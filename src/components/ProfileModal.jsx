import React, { useState, useEffect, useCallback, useRef, useId } from 'react';
import { useAuth } from '../context/AuthContext';
import useModalA11y from '../hooks/useModalA11y';
import { 
  X, User, Phone, CheckCircle2, AlertCircle, 
  Save, RefreshCw, MessageSquare, Bell, BellRing 
} from 'lucide-react';
import { 
  getPushSubscriptionStatus, 
  subscribeToPush, 
  unsubscribeFromPush,
  sendTestPush 
} from '../utils/push';
import { normalizePhone } from '../utils/phone';
import { getFriendlyErrorMessage } from '../utils/errors';

export default function ProfileModal({ isOpen, onClose, onSuccess }) {
  const { user, updateUserPhone } = useAuth();
  const id = useId();
  const phoneInputId = `${id}-phone`;
  const phoneHelpId = `${id}-phone-help`;

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Push notifications state
  const [pushStatus, setPushStatus] = useState({
    loading: true,
    supported: false,
    subscribed: false,
    permission: 'default',
    details: null,
  });
  const [pushActionLoading, setPushActionLoading] = useState(false);
  const [pushMessage, setPushMessage] = useState(null);

  const checkPush = useCallback(async () => {
    try {
      const status = await getPushSubscriptionStatus();
      setPushStatus({
        loading: false,
        supported: status.supported,
        subscribed: status.subscribed,
        permission: status.permission,
        details: status.details,
      });
    } catch {
      setPushStatus((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const checkPushRef = useRef(checkPush);
  useEffect(() => {
    checkPushRef.current = checkPush;
  }, [checkPush]);

  const prevIsOpenRef = useRef(false);
  const modalRef = useModalA11y(isOpen, onClose, { closeOnEscape: !loading && !pushActionLoading });

  // Seed phone and clear messages ONLY when isOpen flips false -> true
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setPhone(userRef.current?.phone || '');
      setErrorMessage('');
      setSuccessMessage('');
      setPushMessage(null);
      checkPushRef.current?.();
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const handleTogglePush = async () => {
    setPushMessage(null);
    setPushActionLoading(true);
    try {
      if (pushStatus.subscribed) {
        await unsubscribeFromPush();
        setPushMessage({ type: 'success', text: 'Notifications disabled on this device.' });
      } else {
        await subscribeToPush();
        setPushMessage({ type: 'success', text: 'Notifications enabled successfully!' });
      }
      await checkPush();
    } catch (err) {
      setPushMessage({ type: 'error', text: getFriendlyErrorMessage(err, 'Failed to update push subscription.') });
    } finally {
      setPushActionLoading(false);
    }
  };

  const handleSendTestPush = async () => {
    setPushMessage(null);
    setPushActionLoading(true);
    try {
      const res = await sendTestPush();
      setPushMessage({
        type: 'success',
        text: res?.message || 'Test push notification dispatched! Check your device.',
      });
    } catch (err) {
      setPushMessage({
        type: 'error',
        text: getFriendlyErrorMessage(err, 'Failed to send test push notification.'),
      });
    } finally {
      setPushActionLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    try {
      setLoading(true);
      await updateUserPhone(normalizedPhone);
      setSuccessMessage('WhatsApp number updated successfully!');
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setErrorMessage(getFriendlyErrorMessage(err, 'Failed to update phone number.'));
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !loading && !pushActionLoading) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 overflow-y-auto bg-brand-primary/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        className="bg-white w-full max-w-md rounded-2xl shadow-lg border border-brand-secondary/25 overflow-hidden relative animate-in fade-in zoom-in-95 duration-150"
      >
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-brand-secondary/15 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <h2 id="profile-modal-title" className="text-base font-bold text-ink-primary">Student Profile</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading || pushActionLoading}
            className="w-10 h-10 rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-brand-primary/5 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            aria-label="Close modal"
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
            <label htmlFor={phoneInputId} className="block text-xs font-semibold text-ink-primary mb-1">
              WhatsApp Contact Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-700">
                <Phone className="w-4 h-4" />
              </div>
              <input
                id={phoneInputId}
                type="tel"
                autoComplete="tel"
                aria-describedby={phoneHelpId}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number (we add +91)"
                className="block w-full pl-9 pr-3 py-2 text-base sm:text-xs border border-brand-secondary/25 rounded-lg bg-brand-bg/60 text-ink-primary placeholder:text-ink-secondary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-brand-primary transition-colors font-mono font-medium"
              />
            </div>
            <p id={phoneHelpId} className="mt-1 text-[10px] text-ink-secondary">
              10-digit mobile number (we add +91)
            </p>

            {/* Privacy notice banner */}
            <div className="mt-2.5 p-3 rounded-lg bg-brand-primary/5 border border-brand-secondary/15 flex items-start gap-2 text-[11px] text-ink-secondary leading-relaxed">
              <MessageSquare className="w-3.5 h-3.5 shrink-0 text-brand-secondary mt-0.5" />
              <span>
                <strong>Privacy Guaranteed:</strong> Your WhatsApp number is only revealed to another student when a borrow, rent, or trade transaction between you is <strong className="text-emerald-700 font-semibold">ACCEPTED</strong>.
              </span>
            </div>
          </div>

          {/* Web Push Notifications Settings */}
          <div className="pt-3 border-t border-brand-secondary/15 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    pushStatus.subscribed
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-brand-primary/5 text-ink-secondary border border-brand-secondary/20'
                  }`}
                >
                  {pushStatus.subscribed ? (
                    <BellRing className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Bell className="w-4 h-4 text-ink-secondary" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-ink-primary">Push Notifications</span>
                    {pushStatus.subscribed && (
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-secondary mt-0.5 leading-relaxed">
                    Receive instant campus alerts for borrow requests, return codes, and lease status.
                  </p>
                </div>
              </div>

              {/* Action Button */}
              {pushStatus.supported && pushStatus.permission !== 'denied' && (
                <button
                  type="button"
                  onClick={handleTogglePush}
                  disabled={pushActionLoading}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    pushStatus.subscribed
                      ? 'border border-brand-secondary/30 text-ink-secondary hover:text-ink-primary hover:bg-brand-primary/5'
                      : 'bg-brand-primary text-white hover:bg-brand-secondary'
                  }`}
                >
                  {pushActionLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
                  <span>{pushStatus.subscribed ? 'Turn Off' : 'Enable'}</span>
                </button>
              )}
            </div>

            {/* Unsupported / iOS notice */}
            {!pushStatus.loading && !pushStatus.supported && (
              <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-amber-900 text-[11px] leading-relaxed">
                {pushStatus.details?.needsIOSInstall
                  ? "On iOS, tap Share → 'Add to Home Screen' first to enable Web Push notifications."
                  : 'Web push notifications are not supported in this browser window.'}
              </div>
            )}

            {/* Blocked permission notice */}
            {!pushStatus.loading && pushStatus.supported && pushStatus.permission === 'denied' && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px]">
                Notifications are blocked in browser settings. Please allow notifications in site settings to enable.
              </div>
            )}

            {/* Push feedback message */}
            {pushMessage && (
              <div
                className={`p-2.5 rounded-lg text-[11px] flex items-center gap-1.5 ${
                  pushMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {pushMessage.type === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                )}
                <span>{pushMessage.text}</span>
              </div>
            )}

            {/* Test Push trigger button when subscribed */}
            {pushStatus.subscribed && (
              <div className="pt-1 flex items-center justify-end">
                <button
                  type="button"
                  onClick={handleSendTestPush}
                  disabled={pushActionLoading}
                  className="text-[11px] font-semibold text-brand-secondary hover:text-brand-primary underline transition-colors cursor-pointer flex items-center gap-1"
                >
                  Send test notification to this device
                </button>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-brand-secondary/15 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-semibold text-ink-secondary hover:text-ink-primary hover:bg-brand-primary/5 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
            >
              Close
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary active:bg-brand-primary disabled:opacity-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
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
