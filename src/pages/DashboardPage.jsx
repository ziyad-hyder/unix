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
import { 
  PlusCircle, CheckCircle2, Search, PackageOpen, 
  Layers, ArrowLeftRight, Check, X, Clock, User, AlertCircle, RefreshCw, MessageCircle,
  ChevronDown
} from 'lucide-react';
import { getFriendlyErrorMessage } from '../utils/errors';
import { formatDateTime, formatDuration, formatAutoCompleteRemaining } from '../utils/time';
import { toWhatsAppUrl } from '../utils/phone';
import { mergePage } from '../utils/pagination';
import { AUTO_START_HOURS, AUTO_COMPLETE_HOURS } from '../utils/policy';
import { needsAction, isHistory } from '../utils/transactionState';

const CATEGORY_FILTERS = [
  { id: 'ALL', label: 'All Items' },
  { id: 'CALCULATOR', label: 'Calculators' },
  { id: 'DRAFTING', label: 'Drafting Kits' },
  { id: 'ELECTRONICS', label: 'Electronics' },
  { id: 'OTHER', label: 'Other Resources' },
];

const TYPE_FILTERS = [
  { id: 'ALL', label: 'All Types' },
  { id: 'RENT', label: 'Rent' },
  { id: 'SELL', label: 'Buy/Sell' },
  { id: 'SWAP', label: 'Swap' },
];

