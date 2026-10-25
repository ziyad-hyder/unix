import React, { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, CheckCircle2, User } from 'lucide-react';
import ProfileModal from './ProfileModal';

export function UniXLogoMark({ className = "w-9 h-9" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="UniX Mark"
    >
      <rect width="100" height="100" rx="22" fill="#173541" />
      <circle cx="50" cy="31" r="9" fill="#B49796" opacity="0.18" />
      <line x1="50" y1="31" x2="33" y2="76" stroke="#F5F1EA" strokeWidth="7" strokeLinecap="round" />
      <line x1="50" y1="31" x2="67" y2="76" stroke="#85ADBB" strokeWidth="7" strokeLinecap="round" />
      <circle cx="33" cy="76" r="4" fill="#F5F1EA" />
      <circle cx="67" cy="76" r="4" fill="#85ADBB" />
      <circle cx="50" cy="31" r="5.5" fill="#B49796" />
    </svg>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleCloseProfile = useCallback(() => {
    setIsProfileOpen(false);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 bg-brand-bg/95 backdrop-blur-md border-b border-brand-secondary/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <UniXLogoMark className="w-9 h-9 flex-shrink-0" />
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-ink-primary">
                Uni<span className="text-brand-secondary">X</span>
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wider bg-brand-primary/5 text-ink-primary border border-brand-secondary/25">
                KITSW
              </span>
            </div>
          </div>

          {/* User Info & Actions */}
          {user && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsProfileOpen(true)}
                className="hidden sm:flex flex-col items-end hover:opacity-80 transition-opacity text-left cursor-pointer p-1 rounded-lg"
                title="View & edit profile"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-ink-primary">{user.fullName || user.email}</span>
                  {user.verified && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" title="Verified Campus Student" />
                  )}
                </div>
                <span className="text-[11px] text-ink-secondary/80 font-mono">{user.email}</span>
              </button>

              <button
                onClick={() => setIsProfileOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-ink-secondary hover:text-ink-primary hover:bg-brand-primary/5 transition-colors border border-brand-secondary/25 cursor-pointer"
                title="My Profile & WhatsApp"
              >
                <User className="w-3.5 h-3.5 text-brand-secondary" />
                <span>Profile</span>
              </button>

              <button
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-ink-secondary hover:text-ink-primary hover:bg-brand-primary/5 transition-colors border border-brand-secondary/25 cursor-pointer"
                title="Log out"
                aria-label="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log out</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={handleCloseProfile}
      />
    </>
  );
}


