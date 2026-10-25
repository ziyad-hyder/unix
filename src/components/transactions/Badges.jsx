import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { formatDuration, formatAutoCompleteRemaining } from '../../utils/time';
import { AUTO_COMPLETE_HOURS } from '../../utils/policy';

export const STATUS_CONFIG = {
  PENDING: {
    label: 'PENDING',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  ACCEPTED: {
    label: 'ACCEPTED',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  OVERDUE: {
    label: 'OVERDUE',
    className: 'bg-red-50 text-red-800 border-red-200',
  },
  RETURN_PENDING: {
    label: 'RETURN PENDING',
    className: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  COMPLETED: {
    label: 'COMPLETED',
    className: 'bg-stone-100 text-stone-700 border-stone-300',
  },
  REJECTED: {
    label: 'DECLINED',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  CANCELLED: {
    label: 'CANCELLED',
    className: 'bg-stone-100 text-stone-600 border-stone-200',
  },
  EXPIRED: {
    label: 'EXPIRED',
    className: 'bg-stone-100 text-stone-600 border-stone-200',
  },
};

export function StatusBadge({ status }) {
  const conf = STATUS_CONFIG[status] || {
    label: status,
    className: 'bg-stone-100 text-stone-700 border-stone-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-tight text-[10px] font-bold tracking-wide border ${conf.className}`}
    >
      {conf.label}
    </span>
  );
}

export function useMinuteTicker() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

export function CountdownBadge({ req }) {
  const now = useMinuteTicker();
  if (!req) return null;
  const { status } = req;

  if (status === 'RETURN_PENDING' && !req.disputed && req.returnedAt) {
    const text = formatAutoCompleteRemaining(req.returnedAt, now, AUTO_COMPLETE_HOURS);
    const displayText = text === 'Completing shortly' ? 'Completing shortly' : `Auto-completes in ${text.replace('auto-completes in ', '')}`;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-tight text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
        <Clock className="w-3 h-3 text-emerald-600" />
        <span>{displayText}</span>
      </span>
    );
  }

  if (!req.dueAt) return null;
  const dueTime = new Date(req.dueAt).getTime();
  if (isNaN(dueTime)) return null;

  const diffMs = dueTime - now;

  if (status === 'ACTIVE_LEASE') {
    if (diffMs > 0) {
      const text = `Due in ${formatDuration(diffMs)}`;
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-tight text-[10px] font-semibold bg-sky-50 text-sky-800 border border-sky-200">
          <Clock className="w-3 h-3 text-sky-600" />
          <span>{text}</span>
        </span>
      );
    } else {
      const overdueMs = Math.abs(diffMs);
      const text = `Overdue by ${formatDuration(overdueMs)}`;
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-tight text-[10px] font-bold bg-red-50 text-red-800 border border-red-200">
          <AlertCircle className="w-3 h-3 text-red-600" />
          <span>{text}</span>
        </span>
      );
    }
  }

  if (status === 'OVERDUE') {
    const overdueMs = Math.max(0, now - dueTime);
    const text = `Overdue by ${formatDuration(overdueMs)}`;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-tight text-[10px] font-bold bg-red-50 text-red-800 border border-red-200">
        <AlertCircle className="w-3 h-3 text-red-600" />
        <span>{text}</span>
      </span>
    );
  }

  return null;
}
