import React, { useState, useEffect } from 'react';
import { Bill } from '../types';
import { FIXED_PARTICIPANTS, getParticipant } from '../constants/participants';
import { splitBillEqually } from '../lib/settlement/calculateSettlement';
import { formatINR, paiseToRupees, rupeesToPaise } from '../lib/formatters';
import { Avatar } from './Avatar';
import { X, Check, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';

interface EditBillModalProps {
  bill: Bill | null;
  onClose: () => void;
  onUpdateBill: (updatedBill: Bill) => void;
}

export const EditBillModal: React.FC<EditBillModalProps> = ({
  bill,
  onClose,
  onUpdateBill,
}) => {
  if (!bill) return null;

  const [title, setTitle] = useState(bill.title);
  const [amountStr, setAmountStr] = useState(String(paiseToRupees(bill.amountPaise)));
  const [merchant, setMerchant] = useState(bill.merchant);
  const [billDate, setBillDate] = useState(bill.billDate);
  const [paidBy, setPaidBy] = useState<string>(bill.paidBy);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    bill.participants
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (bill) {
      setTitle(bill.title);
      setAmountStr(String(paiseToRupees(bill.amountPaise)));
      setMerchant(bill.merchant);
      setBillDate(bill.billDate);
      setPaidBy(bill.paidBy);
      setSelectedParticipants(bill.participants);
    }
  }, [bill]);

  const amountPaise = rupeesToPaise(amountStr);
  const calculatedShares = splitBillEqually(amountPaise, selectedParticipants);
  const participantCount = selectedParticipants.length;

  const toggleParticipant = (id: string) => {
    if (selectedParticipants.includes(id)) {
      if (selectedParticipants.length === 1) {
        setErrorMessage('At least one participant is required.');
        return;
      }
      setSelectedParticipants(selectedParticipants.filter((p) => p !== id));
      setErrorMessage(null);
    } else {
      setSelectedParticipants([...selectedParticipants, id]);
      setErrorMessage(null);
    }
  };

  const handleSelectAll = () => {
    setSelectedParticipants(FIXED_PARTICIPANTS.map((p) => p.id));
    setErrorMessage(null);
  };

  const handleClearAll = () => {
    setSelectedParticipants([paidBy]);
    setErrorMessage(null);
  };

  const handleSave = () => {
    if (!title.trim()) {
      setErrorMessage('Please enter a bill title.');
      return;
    }
    if (amountPaise <= 0) {
      setErrorMessage('Please enter a valid amount.');
      return;
    }
    if (!paidBy) {
      setErrorMessage('Please choose who paid.');
      return;
    }
    if (selectedParticipants.length === 0) {
      setErrorMessage('Please choose at least one participant.');
      return;
    }

    const updated: Bill = {
      ...bill,
      title: title.trim(),
      amountPaise,
      merchant: merchant.trim() || 'General Expense',
      billDate,
      paidBy,
      participants: selectedParticipants,
      shares: calculatedShares,
    };

    onUpdateBill(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/70">
          <div>
            <h3 className="text-lg font-black text-zinc-950 tracking-tight">
              Edit Bill
            </h3>
            <p className="text-xs text-zinc-500">
              Modifying will automatically rebalance group settlements
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                Bill Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-sm font-medium text-zinc-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                Amount in Rupees (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-zinc-400">
                  ₹
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-base font-bold text-zinc-900 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                Merchant / Store
              </label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-sm font-medium text-zinc-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-sm font-medium text-zinc-900 bg-white"
              />
            </div>
          </div>

          {/* WHO PAID */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
              Who Paid? *
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
              {FIXED_PARTICIPANTS.map((participant) => {
                const isSelected = paidBy === participant.id;
                return (
                  <button
                    key={participant.id}
                    type="button"
                    onClick={() => setPaidBy(participant.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'border-zinc-950 bg-zinc-900 text-white shadow-xs'
                        : 'border-zinc-200 bg-zinc-50/70 hover:bg-zinc-100 text-zinc-800'
                    }`}
                  >
                    <Avatar participant={participant} size="sm" />
                    <span className="text-xs font-bold truncate">
                      {participant.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* WHO PARTICIPATED */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
                Who Participated? ({participantCount} selected) *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-zinc-600 hover:text-zinc-900 font-semibold px-2 py-0.5 rounded bg-zinc-100 cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs text-zinc-500 hover:text-zinc-800 font-semibold px-2 py-0.5 rounded bg-zinc-100 cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
              {FIXED_PARTICIPANTS.map((participant) => {
                const isChecked = selectedParticipants.includes(participant.id);
                return (
                  <button
                    key={participant.id}
                    type="button"
                    onClick={() => toggleParticipant(participant.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isChecked
                        ? 'border-zinc-900 bg-zinc-900/5 text-zinc-950 font-bold'
                        : 'border-zinc-200 bg-white text-zinc-400 opacity-60 hover:opacity-90'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar participant={participant} size="sm" />
                      <span className="text-xs truncate">{participant.name}</span>
                    </div>
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                        isChecked
                          ? 'bg-zinc-900 border-zinc-900 text-white'
                          : 'border-zinc-300 bg-white'
                      }`}
                    >
                      {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Split summary */}
          {amountPaise > 0 && participantCount > 0 && (
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 text-xs">
              <div className="flex justify-between font-semibold text-zinc-800">
                <span>Per-person share:</span>
                <span>{formatINR(Math.round(amountPaise / participantCount))} approx</span>
              </div>
              <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Exact integer paise reconciliation guaranteed.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-zinc-600 hover:bg-zinc-200/80 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-zinc-950 text-white hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <span>Update & Recalculate</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
