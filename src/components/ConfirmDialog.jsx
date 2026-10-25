import React, { useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import useModalA11y from '../hooks/useModalA11y';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const cancelBtnRef = useRef(null);
  const dialogRef = useModalA11y(open, onCancel, {
    closeOnEscape: !loading,
    initialFocusRef: cancelBtnRef,
  });

  if (!open) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !loading && onCancel) {
      onCancel();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 overflow-y-auto bg-brand-primary/40 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="bg-white w-full max-w-md rounded-2xl shadow-lg border border-brand-secondary/25 p-5 sm:p-6 overflow-hidden relative animate-in fade-in zoom-in-95 duration-150"
      >
        <h3 id="confirm-dialog-title" className="text-base font-bold text-ink-primary">
          {title}
        </h3>

        <div id="confirm-dialog-message" className="text-xs sm:text-sm text-ink-secondary whitespace-pre-line mt-2.5 leading-relaxed">
          {message}
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-3.5 py-2 rounded-control text-xs font-semibold text-ink-primary hover:bg-brand-primary/5 border border-brand-secondary/25 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-control text-xs font-semibold text-white transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              danger
                ? 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                : 'bg-brand-primary hover:bg-brand-secondary active:bg-brand-primary'
            }`}
          >
            {loading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
