import React from 'react';
import { Bill, Participant, ParticipantBalance, Settlement } from '../types';
import { Avatar } from './Avatar';
import { formatINR, formatDate } from '../lib/formatters';
import { X, ArrowRight, CheckCircle2, Clock, Receipt, UserCheck } from 'lucide-react';
import { getParticipant } from '../constants/participants';

interface PersonDetailModalProps {
  participant: Participant | null;
  balance: ParticipantBalance | null;
  bills: Bill[];
  settlements: Settlement[];
  onClose: () => void;
  onSetViewingUser: (id: string) => void;
  onToggleStatus: (settlementId: string) => void;
}

export const PersonDetailModal: React.FC<PersonDetailModalProps> = ({
  participant,
  balance,
  bills,
  settlements,
  onClose,
  onSetViewingUser,
  onToggleStatus,
}) => {
  if (!participant || !balance) return null;

  // Bills this person paid
  const paidBills = bills.filter((b) => b.paidBy === participant.id);

  // Bills this person participated in
  const participatedBills = bills.filter((b) =>
    b.participants.includes(participant.id)
  );

  // Outgoing payments this person needs to make (pending first, paid last)
  const outgoingSettlements = settlements
    .filter((s) => s.fromParticipantId === participant.id)
    .sort((a, b) => {
      if (a.status === 'pending' && b.status === 'paid') return -1;
      if (a.status === 'paid' && b.status === 'pending') return 1;
      return b.amountPaise - a.amountPaise;
    });

  // Incoming payments this person should receive (pending first, paid last)
  const incomingSettlements = settlements
    .filter((s) => s.toParticipantId === participant.id)
    .sort((a, b) => {
      if (a.status === 'pending' && b.status === 'paid') return -1;
      if (a.status === 'paid' && b.status === 'pending') return 1;
      return b.amountPaise - a.amountPaise;
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-2xl border border-zinc-200 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <Avatar participant={participant} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-zinc-950">
                  {participant.name}
                </h3>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                    balance.status === 'receive'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : balance.status === 'pay'
                      ? 'bg-rose-50 text-rose-700 border-rose-300'
                      : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                  }`}
                >
                  {balance.status === 'receive'
                    ? 'Receive'
                    : balance.status === 'pay'
                    ? 'Pay'
                    : 'Settled'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Participant Activity Ledger
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Financial Summary Box */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-center">
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Total Paid
              </div>
              <div className="text-base sm:text-lg font-bold text-zinc-900 mt-0.5">
                {formatINR(balance.totalPaidPaise)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Consumed Share
              </div>
              <div className="text-base sm:text-lg font-bold text-zinc-900 mt-0.5">
                {formatINR(balance.totalSharePaise)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Net Balance
              </div>
              <div
                className={`text-base sm:text-lg font-black mt-0.5 ${
                  balance.netBalancePaise > 0
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

          {/* Settle Up Directives for this Person */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Settlement Instructions
            </h4>
            {balance.status === 'pay' && (
              <div className="space-y-2">
                {outgoingSettlements.map((s) => {
                  const recipient = getParticipant(s.toParticipantId);
                  const isPaid = s.status === 'paid';
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between p-3 rounded-xl border ${
                        isPaid
                          ? 'bg-emerald-50/40 border-emerald-200 text-zinc-600'
                          : 'bg-rose-50/40 border-rose-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar participant={recipient} size="sm" />
                        <span className="text-xs sm:text-sm font-semibold text-zinc-900">
                          Pay to {recipient.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-bold text-zinc-950">
                          {formatINR(s.amountPaise)}
                        </span>
                        <button
                          onClick={() => onToggleStatus(s.id)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-900 text-white cursor-pointer hover:bg-zinc-800"
                        >
                          {isPaid ? 'Paid ✓' : 'Mark Paid'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {balance.status === 'receive' && (
              <div className="space-y-2">
                {incomingSettlements.map((s) => {
                  const debtor = getParticipant(s.fromParticipantId);
                  const isPaid = s.status === 'paid';
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between p-3 rounded-xl border ${
                        isPaid
                          ? 'bg-emerald-50/40 border-emerald-200 text-zinc-600'
                          : 'bg-emerald-50/20 border-emerald-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar participant={debtor} size="sm" />
                        <span className="text-xs sm:text-sm font-semibold text-zinc-900">
                          Receive from {debtor.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-bold text-emerald-700">
                          {formatINR(s.amountPaise)}
                        </span>
                        <button
                          onClick={() => onToggleStatus(s.id)}
                          className="px-2.5 py-1 rounded-md text-xs font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200 cursor-pointer hover:bg-zinc-200"
                        >
                          {isPaid ? 'Received ✓' : 'Mark Received'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {balance.status === 'settled' && (
              <div className="text-xs text-zinc-500 p-3 bg-zinc-50 rounded-xl">
                No money owed or receivable. Perfectly balanced.
              </div>
            )}
          </div>

          {/* Bills Paid By This Person */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Bills Paid ({paidBills.length})
            </h4>
            {paidBills.length > 0 ? (
              <div className="space-y-2">
                {paidBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-zinc-900">
                        {bill.title}
                      </div>
                      <div className="text-zinc-500">
                        {bill.merchant} · {formatDate(bill.billDate)}
                      </div>
                    </div>
                    <div className="font-bold text-zinc-900 text-sm">
                      {formatINR(bill.amountPaise)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-zinc-500 italic p-3 bg-zinc-50 rounded-xl">
                Has not paid for any bills yet.
              </div>
            )}
          </div>

          {/* Bills Participated In */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Bills Participated In ({participatedBills.length})
            </h4>
            <div className="space-y-2">
              {participatedBills.map((bill) => (
                <div
                  key={bill.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs"
                >
                  <div>
                    <div className="font-semibold text-zinc-900">
                      {bill.title}
                    </div>
                    <div className="text-zinc-500">
                      Paid by {getParticipant(bill.paidBy).name} · {bill.participants.length} people
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-zinc-900">
                      Share: {formatINR(bill.shares[participant.id] || 0)}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      Total: {formatINR(bill.amountPaise)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50/70 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              onSetViewingUser(participant.id);
              onClose();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Set as Active "Viewing As"</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
