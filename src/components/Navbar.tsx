import React, { useState } from 'react';
import { FIXED_PARTICIPANTS, getParticipant } from '../constants/participants';
import { Plus, RotateCcw, Users, Share2, Check, Lock, Unlock, Eye } from 'lucide-react';
import { Avatar } from './Avatar';
import { getViewerShareUrl } from '../lib/auth';

interface NavbarProps {
  viewingUserId: string | null;
  onSelectViewingUser: (userId: string | null) => void;
  onOpenAddBill: () => void;
  onResetData: () => void;
  totalBillsCount: number;
  isLiveSync?: boolean;
  isReadOnly?: boolean;
  onOpenAdminLogin?: () => void;
  onLogoutAdmin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  viewingUserId,
  onSelectViewingUser,
  onOpenAddBill,
  onResetData,
  isReadOnly = false,
  onOpenAdminLogin,
  onLogoutAdmin,
}) => {
  const currentParticipant = viewingUserId ? getParticipant(viewingUserId) : null;
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyShareLink = async () => {
    try {
      const shareUrl = getViewerShareUrl();
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/40 backdrop-blur-xl saturate-180 border-b border-white/50 shadow-[0_4px_24px_rgba(0,0,0,0.04)] transition-all">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand Logo & Mode Badge */}
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Payana"
            className="h-8 sm:h-9 w-auto object-contain select-none drop-shadow-xs"
          />

          {isReadOnly ? (
            <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-zinc-100/90 text-zinc-600 border border-zinc-200 shadow-2xs backdrop-blur-sm">
              <Eye className="w-3 h-3 text-zinc-400" />
              Viewer Mode
            </span>
          ) : (
            <span className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Organizer Mode
            </span>
          )}
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* "Viewing As" Switcher */}
          <div className="relative flex items-center">
            <label htmlFor="viewing-user" className="sr-only">
              View balance as
            </label>
            <div className="flex items-center gap-1.5 bg-white/60 hover:bg-white/85 backdrop-blur-md transition-all rounded-xl px-2.5 py-1.5 border border-white/80 text-xs font-medium text-zinc-700 shadow-xs">
              {currentParticipant ? (
                <Avatar participant={currentParticipant} size="sm" />
              ) : (
                <Users className="w-3.5 h-3.5 text-zinc-500" />
              )}
              <span className="text-zinc-500 hidden md:inline">Viewing as:</span>
              <select
                id="viewing-user"
                value={viewingUserId || 'all'}
                onChange={(e) =>
                  onSelectViewingUser(e.target.value === 'all' ? null : e.target.value)
                }
                className="bg-transparent font-semibold text-zinc-900 focus:outline-none cursor-pointer pr-1 text-xs"
              >
                <option value="all">Group Overview</option>
                <optgroup label="Participants (Alphabetical)">
                  {FIXED_PARTICIPANTS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          {/* Organizer-Only Action Controls */}
          {!isReadOnly && (
            <>
              {/* Share Viewer Link Button (For Organizer to copy group link) */}
              <button
                onClick={handleCopyShareLink}
                title="Copy read-only group viewer link"
                className="flex items-center gap-1.5 py-1.5 px-2.5 sm:px-3 text-xs font-semibold text-zinc-700 hover:text-zinc-950 bg-white/60 hover:bg-white/90 backdrop-blur-md rounded-xl transition-all border border-white/80 shadow-xs cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold hidden sm:inline">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="hidden sm:inline">Share Link</span>
                  </>
                )}
              </button>

              {/* Reset button (Admin Only) */}
              <button
                onClick={onResetData}
                title="Clear all data (Admin)"
                className="p-2 text-zinc-600 hover:text-zinc-900 bg-white/40 hover:bg-white/80 backdrop-blur-md rounded-xl transition-all border border-white/60 shadow-xs cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Add Bill Button (Admin Only) */}
              <button
                onClick={onOpenAddBill}
                className="inline-flex items-center gap-1.5 bg-zinc-950/90 hover:bg-zinc-900 backdrop-blur-md text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.98] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Bill</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
