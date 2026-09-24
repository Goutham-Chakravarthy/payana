import React from 'react';
import { FIXED_PARTICIPANTS, getParticipant } from '../constants/participants';
import { Plus, RotateCcw, Users, Sparkles, UserCheck } from 'lucide-react';
import { Avatar } from './Avatar';

interface NavbarProps {
  viewingUserId: string | null;
  onSelectViewingUser: (userId: string | null) => void;
  onOpenAddBill: () => void;
  onResetData: () => void;
  totalBillsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  viewingUserId,
  onSelectViewingUser,
  onOpenAddBill,
  onResetData,
  totalBillsCount,
}) => {
  const currentParticipant = viewingUserId ? getParticipant(viewingUserId) : null;

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-zinc-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-black tracking-wider text-base shadow-sm">
            P
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black tracking-tight text-lg text-zinc-950">
                PAYANA
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                <Sparkles className="w-2.5 h-2.5" /> AI Splitter
              </span>
            </div>
            <p className="text-xs text-zinc-500 hidden sm:block">
              Minimalist Collaborative Bill Engine
            </p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* "Viewing As" Switcher for instant personal balance answering */}
          <div className="relative flex items-center">
            <label htmlFor="viewing-user" className="sr-only">
              View balance as
            </label>
            <div className="flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200/80 transition-colors rounded-lg px-2.5 py-1.5 border border-zinc-200 text-xs font-medium text-zinc-700">
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

          {/* Reset Demo button */}
          <button
            onClick={onResetData}
            title="Reset sample bills"
            className="p-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors border border-transparent hover:border-zinc-200"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Add Bill Button */}
          <button
            onClick={onOpenAddBill}
            className="inline-flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Bill</span>
          </button>
        </div>
      </div>
    </header>
  );
};
