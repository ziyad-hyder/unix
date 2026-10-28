import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import Navbar from '../components/Navbar';
import ListingCard from '../components/ListingCard';
import CreateListingModal from '../components/CreateListingModal';
import ListingDetailModal from '../components/ListingDetailModal';
import ProfileModal from '../components/ProfileModal';
import Footer from '../components/Footer';
import ConfirmDialog from '../components/ConfirmDialog';
import IncomingRequestCard from '../components/transactions/IncomingRequestCard';
import OutgoingRequestCard from '../components/transactions/OutgoingRequestCard';
import { useMinuteTicker } from '../components/transactions/Badges';
import { 
  PlusCircle, Search, PackageOpen, 
  Layers, ArrowLeftRight, Check, X, AlertCircle, RefreshCw,
  ChevronDown
} from 'lucide-react';
import { getFriendlyErrorMessage } from '../utils/errors';
import { mergePage } from '../utils/pagination';
import { AUTO_START_HOURS, AUTO_COMPLETE_HOURS } from '../utils/policy';
import { detectNewlyClosed, groupRequests, getClosedNotice } from '../utils/transactionState';
import { categoryLabel, typeLabel } from '../utils/labels';
import { trackEvent, sanitizeSearchTerm } from '../utils/analytics';

const CATEGORY_FILTERS = [
  { id: 'ALL', label: categoryLabel('ALL') },
  { id: 'CALCULATOR', label: categoryLabel('CALCULATOR') },
  { id: 'DRAFTING', label: categoryLabel('DRAFTING') },
  { id: 'ELECTRONICS', label: categoryLabel('ELECTRONICS') },
  { id: 'OTHER', label: categoryLabel('OTHER') },
];

