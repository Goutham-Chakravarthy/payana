import React from 'react';
import { Settlement } from '../types';
import { getParticipant } from '../constants/participants';
import { formatINR } from '../lib/formatters';
import { Avatar } from './Avatar';
import { ArrowRight, Check, Clock, CheckCircle } from 'lucide-react';

interface SettlementCardProps {
  settlement: Settlement;
  onToggleStatus: (settlementId: string) => void;
  highlightUserId?: string | null;
}

export const SettlementCard: React.FC<SettlementCardProps> = ({
  settlement,
  onToggleStatus,
  highlightUserId,
}) => {
  const fromUser = getParticipant(settlement.fromParticipantId);
  const toUser = getParticipant(settlement.toParticipantId);
  const isPaid = settlement.status === 'paid';

  const isUserDebtor = highlightUserId === settlement.fromParticipantId;
  const isUserCreditor = highlightUserId === settlement.toParticipantId;

  return (
    <div
      className={`relative rounded-2xl border transition-all duration-200 p-5 sm:p-6 ${
        isPaid
          ? 'bg-zinc-50/80 border-zinc-200/80 opacity-75'
          : isUserDebtor
          ? 'bg-rose-50/30 border-rose-200 ring-2 ring-rose-300 shadow-sm'
          : isUserCreditor
          ? 'bg-emerald-50/30 border-emerald-200 ring-2 ring-emerald-300 shadow-sm'
          : 'bg-white border-zinc-200/90 hover:border-zinc-300 shadow-xs hover:shadow-sm'
      }`}
    >
      {/* Top row: Status Tag & Direction */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <span
          className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
            isPaid
              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          {isPaid ? (
            <>
              <Check className="w-3 h-3 stroke-[2.5]" /> Paid
            </>
          ) : (
            <>
              <Clock className="w-3 h-3" /> Pending Payment
            </>
          )}
        </span>

        {isUserDebtor && (
          <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
            You Pay
          </span>
        )}
        {isUserCreditor && (
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            You Receive
          </span>
        )}
      </div>

      {/* Visual Transfer Layout: [Debtor] -> [Creditor] */}
      <div className="flex items-center justify-between gap-3 sm:gap-6 py-2">
        {/* Debtor */}
        <div className="flex flex-col items-center text-center w-28 sm:w-32">
          <Avatar participant={fromUser} size="lg" />
          <span className="mt-2 text-sm font-bold text-zinc-900 tracking-tight">
            {fromUser.name}
          </span>
          <span className="text-[11px] text-zinc-500 font-medium">Pays</span>
        </div>

        {/* Direction Arrow */}
        <div className="flex flex-col items-center justify-center grow">
          <div className="w-full flex items-center justify-center">
            <div className="h-0.5 grow bg-zinc-200 relative max-w-28 sm:max-w-40">
              <div className="absolute right-0 top-1/2 -translate-y-1/2 -mr-1">
                <ArrowRight className="w-4 h-4 text-zinc-400" />
              </div>
            </div>
          </div>
          <span className="text-[10px] text-zinc-400 mt-1 uppercase font-semibold tracking-wider">
            Direct Transfer
          </span>
        </div>

        {/* Creditor */}
        <div className="flex flex-col items-center text-center w-28 sm:w-32">
          <Avatar participant={toUser} size="lg" />
          <span className="mt-2 text-sm font-bold text-zinc-900 tracking-tight">
            {toUser.name}
          </span>
          <span className="text-[11px] text-zinc-500 font-medium">Receives</span>
        </div>
      </div>

      {/* The Amount - Primary Visual Focus (Prompt Section 16) */}
      <div className="my-5 text-center">
        <div className="text-3xl sm:text-4xl font-black text-zinc-950 tracking-tight">
          {formatINR(settlement.amountPaise)}
        </div>
        <div className="text-xs text-zinc-400 font-medium mt-0.5">
          Consolidated debt simplification
        </div>
      </div>

      {/* Action Button: Mark as Paid (Prompt Section 20) */}
      <div className="pt-3 border-t border-zinc-100 flex items-center justify-center">
        <button
          onClick={() => onToggleStatus(settlement.id)}
          className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            isPaid
              ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
              : 'bg-zinc-950 hover:bg-zinc-800 text-white shadow-xs hover:shadow'
          }`}
        >
          {isPaid ? (
            <>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Mark as Pending</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              <span>Mark as Paid</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
