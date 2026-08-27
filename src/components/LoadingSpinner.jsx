import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-bg text-ink-secondary">
      <Loader2 className="w-7 h-7 animate-spin text-brand-primary mb-3" />
      <p className="text-xs font-medium text-ink-secondary tracking-wide">{text}</p>
    </div>
  );
}

