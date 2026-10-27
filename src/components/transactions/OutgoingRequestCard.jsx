import React from 'react';
import { 
  CheckCircle2, AlertCircle, RefreshCw, MessageCircle, Clock, Check, X 
} from 'lucide-react';
import { typeLabel } from '../../utils/labels';
import { toWhatsAppUrl } from '../../utils/phone';
import { formatDateTime, formatAutoCompleteRemaining } from '../../utils/time';
import { AUTO_COMPLETE_HOURS } from '../../utils/policy';
import { StatusBadge, CountdownBadge } from './Badges';
import { trackEvent } from '../../utils/analytics';

export default function OutgoingRequestCard({
  req,
  now,
  cardFeedback = {},
  actionLoadingId,
  codeInputs = {},
  closedNotice = null,
  onCodeInputChange,
  onVerifyCode,
  onConfirmState,
  onClearCardFeedback,
  onRequestAddPhone,
}) {
  return (
    <div
      key={req.id}
      className="bg-white rounded-xl border border-brand-secondary/20 p-4 flex flex-col justify-between space-y-3 min-w-0"
    >
      <div>
        {closedNotice && (
          <div
            role="status"
            className={`mb-3 px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-opacity duration-200 motion-reduce:transition-none ${
              req.status === 'COMPLETED'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-stone-100 text-stone-700 border-stone-200'
            }`}
          >
            {req.status === 'COMPLETED' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-stone-500 shrink-0" />
            )}
            <span>{closedNotice}</span>
          </div>
        )}

        {/* Top: Item Title & Badges */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-semibold text-ink-secondary uppercase tracking-wider bg-brand-primary/5 px-2 py-0.5 rounded-tight mr-1.5 inline-block align-middle">
              {typeLabel(req.listing?.type)}
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
                  onClick={() => {
                    trackEvent('contact_reveal_click', {
                      transaction_id: req.id,
                      role: 'borrower',
                      listing_id: req.listing?.id,
                      listing_type: req.listing?.type,
                    });
                  }}
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
                  onClick={onRequestAddPhone}
                  className="px-2 py-0.5 rounded bg-brand-primary text-white text-[11px] font-semibold hover:bg-brand-secondary transition-colors cursor-pointer"
                >
                  Add WhatsApp number
                </button>
              )}
            </div>
            {cardFeedback[req.id].type === 'error' && (
              <button
                type="button"
                onClick={() => onClearCardFeedback(req.id)}
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
              onClick={() => onConfirmState({ type: 'CANCEL', request: req })}
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
                onClick={() => onConfirmState({ type: 'CANCEL', request: req })}
                disabled={actionLoadingId === req.id}
                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-tight text-xs font-semibold text-ink-secondary hover:text-red-700 bg-white hover:bg-red-50 border border-brand-secondary/25 hover:border-red-200 transition-colors cursor-pointer disabled:opacity-50 w-full sm:w-auto"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>

              {req.handedOverAt ? (
                <button
                  type="button"
                  onClick={() => onConfirmState({ type: 'MANUAL_RECEIPT_BORROWER', request: req })}
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
                  onClick={() => onConfirmState({ type: 'MANUAL_RECEIPT_BORROWER', request: req })}
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
              onClick={() => onConfirmState({ type: 'CANCEL', request: req })}
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
                  onChange={(e) => onCodeInputChange(req.id, e.target.value)}
                  disabled={actionLoadingId === req.id}
                  className="w-full sm:w-32 px-3 py-1.5 text-center font-mono text-base sm:text-sm tracking-widest bg-white border border-brand-secondary/30 rounded-tight focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:border-brand-primary"
                />
                <button
                  onClick={() => onVerifyCode(req.id, 'verify-return', codeInputs[req.id], 'Return verified successfully. Transaction completed.')}
                  disabled={actionLoadingId === req.id || (codeInputs[req.id] || '').length !== 6}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-tight text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary active:bg-brand-primary transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
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
                    onClick={() => onClearCardFeedback(req.id)}
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
                  onClick={() => onConfirmState({ type: 'MANUAL_RETURN_BORROWER', request: req })}
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
}
