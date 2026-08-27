import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Layers, CheckCircle2 } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center text-white shadow-sm shadow-brand-500/30">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-extrabold tracking-tight text-slate-900">Uni<span className="text-brand-600">X</span></span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                KITSW
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-none">Campus Marketplace</p>
          </div>
        </div>

        {/* User Info & Actions */}
        {user && (
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-800">{user.fullName || user.email}</span>
                {user.verified && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" title="Verified Campus Student" />
                )}
              </div>
              <span className="text-[11px] text-slate-400 font-mono">{user.email}</span>
            </div>

            <button
              onClick={logout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200"
              title="Log out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
