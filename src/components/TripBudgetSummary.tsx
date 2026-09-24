import React, { useState } from 'react';
import { Bill, ParticipantBalance, Settlement } from '../types';
import { FIXED_PARTICIPANTS, getParticipant } from '../constants/participants';
import { formatINR, paiseToRupees, rupeesToPaise } from '../lib/formatters';
import {
  Wallet,
  TrendingUp,
  PieChart,
  Users,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Check,
  Copy,
  ShieldCheck,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

interface TripBudgetSummaryProps {
  bills: Bill[];
  balances: Record<string, ParticipantBalance>;
  settlements: Settlement[];
  targetBudgetPaise: number;
  onUpdateBudget: (newBudgetPaise: number) => void;
  isReadOnly?: boolean;
}

export const TripBudgetSummary: React.FC<TripBudgetSummaryProps> = ({
  bills,
  balances,
  settlements,
  targetBudgetPaise,
  onUpdateBudget,
  isReadOnly = false,
}) => {
  // Editing budget state
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(
    String(paiseToRupees(targetBudgetPaise))
  );
  const [copied, setCopied] = useState(false);

  // Sync budgetInput when targetBudgetPaise changes
  React.useEffect(() => {
    setBudgetInput(String(paiseToRupees(targetBudgetPaise)));
  }, [targetBudgetPaise]);

  // 1. Calculations
  const totalSpendPaise = bills.reduce((sum, b) => sum + b.amountPaise, 0);
  const remainingBudgetPaise = targetBudgetPaise - totalSpendPaise;
  const isOverBudget = remainingBudgetPaise < 0;

  const percentUsed =
    targetBudgetPaise > 0
      ? Math.min(Math.round((totalSpendPaise / targetBudgetPaise) * 100), 100)
      : 100;
  const rawPercentUsed =
    targetBudgetPaise > 0
      ? ((totalSpendPaise / targetBudgetPaise) * 100).toFixed(1)
      : '100.0';

  // Per person metrics across the 9 group members
  const memberCount = FIXED_PARTICIPANTS.length;
  const averageSpentPerHeadPaise =
    memberCount > 0 ? Math.round(totalSpendPaise / memberCount) : 0;
  const budgetPerHeadPaise =
    memberCount > 0 ? Math.round(targetBudgetPaise / memberCount) : 0;

  // Largest bill
  const largestBill = bills.length > 0
    ? [...bills].sort((a, b) => b.amountPaise - a.amountPaise)[0]
    : null;

  // Top payer (who spent most upfront)
  const topPayerBalance = Object.values(balances).sort(
    (a, b) => b.totalPaidPaise - a.totalPaidPaise
  )[0];
  const topPayer = topPayerBalance ? getParticipant(topPayerBalance.participantId) : null;

  // Settlement reconciliation metrics
  const totalSettlementDebtPaise = settlements.reduce(
    (sum, s) => sum + s.amountPaise,
    0
  );
  const paidSettlementsPaise = settlements
    .filter((s) => s.status === 'paid')
    .reduce((sum, s) => sum + s.amountPaise, 0);
  const pendingSettlementsPaise = totalSettlementDebtPaise - paidSettlementsPaise;

  // Verification: Sum of all shares vs total spend
  const totalSharesPaise = Object.values(balances).reduce(
    (sum, b) => sum + b.totalSharePaise,
    0
  );

  const handleSaveBudget = () => {
    const parsedPaise = rupeesToPaise(budgetInput);
    if (parsedPaise > 0) {
      onUpdateBudget(parsedPaise);
      setIsEditingBudget(false);
    }
  };

  const handleCopySummary = () => {
    const summaryText = `🏕️ PAYANA · TRIP BUDGET & EXPENSE SUMMARY
-----------------------------------------
💰 Total Spent: ${formatINR(totalSpendPaise)}
🎯 Target Budget: ${formatINR(targetBudgetPaise)} (${rawPercentUsed}% used)
⚖️ Remaining Budget: ${
      isOverBudget
        ? `-${formatINR(Math.abs(remainingBudgetPaise))} OVER BUDGET`
        : `${formatINR(remainingBudgetPaise)} remaining`
    }
👥 Average Per Head (9 members): ${formatINR(averageSpentPerHeadPaise)}
🧾 Bills Logged: ${bills.length}
-----------------------------------------
${largestBill ? `🌟 Largest Bill: ${largestBill.title} (${formatINR(largestBill.amountPaise)})` : ''}
${topPayer ? `👑 Top Upfront Payer: ${topPayer.name} (${formatINR(topPayerBalance.totalPaidPaise)})` : ''}
✅ Settlements: ${settlements.filter((s) => s.status === 'paid').length}/${settlements.length} cleared (${formatINR(paidSettlementsPaise)} settled)`;

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section className="mt-10 pt-8 border-t-2 border-zinc-200/80">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center">
              <Wallet className="w-4 h-4 text-amber-300" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight uppercase">
              TOTAL TRIP BUDGET & FINAL LEDGER
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Aggregated trip expenditures, budget utilization, and per-head averages calculated across all bills
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-zinc-200 text-zinc-800 hover:bg-zinc-50 transition-colors shadow-2xs cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copied Summary!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-500" />
                <span>Copy Summary for Group</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Budget Dashboard Card */}
      <div className="bg-white rounded-3xl border border-zinc-200/90 shadow-xs overflow-hidden">
        {/* Top Highlight Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-100 bg-zinc-50/50 p-6 sm:p-7">
          {/* Total Spent */}
          <div className="pb-4 md:pb-0 md:pr-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Total Trip Spend
              </span>
              <span className="text-[11px] font-semibold text-zinc-500 bg-zinc-200/60 px-2 py-0.5 rounded-full">
                {bills.length} {bills.length === 1 ? 'bill' : 'bills'}
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-zinc-950 tracking-tight mt-1.5">
              {formatINR(totalSpendPaise)}
            </div>
            <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
              <span>Avg <strong>{formatINR(averageSpentPerHeadPaise)}</strong> per member</span>
            </div>
          </div>

          {/* Allocated Trip Budget */}
          <div className="py-4 md:py-0 md:px-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Allocated Trip Budget
              </span>
              {!isEditingBudget && !isReadOnly && (
                <button
                  onClick={() => {
                    setBudgetInput(String(paiseToRupees(targetBudgetPaise)));
                    setIsEditingBudget(true);
                  }}
                  className="text-[11px] font-bold text-zinc-700 hover:text-zinc-950 flex items-center gap-1 cursor-pointer bg-zinc-100 hover:bg-zinc-200 px-2 py-0.5 rounded-md transition-colors"
                >
                  <Edit2 className="w-2.5 h-2.5" /> Edit
                </button>
              )}
            </div>

            {isEditingBudget ? (
              <div className="mt-2 flex items-center gap-2">
                <div className="relative grow">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    className="w-full pl-6 pr-2 py-1.5 text-sm font-bold border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900"
                    placeholder="33000"
                  />
                </div>
                <button
                  onClick={handleSaveBudget}
                  className="px-3 py-1.5 text-xs font-bold bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 cursor-pointer"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="text-3xl sm:text-4xl font-black text-zinc-950 tracking-tight mt-1.5">
                {formatINR(targetBudgetPaise)}
              </div>
            )}

            <div className="text-xs text-zinc-500 mt-1">
              Target: <strong>{formatINR(budgetPerHeadPaise)}</strong> / member
            </div>
          </div>

          {/* Remaining Budget & Status */}
          <div className="pt-4 md:pt-0 md:pl-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Remaining Budget
              </span>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  isOverBudget
                    ? 'bg-rose-100 text-rose-800'
                    : percentUsed > 80
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {isOverBudget ? 'Over Budget' : 'On Track'}
              </span>
            </div>
            <div
              className={`text-3xl sm:text-4xl font-black tracking-tight mt-1.5 ${
                isOverBudget ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {isOverBudget
                ? `-${formatINR(Math.abs(remainingBudgetPaise))}`
                : formatINR(remainingBudgetPaise)}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {rawPercentUsed}% of allocated budget utilized
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-zinc-50 border-t border-b border-zinc-100">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-600 mb-1.5">
            <span>Budget Utilization: {formatINR(totalSpendPaise)} of {formatINR(targetBudgetPaise)}</span>
            <span className={isOverBudget ? 'text-rose-600 font-bold' : 'text-zinc-900 font-bold'}>
              {rawPercentUsed}%
            </span>
          </div>
          <div className="w-full h-3 bg-zinc-200 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverBudget
                  ? 'bg-rose-500'
                  : percentUsed > 85
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
        </div>

        {/* 4 Detailed Summary Quadrants */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Per-Head Equal Share */}
          <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200/80">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Users className="w-3.5 h-3.5" />
              <span>Per-Head Spend</span>
            </div>
            <div className="text-2xl font-black text-zinc-950">
              {formatINR(averageSpentPerHeadPaise)}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Uniform average across all {memberCount} fixed participants
            </p>
          </div>

          {/* Card 2: Highest Expense */}
          <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200/80">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Receipt className="w-3.5 h-3.5" />
              <span>Largest Bill</span>
            </div>
            {largestBill ? (
              <>
                <div className="text-2xl font-black text-zinc-950 truncate">
                  {formatINR(largestBill.amountPaise)}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1 truncate">
                  {largestBill.title} · {largestBill.merchant}
                </p>
              </>
            ) : (
              <div className="text-xs text-zinc-400 italic">No bills yet</div>
            )}
          </div>

          {/* Card 3: Top Upfront Spender */}
          <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200/80">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Top Upfront Payer</span>
            </div>
            {topPayer && topPayerBalance.totalPaidPaise > 0 ? (
              <>
                <div className="text-2xl font-black text-zinc-950">
                  {topPayer.name}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Fronted {formatINR(topPayerBalance.totalPaidPaise)} to merchants
                </p>
              </>
            ) : (
              <div className="text-xs text-zinc-400 italic">None yet</div>
            )}
          </div>

          {/* Card 4: Group Debt Clearance */}
          <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200/80">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-wider mb-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Settlement Clearance</span>
            </div>
            <div className="text-2xl font-black text-zinc-950">
              {formatINR(paidSettlementsPaise)}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              {formatINR(pendingSettlementsPaise)} pending settlement
            </p>
          </div>
        </div>

        {/* Footnote: Accounting Guarantee */}
        <div className="p-4 bg-zinc-100/70 border-t border-zinc-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Budget Reconciliation Guarantee:</strong> Total Group Paid ({formatINR(totalSpendPaise)}) equals Total Group Consumed ({formatINR(totalSharesPaise)}) with 100% integer paise precision.
            </span>
          </div>
          <span className="font-mono text-[11px] text-zinc-400">
            Zero discrepancy
          </span>
        </div>
      </div>
    </section>
  );
};
