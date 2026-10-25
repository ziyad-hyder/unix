import React from 'react';
import { RefreshCw, Clock, User as UserIcon, ArrowUpRight } from 'lucide-react';
import { formatDateTime } from '../utils/time';
import { categoryLabel, typeLabel, rentalPeriodLabel, formatPrice } from '../utils/labels';

export default function ListingCard({ listing, onClick }) {
  const { title, description, type, category, price, rentalRate, rentalPeriod, depositAmount, swapPreferences, imageUrl, owner, createdAt } = listing;

  const typeConfig = {
    SELL: {
      label: typeLabel('SELL'),
      bg: 'bg-brand-primary/10 text-brand-primary border-brand-primary/20',
      dot: 'bg-brand-primary',
    },
    RENT: {
      label: typeLabel('RENT'),
      bg: 'bg-brand-secondary/15 text-brand-primary border-brand-secondary/30',
      dot: 'bg-brand-secondary',
    },
    SWAP: {
      label: typeLabel('SWAP'),
      bg: 'bg-brand-accent/25 text-brand-primary border-brand-accent/45',
      dot: 'bg-brand-accent',
    },
  }[type] || { label: typeLabel(type), bg: 'bg-brand-primary/5 text-ink-primary border-brand-secondary/20', dot: 'bg-brand-secondary' };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="bg-white rounded-xl border border-brand-secondary/20 p-5 hover:border-brand-tertiary transition-colors flex flex-col justify-between h-full group cursor-pointer text-left overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
    >
      <div>
        {/* Optional Listing Image */}
        {imageUrl && (
          <div className="mb-3.5 -mt-1 -mx-1 rounded-lg overflow-hidden border border-brand-secondary/15 bg-brand-bg/50">
            <img
              src={imageUrl}
              alt={title}
              loading="lazy"
              className="w-full h-36 object-cover group-hover:scale-[1.02] transition-transform duration-200"
            />
          </div>
        )}

        {/* Top Header: Type & Category Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide border ${typeConfig.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${typeConfig.dot}`} />
            {typeConfig.label}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-semibold text-ink-secondary uppercase tracking-wider bg-brand-primary/5 px-2 py-0.5 rounded">
              {categoryLabel(category)}
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-brand-secondary/40 group-hover:text-brand-primary transition-colors" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-ink-primary line-clamp-1 group-hover:text-brand-secondary transition-colors">
          {title}
        </h3>

        {/* Description */}
        <p className="text-xs text-ink-secondary mt-1.5 line-clamp-2 leading-relaxed">
          {description}
        </p>

        {/* Pricing / Terms Section */}
        <div className="mt-4 pt-3 border-t border-brand-secondary/15">
          {type === 'SELL' && (
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-ink-secondary font-medium">Price:</span>
              <span className="text-base font-bold text-ink-primary">
                {formatPrice(price)}
              </span>
            </div>
          )}

          {type === 'RENT' && (
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-bold text-ink-primary">
                  {formatPrice(rentalRate)}
                </span>
                {rentalPeriod && rentalRate != null && String(rentalRate).trim() !== '' && (
                  <span className="text-xs text-ink-secondary font-medium">
                    {rentalPeriodLabel(rentalPeriod)}
                  </span>
                )}
              </div>
              {depositAmount != null && Number(depositAmount) > 0 && (
                <p className="text-[11px] text-ink-secondary mt-0.5 truncate">
                  Deposit: ₹{Number(depositAmount).toLocaleString('en-IN')}
                </p>
              )}
            </div>
          )}

          {type === 'SWAP' && (
            <div>
              <div className="flex items-center gap-1 text-xs font-semibold text-ink-secondary">
                <RefreshCw className="w-3 h-3 shrink-0 text-brand-secondary" />
                <span>Trade preference</span>
              </div>
              <p className="text-xs text-ink-primary mt-0.5 font-medium italic truncate">
                "{swapPreferences || 'Open to peer swaps'}"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer: Owner & Timestamp */}
      <div className="mt-4 pt-3 border-t border-brand-secondary/15 flex items-center justify-between text-[11px] text-ink-secondary/70">
        <div className="flex items-center gap-1.5 text-ink-secondary truncate max-w-[65%]">
          <UserIcon className="w-3.5 h-3.5 shrink-0 text-brand-secondary/70" />
          <span className="truncate font-medium">{owner?.fullName || owner?.email?.split('@')[0]}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 font-mono text-ink-secondary/70">
          <Clock className="w-3 h-3" />
          <span>{formatDateTime(createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

