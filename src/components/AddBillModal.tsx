import React, { useState } from 'react';
import { Bill } from '../types';
import { FIXED_PARTICIPANTS, getParticipant } from '../constants/participants';
import { splitBillEqually } from '../lib/settlement/calculateSettlement';
import { formatINR, rupeesToPaise } from '../lib/formatters';
import { BillScanner } from './scanner/BillScanner';
import { Avatar } from './Avatar';
import {
  X,
  Sparkles,
  Edit3,
  Check,
  Receipt,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  ChevronLeft,
} from 'lucide-react';

interface AddBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBill: (bill: Bill) => void;
}

export const AddBillModal: React.FC<AddBillModalProps> = ({
  isOpen,
  onClose,
  onSaveBill,
}) => {
  if (!isOpen) return null;

  // Active step in Add Bill Flow: 'scanner' | 'split-form' | 'manual'
  const [mode, setMode] = useState<'scanner' | 'split-form' | 'manual'>('scanner');

  // Form states
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [merchant, setMerchant] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidBy, setPaidBy] = useState<string>('gouthu');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    FIXED_PARTICIPANTS.map((p) => p.id)
  );
  const [billImage, setBillImage] = useState<string | null>(null);
  const [rawOcrText, setRawOcrText] = useState<string>('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Financial calculations
  const amountPaise = rupeesToPaise(amountStr);
  const calculatedShares = splitBillEqually(amountPaise, selectedParticipants);
  const participantCount = selectedParticipants.length;

  // Handle OCR completion from BillScanner
  const handleScanComplete = (result: {
    merchant: string;
    amount: number;
    date: string;
    originalImage: string | null;
    rawText: string;
  }) => {
    setMerchant(result.merchant);
    setTitle(result.merchant ? `${result.merchant} Bill` : 'Receipt Expense');
    setAmountStr(String(result.amount));
    setBillDate(result.date);
    setBillImage(result.originalImage);
    setRawOcrText(result.rawText);
    setErrorMessage(null);

    // Proceed to Who Paid & Participant Split step
    setMode('split-form');
  };

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
      setErrorMessage('Please confirm a valid bill amount greater than ₹0.');
      return;
    }
    if (!paidBy) {
      setErrorMessage('Please select who paid the bill.');
      return;
    }
    if (selectedParticipants.length === 0) {
      setErrorMessage('Please select at least one participant.');
      return;
    }

    const newBill: Bill = {
      id: `bill-${Date.now()}`,
      title: title.trim(),
      amountPaise,
      merchant: merchant.trim() || 'General Merchant',
      billDate,
      billImage,
      paidBy,
      participants: selectedParticipants,
      shares: calculatedShares,
      createdAt: new Date().toISOString(),
    };

    onSaveBill(newBill);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/70">
          <div className="flex items-center gap-2.5">
            {mode !== 'scanner' && (
              <button
                type="button"
                onClick={() => setMode('scanner')}
                className="p-1 -ml-1 text-zinc-400 hover:text-zinc-800 rounded-lg hover:bg-zinc-200/60 cursor-pointer"
                title="Back to scanner"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-950 tracking-tight">
                {mode === 'scanner'
                  ? 'Add Bill · OCR Scanner'
                  : mode === 'split-form'
                  ? 'Confirm Split & Participants'
                  : 'Manual Bill Entry'}
              </h3>
              <p className="text-xs text-zinc-500">
                {mode === 'scanner'
                  ? 'Photograph receipt or choose file'
                  : 'Select payer and participants for equal split'}
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

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* STEP 1: BILL SCANNER (Default view) */}
          {mode === 'scanner' && (
            <BillScanner
              onScanComplete={handleScanComplete}
              onEnterManually={() => setMode('manual')}
              onCancel={onClose}
            />
          )}

          {/* STEP 2: SPLIT & PARTICIPANT SELECTION (After OCR confirms or Manual entry) */}
          {(mode === 'split-form' || mode === 'manual') && (
            <>
              {/* Receipt Snippet Banner if image was scanned */}
              {billImage && (
                <div className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <img
                      src={billImage}
                      alt="Scanned receipt"
                      className="w-12 h-12 rounded-lg object-cover border border-zinc-200"
                    />
                    <div>
                      <div className="text-xs font-bold text-zinc-900">
                        {merchant || 'Scanned Receipt'}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        Original bill image preserved for proof
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMode('scanner')}
                    className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 px-2.5 py-1 rounded-lg cursor-pointer"
                  >
                    Rescan
                  </button>
                </div>
              )}

              {/* Error Message */}
              {errorMessage && (
                <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Amount, Title, Merchant, Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                    Bill Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Dinner, Fuel, Hotel Stay"
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
                      placeholder="2840"
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
                    placeholder="e.g. Fisherman's Wharf"
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

              {/* WHO PAID? (Prompt Section 5 & 15: Exactly 1 payer, doesn't need to participate) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Who Paid? (Exactly 1 Payer) *
                  </label>
                  <span className="text-xs text-zinc-500">
                    Selected:{' '}
                    <strong className="text-zinc-900">
                      {getParticipant(paidBy).name}
                    </strong>
                  </span>
                </div>

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
                <p className="text-[11px] text-zinc-400 mt-1.5">
                  The person who actually settled the merchant.
                </p>
              </div>

              {/* WHO PARTICIPATED? (Prompt Section 6 & 15: Select All / Clear All) */}
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
                          <span className="text-xs truncate">
                            {participant.name}
                          </span>
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

              {/* EQUAL SPLIT ENGINE CALCULATION PREVIEW */}
              {amountPaise > 0 && participantCount > 0 && (
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-200/70">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Calculated Split Breakdown
                    </span>
                    <span className="text-xs font-semibold text-zinc-700">
                      {formatINR(amountPaise)} ÷ {participantCount} participants
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {selectedParticipants.map((id) => {
                      const p = getParticipant(id);
                      const share = calculatedShares[id] || 0;
                      return (
                        <div
                          key={id}
                          className="p-2 bg-white rounded-lg border border-zinc-200 flex items-center justify-between"
                        >
                          <span className="font-semibold text-zinc-800 truncate">
                            {p.name}
                          </span>
                          <span className="font-bold text-zinc-900 ml-1">
                            {formatINR(share)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 text-[11px] text-zinc-500 flex items-center justify-between pt-2 border-t border-zinc-200/60">
                    <span>Sum of shares: {formatINR(amountPaise)}</span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> 100% exact integer paise
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {(mode === 'split-form' || mode === 'manual') && (
          <div className="p-4 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMode('scanner')}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-zinc-600 hover:bg-zinc-200/80 transition-colors cursor-pointer"
            >
              Back to Scanner
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-zinc-950 text-white hover:bg-zinc-800 transition-all shadow-xs hover:shadow cursor-pointer"
            >
              <span>Save & Split Bill</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
