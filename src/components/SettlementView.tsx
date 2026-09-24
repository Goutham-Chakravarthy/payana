import React, { useState } from 'react';
import { ParticipantBalance, Settlement } from '../types';
import { SettlementCard } from './SettlementCard';
import { formatINR } from '../lib/formatters';
import { CheckCircle2, ShieldCheck, Zap, ArrowUpDown } from 'lucide-react';

interface SettlementViewProps {
  settlements: Settlement[];
  balances: Record<string, ParticipantBalance>;
  onToggleStatus: (settlementId: string) => void;
  viewingUserId: string | null;
}

export const SettlementView: React.FC<SettlementViewProps> = ({
  settlements,
  balances,
  onToggleStatus,
  viewingUserId,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');

  // Count debtors and creditors
  const balanceValues = Object.values(balances);
  const peopleWhoNeedToPay = balanceValues.filter((b) => b.netBalancePaise < 0).length;
  const peopleWhoShouldReceive = balanceValues.filter((b) => b.netBalancePaise > 0).length;

  const totalDebtPaise = settlements.reduce((sum, s) => sum + s.amountPaise, 0);
  const paidDebtPaise = settlements
    .filter((s) => s.status === 'paid')
    .reduce((sum, s) => sum + s.amountPaise, 0);
  const pendingDebtPaise = totalDebtPaise - paidDebtPaise;

  const percentSettled = totalDebtPaise > 0 ? Math.round((paidDebtPaise / totalDebtPaise) * 100) : 100;

  // Pending payments appear first in the list, paid go to the last
  const sortedSettlements = [...settlements].sort((a, b) => {
    if (a.status === 'pending' && b.status === 'paid') return -1;
    if (a.status === 'paid' && b.status === 'pending') return 1;
    return b.amountPaise - a.amountPaise;
  });

  // Filter settlements
  const filteredSettlements = sortedSettlements.filter((s) => {
    if (filter === 'pending') return s.status === 'pending';
    if (filter === 'paid') return s.status === 'paid';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Section (Prompt Section 15) */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight uppercase">
                SETTLE UP
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">
                Smart Debt Simplification
              </span>
            </div>
            <div className="text-sm font-semibold text-zinc-600 mt-1 flex items-center gap-2">
              <span className="text-rose-600 font-bold">
                {peopleWhoNeedToPay} {peopleWhoNeedToPay === 1 ? 'person needs' : 'people need'} to pay
              </span>
              <span>•</span>
              <span className="text-emerald-600 font-bold">
                {peopleWhoShouldReceive} {peopleWhoShouldReceive === 1 ? 'person should' : 'people should'} receive
              </span>
            </div>
          </div>

          {/* Settle Up Progress Summary */}
          <div className="bg-zinc-50 border border-zinc-200/70 rounded-xl p-3 sm:px-4 min-w-[200px]">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-zinc-500">Settlement Progress</span>
              <span className="text-zinc-900 font-bold">{percentSettled}%</span>
            </div>
            <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${percentSettled}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-500 mt-1.5">
              <span>Paid: {formatINR(paidDebtPaise)}</span>
              <span>Pending: {formatINR(pendingDebtPaise)}</span>
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-zinc-100">
          <span className="text-xs font-semibold text-zinc-400 mr-1">Filter:</span>
          {(['all', 'pending', 'paid'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                filter === f
                  ? 'bg-zinc-900 text-white shadow-xs'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {f} ({f === 'all' ? settlements.length : settlements.filter((s) => s.status === f).length})
            </button>
          ))}
        </div>
      </div>

      {/* Settlements Grid */}
      {filteredSettlements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSettlements.map((settlement) => (
            <SettlementCard
              key={settlement.id}
              settlement={settlement}
              onToggleStatus={onToggleStatus}
              highlightUserId={viewingUserId}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-zinc-900">
            {filter === 'pending'
              ? 'All transactions marked as paid!'
              : filter === 'paid'
              ? 'No payments marked as paid yet.'
              : 'The group is completely settled!'}
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1">
            {filter === 'all'
              ? 'No outstanding balances or payments required across the group.'
              : 'Toggle filters above or add new bills to update the settlement balance.'}
          </p>
        </div>
      )}

      {/* Settlement Guarantee Footnote (Prompt Section 24, 25, 26) */}
      <div className="flex items-start gap-3 bg-zinc-50 border border-zinc-200/80 rounded-xl p-4 text-xs text-zinc-600">
        <ShieldCheck className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-zinc-800">Mathematical Guarantee: </span>
          All debts are reconciled across every bill with exact integer paise precision. The algorithm computes net
          balances first, eliminating duplicate circular payments and reducing overall group transactions to the
          absolute minimum.
        </div>
      </div>
    </div>
  );
};
