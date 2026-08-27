import React from 'react';
import { RefreshCw, Clock, User as UserIcon, ArrowUpRight } from 'lucide-react';

export default function ListingCard({ listing, onClick }) {
  const { title, description, type, category, price, rentalRate, rentalPeriod, depositAmount, swapPreferences, owner, createdAt } = listing;

  const typeConfig = {
    SELL: {
      label: 'SELL',
      bg: 'bg-brand-primary/10 text-brand-primary border-brand-primary/20',
      dot: 'bg-brand-primary',
    },
    RENT: {
      label: 'RENT',
      bg: 'bg-brand-secondary/15 text-brand-primary border-brand-secondary/30',
      dot: 'bg-brand-secondary',
    },
    SWAP: {
      label: 'SWAP',
      bg: 'bg-brand-accent/25 text-brand-primary border-brand-accent/45',
      dot: 'bg-brand-accent',
    },
  }[type] || { label: type, bg: 'bg-brand-primary/5 text-ink-primary border-brand-secondary/20', dot: 'bg-brand-secondary' };

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
      className="bg-white rounded-xl border border-brand-secondary/20 p-5 hover:border-brand-tertiary transition-colors flex flex-col justify-between h-full group cursor-pointer text-left"
    >
      <div>
        {/* Top Header: Type & Category Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide border ${typeConfig.bg}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${typeConfig.dot}`} />
            {typeConfig.label}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-semibold text-ink-secondary uppercase tracking-wider bg-brand-primary/5 px-2 py-0.5 rounded">
              {category}
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
                ₹{price != null ? Number(price).toLocaleString('en-IN') : '0'}
              </span>
            </div>
          )}

          {type === 'RENT' && (
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold text-ink-primary">
                  ₹{rentalRate != null ? Number(rentalRate).toLocaleString('en-IN') : '0'}
                </span>
                <span className="text-xs text-ink-secondary font-medium">
                  / {rentalPeriod ? rentalPeriod.toLowerCase() : 'period'}
                </span>
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
          <span>{formatDate(createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