const STATUS_CONFIG = {
  PENDING: {
    label: 'PENDING',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  ACCEPTED: {
    label: 'ACCEPTED',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  ACTIVE_LEASE: {
    label: 'ACTIVE LEASE',
    className: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  OVERDUE: {
    label: 'OVERDUE',
    className: 'bg-red-50 text-red-800 border-red-200',
  },
  RETURN_PENDING: {
    label: 'RETURN PENDING',
    className: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  COMPLETED: {
    label: 'COMPLETED',
    className: 'bg-stone-100 text-stone-700 border-stone-300',
  },
  REJECTED: {
    label: 'DECLINED',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  CANCELLED: {
    label: 'CANCELLED',
    className: 'bg-stone-100 text-stone-600 border-stone-200',
  },
  EXPIRED: {
    label: 'EXPIRED',
    className: 'bg-stone-100 text-stone-600 border-stone-200',
  },
};

function StatusBadge({ status }) {
  const conf = STATUS_CONFIG[status] || {
    label: status,
    className: 'bg-stone-100 text-stone-700 border-stone-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-tight text-[10px] font-bold tracking-wide border ${conf.className}`}
    >
      {conf.label}
    </span>
  );
}

function useMinuteTicker() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function CountdownBadge({ req }) {
  const now = useMinuteTicker();
  if (!req) return null;
  const { status } = req;

  if (status === 'RETURN_PENDING' && !req.disputed && req.returnedAt) {
    const text = formatAutoCompleteRemaining(req.returnedAt, now, AUTO_COMPLETE_HOURS);
    const displayText = text === 'Completing shortly' ? 'Completing shortly' : `Auto-completes in ${text.replace('auto-completes in ', '')}`;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-tight text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <Clock className="w-3 h-3 text-emerald-600" />
        <span>{displayText}</span>
      </span>
    );
  }

  if (!req.dueAt) return null;
  const dueTime = new Date(req.dueAt).getTime();
  if (isNaN(dueTime)) return null;

  const diffMs = dueTime - now;

  if (status === 'ACTIVE_LEASE') {
    if (diffMs > 0) {
      const text = `Due in ${formatDuration(diffMs)}`;
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-tight text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
          <Clock className="w-3 h-3 text-sky-600" />
          <span>{text}</span>
        </span>
      );
    } else {
      const overdueMs = Math.abs(diffMs);
      const text = `Overdue by ${formatDuration(overdueMs)}`;
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-tight text-[10px] font-bold bg-red-50 text-red-800 border border-red-200">
          <AlertCircle className="w-3 h-3 text-red-600" />
          <span>{text}</span>
        </span>
      );
    }
  }

  if (status === 'OVERDUE') {
    const overdueMs = Math.max(0, now - dueTime);
    const text = `Overdue by ${formatDuration(overdueMs)}`;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-tight text-[10px] font-bold bg-red-50 text-red-800 border border-red-200">
        <AlertCircle className="w-3 h-3 text-red-600" />
        <span>{text}</span>
      </span>
    );
  }

  return null;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const now = useMinuteTicker();

  // Active Tab: synced with ?tab=transactions|marketplace (default marketplace)
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = (searchParams.get('tab') || '').toLowerCase();
  const activeTab = tabParam === 'transactions' ? 'TRANSACTIONS' : 'MARKETPLACE';

  const handleTabChange = useCallback((newTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (newTab.toLowerCase() === 'transactions') {
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
      } else if (type === 'CANCEL') {
        await handleAction(request.id, 'cancel', 'Request cancelled.');
      } else if (type === 'MANUAL_HANDOVER_OWNER') {
        await handleAction(request.id, 'handoff', 'Handover recorded. Waiting for borrower to confirm receipt.');
      } else if (type === 'MANUAL_RECEIPT_BORROWER') {
        await handleAction(request.id, 'confirm-receipt', 'Receipt confirmed. Lease clock is now active.');
      } else if (type === 'MANUAL_RETURN_BORROWER') {
        await handleAction(request.id, 'return', 'Item marked as returned. Waiting for owner confirmation.');
      } else if (type === 'COMPLETE_EXCHANGE') {
        await handleAction(request.id, 'complete', 'Transaction marked as completed.');
      } else if (type === 'CONFIRM_RETURN') {
        await handleAction(request.id, 'confirm-return', 'Return confirmed. Transaction completed.');
      } else if (type === 'DISPUTE') {
        await handleAction(request.id, 'dispute', 'Return disputed. Auto-completion suspended.');
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

  const totalNeedsActionCount =
    incomingRequests.filter((r) => needsAction(r, 'owner')).length +
    outgoingRequests.filter((r) => needsAction(r, 'borrower')).length;

  const incomingNeedsAction = incomingRequests.filter((r) => needsAction(r, 'owner'));
  const incomingInProgress = incomingRequests.filter((r) => !needsAction(r, 'owner') && !isHistory(r));
  const incomingHistory = incomingRequests.filter((r) => isHistory(r));
  const incomingActive = [...incomingNeedsAction, ...incomingInProgress];

  const outgoingNeedsAction = outgoingRequests.filter((r) => needsAction(r, 'borrower'));
  const outgoingInProgress = outgoingRequests.filter((r) => !needsAction(r, 'borrower') && !isHistory(r));
  const outgoingHistory = outgoingRequests.filter((r) => isHistory(r));
  const outgoingActive = [...outgoingNeedsAction, ...outgoingInProgress];

  const filteredListings = listings.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.title?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
  });



  const renderIncomingCard = (req) => (
    <div
      key={req.id}
      className="bg-white rounded-xl border border-brand-secondary/20 p-4 flex flex-col justify-between space-y-3 min-w-0"
    >
      <div>
        {/* Top: Item Title & Badges */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold text-ink-secondary uppercase tracking-wider bg-brand-primary/5 px-2 py-0.5 rounded-tight mr-1.5 inline-block align-middle">
              {req.listing?.type}
            </span>
            <h3 className="font-bold text-ink-primary text-xs sm:text-sm inline align-middle leading-snug break-words">
              {req.listing?.title}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap sm:shrink-0 sm:justify-end">
            <StatusBadge status={req.status} />
            <CountdownBadge req={req} />

            {/* WhatsApp Connect Button (rendered only when phone is returned by API) */}
            {req.requester?.phone && (() => {
              const waUrl = toWhatsAppUrl(req.requester.phone);
              return waUrl ? (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-tight text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-xs shrink-0"
                  title={`Chat with ${req.requester.fullName || 'student'} on WhatsApp`}
                >
                  <MessageCircle className="w-3 h-3 shrink-0" />
                  <span>WhatsApp</span>
                </a>
              ) : (
                <span className="text-[11px] font-mono text-ink-secondary shrink-0">
                  {req.requester.phone}
                </span>
              );
            })()}
          </div>
        </div>

        {/* Requester Info */}
        <div className="mt-3 p-2.5 rounded-control bg-brand-bg/60 border border-brand-secondary/15 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-[10px] shrink-0">
              <User className="w-3 h-3" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink-primary text-xs truncate">{req.requester?.fullName || 'Student'}</p>
              <p className="font-mono text-[10px] text-ink-secondary truncate">
                {req.requester?.email}
                {req.requester?.phone ? ` | ${req.requester.phone}` : ''}
              </p>
            </div>
          </div>
          <span className="text-[10px] text-ink-secondary font-mono shrink-0">
            {formatDateTime(req.createdAt)}
          </span>
        </div>

        {/* Lifecycle Info */}
        {(req.dueAt || req.handedOverAt || req.returnedAt) && (
          <div className="mt-2 text-[11px] text-ink-secondary space-y-0.5 px-0.5">
            {req.handedOverAt && (
              <p>Handover marked on: {formatDateTime(req.handedOverAt)}</p>
            )}
            {req.dueAt && (
              <p>Due: <span className="font-medium text-ink-primary">{formatDateTime(req.dueAt)}</span></p>
            )}
            {req.returnedAt && (
              <p>Return declared on: <span className="font-medium text-ink-primary">{formatDateTime(req.returnedAt)}</span></p>
            )}
            {req.disputed && (
              <p className="text-amber-800 font-semibold">Disputed. Contact the other party to resolve.</p>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons & Contact Status for Listing Owner */}
      <div className="pt-2 border-t border-brand-secondary/15">
        {/* Inline Card Feedback (Above Action Buttons) */}
        {cardFeedback[req.id] && !cardFeedback[req.id].isCodeError && (
          <div
            role={cardFeedback[req.id].type === 'error' ? 'alert' : 'status'}
            className={`mb-2.5 p-2.5 rounded-tight border text-xs flex items-center justify-between ${
              cardFeedback[req.id].type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              {cardFeedback[req.id].type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              )}
              <span className="font-medium">{cardFeedback[req.id].text}</span>
              {cardFeedback[req.id].isPhoneRequired && (
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="px-2 py-0.5 rounded bg-brand-primary text-white text-[11px] font-semibold hover:bg-brand-secondary transition-colors cursor-pointer"
                >
                  Add WhatsApp number
                </button>
              )}
            </div>
            {cardFeedback[req.id].type === 'error' && (
              <button
                type="button"
                onClick={() => clearCardFeedback(req.id)}
                className="text-ink-secondary hover:text-ink-primary p-0.5 cursor-pointer ml-2 shrink-0"
                aria-label="Dismiss error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
        {req.status === 'PENDING' && (
          <div className="flex items-center justify-end gap-2 flex-wrap">
            <button
              onClick={() => setConfirmState({ type: 'REJECT', request: req })}
              disabled={actionLoadingId === req.id}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-tight text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reject</span>
            </button>

            <button
              onClick={() => handleUpdateStatus(req.id, 'ACCEPTED')}
              disabled={actionLoadingId === req.id}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-tight text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary active:bg-brand-primary transition-colors cursor-pointer disabled:opacity-50"
            >
              {actionLoadingId === req.id ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              <span>Accept Request</span>
            </button>
          </div>
        )}

        {req.status === 'ACCEPTED' && req.listing?.type === 'RENT' && (
          <div className="space-y-2.5">
            {!req.handedOverAt ? (
              <div className="p-3 rounded-control bg-brand-bg border border-brand-secondary/20 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-brand-primary">Verify Physical Handover</span>
                  <span className="text-[11px] text-ink-secondary">Ask borrower for their 6-digit code</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={6}
                    placeholder="000000"
                    value={codeInputs[req.id] || ''}
                    onChange={(e) => handleCodeInputChange(req.id, e.target.value)}
                    disabled={actionLoadingId === req.id}
                    className="w-full sm:w-32 px-3 py-1.5 text-center font-mono text-base sm:text-sm tracking-widest bg-white border border-brand-secondary/30 rounded-tight focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                  <button
                    onClick={() => handleVerifyCode(req.id, 'verify-handoff', codeInputs[req.id], 'Handoff verified successfully. Lease is now active.')}
                    disabled={actionLoadingId === req.id || (codeInputs[req.id] || '').length !== 6}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-tight text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary active:bg-brand-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    {actionLoadingId === req.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    <span>Verify Handoff</span>
                  </button>
                </div>
                {cardFeedback[req.id] && cardFeedback[req.id].isCodeError && cardFeedback[req.id].type === 'error' && (
                  <div
                    role="alert"
                    className="flex items-center justify-between text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2.5 py-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <span>{cardFeedback[req.id].text}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => clearCardFeedback(req.id)}
                      className="text-ink-secondary hover:text-red-700 p-0.5 cursor-pointer ml-2 shrink-0"
                      aria-label="Dismiss error"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div className="pt-1 border-t border-brand-secondary/15 flex items-center justify-between flex-wrap gap-1">
                  <span className="text-[10px] text-ink-secondary">Can't use a code?</span>
                  <button
                    type="button"
                    onClick={() => setConfirmState({ type: 'MANUAL_HANDOVER_OWNER', request: req })}
                    disabled={actionLoadingId === req.id}
                    className="text-[11px] font-medium text-brand-secondary hover:text-brand-primary underline cursor-pointer disabled:opacity-50"
                  >
                    Use manual handover
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-ink-secondary flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-brand-secondary shrink-0" />
                <span>Manual handover recorded. Waiting for borrower to confirm receipt.</span>
              </div>
            )}
          </div>
        )}

        {req.status === 'ACCEPTED' && req.listing?.type !== 'RENT' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[11px] text-ink-secondary">
              Meet peer and complete exchange.
            </span>
            <button
              onClick={() => setConfirmState({ type: 'COMPLETE_EXCHANGE', request: req })}
              disabled={actionLoadingId === req.id}
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-tight text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary transition-colors cursor-pointer disabled:opacity-50 w-full sm:w-auto"
            >
              {actionLoadingId === req.id ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              <span>Complete Exchange</span>
            </button>
          </div>
        )}

        {(req.status === 'ACTIVE_LEASE' || req.status === 'OVERDUE') && req.listing?.type === 'RENT' && (
          <div className="space-y-2">
            {req.returnCode ? (
              <div className="p-3 rounded-control bg-brand-bg border border-brand-secondary/20 space-y-1 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-brand-primary">Return Verification Code</span>
                  <CountdownBadge req={req} />
                </div>
                <div className="py-1">
                  <div className="font-mono text-2xl font-bold tracking-widest text-ink-primary select-all">
                    {req.returnCode}
                  </div>
                </div>
                <p className="text-[11px] text-ink-secondary">
                  Show this code to the borrower when they return the item.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-secondary">
                  {req.status === 'OVERDUE' ? 'Rental is overdue. Overdue notices sent to borrower.' : 'Lease active. Item is currently with borrower.'}
                </span>
                <CountdownBadge req={req} />
              </div>
            )}
          </div>
        )}

        {req.status === 'RETURN_PENDING' && (
          <div className="space-y-2">
            <div className="text-xs text-ink-secondary">
              {req.disputed ? (
                <span className="text-amber-800 font-semibold flex items-center gap-1 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Disputed. Contact the other party to resolve.</span>
                </span>
              ) : (
                <span className="text-emerald-800 font-semibold flex items-center gap-1 text-xs">
                  <Clock className="w-3.5 h-3.5 text-brand-secondary shrink-0" />
                  <span>Return declared by borrower ({formatAutoCompleteRemaining(req.returnedAt, now, AUTO_COMPLETE_HOURS)}).</span>
                </span>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 flex-wrap">
              {!req.disputed && (
                <button
                  onClick={() => setConfirmState({ type: 'DISPUTE', request: req })}
                  disabled={actionLoadingId === req.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-tight text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span>Dispute Return</span>
                </button>
              )}
              <button
                onClick={() => setConfirmState({ type: 'CONFIRM_RETURN', request: req })}
                disabled={actionLoadingId === req.id}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-tight text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary transition-colors cursor-pointer disabled:opacity-50"
              >
                {actionLoadingId === req.id ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                <span>Confirm Return</span>
              </button>
            </div>
          </div>
        )}

        {req.status === 'COMPLETED' && (
          <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Transaction completed.</span>
          </div>
        )}

        {req.status === 'REJECTED' && (
          <div className="text-right text-xs text-ink-secondary">
            <span>Request rejected.</span>
          </div>
        )}

        {req.status === 'CANCELLED' && (
          <div className="text-right text-xs text-ink-secondary">
            <span>Cancelled by requester.</span>
          </div>
        )}

        {req.status === 'EXPIRED' && (
          <div className="text-right text-xs text-ink-secondary">
            <span>Request expired.</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderOutgoingCard = (req) => (
    <div
      key={req.id}
      className="bg-white rounded-xl border border-brand-secondary/20 p-4 flex flex-col justify-between space-y-3 min-w-0"
    >
      <div>
        {/* Top: Item Title & Badges */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold text-ink-secondary uppercase tracking-wider bg-brand-primary/5 px-2 py-0.5 rounded-tight mr-1.5 inline-block align-middle">
              {req.listing?.type}
            </span>
            <h3 className="font-bold text-ink-primary text-xs sm:text-sm inline align-middle leading-snug break-words">
              {req.listing?.title}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap sm:shrink-0 sm:justify-end">
            <StatusBadge status={req.status} />
            <CountdownBadge req={req} />

            {/* WhatsApp Connect Button (rendered only when phone is returned by API) */}
            {req.listing?.owner?.phone && (() => {
              const waUrl = toWhatsAppUrl(req.listing.owner.phone);
              return waUrl ? (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-tight text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-xs shrink-0"
                  title={`Chat with ${req.listing.owner.fullName || 'owner'} on WhatsApp`}
                >
                  <MessageCircle className="w-3 h-3 shrink-0" />
                  <span>WhatsApp</span>
                </a>
              ) : (
                <span className="text-[11px] font-mono text-ink-secondary shrink-0">
                  {req.listing.owner.phone}
                </span>
              );
            })()}
          </div>
        </div>

        {/* Owner contact details */}
        <div className="mt-3 p-2.5 rounded-control bg-brand-bg/60 border border-brand-secondary/15 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-ink-secondary">Listing Owner</p>
            <p className="font-mono text-xs font-semibold text-ink-primary truncate">
              {req.listing?.owner?.fullName ? `${req.listing.owner.fullName} (${req.listing.owner.email})` : req.listing?.owner?.email}
            </p>
            {req.listing?.owner?.phone && (
              <p className="font-mono text-[10px] text-emerald-800 font-semibold mt-0.5 truncate">
                Phone: {req.listing.owner.phone}
              </p>
            )}
          </div>
          <div className="text-left sm:text-right shrink-0">
            <p className="text-[10px] text-ink-secondary">Requested</p>
            <p className="font-mono text-xs text-ink-secondary">{formatDateTime(req.createdAt)}</p>
          </div>
        </div>

        {/* Lifecycle Info */}
        {(req.dueAt || req.handedOverAt || req.returnedAt) && (
          <div className="mt-2 text-[11px] text-ink-secondary space-y-0.5 px-0.5">
            {req.handedOverAt && (
              <p className="text-emerald-800 font-semibold">Owner recorded item handover on {formatDateTime(req.handedOverAt)}</p>
            )}
            {req.dueAt && (
              <p>Due: <span className="font-medium text-ink-primary">{formatDateTime(req.dueAt)}</span></p>
            )}
            {req.returnedAt && (
              <p>Return declared on: <span className="font-medium text-ink-primary">{formatDateTime(req.returnedAt)}</span></p>
            )}
            {req.disputed && (
              <p className="text-amber-800 font-semibold">Disputed. Contact the other party to resolve.</p>
            )}
          </div>
        )}
      </div>

      {/* Outgoing Action Buttons */}
      <div className="pt-2 border-t border-brand-secondary/15">
        {/* Inline Card Feedback (Above Action Buttons) */}
        {cardFeedback[req.id] && !cardFeedback[req.id].isCodeError && (
          <div
            role={cardFeedback[req.id].type === 'error' ? 'alert' : 'status'}
            className={`mb-2.5 p-2.5 rounded-tight border text-xs flex items-center justify-between ${
              cardFeedback[req.id].type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-red-50 border-red-200 text-red-800'
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              {cardFeedback[req.id].type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              )}
              <span className="font-medium">{cardFeedback[req.id].text}</span>
              {cardFeedback[req.id].isPhoneRequired && (
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="px-2 py-0.5 rounded bg-brand-primary text-white text-[11px] font-semibold hover:bg-brand-secondary transition-colors cursor-pointer"
                >
                  Add WhatsApp number
                </button>
              )}
            </div>
            {cardFeedback[req.id].type === 'error' && (
              <button
                type="button"
                onClick={() => clearCardFeedback(req.id)}
                className="text-ink-secondary hover:text-ink-primary p-0.5 cursor-pointer ml-2 shrink-0"
                aria-label="Dismiss error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
        {req.status === 'PENDING' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[11px] text-ink-secondary">Waiting for owner response.</span>
            <button
              onClick={() => setConfirmState({ type: 'CANCEL', request: req })}
              disabled={actionLoadingId === req.id}
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-tight text-xs font-semibold text-ink-secondary hover:text-red-700 bg-white hover:bg-red-50 border border-brand-secondary/25 hover:border-red-200 transition-colors cursor-pointer disabled:opacity-50 w-full sm:w-auto"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel Request</span>
            </button>
          </div>
        )}

        {req.status === 'ACCEPTED' && req.listing?.type === 'RENT' && (
          <div className="space-y-2.5">
            {req.handoffCode && (
              <div className="p-3 rounded-control bg-brand-bg border border-brand-secondary/20 space-y-1 text-left">
                <span className="text-[11px] font-semibold text-brand-primary">Handoff Verification Code</span>
                <div className="py-1">
                  <div className="font-mono text-2xl font-bold tracking-widest text-ink-primary select-all">
                    {req.handoffCode}
                  </div>
                </div>
                <p className="text-[11px] text-ink-secondary">
                  Show this code to the owner when you receive the item.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <button
                onClick={() => setConfirmState({ type: 'CANCEL', request: req })}
                disabled={actionLoadingId === req.id}
                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-tight text-xs font-semibold text-ink-secondary hover:text-red-700 bg-white hover:bg-red-50 border border-brand-secondary/25 hover:border-red-200 transition-colors cursor-pointer disabled:opacity-50 w-full sm:w-auto"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>

              {req.handedOverAt ? (
                <button
                  type="button"
                  onClick={() => setConfirmState({ type: 'MANUAL_RECEIPT_BORROWER', request: req })}
                  disabled={actionLoadingId === req.id}
                  className="inline-flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-tight text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary active:bg-brand-primary transition-colors cursor-pointer disabled:opacity-50 w-full sm:w-auto"
                >
                  {actionLoadingId === req.id ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                  <span>Confirm receipt</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmState({ type: 'MANUAL_RECEIPT_BORROWER', request: req })}
                  disabled={actionLoadingId === req.id}
                  className="text-[11px] font-medium text-brand-secondary hover:text-brand-primary underline cursor-pointer disabled:opacity-50 text-left"
                >
                  Can't use a code? Use manual handover
                </button>
              )}
            </div>
          </div>
        )}

        {req.status === 'ACCEPTED' && req.listing?.type !== 'RENT' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[11px] text-ink-secondary">Meet owner in person to complete exchange.</span>
            <button
              onClick={() => setConfirmState({ type: 'CANCEL', request: req })}
              disabled={actionLoadingId === req.id}
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-tight text-xs font-semibold text-ink-secondary hover:text-red-700 bg-white hover:bg-red-50 border border-brand-secondary/25 hover:border-red-200 transition-colors cursor-pointer disabled:opacity-50 w-full sm:w-auto"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          </div>
        )}

        {(req.status === 'ACTIVE_LEASE' || req.status === 'OVERDUE') && (
          <div className="space-y-2.5">
            <div className="p-3 rounded-control bg-brand-bg border border-brand-secondary/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-brand-primary">Verify Return</span>
                <CountdownBadge req={req} />
              </div>
              <p className="text-[11px] text-ink-secondary">
                Ask the owner for their 6-digit return code at physical return.
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={6}
                  placeholder="000000"
                  value={codeInputs[req.id] || ''}
                  onChange={(e) => handleCodeInputChange(req.id, e.target.value)}
                  disabled={actionLoadingId === req.id}
                  className="w-full sm:w-32 px-3 py-1.5 text-center font-mono text-base sm:text-sm tracking-widest bg-white border border-brand-secondary/30 rounded-tight focus:outline-none focus:ring-1 focus:ring-brand-primary"
                />
                <button
                  onClick={() => handleVerifyCode(req.id, 'verify-return', codeInputs[req.id], 'Return verified successfully. Transaction completed.')}
                  disabled={actionLoadingId === req.id || (codeInputs[req.id] || '').length !== 6}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-tight text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary active:bg-brand-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  {actionLoadingId === req.id ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                  <span>Verify Return</span>
                </button>
              </div>
              {cardFeedback[req.id] && cardFeedback[req.id].isCodeError && cardFeedback[req.id].type === 'error' && (
                <div
                  role="alert"
                  className="flex items-center justify-between text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2.5 py-1.5"
                >
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <span>{cardFeedback[req.id].text}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => clearCardFeedback(req.id)}
                    className="text-ink-secondary hover:text-red-700 p-0.5 cursor-pointer ml-2 shrink-0"
                    aria-label="Dismiss error"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="pt-1 border-t border-brand-secondary/15 flex items-center justify-between flex-wrap gap-1">
                <span className="text-[10px] text-ink-secondary">Can't use a code?</span>
                <button
                  type="button"
                  onClick={() => setConfirmState({ type: 'MANUAL_RETURN_BORROWER', request: req })}
                  disabled={actionLoadingId === req.id}
                  className="text-[11px] font-medium text-brand-secondary hover:text-brand-primary underline cursor-pointer disabled:opacity-50"
                >
                  Use manual return
                </button>
              </div>
            </div>
          </div>
        )}

        {req.status === 'RETURN_PENDING' && (
          <div className="text-xs text-ink-secondary">
            {req.disputed ? (
              <span className="text-amber-800 font-semibold flex items-center gap-1 text-xs">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Disputed. Contact the other party to resolve.</span>
              </span>
            ) : (
              <span className="text-emerald-800 font-semibold flex items-center gap-1 text-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Return declared. Awaiting owner confirmation ({formatAutoCompleteRemaining(req.returnedAt, now, AUTO_COMPLETE_HOURS)}).</span>
              </span>
            )}
          </div>
        )}

        {req.status === 'COMPLETED' && (
          <div className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Transaction completed. Thank you!</span>
          </div>
        )}

        {req.status === 'REJECTED' && (
          <div className="text-right text-xs text-ink-secondary">
            <span>Request declined by owner.</span>
          </div>
        )}

        {req.status === 'CANCELLED' && (
          <div className="text-right text-xs text-ink-secondary">
            <span>You cancelled this request.</span>
          </div>
        )}

        {req.status === 'EXPIRED' && (
          <div className="text-right text-xs text-ink-secondary">
            <span>Request expired.</span>
          </div>
        )}
      </div>
    </div>
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
                      onClick={() => setSelectedCategory(cat.id)}
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
                    className="block w-full pl-8 pr-3 py-1.5 text-base sm:text-xs border border-brand-secondary/25 rounded-lg bg-white text-ink-primary placeholder:text-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-light/30 focus:border-brand-secondary font-medium"
                  />
                </div>
              </div>

              {/* Type Filters */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-[10px] font-semibold text-ink-secondary uppercase tracking-wider">Type:</span>
                <div className="flex items-center gap-1">
                  {TYPE_FILTERS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedType(t.id)}
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
              <div className="bg-white rounded-2xl border border-dashed border-brand-secondary/30 p-10 sm:p-14 text-center">
                <div className="w-10 h-10 rounded-lg bg-brand-primary/5 text-ink-secondary flex items-center justify-center mx-auto mb-3">
                  <PackageOpen className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-ink-primary">No active listings found</h3>
                <p className="text-xs text-ink-secondary max-w-sm mx-auto mt-1">
                  {searchQuery
                    ? 'No items matched your search query. Try broadening your filters.'
                    : 'Be the first to list a calculator, drafting kit, or lab resource for fellow KITSW students.'}
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Create First Listing</span>
                </button>
              </div>
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
                        onClick={() => setIncomingHistoryOpen((prev) => !prev)}
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
                        onClick={() => setOutgoingHistoryOpen((prev) => !prev)}
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

