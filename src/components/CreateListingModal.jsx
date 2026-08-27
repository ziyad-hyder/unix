import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { X, PlusCircle, AlertCircle, RefreshCw, IndianRupee, Layers } from 'lucide-react';

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

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
    setErrorMessage('');
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
      await api.post('/api/listings', payload);
      resetForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to create listing. Please check the fields.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-slate-200 overflow-hidden relative animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">List an Item on UniX</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Item Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Casio fx-991CW Calculator (1st Year)"
              className="block w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium"
            />
          </div>

          {/* Category & Listing Type Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="block w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Listing Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="block w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all font-medium cursor-pointer"
              >
                <option value="RENT">RENT (Lend for duration)</option>
                <option value="SELL">SELL (Outright Purchase)</option>
                <option value="SWAP">SWAP (Item Exchange)</option>
              </select>
            </div>
          </div>

          {/* Dynamic Pricing / Conditions Fields */}
          {type === 'SELL' && (
            <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-3">
              <label className="block text-xs font-semibold text-emerald-900 mb-1">
                Selling Price (₹ INR) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-600 font-bold">
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
                  className="block w-full pl-8 pr-3 py-2 text-sm border border-emerald-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-mono font-semibold"
                />
              </div>
            </div>
          )}

          {type === 'RENT' && (
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-indigo-900 mb-1">
                    Rental Rate (₹ INR) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-600 font-bold">
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
                      className="block w-full pl-8 pr-3 py-2 text-sm border border-indigo-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono font-semibold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-indigo-900 mb-1">
                    Period Unit <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={rentalPeriod}
                    onChange={(e) => setRentalPeriod(e.target.value)}
                    className="block w-full px-3 py-2 text-sm border border-indigo-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium cursor-pointer"
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
                <label className="block text-xs font-semibold text-indigo-900 mb-1">
                  Refundable Security Deposit (₹ INR) <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-600 font-bold">
                    ₹
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="400.00"
                    className="block w-full pl-8 pr-3 py-2 text-sm border border-indigo-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {type === 'SWAP' && (
            <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-2">
              <label className="block text-xs font-semibold text-amber-900 mb-1">
                What item are you looking to swap for?
              </label>
              <input
                type="text"
                maxLength={500}
                value={swapPreferences}
                onChange={(e) => setSwapPreferences(e.target.value)}
                placeholder="e.g. Seeking Casio fx-991ES or standard Mini-Drafter"
                className="block w-full px-3 py-2 text-sm border border-amber-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Item Description & Condition <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe item condition, inclusions (cases, clips, batteries), and preferred meetup spot on campus..."
              className="block w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 shadow-sm transition-all"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                'Publish Listing'
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
