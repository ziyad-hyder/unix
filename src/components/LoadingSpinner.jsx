import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600">
      <Loader2 className="w-8 h-8 animate-spin text-brand-600 mb-3" />
      <p className="text-sm font-medium text-slate-500">{text}</p>
    </div>
  );
}
