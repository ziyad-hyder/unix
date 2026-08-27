import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import { 
  X, CheckCircle2, AlertCircle, RefreshCw, Send, User, 
  Edit3, Trash2, ArrowLeft, Save, AlertTriangle 
} from 'lucide-react';

const CATEGORIES = [
  { value: 'CALCULATOR', label: 'Scientific Calculator (fx-991CW / ES)' },
  { value: 'DRAFTING', label: 'Drafting Kit & Mini Drafter' },
  { value: 'ELECTRONICS', label: 'Electronics & Lab Components' },
  { value: 'OTHER', label: 'Other Campus Resources' },
];

const RENTAL_PERIODS = [
  { value: 'DAILY', label: 'Per Day' },
  { value: 'WEEKLY', label: 'Per Week' },
  { value: 'MONTHLY', label: 'Per Month' },
  { value: 'SEMESTER', label: 'Full Semester' },
];

export default function ListingDetailModal({ 
  listing, 
  isOpen, 
  onClose, 
  onListingUpdated,
  isAlreadyRequested = false
}) {
  const { user } = useAuth();

  // Mode: 'VIEW' | 'EDIT' | 'DELETE_CONFIRM'
  const [mode, setMode] = useState('VIEW');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [requestSent, setRequestSent] = useState(isAlreadyRequested);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('CALCULATOR');
  const [editType, setEditType] = useState('SELL');
  const [editPrice, setEditPrice] = useState('');
  const [editRentalRate, setEditRentalRate] = useState('');
  const [editRentalPeriod, setEditRentalPeriod] = useState('SEMESTER');
  const [editDepositAmount, setEditDepositAmount] = useState('');
  const [editSwapPreferences, setEditSwapPreferences] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      setMode('VIEW');
      setErrorMessage('');
      setSuccessMessage('');
      setRequestSent(isAlreadyRequested);

      if (listing) {
        setEditTitle(listing.title || '');
        setEditDescription(listing.description || '');
        setEditCategory(listing.category || 'CALCULATOR');
        setEditType(listing.type || 'SELL');
        setEditPrice(listing.price != null ? String(listing.price) : '');
        setEditRentalRate(listing.rentalRate != null ? String(listing.rentalRate) : '');
        setEditRentalPeriod(listing.rentalPeriod || 'SEMESTER');
        setEditDepositAmount(listing.depositAmount != null ? String(listing.depositAmount) : '');
        setEditSwapPreferences(listing.swapPreferences || '');
      }
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, listing, isAlreadyRequested, onClose]);

  if (!isOpen || !listing) return null;

  const isOwner = user && (user.id === listing.owner?.id || user.email === listing.owner?.email);

  const typeConfig = {
    SELL: { label: 'SELL', ctaText: 'Request to Buy', badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-500' },
    RENT: { label: 'RENT', ctaText: 'Request to Rent', badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80', dot: 'bg-indigo-500' },
    SWAP: { label: 'SWAP', ctaText: 'Request to Swap', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200/80', dot: 'bg-amber-500' },
  }[listing.type] || { label: listing.type, ctaText: 'Request Item', badgeBg: 'bg-slate-50 text-slate-700', dot: 'bg-slate-500' };

  // 1. Transaction Request (Buyer / Borrower)
  const handleCreateRequest = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    try {
      setLoading(true);
      await api.post('/api/transactions', { listingId: listing.id });
      setSuccessMessage('Request sent successfully! The owner will be notified.');
      setRequestSent(true);
      onListingUpdated?.();
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('already have an active')) {
        setRequestSent(true);
        setSuccessMessage('You already have an active pending request for this item.');
      } else {
        setErrorMessage(err.message || 'Failed to submit request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. Edit Listing (Owner)
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const payload = {
      title: editTitle.trim(),
      description: editDescription.trim(),
      category: editCategory,
      type: editType,
    };

    if (editType === 'SELL') {
      if (!editPrice || Number(editPrice) < 0) {
        setErrorMessage('Please provide a valid selling price.');
        return;
      }
      payload.price = parseFloat(editPrice);
    } else if (editType === 'RENT') {
      if (!editRentalRate || Number(editRentalRate) < 0) {
        setErrorMessage('Please provide a valid rental rate.');
        return;
      }
      payload.rentalRate = parseFloat(editRentalRate);
      payload.rentalPeriod = editRentalPeriod;
      if (editDepositAmount && Number(editDepositAmount) >= 0) {
        payload.depositAmount = parseFloat(editDepositAmount);
      }
    } else if (editType === 'SWAP') {
      if (editSwapPreferences.trim()) {
        payload.swapPreferences = editSwapPreferences.trim();
      }
    }

    try {
      setLoading(true);
      await api.put(`/api/listings/${listing.id}`, payload);
      setSuccessMessage('Listing updated successfully!');
      onListingUpdated?.();
      setTimeout(() => {
        setMode('VIEW');
        setSuccessMessage('');
      }, 800);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update listing.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Delete / Close Listing (Owner)
  const handleDeleteListing = async () => {
    setErrorMessage('');
    try {
      setLoading(true);
      await api.delete(`/api/listings/${listing.id}`);
      onListingUpdated?.();
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to delete listing.');
      setLoading(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Recently';
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-slate-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {mode === 'VIEW' ? (
              <>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${typeConfig.badgeBg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${typeConfig.dot}`} />
                  {typeConfig.label}
                </span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
                  {listing.category}
                </span>
              </>
            ) : mode === 'EDIT' ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMode('VIEW')}
                  className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 className="text-sm font-bold text-slate-800">Edit Listing</h3>
              </div>
            ) : (
              <h3 className="text-sm font-bold text-rose-600 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Confirm Deletion</span>
              </h3>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Notifications */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* 1. VIEW MODE */}
        {mode === 'VIEW' && (
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 leading-snug">
                {listing.title}
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                {listing.description}
              </p>
            </div>

            {/* Pricing & Terms */}
            <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-2xs">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Terms & Pricing</h4>
              {listing.type === 'SELL' && (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-slate-900">
                    ₹{listing.price != null ? Number(listing.price).toLocaleString('en-IN') : '0'}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">One-time purchase</span>
                </div>
              )}
              {listing.type === 'RENT' && (
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-indigo-700">
                      ₹{listing.rentalRate != null ? Number(listing.rentalRate).toLocaleString('en-IN') : '0'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      / {listing.rentalPeriod ? listing.rentalPeriod.toLowerCase() : 'period'}
                    </span>
                  </div>
                  {listing.depositAmount != null && Number(listing.depositAmount) > 0 && (
                    <p className="text-xs text-slate-600">
                      Deposit: <span className="font-semibold text-slate-800">₹{Number(listing.depositAmount).toLocaleString('en-IN')}</span> (Refundable on return)
                    </p>
                  )}
                </div>
              )}
              {listing.type === 'SWAP' && (
                <div className="space-y-1">
                  <p className="text-xs text-slate-700 italic bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                    "{listing.swapPreferences || 'Open to relevant peer swaps'}"
                  </p>
                </div>
              )}
            </div>

            {/* Owner Info */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{listing.owner?.fullName || 'Campus Peer'}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{listing.owner?.email}</p>
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-400">
                <p>Listed on</p>
                <p className="font-mono text-slate-600">{formatDate(listing.createdAt)}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100">
              {isOwner ? (
                <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-center">
                  <p className="text-xs font-semibold text-slate-700 mb-2.5">You are the owner of this listing</p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setMode('EDIT')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-brand-600" />
                      <span>Edit Listing</span>
                    </button>
                    <button
                      onClick={() => setMode('DELETE_CONFIRM')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-white hover:bg-rose-50 border border-rose-200 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Delete Listing</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleCreateRequest}
                  disabled={loading || requestSent}
                  className={`w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-2xl text-sm font-semibold transition-all ${
                    requestSent
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 cursor-not-allowed shadow-2xs'
                      : 'text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 shadow-sm cursor-pointer'
                  }`}
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : requestSent ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Request Sent</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>{typeConfig.ctaText}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 2. EDIT MODE */}
        {mode === 'EDIT' && (
          <form onSubmit={handleSaveEdit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Item Title *</label>
              <input
                type="text"
                required
                maxLength={150}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="block w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category *</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Listing Type *</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium cursor-pointer"
                >
                  <option value="RENT">RENT</option>
                  <option value="SELL">SELL</option>
                  <option value="SWAP">SWAP</option>
                </select>
              </div>
            </div>

            {editType === 'SELL' && (
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                <label className="block text-xs font-semibold text-emerald-900 mb-1">Selling Price (₹ INR) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-emerald-200 rounded-xl bg-white text-slate-900 font-mono font-semibold"
                />
              </div>
            )}

            {editType === 'RENT' && (
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-indigo-900 mb-1">Rental Rate (₹ INR) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={editRentalRate}
                      onChange={(e) => setEditRentalRate(e.target.value)}
                      className="block w-full px-3 py-2 text-sm border border-indigo-200 rounded-xl bg-white text-slate-900 font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-indigo-900 mb-1">Period Unit *</label>
                    <select
                      value={editRentalPeriod}
                      onChange={(e) => setEditRentalPeriod(e.target.value)}
                      className="block w-full px-3 py-2 text-sm border border-indigo-200 rounded-xl bg-white text-slate-900 font-medium cursor-pointer"
                    >
                      {RENTAL_PERIODS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-indigo-900 mb-1">Refundable Deposit (₹ INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editDepositAmount}
                    onChange={(e) => setEditDepositAmount(e.target.value)}
                    className="block w-full px-3 py-2 text-sm border border-indigo-200 rounded-xl bg-white text-slate-900 font-mono"
                  />
                </div>
              </div>
            )}

            {editType === 'SWAP' && (
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                <label className="block text-xs font-semibold text-amber-900 mb-1">Swap Preferences</label>
                <input
                  type="text"
                  maxLength={500}
                  value={editSwapPreferences}
                  onChange={(e) => setEditSwapPreferences(e.target.value)}
                  className="block w-full px-3 py-2 text-sm border border-amber-200 rounded-xl bg-white text-slate-900"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description *</label>
              <textarea
                required
                rows={3}
                maxLength={2000}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="block w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 resize-none"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setMode('VIEW')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 shadow-sm transition-all cursor-pointer"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        )}

        {/* 3. DELETE CONFIRMATION MODE */}
        {mode === 'DELETE_CONFIRM' && (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed">
              <p className="font-bold text-sm mb-1 text-rose-900">Are you sure you want to delete this listing?</p>
              This item will be permanently removed from the active campus marketplace.
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setMode('VIEW')}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteListing}
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 shadow-sm transition-all cursor-pointer"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Yes, Delete Listing</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
