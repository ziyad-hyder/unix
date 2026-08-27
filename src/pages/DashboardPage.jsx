import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import Navbar from '../components/Navbar';
import ListingCard from '../components/ListingCard';
import CreateListingModal from '../components/CreateListingModal';
import ListingDetailModal from '../components/ListingDetailModal';
import { 
  PlusCircle, Sparkles, CheckCircle2, Search, PackageOpen, 
  Layers, ArrowLeftRight, Check, X, Clock, User, Mail, AlertCircle, RefreshCw 
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
        text: newStatus === 'ACCEPTED' ? 'Request accepted! Listing is now reserved.' : 'Request rejected.',
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Top Hero Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200/60 text-brand-700 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>KITSW Campus Marketplace</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Welcome to <span className="text-brand-600">UniX</span>
            </h1>

            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Share, rent, and swap calculators, drafting kits, and campus equipment directly with your peers.
            </p>

            {user && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Signed in as:</span>
                <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                  {user.email}
                </span>
                {user.verified && (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified Student
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 shadow-sm shadow-brand-500/20 hover:shadow-md transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>List Your Item</span>
            </button>
          </div>
        </div>

        {/* Global Navigation Tabs: Marketplace vs My Transactions */}
        <div className="mt-8 flex items-center gap-3 border-b border-slate-200/80 pb-4">
          <button
            onClick={() => setActiveTab('MARKETPLACE')}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'MARKETPLACE'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Marketplace Feed</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('TRANSACTIONS');
              fetchTransactions();
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'TRANSACTIONS'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            <span>My Transactions</span>
            {pendingIncomingCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-500 text-white shadow-2xs">
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
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  {CATEGORY_FILTERS.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        selectedCategory === cat.id
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Search Input */}
                <div className="relative w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search resources..."
                    className="block w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
                  />
                </div>
              </div>

              {/* Type Pills */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Type:</span>
                <div className="flex items-center gap-1">
                  {TYPE_FILTERS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedType(t.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        selectedType === t.id
                          ? 'bg-brand-50 text-brand-700 border border-brand-200 font-semibold'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-white'
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs animate-pulse space-y-4">
                    <div className="flex justify-between">
                      <div className="w-16 h-5 bg-slate-100 rounded-full" />
                      <div className="w-20 h-5 bg-slate-100 rounded-md" />
                    </div>
                    <div className="w-3/4 h-5 bg-slate-200 rounded-md" />
                    <div className="space-y-1.5">
                      <div className="w-full h-3 bg-slate-100 rounded" />
                      <div className="w-5/6 h-3 bg-slate-100 rounded" />
                    </div>
                    <div className="w-1/3 h-6 bg-slate-200 rounded pt-2" />
                  </div>
                ))}
              </div>
            ) : filteredListings.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-10 sm:p-16 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <PackageOpen className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">No active listings found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1.5">
                  {searchQuery
                    ? 'No items matched your search query. Try broadening your filters.'
                    : 'Be the first to list a calculator, drafting kit, or lab resource for fellow KITSW students!'}
                </p>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-all cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Create First Listing</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
          <div className="mt-6 space-y-8">
            
            {/* Status Alert Banner */}
            {actionMessage && (
              <div
                className={`p-4 rounded-2xl border text-xs flex items-center justify-between ${
                  actionMessage.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <span>{actionMessage.text}</span>
                <button
                  onClick={() => setActionMessage(null)}
                  className="text-xs font-semibold underline opacity-70 hover:opacity-100"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Section 1: Incoming Requests (Action Required) */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Incoming Requests <span className="text-slate-400 font-normal">({incomingRequests.length})</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Students requesting to buy, rent, or swap your listed items.
                  </p>
                </div>
                <button
                  onClick={fetchTransactions}
                  className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-semibold cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              {transactionsLoading ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading requests...</div>
              ) : incomingRequests.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center">
                  <p className="text-xs font-medium text-slate-500">No incoming requests yet for your listings.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {incomingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between space-y-4"
                    >
                      <div>
                        {/* Top: Item Title & Status Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md mr-2">
                              {req.listing?.type}
                            </span>
                            <h3 className="font-bold text-slate-900 text-sm inline">
                              {req.listing?.title}
                            </h3>
                          </div>

                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              req.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : req.status === 'ACCEPTED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>

                        {/* Requester Info */}
                        <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-[11px]">
                              <User className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{req.requester?.fullName || 'Student'}</p>
                              <p className="font-mono text-[11px] text-slate-500">{req.requester?.email}</p>
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {formatDate(req.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons for Listing Owner */}
                      {req.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => handleUpdateStatus(req.id, 'REJECTED')}
                            disabled={actionLoadingId === req.id}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>

                          <button
                            onClick={() => handleUpdateStatus(req.id, 'ACCEPTED')}
                            disabled={actionLoadingId === req.id}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-2xs transition-all cursor-pointer"
                          >
                            {actionLoadingId === req.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Accept Request</span>
                          </button>
                        </div>
                      ) : (
                        <div className="text-right text-xs font-medium text-slate-400 pt-2 border-t border-slate-100">
                          {req.status === 'ACCEPTED' ? (
                            <span className="text-emerald-700 font-semibold">Accepted - Connect with requester at {req.requester?.email}</span>
                          ) : (
                            <span className="text-rose-600">Declined</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: My Outgoing Requests */}
            <div className="pt-6 border-t border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                My Outgoing Requests <span className="text-slate-400 font-normal">({outgoingRequests.length})</span>
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Track requests you have made for other students' items.
              </p>

              {outgoingRequests.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center">
                  <p className="text-xs font-medium text-slate-500">You haven't requested any items yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {outgoingRequests.map((req) => (
                    <div
                      key={req.id}
                      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md mr-2">
                            {req.listing?.type}
                          </span>
                          <h3 className="font-bold text-slate-900 text-sm inline">
                            {req.listing?.title}
                          </h3>
                        </div>

                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            req.status === 'PENDING'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : req.status === 'ACCEPTED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {req.status === 'PENDING' ? 'Waiting on Owner' : req.status}
                        </span>
                      </div>

                      {/* Owner contact details */}
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between">
                        <div>
                          <p className="text-[11px] text-slate-400">Listing Owner</p>
                          <p className="font-mono text-xs font-semibold text-slate-800">{req.listing?.owner?.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-slate-400">Requested</p>
                          <p className="font-mono text-xs text-slate-600">{formatDate(req.createdAt)}</p>
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
