import React from 'react';
import { Participant, ParticipantBalance, Settlement } from '../types';
import { FIXED_PARTICIPANTS, getParticipant } from '../constants/participants';
import { formatINR } from '../lib/formatters';
import { Avatar } from './Avatar';
import { ArrowRight, CheckCircle2, Clock, Info, User } from 'lucide-react';

interface PersonalSummaryProps {
  viewingUserId: string | null;
  onSelectUser: (id: string | null) => void;
  balances: Record<string, ParticipantBalance>;
  settlements: Settlement[];
  onToggleStatus: (settlementId: string) => void;
  isReadOnly?: boolean;
}

export const PersonalSummary: React.FC<PersonalSummaryProps> = ({
  viewingUserId,
  onSelectUser,
  balances,
  settlements,
  onToggleStatus,
  isReadOnly = false,
}) => {
  // If no single user is selected, show group quick-switch chips or prompt
  const participant = viewingUserId ? getParticipant(viewingUserId) : null;
  const balance = viewingUserId ? balances[viewingUserId] : null;

  // Payments this user needs to make (Outgoing: pending first, paid last)
  const outgoingSettlements = settlements
    .filter((s) => s.fromParticipantId === viewingUserId)
    .sort((a, b) => {
      if (a.status === 'pending' && b.status === 'paid') return -1;
      if (a.status === 'paid' && b.status === 'pending') return 1;
      return b.amountPaise - a.amountPaise;
    });

  // Payments this user should receive (Incoming: pending first, paid last)
  const incomingSettlements = settlements
    .filter((s) => s.toParticipantId === viewingUserId)
    .sort((a, b) => {
      if (a.status === 'pending' && b.status === 'paid') return -1;
      if (a.status === 'paid' && b.status === 'pending') return 1;
      return b.amountPaise - a.amountPaise;
    });

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs p-5 sm:p-6 mb-6">
      {/* Quick Switcher Bar */}
      <div className="mb-4 pb-4 border-b border-zinc-100 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mr-1">
            Check Status:
          </span>
          <button
            onClick={() => onSelectUser(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${viewingUserId === null
                ? 'bg-zinc-900 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
          >
            All Group
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {FIXED_PARTICIPANTS.map((p) => {
            const isSelected = viewingUserId === p.id;
            const pBalance = balances[p.id]?.netBalancePaise || 0;
            return (
              <button
                key={p.id}
                onClick={() => onSelectUser(p.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0 border cursor-pointer ${isSelected
                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-xs font-semibold'
                    : 'border-zinc-200 bg-zinc-50/80 hover:bg-zinc-100 text-zinc-700'
                  }`}
              >
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{
                    backgroundColor: isSelected ? '#ffffff22' : p.bgColor,
                    color: isSelected ? '#ffffff' : p.color,
                  }}
                >
                  {p.initials[0]}
                </div>
                <span>{p.name}</span>
                <span
                  className={`text-[10px] ml-0.5 ${isSelected
                      ? 'text-zinc-300'
                      : pBalance > 0
                        ? 'text-emerald-600 font-semibold'
                        : pBalance < 0
                          ? 'text-rose-600 font-semibold'
                          : 'text-zinc-400'
                    }`}
                >
                  {pBalance > 0 ? '+' : ''}
                  {Math.round(pBalance / 100)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* When Viewing as a Specific Participant */}
      {participant && balance ? (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
            <div className="flex items-center gap-3.5">
              <Avatar participant={participant} size="lg" />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
                    {participant.name}
                  </h2>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${balance.status === 'receive'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : balance.status === 'pay'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                      }`}
                  >
                    {balance.status === 'receive'
                      ? 'Should Receive'
                      : balance.status === 'pay'
                        ? 'Needs to Pay'
                        : 'Settled Up'}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Paid {formatINR(balance.totalPaidPaise)} total · Consumed{' '}
                  {formatINR(balance.totalSharePaise)}
                </p>
              </div>
            </div>

            {/* Prominent Net Balance Indicator */}
            <div className="text-left sm:text-right bg-zinc-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Your Net Balance
              </div>
              <div
                className={`text-2xl sm:text-3xl font-black tracking-tight ${balance.netBalancePaise > 0
                    ? 'text-emerald-600'
                    : balance.netBalancePaise < 0
                      ? 'text-rose-600'
                      : 'text-zinc-700'
                  }`}
              >
                {formatINR(balance.netBalancePaise, { showSign: true })}
              </div>
            </div>
          </div>

          {/* Actionable Settlement Directions (Section 18 & 19) */}
          <div className="mt-5">
            {balance.status === 'pay' && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2.5">
                  You need to pay
                </div>
                <div className="space-y-2.5">
                  {outgoingSettlements.length > 0 ? (
                    outgoingSettlements.map((s) => {
                      const recipient = getParticipant(s.toParticipantId);
                      const isPaid = s.status === 'paid';
                      return (
                        <div
                          key={s.id}
                          className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${isPaid
                              ? 'bg-emerald-50/50 border-emerald-200 opacity-80'
                              : 'bg-rose-50/40 border-rose-200/80 hover:border-rose-300'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar participant={recipient} size="md" />
                            <div>
                              <div className="text-sm font-semibold text-zinc-900">
                                Pay to {recipient.name}
                              </div>
                              <div className="text-xs text-zinc-500">
                                {isPaid ? 'Payment marked complete' : 'Consolidated settlement'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg sm:text-xl font-bold text-zinc-900">
                              {formatINR(s.amountPaise)}
                            </span>
                            {isReadOnly ? (
                              <span
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${isPaid
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                  }`}
                              >
                                {isPaid ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Settled</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                                    <span>Pending</span>
                                  </>
                                )}
                              </span>
                            ) : (
                              <button
                                onClick={() => onToggleStatus(s.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 ${isPaid
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'bg-zinc-900 text-white hover:bg-zinc-800'
                                  }`}
                              >
                                {isPaid ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Paid</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>Mark Paid</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-zinc-500 italic p-3 bg-zinc-50 rounded-xl">
                      No pending payment instructions.
                    </div>
                  )}
                </div>
              </div>
            )}

            {balance.status === 'receive' && (
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2.5">
                  You should receive
                </div>
                <div className="space-y-2.5">
                  {incomingSettlements.length > 0 ? (
                    incomingSettlements.map((s) => {
                      const debtor = getParticipant(s.fromParticipantId);
                      const isPaid = s.status === 'paid';
                      return (
                        <div
                          key={s.id}
                          className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${isPaid
                              ? 'bg-emerald-50/50 border-emerald-200 opacity-80'
                              : 'bg-emerald-50/20 border-emerald-200/80 hover:border-emerald-300'
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar participant={debtor} size="md" />
                            <div>
                              <div className="text-sm font-semibold text-zinc-900">
                                From {debtor.name}
                              </div>
                              <div className="text-xs text-zinc-500">
                                {isPaid ? 'Received' : 'Awaiting payment'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-lg sm:text-xl font-bold text-emerald-700">
                              {formatINR(s.amountPaise)}
                            </span>
                            {isReadOnly ? (
                              <span
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${isPaid
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-zinc-100 text-zinc-600'
                                  }`}
                              >
                                {isPaid ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Received</span>
                                  </>
                                ) : (
                                  <span>Pending</span>
                                )}
                              </span>
                            ) : (
                              <button
                                onClick={() => onToggleStatus(s.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1 ${isPaid
                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200'
                                  }`}
                              >
                                {isPaid ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Received</span>
                                  </>
                                ) : (
                                  <span>Mark as Received</span>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-zinc-500 italic p-3 bg-zinc-50 rounded-xl">
                      No incoming settlements pending.
                    </div>
                  )}
                </div>
              </div>
            )}

            {balance.status === 'settled' && (
              <div className="flex items-center gap-3 p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-semibold">You are completely settled up!</div>
                  <div className="text-xs text-emerald-700">
                    Your total paid matches your total consumed share (₹0.00 balance).
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Group Overview banner when no single person selected
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2">
          <div>
            <h2 className="text-lg font-bold text-zinc-900">
              Fixed Trip Group · 9 Participants
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Select any participant above or below to immediately see “Who do I pay?” and “Who pays me?”.
            </p>
          </div>
          <div className="text-xs text-zinc-500 bg-zinc-100 px-3 py-2 rounded-xl border border-zinc-200">
            Equal split engine · Integer paise precision · Minimum transactions
          </div>
        </div>
      )}
    </div>
  );
};
