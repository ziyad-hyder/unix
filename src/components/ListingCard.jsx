import React from 'react';
import { RefreshCw, Clock, User as UserIcon, ArrowUpRight } from 'lucide-react';

export default function ListingCard({ listing, onClick }) {
  const { title, description, type, category, price, rentalRate, rentalPeriod, depositAmount, swapPreferences, owner, createdAt } = listing;

  const typeConfig = {
    SELL: {
      label: 'SELL',
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      dot: 'bg-emerald-500',
    },
    RENT: {
      label: 'RENT',
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
      dot: 'bg-indigo-500',
    },
    SWAP: {
      label: 'SWAP',
      bg: 'bg-amber-50 text-amber-700 border-amber-200/80',
      dot: 'bg-amber-500',
    },
  }[type] || { label: type, bg: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-500' };

  const formatDate = (isoString) => {
    if (!isoString) return 'Just now';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs hover:shadow-md hover:border-brand-300 transition-all flex flex-col justify-between h-full group cursor-pointer text-left"
    >
      <div>
        {/* Top Header: Type & Category Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${typeConfig.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${typeConfig.dot}`} />
            {typeConfig.label}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
              {category}
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-brand-600 transition-colors" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-900 line-clamp-1 group-hover:text-brand-600 transition-colors">
          {title}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
          {description}
        </p>

        {/* Pricing / Terms Section */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          {type === 'SELL' && (
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-slate-500 font-medium">Price:</span>
              <span className="text-lg font-extrabold text-slate-900">
                ₹{price != null ? Number(price).toLocaleString('en-IN') : '0'}
              </span>
            </div>
          )}

          {type === 'RENT' && (
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-extrabold text-indigo-700">
                  ₹{rentalRate != null ? Number(rentalRate).toLocaleString('en-IN') : '0'}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  / {rentalPeriod ? rentalPeriod.toLowerCase() : 'period'}
                </span>
              </div>
              {depositAmount != null && Number(depositAmount) > 0 && (
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  Deposit: ₹{Number(depositAmount).toLocaleString('en-IN')}
                </p>
              )}
            </div>
          )}

          {type === 'SWAP' && (
            <div>
              <div className="flex items-center gap-1 text-xs font-semibold text-amber-700">
                <RefreshCw className="w-3 h-3 shrink-0" />
                <span>Trade item</span>
              </div>
              <p className="text-xs text-slate-700 mt-1 font-medium italic truncate">
                "{swapPreferences || 'Open to swaps'}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer: Owner & Timestamp */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 text-slate-600 truncate max-w-[65%]">
          <UserIcon className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span className="truncate font-medium">{owner?.fullName || owner?.email?.split('@')[0]}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 font-mono text-slate-400">
          <Clock className="w-3 h-3" />
          <span>{formatDate(createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
