import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import useModalA11y from '../hooks/useModalA11y';
import ConfirmDialog from './ConfirmDialog';
import { 
  X, CheckCircle2, AlertCircle, RefreshCw, Send, User, 
  Edit3, Trash2, ArrowLeft, Save, AlertTriangle, Clock 
} from 'lucide-react';
import { getFriendlyErrorMessage } from '../utils/errors';
import { formatDateTime, formatDuration } from '../utils/time';
import { AUTO_START_HOURS, FREEZE_AFTER_OVERDUE_HOURS } from '../utils/policy';
import { categoryLabel, typeLabel, typeActionLabel, rentalPeriodLabel, formatPrice } from '../utils/labels';

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
  isAlreadyRequested = false,
  onRequestAddPhone,
}) {
  const { user } = useAuth();

  // Mode: 'VIEW' | 'EDIT'
  const [mode, setMode] = useState('VIEW');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [requestSent, setRequestSent] = useState(isAlreadyRequested);
  const [isAccountFrozen, setIsAccountFrozen] = useState(false);
  const [isPhoneRequired, setIsPhoneRequired] = useState(false);

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

  const modalRef = useModalA11y(isOpen, onClose, { closeOnEscape: !loading });

  // Reset effect: depends ONLY on [isOpen, listing?.id]
  useEffect(() => {
    if (isOpen) {
      setMode('VIEW');
      setShowDeleteConfirm(false);
      setErrorMessage('');
      setSuccessMessage('');
      setRequestSent(isAlreadyRequested);
      setIsAccountFrozen(false);
      setIsPhoneRequired(false);

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
  }, [isOpen, listing?.id]);

  if (!isOpen || !listing) return null;

  const isOwner = user && (user.id === listing.owner?.id || user.email === listing.owner?.email);

  const typeConfig = {
    SELL: { 
      label: typeLabel('SELL'), 
      ctaText: typeActionLabel('SELL'), 
      badgeBg: 'bg-brand-primary/10 text-brand-primary border-brand-primary/20', 
      dot: 'bg-brand-primary' 
    },
    RENT: { 
      label: typeLabel('RENT'), 
      ctaText: typeActionLabel('RENT'), 
      badgeBg: 'bg-brand-secondary/15 text-brand-primary border-brand-secondary/30', 
      dot: 'bg-brand-secondary' 
    },
    SWAP: { 
      label: typeLabel('SWAP'), 
      ctaText: typeActionLabel('SWAP'), 
      badgeBg: 'bg-brand-accent/25 text-brand-primary border-brand-accent/45', 
      dot: 'bg-brand-accent' 
    },
  }[listing.type] || { 
    label: typeLabel(listing.type), 
    ctaText: typeActionLabel(listing.type), 
    badgeBg: 'bg-brand-primary/5 text-ink-primary border-brand-secondary/20', 
    dot: 'bg-brand-secondary' 
  };

  // 1. Transaction Request (Buyer / Borrower)
  const handleCreateRequest = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    try {
      setLoading(true);
      setIsPhoneRequired(false);
      await api.post('/api/transactions', { listingId: listing.id });
      setSuccessMessage('Request sent successfully! The owner will be notified.');
      setRequestSent(true);
      onListingUpdated?.();
    } catch (err) {
      const isPhoneReq =
        err.errorCode?.includes('PHONE_REQUIRED') ||
        (err.message && err.message.toLowerCase().includes('phone number is required'));

      if (isPhoneReq) {
        setIsPhoneRequired(true);
        setErrorMessage(getFriendlyErrorMessage(err, 'A phone number is required on your profile before requesting or accepting transactions.'));
      } else if (err.errorCode === 'ACCOUNT_FROZEN' || (err.message && err.message.toLowerCase().includes('frozen'))) {
        setIsAccountFrozen(true);
        setErrorMessage(getFriendlyErrorMessage(err, 'Your account is frozen due to overdue rentals. You cannot create new requests.'));
      } else if (err.message && err.message.toLowerCase().includes('already have an active')) {
        setRequestSent(true);
        setSuccessMessage('You already have an active pending request for this item.');
      } else {
        setErrorMessage(getFriendlyErrorMessage(err, 'Failed to submit request. Please try again.'));
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
      setMode('VIEW');
      onListingUpdated?.();
    } catch (err) {
      setErrorMessage(getFriendlyErrorMessage(err, 'Failed to update listing.'));
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = () => {
    setErrorMessage('');
    setSuccessMessage('');
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
    setMode('EDIT');
  };

  // 3. Delete / Close Listing (Owner)
  const handleDeleteListing = async () => {
    setErrorMessage('');
    try {
      setLoading(true);
      await api.delete(`/api/listings/${listing.id}`);
      setShowDeleteConfirm(false);
      onListingUpdated?.();
      onClose();
    } catch (err) {
      setShowDeleteConfirm(false);
      setErrorMessage(getFriendlyErrorMessage(err, 'Failed to delete listing.'));
      setLoading(false);
    }
  };



  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  return (
    <>
      <div
        onClick={handleBackdropClick}
        className="fixed inset-0 z-50 overflow-y-auto bg-brand-primary/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
      >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="listing-detail-title"
        className="bg-white w-full max-w-lg rounded-2xl shadow-lg border border-brand-secondary/25 overflow-hidden relative animate-in fade-in zoom-in-95 duration-150"
      >
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-brand-secondary/15 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {mode === 'VIEW' ? (
              <>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide border ${typeConfig.badgeBg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${typeConfig.dot}`} />
                  {typeConfig.label}
                </span>
                <span className="text-[10px] font-semibold text-ink-secondary uppercase tracking-wider bg-brand-primary/5 px-2 py-0.5 rounded">
                  {categoryLabel(listing.category)}
                </span>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMode('VIEW')}
                  className="text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h3 id="listing-detail-title" className="text-sm font-bold text-ink-primary">Edit Listing</h3>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            disabled={loading}
            className="w-10 h-10 rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-brand-primary/5 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Notifications */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
            {isPhoneRequired && onRequestAddPhone && (
              <button
                type="button"
                onClick={onRequestAddPhone}
                className="shrink-0 self-start sm:self-center px-2.5 py-1.5 rounded-lg bg-brand-primary text-white text-xs font-semibold hover:bg-brand-secondary transition-colors cursor-pointer"
              >
                Add WhatsApp number
              </button>
            )}
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* 1. VIEW MODE */}
        {mode === 'VIEW' && (
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {listing.imageUrl && (
              <div className="rounded-xl overflow-hidden border border-brand-secondary/20 bg-brand-bg/60 max-h-56">
                <img
                  src={listing.imageUrl}
                  alt={listing.title}
                  className="w-full h-full max-h-56 object-cover"
                />
              </div>
            )}

            <div>
              <h2 id="listing-detail-title" className="text-lg font-bold text-ink-primary leading-snug">
                {listing.title}
              </h2>
              <p className="mt-2.5 text-xs text-ink-primary leading-relaxed whitespace-pre-line bg-brand-bg/60 p-3.5 rounded-xl border border-brand-secondary/15">
                {listing.description}
              </p>
            </div>

            {/* Pricing & Terms */}
            <div className="p-3.5 rounded-xl border border-brand-secondary/20 bg-white">
              <h4 className="text-[10px] font-bold text-ink-secondary/70 uppercase tracking-wider mb-1.5">Terms & Pricing</h4>
              {listing.type === 'SELL' && (
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-ink-primary">
                    {formatPrice(listing.price)}
                  </span>
                  <span className="text-xs text-ink-secondary font-medium">One-time purchase</span>
                </div>
              )}
              {listing.type === 'RENT' && (
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-ink-primary">
                      {formatPrice(listing.rentalRate)}
                    </span>
                    {listing.rentalPeriod && listing.rentalRate != null && String(listing.rentalRate).trim() !== '' && (
                      <span className="text-xs text-ink-secondary font-medium">
                        {rentalPeriodLabel(listing.rentalPeriod)}
                      </span>
                    )}
                  </div>
                  {listing.depositAmount != null && Number(listing.depositAmount) > 0 && (
                    <p className="text-xs text-ink-secondary">
                      Deposit: <span className="font-semibold text-ink-primary">₹{Number(listing.depositAmount).toLocaleString('en-IN')}</span> (Refundable on return)
                    </p>
                  )}
                </div>
              )}
              {listing.type === 'SWAP' && (
                <div className="space-y-1">
                  <p className="text-xs text-ink-primary italic bg-brand-accent/15 p-2.5 rounded-lg border border-brand-accent/30">
                    "{listing.swapPreferences || 'Open to relevant peer swaps'}"
                  </p>
                </div>
              )}
            </div>

            {/* Owner Info */}
            <div className="p-3.5 rounded-xl bg-brand-bg/60 border border-brand-secondary/15 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div>
                  <p className="font-semibold text-ink-primary">{listing.owner?.fullName || 'Campus Peer'}</p>
                  <p className="text-[11px] text-ink-secondary/70 font-mono">{listing.owner?.email}</p>
                </div>
              </div>
              <div className="text-right text-[11px] text-ink-secondary/70">
                <p>Listed</p>
                <p className="font-mono text-ink-secondary">{formatDateTime(listing.createdAt)}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-brand-secondary/15">
              {isOwner ? (
                <div className="p-3 rounded-xl bg-brand-bg/60 border border-brand-secondary/20 text-center">
                  <p className="text-xs font-semibold text-ink-secondary mb-2">You are the owner of this listing</p>
                  <div className="flex items-center justify-center gap-2.5">
                    <button
                      onClick={handleStartEdit}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-ink-primary bg-white hover:bg-brand-primary/5 border border-brand-secondary/25 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-brand-secondary" />
                      <span>Edit Listing</span>
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-white hover:bg-red-50 border border-red-200 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      <span>Delete Listing</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Rental terms and consequences notice */}
                  {listing.type === 'RENT' && (
                    <div className="p-3.5 rounded-control bg-brand-bg border border-brand-secondary/25 text-xs text-ink-primary space-y-1.5 text-left">
                      <div className="flex items-center gap-1.5 font-semibold text-brand-primary">
                        <Clock className="w-3.5 h-3.5 text-brand-secondary" />
                        <span>Rental Terms and Due Date Policy</span>
                      </div>
                      <p className="text-[11px] text-ink-secondary leading-relaxed">
                        The lease clock starts when you confirm physical receipt of the item (or automatically after {formatDuration(AUTO_START_HOURS * 3600 * 1000)} of handover). The item must be returned within the {listing.rentalPeriod ? listing.rentalPeriod.toLowerCase() : 'agreed'} period.
                      </p>
                      <div className="pt-1.5 border-t border-brand-secondary/15 text-[11px] text-ink-secondary leading-relaxed">
                        <span className="font-semibold text-red-700">Important:</span> Items overdue by more than {formatDuration(FREEZE_AFTER_OVERDUE_HOURS * 3600 * 1000)} will freeze your account, which blocks new requests until the item is returned.
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleCreateRequest}
                    disabled={loading || requestSent || isAccountFrozen}
                    className={`w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors ${
                      isAccountFrozen
                        ? 'bg-red-50 text-red-700 border border-red-300 cursor-not-allowed'
                        : requestSent
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 cursor-not-allowed'
                        : 'text-white bg-brand-primary hover:bg-brand-secondary active:bg-brand-primary cursor-pointer'
                    }`}
                  >
                    {loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : isAccountFrozen ? (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                        <span>Account Frozen</span>
                      </>
                    ) : requestSent ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Request Sent</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>{typeConfig.ctaText}</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. EDIT MODE */}
        {mode === 'EDIT' && (
          <form onSubmit={handleSaveEdit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            <div>
              <label className="block text-xs font-semibold text-ink-primary mb-1">Item Title <span className="text-red-600">*</span></label>
              <input
                type="text"
                required
                maxLength={150}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="block w-full px-3 py-2 text-base sm:text-xs border border-brand-secondary/25 rounded-lg bg-brand-bg/60 text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-light/30 focus:border-brand-secondary font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-primary mb-1">Category <span className="text-red-600">*</span></label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="block w-full px-3 py-2 text-base sm:text-xs border border-brand-secondary/25 rounded-lg bg-brand-bg/60 text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-light/30 focus:border-brand-secondary font-medium cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-primary mb-1">Listing Type <span className="text-red-600">*</span></label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="block w-full px-3 py-2 text-base sm:text-xs border border-brand-secondary/25 rounded-lg bg-brand-bg/60 text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-light/30 focus:border-brand-secondary font-medium cursor-pointer"
                >
                  <option value="RENT">Rent</option>
                  <option value="SELL">Buy</option>
                  <option value="SWAP">Swap</option>
                </select>
              </div>
            </div>

            {editType === 'SELL' && (
              <div className="p-3.5 rounded-xl bg-brand-primary/5 border border-brand-primary/15">
                <label className="block text-xs font-semibold text-ink-primary mb-1">Selling Price (INR) <span className="text-red-600">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="block w-full px-3 py-1.5 text-base sm:text-xs border border-brand-secondary/30 rounded-lg bg-white text-ink-primary font-mono font-semibold"
                />
              </div>
            )}

            {editType === 'RENT' && (
              <div className="p-3.5 rounded-xl bg-brand-secondary/5 border border-brand-secondary/20 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-ink-primary mb-1">Rental Rate (INR) <span className="text-red-600">*</span></label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={editRentalRate}
                      onChange={(e) => setEditRentalRate(e.target.value)}
                      className="block w-full px-3 py-1.5 text-base sm:text-xs border border-brand-secondary/30 rounded-lg bg-white text-ink-primary font-mono font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-primary mb-1">Period Unit <span className="text-red-600">*</span></label>
                    <select
                      value={editRentalPeriod}
                      onChange={(e) => setEditRentalPeriod(e.target.value)}
                      className="block w-full px-3 py-1.5 text-base sm:text-xs border border-brand-secondary/30 rounded-lg bg-white text-ink-primary font-medium cursor-pointer"
                    >
                      {RENTAL_PERIODS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-primary mb-1">Refundable Deposit (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editDepositAmount}
                    onChange={(e) => setEditDepositAmount(e.target.value)}
                    className="block w-full px-3 py-1.5 text-base sm:text-xs border border-brand-secondary/30 rounded-lg bg-white text-ink-primary font-mono"
                  />
                </div>
              </div>
            )}

            {editType === 'SWAP' && (
              <div className="p-3.5 rounded-xl bg-brand-accent/15 border border-brand-accent/35">
                <label className="block text-xs font-semibold text-ink-primary mb-1">Swap Preferences</label>
                <input
                  type="text"
                  maxLength={500}
                  value={editSwapPreferences}
                  onChange={(e) => setEditSwapPreferences(e.target.value)}
                  className="block w-full px-3 py-1.5 text-base sm:text-xs border border-brand-secondary/30 rounded-lg bg-white text-ink-primary"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-ink-primary mb-1">Description <span className="text-red-600">*</span></label>
              <textarea
                required
                rows={3}
                maxLength={2000}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="block w-full px-3 py-2 text-base sm:text-xs border border-brand-secondary/25 rounded-lg bg-brand-bg/60 text-ink-primary resize-none"
              />
            </div>

            <div className="pt-3 border-t border-brand-secondary/15 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setMode('VIEW')}
                className="px-3.5 py-2 text-xs font-semibold text-ink-secondary hover:bg-brand-primary/5 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary active:bg-brand-primary transition-colors cursor-pointer"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>

    {/* Delete Listing Confirmation Dialog */}
    <ConfirmDialog
      open={showDeleteConfirm}
      title="Delete this listing?"
      message="This listing will be closed and removed from the active marketplace. Any pending requests will be automatically declined. Listings with an accepted or ongoing request cannot be deleted."
      confirmLabel="Delete Listing"
      cancelLabel="Cancel"
      danger={true}
      loading={loading}
      onConfirm={handleDeleteListing}
      onCancel={() => setShowDeleteConfirm(false)}
    />
  </>
  );
}

