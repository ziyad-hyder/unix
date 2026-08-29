import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  X, User, Phone, CheckCircle2, AlertCircle, 
  Save, RefreshCw, MessageSquare 
} from 'lucide-react';

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateUserPhone } = useAuth();

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      setPhone(user?.phone || '');
      setErrorMessage('');
      setSuccessMessage('');
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, user, onClose]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanPhone = phone.trim();

    // Basic format validation
    if (cleanPhone && !/^(\+?[0-9\s\-]{7,20})$/.test(cleanPhone)) {
      setErrorMessage('Please enter a valid phone number (e.g. +91 9876543210 or 9876543210).');
      return;
    }

    try {
      setLoading(true);
      await updateUserPhone(cleanPhone || null);
      setSuccessMessage('WhatsApp number updated successfully!');
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update phone number.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-primary/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-lg border border-brand-secondary/25 overflow-hidden relative animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-brand-secondary/15 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-ink-primary">Student Profile</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-brand-primary/5 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form & Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* User Identification Summary */}
          <div className="p-4 rounded-xl bg-brand-bg/70 border border-brand-secondary/20 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-ink-primary">{user.fullName}</p>
                <p className="text-[11px] font-mono text-ink-secondary mt-0.5">{user.email}</p>
              </div>
              {user.verified && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Verified Student
                </span>
              )}
            </div>
            {user.rollNumber && (
              <p className="text-[10px] text-ink-secondary font-mono pt-1 border-t border-brand-secondary/10">
                Roll ID: <span className="font-semibold text-ink-primary uppercase">{user.rollNumber}</span>
              </p>
            )}
          </div>

          {/* Notifications */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* WhatsApp Phone Number */}
          <div>
            <label className="block text-xs font-semibold text-ink-primary mb-1">
              WhatsApp Contact Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-700">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="block w-full pl-9 pr-3 py-2 text-xs border border-brand-secondary/25 rounded-lg bg-brand-bg/60 text-ink-primary placeholder:text-ink-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-light/30 focus:border-brand-secondary transition-colors font-mono font-medium"
              />
            </div>

            {/* Privacy notice banner */}
            <div className="mt-2.5 p-3 rounded-lg bg-brand-primary/5 border border-brand-secondary/15 flex items-start gap-2 text-[11px] text-ink-secondary leading-relaxed">
              <MessageSquare className="w-3.5 h-3.5 shrink-0 text-brand-secondary mt-0.5" />
              <span>
                <strong>Privacy Guaranteed:</strong> Your WhatsApp number is only revealed to another student when a borrow, rent, or trade transaction between you is <strong className="text-emerald-700 font-semibold">ACCEPTED</strong>.
              </span>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-brand-secondary/15 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-semibold text-ink-secondary hover:text-ink-primary hover:bg-brand-primary/5 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary active:bg-brand-primary disabled:opacity-50 transition-colors cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Changes</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
