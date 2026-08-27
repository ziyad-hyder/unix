import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import Navbar from '../components/Navbar';
import ListingCard from '../components/ListingCard';
import CreateListingModal from '../components/CreateListingModal';
import ListingDetailModal from '../components/ListingDetailModal';
import { 
  PlusCircle, CheckCircle2, Search, PackageOpen, 
  Layers, ArrowLeftRight, Check, X, Clock, User, AlertCircle, RefreshCw 
} from 'lucide-react';

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

export default function DashboardPage() {
  const { user } = useAuth();

  // Active Tab: 'MARKETPLACE' | 'TRANSACTIONS'
  const [activeTab, setActiveTab] = useState('MARKETPLACE');

  // Marketplace State
  const [listings, setListings] = useState([]);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedListingForDetail, setSelectedListingForDetail] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Transactions State
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  // 1. Fetch Listings
  const fetchListings = useCallback(async () => {
    try {
      setListingsLoading(true);
      const params = { status: 'ACTIVE' };
      if (selectedCategory !== 'ALL') params.category = selectedCategory;
      if (selectedType !== 'ALL') params.type = selectedType;

      const res = await api.get('/api/listings', { params });
      if (res.data?.success && res.data?.data) {
        setListings(res.data.data.content || []);
      }
    } catch (err) {
      console.error('Failed to fetch listings:', err);
    } finally {
      setListingsLoading(false);
    }
  }, [selectedCategory, selectedType]);

  // 2. Fetch My Transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setTransactionsLoading(true);
      const res = await api.get('/api/transactions/me');
      if (res.data?.success && res.data?.data) {
        setIncomingRequests(res.data.data.receivedRequests || []);
        setOutgoingRequests(res.data.data.sentRequests || []);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
    fetchTransactions();
  }, [fetchListings, fetchTransactions]);

  // 3. Handle Status Update (Accept / Reject)
  const handleUpdateStatus = async (transactionId, newStatus) => {
    setActionLoadingId(transactionId);
    setActionMessage(null);

    try {
      await api.patch(`/api/transactions/${transactionId}/status`, { status: newStatus });
      setActionMessage({
        type: 'success',
        text: newStatus === 'ACCEPTED' ? 'Request accepted. Listing is now reserved.' : 'Request rejected.',
      });
      // Refresh both listings and transactions
      fetchTransactions();
      fetchListings();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: err.message || 'Failed to update request status.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Pre-calculated requested listing IDs
  const requestedListingIds = new Set(
    outgoingRequests
      .filter((r) => r.status === 'PENDING' || r.status === 'ACCEPTED')
      .map((r) => r.listing?.id)
  );

  const pendingIncomingCount = incomingRequests.filter((r) => r.status === 'PENDING').length;

  const filteredListings = listings.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.title?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
  });

  const formatDate = (isoString) => {
    if (!isoString) return 'Recently';
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7">
        
        {/* Top Hero / Header Section */}
        <div className="py-4 border-b border-brand-secondary/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-brand-secondary">
                KITSW Campus Marketplace
              </span>
              {user?.verified && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Verified
                </span>
              )}
            </div>

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
        <div className="mt-6 flex items-center gap-2 border-b border-brand-secondary/20 pb-3">
          <button
            onClick={() => setActiveTab('MARKETPLACE')}
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
              setActiveTab('TRANSACTIONS');
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
            {pendingIncomingCount > 0 && (
              <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-brand-accent text-white">
                {pendingIncomingCount}
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
                    className="block w-full pl-8 pr-3 py-1.5 text-xs border border-brand-secondary/25 rounded-lg bg-white text-ink-primary placeholder:text-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-light/30 focus:border-brand-secondary font-medium"
                  />
                </div>
              </div>

              {/* Type Filters */}
              <div className="flex items-center gap-2 pt-1">
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

            {/* Listings Grid */}
            {listingsLoading ? (
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredListings.map((item) => (
                  <ListingCard
                    key={item.id}
                    listing={item}
                    onClick={() => setSelectedListingForDetail(item)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MY TRANSACTIONS HUB */}
        {/* ========================================================================= */}
        {activeTab === 'TRANSACTIONS' && (
          <div className="mt-6 space-y-7">
            
            {/* Status Alert Banner */}
            {actionMessage && (
              <div
                className={`p-3.5 rounded-lg border text-xs flex items-center justify-between ${
                  actionMessage.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <span>{actionMessage.text}</span>
                <button
                  onClick={() => setActionMessage(null)}
                  className="text-xs font-semibold underline opacity-70 hover:opacity-100 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Section 1: Incoming Requests (Action Required) */}
            <div>
              <div className="flex items-center justify-between mb-3">
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
                  className="inline-flex items-center gap-1.5 text-xs text-brand-secondary hover:text-brand-primary font-semibold cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              {transactionsLoading ? (
                <div className="p-8 text-center text-xs text-ink-secondary">Loading requests...</div>
              ) : incomingRequests.length === 0 ? (
                <div className="bg-white rounded-xl border border-brand-secondary/20 p-7 text-center">
                  <p className="text-xs font-medium text-ink-secondary">No incoming requests yet for your listings.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-white rounded-xl border border-brand-secondary/20 p-4 flex flex-col justify-between space-y-3"
                    >
                      <div>
                        {/* Top: Item Title & Status Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-semibold text-ink-secondary uppercase tracking-wider bg-brand-primary/5 px-2 py-0.5 rounded mr-2">
                              {req.listing?.type}
                            </span>
                            <h3 className="font-bold text-ink-primary text-xs inline">
                              {req.listing?.title}
                            </h3>
                          </div>

                          <span
                            className={`inline-flex items-center px-2 py-0.2 rounded-full text-[11px] font-bold ${
                              req.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : req.status === 'ACCEPTED'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>

                        {/* Requester Info */}
                        <div className="mt-3 p-2.5 rounded-lg bg-brand-bg/60 border border-brand-secondary/15 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-[10px]">
                              <User className="w-3 h-3" />
                            </div>
                            <div>
                              <p className="font-semibold text-ink-primary text-xs">{req.requester?.fullName || 'Student'}</p>
                              <p className="font-mono text-[10px] text-ink-secondary">{req.requester?.email}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-ink-secondary font-mono">
                            {formatDate(req.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons for Listing Owner */}
                      {req.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-brand-secondary/15">
                          <button
                            onClick={() => handleUpdateStatus(req.id, 'REJECTED')}
                            disabled={actionLoadingId === req.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>

                          <button
                            onClick={() => handleUpdateStatus(req.id, 'ACCEPTED')}
                            disabled={actionLoadingId === req.id}
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary active:bg-brand-primary transition-colors cursor-pointer"
                          >
                            {actionLoadingId === req.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            <span>Accept Request</span>
                          </button>
                        </div>
                      ) : (
                        <div className="text-right text-xs font-medium text-ink-secondary pt-2 border-t border-brand-secondary/15">
                          {req.status === 'ACCEPTED' ? (
                            <span className="text-emerald-800 font-semibold">Accepted - Connect at {req.requester?.email}</span>
                          ) : (
                            <span className="text-red-700">Declined</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: My Outgoing Requests */}
            <div className="pt-5 border-t border-brand-secondary/20">
              <h2 className="text-base font-bold text-ink-primary mb-1">
                My Outgoing Requests <span className="text-ink-secondary/70 font-normal">({outgoingRequests.length})</span>
              </h2>
              <p className="text-xs text-ink-secondary mb-3">
                Track requests you have made for other students' items.
              </p>

              {outgoingRequests.length === 0 ? (
                <div className="bg-white rounded-xl border border-brand-secondary/20 p-7 text-center">
                  <p className="text-xs font-medium text-ink-secondary">You have not requested any items yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-white rounded-xl border border-brand-secondary/20 p-4 flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-semibold text-ink-secondary uppercase tracking-wider bg-brand-primary/5 px-2 py-0.5 rounded mr-2">
                            {req.listing?.type}
                          </span>
                          <h3 className="font-bold text-ink-primary text-xs inline">
                            {req.listing?.title}
                          </h3>
                        </div>

                        <span
                          className={`inline-flex items-center px-2 py-0.2 rounded-full text-[11px] font-bold ${
                            req.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : req.status === 'ACCEPTED'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {req.status === 'PENDING' ? 'Waiting on Owner' : req.status}
                        </span>
                      </div>

                      {/* Owner contact details */}
                      <div className="p-2.5 rounded-lg bg-brand-bg/60 border border-brand-secondary/15 text-xs flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-ink-secondary">Listing Owner</p>
                          <p className="font-mono text-xs font-semibold text-ink-primary">{req.listing?.owner?.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-ink-secondary">Requested</p>
                          <p className="font-mono text-xs text-ink-secondary">{formatDate(req.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* Create Listing Modal */}
      <CreateListingModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchListings();
          fetchTransactions();
        }}
      />

      {/* Listing Detail & Request Modal */}
      <ListingDetailModal
        listing={selectedListingForDetail}
        isOpen={!!selectedListingForDetail}
        isAlreadyRequested={selectedListingForDetail ? requestedListingIds.has(selectedListingForDetail.id) : false}
        onClose={() => setSelectedListingForDetail(null)}
        onListingUpdated={() => {
          fetchListings();
          fetchTransactions();
        }}
      />
    </div>
  );
}

