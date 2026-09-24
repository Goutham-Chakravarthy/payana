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
  isReadOnly?: boolean;
}

export const BillDetailModal: React.FC<BillDetailModalProps> = ({
  bill,
  onClose,
  onEdit,
  onDelete,
  isReadOnly = false,
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
            <div className="text-xs text-zinc-400 mt-1">
              Split equally among {participantCount} people ({formatINR(averageSharePaise)} each)
            </div>
          </div>

          {/* Paid By info */}
          <div className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-200 rounded-xl">
            <div className="flex items-center gap-3">
              <Avatar participant={payer} size="md" />
              <div>
                <div className="text-[11px] uppercase font-bold text-zinc-400">
                  Paid Entirely By
                </div>
                <div className="text-sm font-bold text-zinc-900">
                  {payer.name}
                </div>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg">
              Paid in Full
            </span>
          </div>

          {/* Participants & Exact Integer Share Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-600 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>Participants ({participantCount})</span>
              </div>
              <span className="text-[11px] text-zinc-400 font-mono">
                Exact integer paise split
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {bill.participants.map((pid) => {
                const p = getParticipant(pid);
                const sharePaise = bill.shares[pid] || 0;
                const isPayer = pid === bill.paidBy;

                return (
                  <div
                    key={pid}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs ${
                      isPayer
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white border-zinc-200 text-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar participant={p} size="sm" />
                      <div>
                        <div className="font-semibold flex items-center gap-1">
                          <span>{p.name}</span>
                          {isPayer && (
                            <span className="text-[9px] px-1 py-0.2 bg-white/20 text-white rounded font-mono">
                              Payer
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold">
                        {formatINR(sharePaise)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Receipt Photo if attached */}
          {bill.billImage && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-600 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>Receipt Photo</span>
              </div>
              <div className="border border-zinc-200 rounded-xl overflow-hidden bg-zinc-100 max-h-64 flex items-center justify-center">
                <img
                  src={bill.billImage}
                  alt="Bill Receipt"
                  className="max-h-64 w-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Guarantee Note */}
          <div className="flex items-center gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-500">
            <ShieldCheck className="w-4 h-4 text-zinc-400 shrink-0" />
            <span>This expense is reconciled live into the group debt simplification engine.</span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50/70 flex items-center justify-between gap-3">
          {isReadOnly ? (
            <div className="w-full flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};
