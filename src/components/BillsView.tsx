import React, { useState } from 'react';
import { Bill } from '../types';
import { getParticipant } from '../constants/participants';
import { formatINR, formatDate } from '../lib/formatters';
import { Avatar } from './Avatar';
import { BillDetailModal } from './BillDetailModal';
import { Receipt, Calendar, Store, ChevronRight, Plus, Image as ImageIcon } from 'lucide-react';

interface BillsViewProps {
  bills: Bill[];
  onOpenAddBill: () => void;
  onEditBill: (bill: Bill) => void;
  onDeleteBill: (billId: string) => void;
  isReadOnly?: boolean;
}

export const BillsView: React.FC<BillsViewProps> = ({
  bills,
  onOpenAddBill,
  onEditBill,
  onDeleteBill,
  isReadOnly = false,
}) => {
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  const totalSpendPaise = bills.reduce((sum, b) => sum + b.amountPaise, 0);

  return (
    <div className="space-y-4">
      {/* Bills Header */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight uppercase">
              BILLS & EXPENSES ({bills.length})
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Every receipt recorded in the group · Recalculates net balances in real time
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-left sm:text-right bg-zinc-50 border border-zinc-200/80 px-3.5 py-1.5 rounded-xl">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              Total Group Spend
            </div>
            <div className="text-lg font-black text-zinc-900">
              {formatINR(totalSpendPaise)}
            </div>
          </div>

          {!isReadOnly && (
            <button
              onClick={onOpenAddBill}
              className="flex items-center gap-1.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold px-3.5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Bill</span>
            </button>
          )}
        </div>
      </div>

      {/* Bills List */}
      {bills.length > 0 ? (
        <div className="space-y-3">
          {bills.map((bill) => {
            const payer = getParticipant(bill.paidBy);
            const count = bill.participants.length;

            return (
              <div
                key={bill.id}
                onClick={() => setSelectedBill(bill)}
                className="bg-white rounded-2xl border border-zinc-200/90 p-4 sm:p-5 shadow-xs hover:border-zinc-300 hover:shadow-sm transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0 border border-zinc-200">
                    <Receipt className="w-5 h-5 text-zinc-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-zinc-950 text-base tracking-tight">
                        {bill.title}
                      </h3>
                      {bill.billImage && (
                        <span
                          className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded flex items-center gap-1 border border-zinc-200"
                          title="Receipt image attached"
                        >
                          <ImageIcon className="w-2.5 h-2.5" /> Receipt
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Store className="w-3 h-3 text-zinc-400" />
                        {bill.merchant}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-400" />
                        {formatDate(bill.billDate)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right side: Payer & Amount & Share info */}
                <div className="flex items-center justify-between sm:justify-end gap-5 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-100">
                  {/* Paid By info */}
                  <div className="flex items-center gap-2">
                    <Avatar participant={payer} size="sm" />
                    <div className="text-left">
                      <div className="text-[10px] text-zinc-400 uppercase font-semibold">
                        Paid By
                      </div>
                      <div className="text-xs font-bold text-zinc-800">
                        {payer.name}
                      </div>
                    </div>
                  </div>

                  {/* Total Bill Amount */}
                  <div className="text-right min-w-[90px]">
                    <div className="text-lg sm:text-xl font-black text-zinc-950 tracking-tight">
                      {formatINR(bill.amountPaise)}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-zinc-400 hidden sm:block shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center mx-auto mb-3">
            <Receipt className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-zinc-900">
            No bills added yet
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
            {isReadOnly
              ? 'The trip organizer has not added any bills yet.'
              : 'Scan an invoice or enter a bill to begin equal splitting and smart settlement.'}
          </p>
          {!isReadOnly && (
            <button
              onClick={onOpenAddBill}
              className="inline-flex items-center gap-1.5 bg-zinc-950 text-white text-xs font-semibold px-4 py-2 rounded-xl hover:bg-zinc-800 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Bill</span>
            </button>
          )}
        </div>
      )}

      {/* Detail Modal */}
      {selectedBill && (
        <BillDetailModal
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
          onEdit={onEditBill}
          onDelete={onDeleteBill}
          isReadOnly={isReadOnly}
        />
      )}
    </div>
  );
};
