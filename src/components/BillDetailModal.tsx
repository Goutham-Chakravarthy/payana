import React from 'react';
import { Bill } from '../types';
import { getParticipant } from '../constants/participants';
import { formatINR, formatDate } from '../lib/formatters';
import { Avatar } from './Avatar';
import { X, Calendar, Store, Users, Trash2, Edit, ShieldCheck, FileText } from 'lucide-react';

interface BillDetailModalProps {
  bill: Bill | null;
  onClose: () => void;
  onEdit: (bill: Bill) => void;
  onDelete: (billId: string) => void;
}

export const BillDetailModal: React.FC<BillDetailModalProps> = ({
  bill,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!bill) return null;

  const payer = getParticipant(bill.paidBy);
  const participantCount = bill.participants.length;
  const averageSharePaise = Math.round(bill.amountPaise / Math.max(participantCount, 1));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl border border-zinc-200 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/70">
          <div>
            <h3 className="text-lg font-bold text-zinc-950 tracking-tight">
              {bill.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
              <Store className="w-3.5 h-3.5" />
              <span>{bill.merchant}</span>
              <span>•</span>
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(bill.billDate)}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Main Amount Card */}
          <div className="bg-zinc-950 text-white rounded-xl p-5 text-center shadow-xs">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Total Bill Amount
            </div>
            <div className="text-3xl sm:text-4xl font-black tracking-tight mt-1">
              {formatINR(bill.amountPaise)}
            </div>
            <div className="text-xs text-zinc-400 mt-2 flex items-center justify-center gap-1.5">
              <span>{participantCount} participants</span>
              <span>•</span>
              <span>Avg {formatINR(averageSharePaise)} each</span>
            </div>
          </div>

          {/* Receipt Image if available */}
          {bill.billImage && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Attached Receipt Photo
              </div>
              <div className="rounded-xl overflow-hidden border border-zinc-200 max-h-48 bg-zinc-100 flex items-center justify-center">
                <img
                  src={bill.billImage}
                  alt={bill.title}
                  className="max-h-48 object-contain w-full"
                />
              </div>
            </div>
          )}

          {/* Who Paid */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
              Paid By
            </div>
            <div className="flex items-center justify-between p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl">
              <div className="flex items-center gap-3">
                <Avatar participant={payer} size="md" />
                <div>
                  <div className="text-sm font-bold text-zinc-900">
                    {payer.name}
                  </div>
                  <div className="text-xs text-zinc-500">
                    Paid {formatINR(bill.amountPaise)} to merchant
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded bg-emerald-100 text-emerald-800">
                Payer
              </span>
            </div>
          </div>

          {/* Participant Shares Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Participant Shares ({participantCount})
              </div>
              <span className="text-[11px] text-zinc-400">
                Sum: {formatINR(bill.amountPaise)}
              </span>
            </div>

            <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden">
              {bill.participants.map((participantId) => {
                const p = getParticipant(participantId);
                const sharePaise = bill.shares[participantId] || averageSharePaise;
                const isPayer = participantId === bill.paidBy;

                return (
                  <div
                    key={participantId}
                    className="p-3 flex items-center justify-between bg-white text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar participant={p} size="sm" />
                      <span className="font-semibold text-zinc-900">
                        {p.name}
                      </span>
                      {isPayer && (
                        <span className="text-[10px] text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">
                          Payer
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-zinc-900 text-sm">
                      {formatINR(sharePaise)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prompt section 27 Note */}
          <div className="flex items-center gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-500">
            <ShieldCheck className="w-4 h-4 text-zinc-400 shrink-0" />
            <span>This payment contributed to your current settlement.</span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50/70 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              if (window.confirm(`Delete "${bill.title}"? Balances will be recalculated.`)) {
                onDelete(bill.id);
                onClose();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Bill</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onEdit(bill);
                onClose();
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Bill</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-200 text-zinc-700 hover:bg-zinc-300 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
