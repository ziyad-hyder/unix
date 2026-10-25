import React, { useState, useEffect, useRef } from 'react';
import api from '../api/api';
import { compressImage } from '../utils/imageUtils';
import { X, PlusCircle, AlertCircle, RefreshCw, Image as ImageIcon, Upload, Trash2 } from 'lucide-react';
import useModalA11y from '../hooks/useModalA11y';
import ConfirmDialog from './ConfirmDialog';

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

export default function CreateListingModal({ isOpen, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].value);
  const [type, setType] = useState('RENT');

  // Dynamic pricing fields
  const [price, setPrice] = useState('');
  const [rentalRate, setRentalRate] = useState('');
  const [rentalPeriod, setRentalPeriod] = useState(RENTAL_PERIODS[3].value); // default SEMESTER
  const [depositAmount, setDepositAmount] = useState('');
  const [swapPreferences, setSwapPreferences] = useState('');

  // Image Upload state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const hasUnsavedInput = Boolean(
    title.trim() ||
    description.trim() ||
    price.trim() ||
    rentalRate.trim() ||
    depositAmount.trim() ||
    swapPreferences.trim() ||
    imageFile ||
    category !== CATEGORIES[0].value ||
    type !== 'RENT' ||
    rentalPeriod !== RENTAL_PERIODS[3].value
  );

  const handleRequestClose = () => {
    if (loading || imageLoading) return;
    if (hasUnsavedInput) {
      setShowDiscardConfirm(true);
    } else {
      resetForm();
      onClose();
    }
  };

  const modalRef = useModalA11y(
    isOpen,
    handleRequestClose,
    { closeOnEscape: !loading && !imageLoading }
  );

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory(CATEGORIES[0].value);
    setType('RENT');
    setPrice('');
    setRentalRate('');
    setRentalPeriod(RENTAL_PERIODS[3].value);
    setDepositAmount('');
    setSwapPreferences('');
    setImageFile(null);
    setImagePreview(null);
    setImageLoading(false);
    setErrorMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (JPEG, PNG, WebP).');
      return;
    }
    try {
      setImageLoading(true);
      setErrorMessage('');
      const compressed = await compressImage(file, 800, 0.7);
      setImageFile(compressed.blob);
      setImagePreview(compressed.dataUrl);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to compress image.');
    } finally {
      setImageLoading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Prepare payload according to polymorphic type constraints
    const payload = {
      title: title.trim(),
      description: description.trim(),
      category,
      type,
    };

    if (type === 'SELL') {
      if (!price || Number(price) < 0) {
        setErrorMessage('Please provide a valid selling price.');
        return;
      }
      payload.price = parseFloat(price);
    } else if (type === 'RENT') {
      if (!rentalRate || Number(rentalRate) < 0) {
        setErrorMessage('Please provide a valid rental rate.');
        return;
      }
      if (!rentalPeriod) {
        setErrorMessage('Please select a rental period duration.');
        return;
      }
      payload.rentalRate = parseFloat(rentalRate);
      payload.rentalPeriod = rentalPeriod;
      if (depositAmount && Number(depositAmount) >= 0) {
        payload.depositAmount = parseFloat(depositAmount);
      }
    } else if (type === 'SWAP') {
      if (swapPreferences.trim()) {
        payload.swapPreferences = swapPreferences.trim();
      }
    }

    try {
      setLoading(true);
      const res = await api.post('/api/listings', payload);
      const newListing = res.data?.data;

      // If image is attached, upload to Cloudflare R2
      if (imageFile && newListing?.id) {
        const formData = new FormData();
        formData.append('file', imageFile, 'listing-image.jpg');
        await api.post(`/api/listings/${newListing.id}/image`, formData);
      }

      resetForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create listing. Please check the fields.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !loading && !imageLoading) {
      handleRequestClose();
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
          aria-labelledby="create-listing-title"
          className="bg-white w-full max-w-lg rounded-2xl shadow-lg border border-brand-secondary/25 overflow-hidden relative animate-in fade-in zoom-in-95 duration-150"
        >
          
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-brand-secondary/15 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                <PlusCircle className="w-4 h-4" />
              </div>
              <h2 id="create-listing-title" className="text-base font-bold text-ink-primary">List an Item on UniX</h2>
            </div>
            <button
              type="button"
              onClick={handleRequestClose}
              disabled={loading || imageLoading}
              className="w-10 h-10 rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-brand-primary/5 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-ink-primary mb-1">
              Item Title <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Casio fx-991CW Calculator (1st Year)"
              className="block w-full px-3 py-2 text-base sm:text-xs border border-brand-secondary/25 rounded-lg bg-brand-bg/60 text-ink-primary placeholder:text-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-light/30 focus:border-brand-secondary transition-colors font-medium"
            />
          </div>

          {/* Category & Listing Type Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-primary mb-1">
                Category <span className="text-red-600">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="block w-full px-3 py-2 text-base sm:text-xs border border-brand-secondary/25 rounded-lg bg-brand-bg/60 text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-light/30 focus:border-brand-secondary transition-colors font-medium cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-primary mb-1">
                Listing Type <span className="text-red-600">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="block w-full px-3 py-2 text-base sm:text-xs border border-brand-secondary/25 rounded-lg bg-brand-bg/60 text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-light/30 focus:border-brand-secondary transition-colors font-medium cursor-pointer"
              >
                <option value="RENT">RENT (Lend for duration)</option>
                <option value="SELL">SELL (Outright Purchase)</option>
                <option value="SWAP">SWAP (Item Exchange)</option>
              </select>
            </div>
          </div>

          {/* Dynamic Pricing / Conditions Fields */}
          {type === 'SELL' && (
            <div className="p-3.5 rounded-xl bg-brand-primary/5 border border-brand-primary/15 space-y-2">
              <label className="block text-xs font-semibold text-ink-primary mb-1">
                Selling Price (INR) <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-primary font-bold text-xs">
                  ₹
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="350.00"
                  className="block w-full pl-7 pr-3 py-1.5 text-base sm:text-xs border border-brand-secondary/30 rounded-lg bg-white text-ink-primary placeholder:text-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-light/30 focus:border-brand-secondary transition-colors font-mono font-semibold"
                />
              </div>
            </div>
          )}

          {type === 'RENT' && (
            <div className="p-3.5 rounded-xl bg-brand-secondary/5 border border-brand-secondary/20 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-primary mb-1">
                    Rental Rate (INR) <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-primary font-bold text-xs">
                      ₹
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={rentalRate}
                      onChange={(e) => setRentalRate(e.target.value)}
                      placeholder="100.00"
                      className="block w-full pl-7 pr-3 py-1.5 text-base sm:text-xs border border-brand-secondary/30 rounded-lg bg-white text-ink-primary placeholder:text-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-light/30 focus:border-brand-secondary transition-colors font-mono font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink-primary mb-1">
                    Period Unit <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={rentalPeriod}
                    onChange={(e) => setRentalPeriod(e.target.value)}
                    className="block w-full px-3 py-1.5 text-base sm:text-xs border border-brand-secondary/30 rounded-lg bg-white text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand-light/30 focus:border-brand-secondary transition-colors font-medium cursor-pointer"
                  >
                    {RENTAL_PERIODS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-primary mb-1">
                  Refundable Security Deposit (INR) <span className="text-ink-secondary/70 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-ink-primary font-bold text-xs">
                    ₹
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="400.00"
                    className="block w-full pl-7 pr-3 py-1.5 text-base sm:text-xs border border-brand-secondary/30 rounded-lg bg-white text-ink-primary placeholder:text-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-light/30 focus:border-brand-secondary transition-colors font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {type === 'SWAP' && (
            <div className="p-3.5 rounded-xl bg-brand-accent/15 border border-brand-accent/35 space-y-1.5">
              <label className="block text-xs font-semibold text-ink-primary mb-1">
                What item are you looking to swap for?
              </label>
              <input
                type="text"
                maxLength={500}
                value={swapPreferences}
                onChange={(e) => setSwapPreferences(e.target.value)}
                placeholder="e.g. Seeking Casio fx-991ES or standard Mini-Drafter"
                className="block w-full px-3 py-1.5 text-base sm:text-xs border border-brand-secondary/30 rounded-lg bg-white text-ink-primary placeholder:text-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-light/30 focus:border-brand-secondary transition-colors"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-ink-primary mb-1">
              Item Description & Condition <span className="text-red-600">*</span>
            </label>
            <textarea
              required
              rows={3}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe item condition, inclusions (cases, clips, batteries), and preferred meetup spot on campus..."
              className="block w-full px-3 py-2 text-base sm:text-xs border border-brand-secondary/25 rounded-lg bg-brand-bg/60 text-ink-primary placeholder:text-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-light/30 focus:border-brand-secondary transition-colors resize-none"
            />
          </div>

          {/* Optional Listing Image Picker */}
          <div>
            <label className="block text-xs font-semibold text-ink-primary mb-1">
              Photo of Item <span className="text-ink-secondary/70 font-normal">(optional, single image)</span>
            </label>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="hidden"
              id="listing-image-upload"
            />

            {!imagePreview ? (
              <label
                htmlFor="listing-image-upload"
                className={`flex flex-col items-center justify-center p-4 border border-dashed border-brand-secondary/30 rounded-xl bg-brand-bg/40 hover:bg-brand-primary/5 hover:border-brand-secondary/60 cursor-pointer transition-colors ${
                  imageLoading ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                {imageLoading ? (
                  <div className="flex items-center gap-2 text-xs text-brand-secondary">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Compressing image...</span>
                  </div>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-1.5">
                      <Upload className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-semibold text-ink-primary">Click to attach photo</p>
                    <p className="text-[10px] text-ink-secondary mt-0.5">JPEG, PNG, WebP • Auto-compressed for campus network</p>
                  </>
                )}
              </label>
            ) : (
              <div className="relative rounded-xl border border-brand-secondary/25 overflow-hidden bg-brand-bg/60 p-2 flex items-center gap-3">
                <img
                  src={imagePreview}
                  alt="Listing preview"
                  className="w-16 h-16 object-cover rounded-lg border border-brand-secondary/20 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <p className="text-xs font-semibold text-ink-primary truncate">Image attached</p>
                  </div>
                  <p className="text-[10px] text-ink-secondary mt-0.5">
                    Compressed: {Math.round((imageFile?.size || 0) / 1024)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Remove photo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-brand-secondary/15 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleRequestClose}
              disabled={loading || imageLoading}
              className="px-3.5 py-2 text-xs font-semibold text-ink-secondary hover:text-ink-primary hover:bg-brand-primary/5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading || imageLoading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary active:bg-brand-primary disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                'Publish Listing'
              )}
            </button>
          </div>

        </form>
      </div>
    </div>

    {/* Discard Confirmation Dialog */}
    <ConfirmDialog
      open={showDiscardConfirm}
      title="Discard this listing?"
      message="You have unsaved changes in this listing draft. Are you sure you want to discard them?"
      confirmLabel="Discard"
      cancelLabel="Keep Editing"
      danger={true}
      onConfirm={() => {
        setShowDiscardConfirm(false);
        resetForm();
        onClose();
      }}
      onCancel={() => setShowDiscardConfirm(false)}
    />
  </>
  );
}