const TYPE_FILTERS = [
  { id: 'ALL', label: typeLabel('ALL') },
  { id: 'RENT', label: typeLabel('RENT') },
  { id: 'SELL', label: typeLabel('SELL') },
  { id: 'SWAP', label: typeLabel('SWAP') },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const now = useMinuteTicker();

  // Active Tab: synced with ?tab=transactions|marketplace (default marketplace)
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get('tab') || '').toLowerCase();
  const activeTab = tabParam === 'transactions' ? 'TRANSACTIONS' : 'MARKETPLACE';

  const handleTabChange = useCallback((newTab) => {
    const tabName = newTab.toLowerCase() === 'transactions' ? 'transactions' : 'marketplace';
    trackEvent('tab_view', { tab_name: tabName });
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tabName === 'transactions') {
        next.set('tab', 'transactions');
      } else {
        next.set('tab', 'marketplace');
      }
      return next;
    });
  }, [setSearchParams]);

  // Marketplace State
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState(null);
  const [listingsPage, setListingsPage] = useState(0);
  const [hasMoreListings, setHasMoreListings] = useState(false);
  const [totalListings, setTotalListings] = useState(null);
  const [loadingMoreListings, setLoadingMoreListings] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Debounced search tracking (fires 600ms after user pauses typing)
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) return;
    const timer = setTimeout(() => {
      trackEvent('search', { search_term: sanitizeSearchTerm(q) });
    }, 600);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Derived selected listing
  const selectedListing = listings.find((l) => l.id === selectedListingId);

  // If selected listing is no longer in listings after a refetch, close the modal
  useEffect(() => {
    if (selectedListingId && !listings.some((l) => l.id === selectedListingId)) {
      setSelectedListingId(null);
    }
  }, [listings, selectedListingId]);

  const handleCloseDetailModal = useCallback(() => {
    setSelectedListingId(null);
  }, []);

  const handleCloseCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  const handleCloseProfileModal = useCallback(() => {
    setIsProfileModalOpen(false);
  }, []);

  // Transactions State
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [cardFeedback, setCardFeedback] = useState({});
  const feedbackTimersRef = useRef({});
  const [codeInputs, setCodeInputs] = useState({});
  const [confirmState, setConfirmState] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [incomingHistoryOpen, setIncomingHistoryOpen] = useState(false);
  const [outgoingHistoryOpen, setOutgoingHistoryOpen] = useState(false);

  // Pinned terminal transactions to avoid jarring disappearances from active list
  const [pinnedClosed, setPinnedClosed] = useState({});
  const prevStatusByIdRef = useRef(null);
  const pinTimersRef = useRef(new Map());
  const completedTrackedIdsRef = useRef(new Set());

  // Clear pin early if user opens History disclosure
  const clearPinsFor = useCallback((ids) => {
    setPinnedClosed((prev) => {
      let changed = false;
      const next = { ...prev };
      const targetIds = ids || Object.keys(next);
      for (const id of targetIds) {
        if (next[id]) {
          delete next[id];
          changed = true;
        }
        if (pinTimersRef.current.has(id)) {
          clearTimeout(pinTimersRef.current.get(id));
          pinTimersRef.current.delete(id);
        }
      }
      return changed ? next : prev;
    });
  }, []);

  // Clear all pin timers on unmount
  useEffect(() => {
    const timers = pinTimersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  const clearCardFeedback = useCallback((reqId) => {
    if (feedbackTimersRef.current[reqId]) {
      clearTimeout(feedbackTimersRef.current[reqId]);
      delete feedbackTimersRef.current[reqId];
    }
    setCardFeedback((prev) => {
      if (!prev[reqId]) return prev;
      const next = { ...prev };
      delete next[reqId];
      return next;
    });
  }, []);

  const setCardFeedbackHelper = useCallback((reqId, feedback) => {
    if (feedbackTimersRef.current[reqId]) {
      clearTimeout(feedbackTimersRef.current[reqId]);
      delete feedbackTimersRef.current[reqId];
    }

    setCardFeedback((prev) => ({
      ...prev,
      [reqId]: feedback,
    }));

    if (feedback?.type === 'success') {
      feedbackTimersRef.current[reqId] = setTimeout(() => {
        setCardFeedback((prev) => {
          const next = { ...prev };
          delete next[reqId];
          return next;
        });
        delete feedbackTimersRef.current[reqId];
      }, 6000);
    }
  }, []);

  useEffect(() => {
    return () => {
      Object.values(feedbackTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  useEffect(() => {
    setConfirmState(null);
  }, [activeTab]);

  const handleCodeInputChange = (transactionId, value) => {
    setCodeInputs((prev) => ({
      ...prev,
      [transactionId]: value.replace(/\D/g, '').slice(0, 6),
    }));
  };

  const listingsRequestIdRef = useRef(0);
  const lastListingsFetchTimeRef = useRef(Date.now());
  const transactionsRequestIdRef = useRef(0);
  const lastTransactionsJsonRef = useRef('');
  const actionLoadingIdRef = useRef(actionLoadingId);

  useEffect(() => {
    actionLoadingIdRef.current = actionLoadingId;
  }, [actionLoadingId]);

  // 1. Fetch Listings
  const fetchListings = useCallback(async (opts = {}) => {
    const isSyntheticEvent = Boolean(opts && typeof opts === 'object' && ('_reactName' in opts || 'nativeEvent' in opts));
    const cleanOpts = isSyntheticEvent ? {} : opts;

    const pageToFetch = typeof cleanOpts.page === 'number' ? cleanOpts.page : 0;
    const isAppend = pageToFetch > 0;
    const silent = Boolean(cleanOpts.silent);

    const requestId = ++listingsRequestIdRef.current;

    try {
      if (isAppend) {
        setLoadingMoreListings(true);
        setLoadMoreError(null);
      } else if (!silent) {
        setListingsLoading(true);
        setListingsError(null);
        setLoadMoreError(null);
      }

      const params = {
        status: 'ACTIVE',
        page: pageToFetch,
        size: 20,
      };
      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      if (selectedType !== 'ALL') params.type = selectedType;

      const res = await api.get('/api/listings', { params });
      if (requestId !== listingsRequestIdRef.current) return;

      if (res.data?.success && res.data?.data) {
        const pageData = res.data.data;
        const newItems = pageData.content || [];

        if (isAppend) {
          setListings((prev) => mergePage(prev, newItems));
        } else {
          setListings(newItems);
        }

        setListingsPage(pageToFetch);
        setHasMoreListings(!pageData.last);
        setTotalListings(pageData.totalElements ?? null);
        lastListingsFetchTimeRef.current = Date.now();
      }
    } catch (err) {
      if (requestId !== listingsRequestIdRef.current) return;
      console.error('Failed to fetch listings:', err);
      const friendlyErr = getFriendlyErrorMessage(err, "Can't reach the server. Check your connection and try again.");
      if (isAppend) {
        setLoadMoreError(friendlyErr);
      } else if (!silent) {
        setListingsError(friendlyErr);
      }
    } finally {
      if (requestId === listingsRequestIdRef.current) {
        if (isAppend) {
          setLoadingMoreListings(false);
        } else if (!silent) {
          setListingsLoading(false);
        }
      }
    }
  }, [selectedCategory, selectedType]);

  const handleLoadMore = () => {
    if (loadingMoreListings || !hasMoreListings) return;
    trackEvent('listing_load_more', {
      page_number: listingsPage + 1,
      category: selectedCategory,
      type: selectedType,
    });
    fetchListings({ page: listingsPage + 1 });
  };

  // 2. Fetch My Transactions
  const fetchTransactions = useCallback(async (opts = {}) => {
    const silent = Boolean(opts && typeof opts === 'object' && opts.silent === true);
    const requestId = ++transactionsRequestIdRef.current;

    try {
      if (!silent) {
        setTransactionsLoading(true);
        setTransactionsError(null);
      }
      const res = await api.get('/api/transactions/me');
      if (requestId !== transactionsRequestIdRef.current) return;

      if (res.data?.success && res.data?.data) {
        const nextReceived = res.data.data.receivedRequests || [];
        const nextSent = res.data.data.sentRequests || [];
        const nextJson = JSON.stringify({ received: nextReceived, sent: nextSent });

        if (nextJson !== lastTransactionsJsonRef.current) {
          lastTransactionsJsonRef.current = nextJson;
          setIncomingRequests(nextReceived);
          setOutgoingRequests(nextSent);
        }

        const allNext = [...nextReceived, ...nextSent];

        // Pin newly closed transactions for 6 seconds so their completion status isn't jarringly hidden
        if (prevStatusByIdRef.current !== null) {
          const newlyClosed = detectNewlyClosed(prevStatusByIdRef.current, allNext);
          if (newlyClosed.length > 0) {
            for (const id of newlyClosed) {
              const req = allNext.find((r) => r && r.id === id);
              if (req?.status === 'COMPLETED' && !completedTrackedIdsRef.current.has(id)) {
                completedTrackedIdsRef.current.add(id);
                trackEvent('transaction_complete', {
                  transaction_id: id,
                  completion_type: 'auto_complete',
                });
              }
            }

            const nowTime = Date.now();
            setPinnedClosed((prev) => {
              const next = { ...prev };
              for (const id of newlyClosed) {
                const req = allNext.find((r) => r && r.id === id);
                next[id] = { status: req?.status, until: nowTime + 6000 };

                if (pinTimersRef.current.has(id)) {
                  clearTimeout(pinTimersRef.current.get(id));
                }
                const timer = setTimeout(() => {
                  setPinnedClosed((curr) => {
                    if (!curr[id]) return curr;
                    const updated = { ...curr };
                    delete updated[id];
                    return updated;
                  });
                  pinTimersRef.current.delete(id);
                }, 6000);
                pinTimersRef.current.set(id, timer);
              }
              return next;
            });
          }
        }

        // Update previous status tracking map
        const newStatusMap = {};
        for (const req of allNext) {
          if (req && req.id != null) {
            newStatusMap[req.id] = req.status;
          }
        }
        prevStatusByIdRef.current = newStatusMap;
      }
    } catch (err) {
      if (requestId !== transactionsRequestIdRef.current) return;
      console.error('Failed to fetch transactions:', err);
      if (!silent) {
        setTransactionsError(getFriendlyErrorMessage(err, "Can't reach the server. Check your connection and try again."));
      }
    } finally {
      if (requestId === transactionsRequestIdRef.current && !silent) {
        setTransactionsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchListings();
    fetchTransactions();
  }, [fetchListings, fetchTransactions]);

  // Live polling for transactions: 20s interval while on TRANSACTIONS tab and document visible
  useEffect(() => {
    if (activeTab !== 'TRANSACTIONS') return;

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      if (actionLoadingIdRef.current != null) return;
      fetchTransactions({ silent: true });
    }, 20000);

    return () => clearInterval(interval);
  }, [activeTab, fetchTransactions]);

  // Refetch on visibility change and window online
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;

      if (activeTab === 'TRANSACTIONS' && actionLoadingIdRef.current == null) {
        fetchTransactions({ silent: true });
      }

      if (Date.now() - lastListingsFetchTimeRef.current > 60000) {
        fetchListings({ silent: true });
      }
    };

    const handleOnline = () => {
      if (activeTab === 'TRANSACTIONS' && actionLoadingIdRef.current == null) {
        fetchTransactions({ silent: true });
      }
      fetchListings({ silent: true });
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [activeTab, fetchTransactions, fetchListings]);

  // 3. Handle Status Update (Accept / Reject)
  const handleUpdateStatus = async (transactionId, newStatus) => {
    setActionLoadingId(transactionId);
    clearCardFeedback(transactionId);

    try {
      await api.patch(`/api/transactions/${transactionId}/status`, { status: newStatus });
      if (newStatus === 'ACCEPTED') {
        trackEvent('transaction_accept', { transaction_id: transactionId });
      }
      setCardFeedbackHelper(transactionId, {
        type: 'success',
        text: newStatus === 'ACCEPTED' ? 'Request accepted. Listing is now reserved.' : 'Request rejected.',
      });
      fetchTransactions();
      fetchListings();
    } catch (err) {
      const isPhoneRequired =
        err.errorCode?.includes('PHONE_REQUIRED') ||
        (err.message && err.message.toLowerCase().includes('phone number is required'));
      setCardFeedbackHelper(transactionId, {
        type: 'error',
        text: getFriendlyErrorMessage(err, 'Failed to update request status.'),
        isPhoneRequired,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // 4. Handle Action Endpoints (cancel, handoff, confirm-receipt, return, confirm-return, dispute, complete)
  const handleAction = async (transactionId, action, successText) => {
    setActionLoadingId(transactionId);
    clearCardFeedback(transactionId);

    try {
      await api.post(`/api/transactions/${transactionId}/${action}`);
      setCardFeedbackHelper(transactionId, {
        type: 'success',
        text: successText,
      });
      fetchTransactions();
      fetchListings();
    } catch (err) {
      setCardFeedbackHelper(transactionId, {
        type: 'error',
        text: getFriendlyErrorMessage(err, `Failed to perform ${action}.`),
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // 5. Handle Code Verification (verify-handoff, verify-return)
  const handleVerifyCode = async (transactionId, endpoint, code, successText) => {
    if (!code || code.length !== 6) {
      setCardFeedbackHelper(transactionId, {
        type: 'error',
        text: 'Please enter a valid 6-digit verification code.',
        isCodeError: true,
      });
      return;
    }

    setActionLoadingId(transactionId);
    clearCardFeedback(transactionId);

    try {
      await api.post(`/api/transactions/${transactionId}/${endpoint}`, { code });
      if (endpoint === 'verify-handoff') {
        trackEvent('transaction_verify_handoff', {
          transaction_id: transactionId,
          verification_method: 'code',
        });
      } else if (endpoint === 'verify-return') {
        trackEvent('transaction_verify_return', {
          transaction_id: transactionId,
          verification_method: 'code',
        });
        completedTrackedIdsRef.current.add(transactionId);
        trackEvent('transaction_complete', {
          transaction_id: transactionId,
          completion_type: 'verify-return',
        });
      }
      setCardFeedbackHelper(transactionId, {
        type: 'success',
        text: successText,
      });
      setCodeInputs((prev) => {
        const next = { ...prev };
        delete next[transactionId];
        return next;
      });
      fetchTransactions();
      fetchListings();
    } catch (err) {
      setCardFeedbackHelper(transactionId, {
        type: 'error',
        text: getFriendlyErrorMessage(err, 'Failed to verify code. Please try again.'),
        isCodeError: true,
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const getConfirmDialogConfig = (state) => {
    if (!state || !state.type) {
      return {
        title: 'Confirm Action',
        message: 'Are you sure you want to proceed?',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        danger: false,
      };
    }

    const { type, request } = state;

    switch (type) {
      case 'REJECT':
        return {
          title: 'Reject Request',
          message: 'Are you sure you want to reject this request? The request will be declined and the item will remain available to others.',
          confirmLabel: 'Reject Request',
          cancelLabel: 'Keep Request',
          danger: true,
        };

      case 'CANCEL': {
        const isAccepted = request?.status === 'ACCEPTED';
        return {
          title: isAccepted ? 'Cancel Accepted Request' : 'Cancel Request',
          message: isAccepted
            ? 'Are you sure you want to cancel this request?\n\nThis request was already accepted by the owner. Please let them know if your plans changed.'
            : 'Are you sure you want to cancel your request for this item?',
          confirmLabel: 'Cancel Request',
          cancelLabel: 'Keep Request',
          danger: true,
        };
      }

      case 'MANUAL_HANDOVER_OWNER':
        return {
          title: 'Record Manual Handover',
          message: `Mark this item as handed over without a verification code?\n\nThe lease clock starts when the borrower confirms receipt, or automatically after ${AUTO_START_HOURS} hours. Unconfirmed manual handovers do not penalize either account.`,
          confirmLabel: 'Record Handover',
          cancelLabel: 'Cancel',
          danger: false,
        };

      case 'MANUAL_RECEIPT_BORROWER':
        return {
          title: 'Confirm Receipt Manually',
          message: `Confirm that you have physically received this item from the owner without using a code?\n\nThis will immediately start your lease clock instead of waiting for the ${AUTO_START_HOURS}-hour auto-start window.`,
          confirmLabel: 'Confirm Receipt',
          cancelLabel: 'Cancel',
          danger: false,
        };

      case 'COMPLETE_EXCHANGE':
        return {
          title: 'Complete Exchange',
          message: 'Confirm that you and the peer have met and completed the exchange? This will close the transaction.',
          confirmLabel: 'Complete Exchange',
          cancelLabel: 'Cancel',
          danger: false,
        };

      case 'MANUAL_RETURN_BORROWER':
        return {
          title: 'Declare Manual Return',
          message: `Mark this item as returned without an owner verification code?\n\nThe transaction completes when the owner confirms receipt, or automatically after ${AUTO_COMPLETE_HOURS} hours. Unconfirmed manual returns do not penalize either account.`,
          confirmLabel: 'Declare Return',
          cancelLabel: 'Cancel',
          danger: false,
        };

      case 'CONFIRM_RETURN':
        return {
          title: 'Confirm Return',
          message: 'Confirm that the item has been returned to you in acceptable condition? This will mark the rental as completed.',
          confirmLabel: 'Confirm Return',
          cancelLabel: 'Cancel',
          danger: false,
        };

      case 'DISPUTE':
        return {
          title: 'Dispute Return',
          message: 'Report an issue with this return? This will suspend automatic completion and flag the transaction as disputed.',
          confirmLabel: 'Dispute Return',
          cancelLabel: 'Cancel',
          danger: true,
        };

      default:
        return {
          title: 'Confirm Action',
          message: 'Are you sure you want to proceed?',
          confirmLabel: 'Confirm',
          cancelLabel: 'Cancel',
          danger: false,
        };
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmState) return;
    const { type, request } = confirmState;
    setConfirmLoading(true);

    try {
      if (type === 'REJECT') {
        await handleUpdateStatus(request.id, 'REJECTED');
        trackEvent('transaction_reject', {
          transaction_id: request.id,
          listing_id: request.listing?.id,
        });
      } else if (type === 'CANCEL') {
        await handleAction(request.id, 'cancel', 'Request cancelled.');
        trackEvent('transaction_cancel', {
          transaction_id: request.id,
          listing_id: request.listing?.id,
          previous_status: request.status,
        });
      } else if (type === 'MANUAL_HANDOVER_OWNER') {
        await handleAction(request.id, 'handoff', 'Handover recorded. Waiting for borrower to confirm receipt.');
        trackEvent('transaction_handoff_fallback', {
          transaction_id: request.id,
          fallback_step: 'MANUAL_HANDOVER_OWNER',
        });
      } else if (type === 'MANUAL_RECEIPT_BORROWER') {
        await handleAction(request.id, 'confirm-receipt', 'Receipt confirmed. Lease clock is now active.');
        trackEvent('transaction_handoff_fallback', {
          transaction_id: request.id,
          fallback_step: 'MANUAL_RECEIPT_BORROWER',
        });
      } else if (type === 'MANUAL_RETURN_BORROWER') {
        await handleAction(request.id, 'return', 'Item marked as returned. Waiting for owner confirmation.');
        trackEvent('transaction_return_fallback', {
          transaction_id: request.id,
          fallback_step: 'MANUAL_RETURN_BORROWER',
        });
      } else if (type === 'COMPLETE_EXCHANGE') {
        await handleAction(request.id, 'complete', 'Transaction marked as completed.');
        completedTrackedIdsRef.current.add(request.id);
        trackEvent('transaction_complete', {
          transaction_id: request.id,
          completion_type: 'COMPLETE_EXCHANGE',
        });
      } else if (type === 'CONFIRM_RETURN') {
        await handleAction(request.id, 'confirm-return', 'Return confirmed. Transaction completed.');
        trackEvent('transaction_return_fallback', {
          transaction_id: request.id,
          fallback_step: 'CONFIRM_RETURN',
        });
        completedTrackedIdsRef.current.add(request.id);
        trackEvent('transaction_complete', {
          transaction_id: request.id,
          completion_type: 'CONFIRM_RETURN',
        });
      } else if (type === 'DISPUTE') {
        await handleAction(request.id, 'dispute', 'Return disputed. Auto-completion suspended.');
        trackEvent('transaction_dispute', {
          transaction_id: request.id,
          listing_id: request.listing?.id,
        });
      }
    } finally {
      setConfirmLoading(false);
      setConfirmState(null);
    }
  };

  // Pre-calculated requested listing IDs across all active stages
  const requestedListingIds = new Set(
    outgoingRequests
      .filter((r) => ['PENDING', 'ACCEPTED', 'ACTIVE_LEASE', 'OVERDUE', 'RETURN_PENDING'].includes(r.status))
      .map((r) => r.listing?.id)
      .filter(Boolean)
  );

  const {
    needsAction: incomingNeedsAction,
    inProgress: incomingInProgress,
    history: incomingHistory,
  } = groupRequests(incomingRequests, 'owner', pinnedClosed);
  const incomingActive = [...incomingNeedsAction, ...incomingInProgress];

  const {
    needsAction: outgoingNeedsAction,
    inProgress: outgoingInProgress,
    history: outgoingHistory,
  } = groupRequests(outgoingRequests, 'borrower', pinnedClosed);
  const outgoingActive = [...outgoingNeedsAction, ...outgoingInProgress];

  const totalNeedsActionCount = incomingNeedsAction.length + outgoingNeedsAction.length;

  const filteredListings = listings.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.title?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
  });



  const renderIncomingCard = (req) => (
    <IncomingRequestCard
      key={req.id}
      req={req}
      now={now}
      cardFeedback={cardFeedback}
      actionLoadingId={actionLoadingId}
      codeInputs={codeInputs}
      closedNotice={pinnedClosed[req.id] ? getClosedNotice(pinnedClosed[req.id].status || req.status) : null}
      onCodeInputChange={handleCodeInputChange}
      onVerifyCode={handleVerifyCode}
      onUpdateStatus={handleUpdateStatus}
      onConfirmState={setConfirmState}
      onClearCardFeedback={clearCardFeedback}
      onRequestAddPhone={() => setIsProfileModalOpen(true)}
    />
  );

  const renderOutgoingCard = (req) => (
    <OutgoingRequestCard
      key={req.id}
      req={req}
      now={now}
      cardFeedback={cardFeedback}
      actionLoadingId={actionLoadingId}
      codeInputs={codeInputs}
      closedNotice={pinnedClosed[req.id] ? getClosedNotice(pinnedClosed[req.id].status || req.status) : null}
      onCodeInputChange={handleCodeInputChange}
      onVerifyCode={handleVerifyCode}
      onConfirmState={setConfirmState}
      onClearCardFeedback={clearCardFeedback}
      onRequestAddPhone={() => setIsProfileModalOpen(true)}
    />
  );

  const confirmDialogConfig = getConfirmDialogConfig(confirmState);

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-7">
        
        {/* Top Hero / Header Section */}
        <div className="pt-1 pb-3 sm:py-4 border-b border-brand-secondary/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="max-w-2xl">


            <h1 className="text-2xl font-bold tracking-tight text-ink-primary">
              Uni<span className="text-brand-secondary">X</span> Resource Exchange
            </h1>

            <p className="mt-1 text-xs text-ink-secondary leading-relaxed">
              Borrow, purchase, or trade calculators, drafting tools, and lab equipment with verified students.
            </p>
          </div>

          <div className="shrink-0">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary active:bg-brand-primary transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>List an Item</span>
            </button>
          </div>
        </div>

        {/* Global Navigation Tabs: Marketplace vs My Transactions */}
        <div className="mt-4 sm:mt-6 flex items-center gap-2 border-b border-brand-secondary/20 pb-3 overflow-x-auto scrollbar-none">
          <button
            onClick={() => handleTabChange('MARKETPLACE')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'MARKETPLACE'
                ? 'bg-brand-primary text-white'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-brand-primary/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Marketplace Feed</span>
          </button>

          <button
            onClick={() => {
              handleTabChange('TRANSACTIONS');
              fetchTransactions();
            }}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === 'TRANSACTIONS'
                ? 'bg-brand-primary text-white'
                : 'text-ink-secondary hover:text-ink-primary hover:bg-brand-primary/5'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>My Transactions</span>
            {totalNeedsActionCount > 0 && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-brand-accent text-white">
                {totalNeedsActionCount}
              </span>
            )}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: MARKETPLACE FEED */}
        {/* ========================================================================= */}
        {activeTab === 'MARKETPLACE' && (
          <div className="mt-6 space-y-6">
            {/* Filter & Search Toolbar */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Category Filters */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {CATEGORY_FILTERS.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        trackEvent('select_content', { content_type: 'category', item_id: cat.id });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'bg-brand-primary text-white'
                          : 'bg-white text-ink-secondary hover:text-ink-primary border border-brand-secondary/20'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Search Input */}
                <div className="relative w-full sm:w-60">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-secondary">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search resources..."
                    className="block w-full pl-8 pr-8 py-1.5 text-base sm:text-xs border border-brand-secondary/25 rounded-lg bg-white text-ink-primary placeholder:text-ink-secondary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-brand-primary font-medium"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-ink-secondary hover:text-ink-primary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Type Filters */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[10px] font-semibold text-ink-secondary uppercase tracking-wider">Type:</span>
                <div className="flex items-center gap-1">
                  {TYPE_FILTERS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSelectedType(t.id);
                        trackEvent('select_content', { content_type: 'listing_type', item_id: t.id });
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                        selectedType === t.id
                          ? 'bg-brand-primary/10 text-brand-primary border border-brand-secondary/30 font-semibold'
                          : 'text-ink-secondary hover:text-ink-primary'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Search hint when more listings are available on the server */}
            {hasMoreListings && searchQuery.trim() && (
              <div className="p-3 rounded-lg bg-brand-primary/5 border border-brand-secondary/20 text-xs text-ink-secondary flex items-center justify-between gap-3">
                <span>Searching loaded listings only. Load more to search further.</span>
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMoreListings}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-secondary active:bg-brand-primary transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {loadingMoreListings && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>Load more</span>
                </button>
              </div>
            )}

            {/* Small error line when data was already loaded and a refresh failed */}
            {listingsError && listings.length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{listingsError}</span>
                </div>
                <button
                  onClick={fetchListings}
                  className="inline-flex items-center gap-1 font-semibold text-brand-primary hover:underline cursor-pointer ml-3 shrink-0"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {/* Listings Grid / Error / Empty / Skeleton */}
            {listingsLoading && listings.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="bg-white rounded-xl border border-brand-secondary/20 p-5 animate-pulse space-y-3">
                    <div className="flex justify-between">
                      <div className="w-14 h-4 bg-brand-primary/5 rounded-full" />
                      <div className="w-16 h-4 bg-brand-primary/5 rounded" />
                    </div>
                    <div className="w-3/4 h-4 bg-brand-primary/10 rounded" />
                    <div className="space-y-1">
                      <div className="w-full h-3 bg-brand-primary/5 rounded" />
                      <div className="w-4/5 h-3 bg-brand-primary/5 rounded" />
                    </div>
                    <div className="w-1/3 h-5 bg-brand-primary/10 rounded pt-2" />
                  </div>
                ))}
              </div>
            ) : listingsError && listings.length === 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-8 sm:p-10 text-center">
                <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-red-900">Unable to load listings</h3>
                <p className="text-xs text-red-700 max-w-sm mx-auto mt-1 mb-4">
                  {listingsError}
                </p>
                <button
                  onClick={fetchListings}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            ) : filteredListings.length === 0 ? (
              (selectedCategory !== 'ALL' || selectedType !== 'ALL' || searchQuery.trim()) ? (
                <div className="bg-white rounded-2xl border border-dashed border-brand-secondary/30 p-10 sm:p-14 text-center">
                  <div className="w-10 h-10 rounded-lg bg-brand-primary/5 text-ink-secondary flex items-center justify-center mx-auto mb-3">
                    <Search className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-ink-primary">No listings match these filters</h3>
                  <p className="text-xs text-ink-secondary max-w-sm mx-auto mt-1">
                    Try adjusting or clearing your category, type, or search query to see more results.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('ALL');
                      setSelectedType('ALL');
                      setSearchQuery('');
                    }}
                    className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Clear filters</span>
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-dashed border-brand-secondary/30 p-10 sm:p-14 text-center">
                  <div className="w-10 h-10 rounded-lg bg-brand-primary/5 text-ink-secondary flex items-center justify-center mx-auto mb-3">
                    <PackageOpen className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-bold text-ink-primary">No active listings found</h3>
                  <p className="text-xs text-ink-secondary max-w-sm mx-auto mt-1">
                    Be the first to list a calculator, drafting kit, or lab resource for fellow KITSW students.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Create First Listing</span>
                  </button>
                </div>
              )
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredListings.map((item) => (
                    <ListingCard
                      key={item.id}
                      listing={item}
                      onClick={() => setSelectedListingId(item.id)}
                    />
                  ))}
                </div>

                {/* Inline error for failed Load more */}
                {loadMoreError && (
                  <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{loadMoreError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchListings({ page: listingsPage + 1 })}
                      className="inline-flex items-center gap-1 font-semibold text-brand-primary hover:underline cursor-pointer ml-3 shrink-0"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  </div>
                )}

                {/* Load More Button */}
                {hasMoreListings && !loadMoreError && (
                  <div className="mt-6 text-center">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMoreListings}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-brand-secondary/30 bg-white text-xs font-bold text-ink-primary hover:bg-brand-primary/5 active:bg-brand-primary/10 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {loadingMoreListings ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-secondary" />
                          <span>Loading more...</span>
                        </>
                      ) : (
                        <span>Load More Listings</span>
                      )}
                    </button>
                  </div>
                )}

                {/* Showing N of M */}
                {totalListings != null && (
                  <p className="mt-4 text-center text-xs text-ink-secondary">
                    Showing {filteredListings.length} of {totalListings}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MY TRANSACTIONS HUB */}
        {/* ========================================================================= */}
        {activeTab === 'TRANSACTIONS' && (
          <div className="mt-6 space-y-7">

            {/* Small error line when transactions already loaded and a refresh failed */}
            {transactionsError && (incomingRequests.length > 0 || outgoingRequests.length > 0) && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{transactionsError}</span>
                </div>
                <button
                  onClick={fetchTransactions}
                  className="inline-flex items-center gap-1 font-semibold text-brand-primary hover:underline cursor-pointer ml-3 shrink-0"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              </div>
            )}

            {transactionsError && incomingRequests.length === 0 && outgoingRequests.length === 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-8 sm:p-10 text-center">
                <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-red-900">Unable to load requests</h3>
                <p className="text-xs text-red-700 max-w-sm mx-auto mt-1 mb-4">
                  {transactionsError}
                </p>
                <button
                  onClick={fetchTransactions}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            ) : (
              <>
                {/* Section 1: Incoming Requests (Owner View) */}
                <div>
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <div>
                      <h2 className="text-base font-bold text-ink-primary">
                        Incoming Requests <span className="text-ink-secondary/70 font-normal">({incomingRequests.length})</span>
                      </h2>
                      <p className="text-xs text-ink-secondary">
                        Students requesting to buy, rent, or swap your listed items.
                      </p>
                    </div>
                    <button
                      onClick={fetchTransactions}
                      disabled={transactionsLoading}
                      className="inline-flex items-center gap-1.5 text-xs text-brand-secondary hover:text-brand-primary font-semibold cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${transactionsLoading ? 'animate-spin' : ''}`} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {transactionsLoading && incomingRequests.length === 0 && outgoingRequests.length === 0 ? (
                    <div className="p-8 text-center text-xs text-ink-secondary">Loading requests...</div>
                  ) : incomingRequests.length === 0 ? (
                    !transactionsError ? (
                      <div className="bg-white rounded-xl border border-brand-secondary/20 p-7 text-center">
                        <p className="text-xs font-medium text-ink-secondary">No incoming requests yet for your listings.</p>
                      </div>
                    ) : null
                  ) : (
                <div className="space-y-4">
                  {incomingActive.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {incomingActive.map(renderIncomingCard)}
                    </div>
                  )}

                  {incomingHistory.length > 0 && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!incomingHistoryOpen) {
                            trackEvent('history_expanded', { section: 'incoming' });
                            clearPinsFor(incomingRequests.map((r) => r.id));
                          }
                          setIncomingHistoryOpen((prev) => !prev);
                        }}
                        aria-expanded={incomingHistoryOpen}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer py-1"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${incomingHistoryOpen ? 'rotate-180' : ''}`} />
                        <span>History ({incomingHistory.length})</span>
                      </button>
                      {incomingHistoryOpen && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          {incomingHistory.map(renderIncomingCard)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 2: My Outgoing Requests (Requester View) */}
            <div className="pt-5 border-t border-brand-secondary/20">
              <h2 className="text-base font-bold text-ink-primary mb-1">
                My Outgoing Requests <span className="text-ink-secondary/70 font-normal">({outgoingRequests.length})</span>
              </h2>
              <p className="text-xs text-ink-secondary mb-3">
                Track requests you have made for other students' items.
              </p>

              {transactionsLoading && incomingRequests.length === 0 && outgoingRequests.length === 0 ? (
                <div className="p-8 text-center text-xs text-ink-secondary">Loading requests...</div>
              ) : outgoingRequests.length === 0 ? (
                !transactionsError ? (
                  <div className="bg-white rounded-xl border border-brand-secondary/20 p-7 text-center">
                    <p className="text-xs font-medium text-ink-secondary">You have not requested any items yet.</p>
                  </div>
                ) : null
              ) : (
                <div className="space-y-4">
                  {outgoingActive.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {outgoingActive.map(renderOutgoingCard)}
                    </div>
                  )}

                  {outgoingHistory.length > 0 && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!outgoingHistoryOpen) {
                            trackEvent('history_expanded', { section: 'outgoing' });
                            clearPinsFor(outgoingRequests.map((r) => r.id));
                          }
                          setOutgoingHistoryOpen((prev) => !prev);
                        }}
                        aria-expanded={outgoingHistoryOpen}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer py-1"
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${outgoingHistoryOpen ? 'rotate-180' : ''}`} />
                        <span>History ({outgoingHistory.length})</span>
                      </button>
                      {outgoingHistoryOpen && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                          {outgoingHistory.map(renderOutgoingCard)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

      </div>
    )}

      </main>

      {/* Footer */}
      <Footer />

      {/* Create Listing Modal */}
      <CreateListingModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        onSuccess={() => {
          fetchListings();
          fetchTransactions();
        }}
      />

      {/* Listing Detail & Request Modal */}
      <ListingDetailModal
        listing={selectedListing}
        isOpen={Boolean(selectedListingId && selectedListing)}
        isAlreadyRequested={selectedListing ? requestedListingIds.has(selectedListing.id) : false}
        onClose={handleCloseDetailModal}
        onListingUpdated={() => {
          fetchListings();
          fetchTransactions();
        }}
        onRequestAddPhone={() => setIsProfileModalOpen(true)}
      />

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={handleCloseProfileModal}
        onSuccess={handleCloseProfileModal}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmDialogConfig.title}
        message={confirmDialogConfig.message}
        confirmLabel={confirmDialogConfig.confirmLabel}
        cancelLabel={confirmDialogConfig.cancelLabel}
        danger={confirmDialogConfig.danger}
        loading={confirmLoading}
        onConfirm={handleConfirmAction}
        onCancel={() => {
          if (!confirmLoading) {
            setConfirmState(null);
          }
        }}
      />
    </div>
  );
}

