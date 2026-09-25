import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import {
  isSupabaseConfigured,
  fetchBills,
  saveBill,
  deleteBill,
  fetchSettlements,
  saveSettlement,
  fetchTripBudget,
  saveTripBudget,
  clearAllDataInSupabase,
  subscribeToRealtime,
} from './lib/supabase';
import { isUrlAdminMode, isUrlViewerMode, getStoredAdminStatus, setStoredAdminStatus } from './lib/auth';
import { Navbar } from './components/Navbar';
import { PersonalSummary } from './components/PersonalSummary';
import { SettlementView } from './components/SettlementView';
import { PeopleView } from './components/PeopleView';
import { BillsView } from './components/BillsView';
import { TripBudgetSummary } from './components/TripBudgetSummary';
import { AddBillModal } from './components/AddBillModal';
import { EditBillModal } from './components/EditBillModal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { ArrowRightLeft, Users, Receipt } from 'lucide-react';

export default function App() {
  // 1. Auth & Mode State: Root URL / and ?mode=view are identical Read-Only Viewer Mode
  const isAdmin = isUrlAdminMode();
  const isReadOnly = !isAdmin;
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);

  // 2. Data State
  const [bills, setBills] = useState<Bill[]>(() => loadBills());
  const [savedSettlements, setSavedSettlements] = useState<Settlement[]>(() =>
    loadSettlements()
  );
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [targetBudgetPaise, setTargetBudgetPaise] = useState<number>(() =>
    loadTripBudgetPaise()
  );
  const [isLiveSyncActive, setIsLiveSyncActive] = useState(isSupabaseConfigured);

  // 3. Navigation & Modal states
  const [activeTab, setActiveTab] = useState<'settle' | 'people' | 'bills'>('settle');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  const handleAdminLoginSuccess = () => {
    setStoredAdminStatus(true);
    setIsAdmin(true);
    setIsAdminLoginOpen(false);
  };

  const handleLogoutAdmin = () => {
    setStoredAdminStatus(false);
    setIsAdmin(false);
  };

  // 3. Supabase Initial Data Fetch & Realtime Sync
  const refreshRemoteData = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    try {
      const [remoteBills, remoteSettlements, remoteBudget] = await Promise.all([
        fetchBills(),
        fetchSettlements(),
        fetchTripBudget(),
      ]);

      if (Array.isArray(remoteBills)) {
        setBills(remoteBills);
        saveBills(remoteBills);
      }
      if (Array.isArray(remoteSettlements)) {
        setSavedSettlements(remoteSettlements);
        saveSettlements(remoteSettlements);
      }
      if (typeof remoteBudget === 'number' && remoteBudget > 0) {
        setTargetBudgetPaise(remoteBudget);
        saveTripBudgetPaise(remoteBudget);
      } else if (remoteBudget === null || remoteBudget === 0) {
        const defaultBudget = 3300000;
        setTargetBudgetPaise(defaultBudget);
        saveTripBudgetPaise(defaultBudget);
        saveTripBudget(defaultBudget);
      }
      setIsLiveSyncActive(true);
    } catch (err) {
      console.error('[Supabase Sync Error]', err);
    }
  }, []);

  useEffect(() => {
    refreshRemoteData();

    if (!isSupabaseConfigured) return;

    const channel = subscribeToRealtime(() => {
      refreshRemoteData();
    });

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [refreshRemoteData]);

  // Save viewing user on change
  const handleSelectViewingUser = (userId: string | null) => {
    setViewingUserId(userId);
    saveViewingUser(userId);
  };

  // 4. Dynamic Calculation Engine
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

  // Keep saved settlements locally updated
  useEffect(() => {
    saveSettlements(settlements);
  }, [settlements]);

  // 5. Bill management handlers with Supabase syncing
  const handleSaveNewBill = async (newBill: Bill) => {
    const updated = [newBill, ...bills];
    setBills(updated);
    saveBills(updated);
    if (isSupabaseConfigured) {
      await saveBill(newBill);
    }
  };

  const handleUpdateBill = async (updatedBill: Bill) => {
    const updated = bills.map((b) => (b.id === updatedBill.id ? updatedBill : b));
    setBills(updated);
    saveBills(updated);
    if (isSupabaseConfigured) {
      await saveBill(updatedBill);
    }
  };

  const handleDeleteBill = async (billId: string) => {
    const updated = bills.filter((b) => b.id !== billId);
    setBills(updated);
    saveBills(updated);
    if (isSupabaseConfigured) {
      await deleteBill(billId);
    }
  };

  const handleToggleSettlementStatus = async (settlementId: string) => {
    let targetSettlement: Settlement | null = null;
    const updated = settlements.map((s) => {
      if (s.id === settlementId) {
        const nextStatus: 'paid' | 'pending' =
          s.status === 'paid' ? 'pending' : 'paid';
        const changed: Settlement = {
          ...s,
          status: nextStatus,
          paidAt: nextStatus === 'paid' ? new Date().toISOString() : undefined,
        };
        targetSettlement = changed;
        return changed;
      }
      return s;
    });
    setSavedSettlements(updated);
    saveSettlements(updated);

    if (isSupabaseConfigured && targetSettlement) {
      await saveSettlement(targetSettlement);
    }
  };

  const handleUpdateBudget = async (newBudgetPaise: number) => {
    setTargetBudgetPaise(newBudgetPaise);
    saveTripBudgetPaise(newBudgetPaise);
    if (isSupabaseConfigured) {
      await saveTripBudget(newBudgetPaise);
    }
  };

  const handleResetData = async () => {
    if (window.confirm('Clear all bills and settlements across the group?')) {
      const { bills: defBills, settlements: defSettlements } = resetToDefaultData();
      setBills(defBills);
      setSavedSettlements(defSettlements);
      setViewingUserId(null);
      if (isSupabaseConfigured) {
        await clearAllDataInSupabase();
      }
    }
  };

  // Metrics for badges
  const pendingSettlementsCount = settlements.filter(
    (s) => s.status === 'pending'
  ).length;

  return (
    <div className="relative min-h-screen bg-zinc-100/60 text-zinc-900 flex flex-col font-sans selection:bg-zinc-900 selection:text-white">
      {/* Background Graphic with 60% Opacity */}
      <div
        className="fixed inset-0 z-0 pointer-events-none select-none flex items-center justify-center opacity-60 overflow-hidden"
        aria-hidden="true"
      >
        <img
          src="/bg.png"
          alt=""
          className="w-full h-full max-w-4xl max-h-[85vh] object-contain"
        />
      </div>

      {/* Top Navigation */}
      <div className="relative z-10">
        <Navbar
          viewingUserId={viewingUserId}
          onSelectViewingUser={handleSelectViewingUser}
          onOpenAddBill={() => setIsAddModalOpen(true)}
          onResetData={handleResetData}
          totalBillsCount={bills.length}
          isLiveSync={isLiveSyncActive}
          isReadOnly={isReadOnly}
          onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
          onLogoutAdmin={handleLogoutAdmin}
        />
      </div>

      {/* Main Container */}
      <main className="relative z-10 grow max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Prominent Personal Answer Card */}
        <PersonalSummary
          viewingUserId={viewingUserId}
          onSelectUser={handleSelectViewingUser}
          balances={balances}
          settlements={settlements}
          onToggleStatus={handleToggleSettlementStatus}
          isReadOnly={isReadOnly}
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
            isReadOnly={isReadOnly}
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
            isReadOnly={isReadOnly}
          />
        )}

        {activeTab === 'bills' && (
          <BillsView
            bills={bills}
            onOpenAddBill={() => setIsAddModalOpen(true)}
            onEditBill={(bill) => setEditingBill(bill)}
            onDeleteBill={handleDeleteBill}
            isReadOnly={isReadOnly}
          />
        )}

        {/* Total Trip Budget & Final Ledger */}
        <TripBudgetSummary
          bills={bills}
          balances={balances}
          settlements={settlements}
          targetBudgetPaise={targetBudgetPaise}
          onUpdateBudget={handleUpdateBudget}
          isReadOnly={isReadOnly}
        />
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-200/80 bg-white/70 backdrop-blur-xs py-6 text-center text-xs text-zinc-500">
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

      {/* Admin Passcode Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginOpen}
        onClose={() => setIsAdminLoginOpen(false)}
        onSuccess={handleAdminLoginSuccess}
      />
    </div>
  );
}
