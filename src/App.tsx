import React, { useState, useEffect, useMemo } from 'react';
import { Bill, Settlement } from './types';
import { FIXED_PARTICIPANTS } from './constants/participants';
import {
  calculateNetBalances,
  calculateSettlement,
} from './lib/settlement/calculateSettlement';
import {
  loadBills,
  saveBills,
  loadSettlements,
  saveSettlements,
  loadViewingUser,
  saveViewingUser,
  resetToDefaultData,
  loadTripBudgetPaise,
  saveTripBudgetPaise,
} from './lib/storage';
import { Navbar } from './components/Navbar';
import { PersonalSummary } from './components/PersonalSummary';
import { SettlementView } from './components/SettlementView';
import { PeopleView } from './components/PeopleView';
import { BillsView } from './components/BillsView';
import { TripBudgetSummary } from './components/TripBudgetSummary';
import { AddBillModal } from './components/AddBillModal';
import { EditBillModal } from './components/EditBillModal';
import { ArrowRightLeft, Users, Receipt, Sparkles } from 'lucide-react';

export default function App() {
  // 1. Storage-backed state
  const [bills, setBills] = useState<Bill[]>(() => loadBills());
  const [savedSettlements, setSavedSettlements] = useState<Settlement[]>(() =>
    loadSettlements()
  );
  const [viewingUserId, setViewingUserId] = useState<string | null>(() =>
    loadViewingUser()
  );
  const [targetBudgetPaise, setTargetBudgetPaise] = useState<number>(() =>
    loadTripBudgetPaise()
  );

  // 2. Navigation & Modal states
  const [activeTab, setActiveTab] = useState<'settle' | 'people' | 'bills'>('settle');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  // Save viewing user on change
  const handleSelectViewingUser = (userId: string | null) => {
    setViewingUserId(userId);
    saveViewingUser(userId);
  };

  // 3. Dynamic Calculation Engine (Prompt Section 21, 23, 24)
  // Whenever bills change, instantly recalculate balances and settlement recommendations
  const balances = useMemo(() => {
    return calculateNetBalances(bills, FIXED_PARTICIPANTS);
  }, [bills]);

  const totalPaidMap = useMemo(() => {
    const map: Record<string, number> = {};
    Object.values(balances).forEach((b) => {
      map[b.participantId] = b.totalPaidPaise;
    });
    return map;
  }, [balances]);

  const settlements = useMemo(() => {
    const netEntries = Object.values(balances).map((b) => ({
      participantId: b.participantId,
      netBalancePaise: b.netBalancePaise,
    }));
    return calculateSettlement(netEntries, totalPaidMap, savedSettlements);
  }, [balances, totalPaidMap, savedSettlements]);

  // Keep saved settlements updated
  useEffect(() => {
    saveSettlements(settlements);
  }, [settlements]);

  // 4. Bill management handlers
  const handleSaveNewBill = (newBill: Bill) => {
    const updated = [newBill, ...bills];
    setBills(updated);
    saveBills(updated);
  };

  const handleUpdateBill = (updatedBill: Bill) => {
    const updated = bills.map((b) => (b.id === updatedBill.id ? updatedBill : b));
    setBills(updated);
    saveBills(updated);
  };

  const handleDeleteBill = (billId: string) => {
    const updated = bills.filter((b) => b.id !== billId);
    setBills(updated);
    saveBills(updated);
  };

  const handleToggleSettlementStatus = (settlementId: string) => {
    const updated = settlements.map((s) => {
      if (s.id === settlementId) {
        const nextStatus: 'paid' | 'pending' =
          s.status === 'paid' ? 'pending' : 'paid';
        return {
          ...s,
          status: nextStatus,
          paidAt: nextStatus === 'paid' ? new Date().toISOString() : undefined,
        };
      }
      return s;
    });
    setSavedSettlements(updated);
    saveSettlements(updated);
  };

  const handleUpdateBudget = (newBudgetPaise: number) => {
    setTargetBudgetPaise(newBudgetPaise);
    saveTripBudgetPaise(newBudgetPaise);
  };

  const handleResetData = () => {
    if (
      window.confirm(
        'Reset bills and settlements to sample trip data (Ticket ₹2,500 & Tiffin ₹1,000)?'
      )
    ) {
      const { bills: defBills, settlements: defSettlements } = resetToDefaultData();
      setBills(defBills);
      setSavedSettlements(defSettlements);
      setViewingUserId(null);
    }
  };

  // Metrics for badges
  const pendingSettlementsCount = settlements.filter(
    (s) => s.status === 'pending'
  ).length;

  return (
    <div className="min-h-screen bg-zinc-100/60 text-zinc-900 flex flex-col font-sans selection:bg-zinc-900 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        viewingUserId={viewingUserId}
        onSelectViewingUser={handleSelectViewingUser}
        onOpenAddBill={() => setIsAddModalOpen(true)}
        onResetData={handleResetData}
        totalBillsCount={bills.length}
      />

      {/* Main Container */}
      <main className="grow max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Prominent Personal Answer Card (Prompt Section 18, 19, 32) */}
        <PersonalSummary
          viewingUserId={viewingUserId}
          onSelectUser={handleSelectViewingUser}
          balances={balances}
          settlements={settlements}
          onToggleStatus={handleToggleSettlementStatus}
        />

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-200/80 rounded-2xl mb-6 max-w-md">
          <button
            onClick={() => setActiveTab('settle')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'settle'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4 text-zinc-500" />
            <span>Settle Up</span>
            {pendingSettlementsCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  activeTab === 'settle'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-zinc-300 text-zinc-700'
                }`}
              >
                {pendingSettlementsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('people')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'people'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Users className="w-4 h-4 text-zinc-500" />
            <span>People</span>
            <span className="text-[10px] text-zinc-400 font-mono">
              ({FIXED_PARTICIPANTS.length})
            </span>
          </button>

          <button
            onClick={() => setActiveTab('bills')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'bills'
                ? 'bg-white text-zinc-950 shadow-xs'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Receipt className="w-4 h-4 text-zinc-500" />
            <span>Bills</span>
            <span className="text-[10px] text-zinc-400 font-mono">
              ({bills.length})
            </span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'settle' && (
          <SettlementView
            settlements={settlements}
            balances={balances}
            onToggleStatus={handleToggleSettlementStatus}
            viewingUserId={viewingUserId}
          />
        )}

        {activeTab === 'people' && (
          <PeopleView
            balances={balances}
            bills={bills}
            settlements={settlements}
            onSetViewingUser={handleSelectViewingUser}
            onToggleStatus={handleToggleSettlementStatus}
            viewingUserId={viewingUserId}
          />
        )}

        {activeTab === 'bills' && (
          <BillsView
            bills={bills}
            onOpenAddBill={() => setIsAddModalOpen(true)}
            onEditBill={(bill) => setEditingBill(bill)}
            onDeleteBill={handleDeleteBill}
          />
        )}

        {/* Total Trip Budget & Final Ledger (Calculated at the total last) */}
        <TripBudgetSummary
          bills={bills}
          balances={balances}
          settlements={settlements}
          targetBudgetPaise={targetBudgetPaise}
          onUpdateBudget={handleUpdateBudget}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 bg-white/70 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium">
            <span className="font-bold text-zinc-900">PAYANA</span>
            <span>·</span>
            <span>Minimalist Collaborative Bill Engine</span>
          </div>
          <div className="text-zinc-400 text-[11px]">
            Zero floating-point errors · Integer paise precision · Single group
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AddBillModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSaveBill={handleSaveNewBill}
      />

      {editingBill && (
        <EditBillModal
          bill={editingBill}
          onClose={() => setEditingBill(null)}
          onUpdateBill={handleUpdateBill}
        />
      )}
    </div>
  );
}
