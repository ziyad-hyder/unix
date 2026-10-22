import React from 'react';

export default function Footer({ className = '', compact = false }) {
  if (compact) {
    return (
      <footer className={`w-full py-4 text-center text-xs text-ink-primary/75 ${className}`}>
        <p>
          Built by{' '}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://ziyadhyder.dev/"
            className="text-brand-primary font-medium underline underline-offset-2 hover:text-brand-secondary transition-colors"
          >
            Ziyad Hyder
          </a>{' '}
          · Not affiliated with KITS Administration
        </p>
      </footer>
    );
  }

  return (
    <footer className={`w-full py-6 text-center border-t border-brand-secondary/15 text-xs text-ink-primary/75 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 space-y-1">
        <p>
          Built by{' '}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://ziyadhyder.dev/"
            className="text-brand-primary font-medium underline underline-offset-2 hover:text-brand-secondary transition-colors"
          >
            Ziyad Hyder
          </a>
        </p>
        <p className="mt-1 text-ink-primary/65">Not affiliated with KITS Administration</p>
        <p className="mt-1 font-mono text-[11px] text-ink-primary/50 tracking-wider">v1.0.0</p>
      </div>
    </footer>
  );
}
