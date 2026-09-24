import { Bill, Settlement } from '../types';
import { splitBillEqually } from './settlement/calculateSettlement';

const STORAGE_KEYS = {
  BILLS: 'payana_bills_v1',
  SETTLEMENTS: 'payana_settlements_v1',
  VIEWING_USER: 'payana_viewing_user_v1',
  TRIP_BUDGET: 'payana_trip_budget_v1',
};

/**
 * Initial sample bills matching the prompt specification:
 * 1. Ticket ₹2,500 paid by Shrinivas (6 participants: Shrinivas, Teju, Thanmay, Srujan, Rishab, Gouthu)
 * 2. Tiffin ₹1,000 paid by Teju (all 9 participants)
 */
export function getInitialBills(): Bill[] {
  const bill1Participants = ['shrinivas', 'teju', 'thanmay', 'srujan', 'rishab', 'gouthu'];
  const bill1AmountPaise = 250000; // ₹2,500.00
  const bill1Shares = splitBillEqually(bill1AmountPaise, bill1Participants);

  const bill2Participants = [
    'gouthu',
    'preethu',
    'rishab',
    'shrinivas',
    'srujan',
    'sujith',
    'teju',
    'thanmay',
    'thanush',
  ];
  const bill2AmountPaise = 100000; // ₹1,000.00
  const bill2Shares = splitBillEqually(bill2AmountPaise, bill2Participants);

  return [
    {
      id: 'bill-1-ticket',
      title: 'Train Ticket',
      amountPaise: bill1AmountPaise,
      merchant: 'IRCTC Travel Booking',
      billDate: '2026-09-21',
      billImage: null,
      paidBy: 'shrinivas',
      participants: bill1Participants,
      shares: bill1Shares,
      createdAt: '2026-09-21T09:30:00.000Z',
    },
    {
      id: 'bill-2-tiffin',
      title: 'Morning Tiffin',
      amountPaise: bill2AmountPaise,
      merchant: 'Udupi Grand Restaurant',
      billDate: '2026-09-22',
      billImage: null,
      paidBy: 'teju',
      participants: bill2Participants,
      shares: bill2Shares,
      createdAt: '2026-09-22T08:15:00.000Z',
    },
  ];
}

export function loadBills(): Bill[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BILLS);
    if (!raw) {
      const initial = getInitialBills();
      localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : getInitialBills();
  } catch (err) {
    console.error('Failed to load bills from storage:', err);
    return getInitialBills();
  }
}

export function saveBills(bills: Bill[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
  } catch (err) {
    console.error('Failed to save bills to storage:', err);
  }
}

export function loadSettlements(): Settlement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTLEMENTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load settlements from storage:', err);
    return [];
  }
}

export function saveSettlements(settlements: Settlement[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTLEMENTS, JSON.stringify(settlements));
  } catch (err) {
    console.error('Failed to save settlements to storage:', err);
  }
}

export function loadViewingUser(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.VIEWING_USER);
  } catch {
    return null;
  }
}

export function saveViewingUser(userId: string | null): void {
  try {
    if (userId) {
      localStorage.setItem(STORAGE_KEYS.VIEWING_USER, userId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.VIEWING_USER);
    }
  } catch (err) {
    console.error('Failed to save viewing user:', err);
  }
}

export function resetToDefaultData(): { bills: Bill[]; settlements: Settlement[] } {
  const initial = getInitialBills();
  saveBills(initial);
  saveSettlements([]);
  return { bills: initial, settlements: [] };
}

export function loadTripBudgetPaise(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRIP_BUDGET);
    if (!raw) return 3300000; // Default ₹33,000 in integer paise
    const parsed = parseInt(raw, 10);
    // If user's browser had previous default 25,000, update to the requested 33,000
    if (parsed === 2500000) {
      saveTripBudgetPaise(3300000);
      return 3300000;
    }
    return isNaN(parsed) || parsed < 0 ? 3300000 : parsed;
  } catch {
    return 3300000;
  }
}

export function saveTripBudgetPaise(budgetPaise: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRIP_BUDGET, String(Math.max(0, Math.round(budgetPaise))));
  } catch (err) {
    console.error('Failed to save trip budget:', err);
  }
}

export function clearAllData(): void {
  saveBills([]);
  saveSettlements([]);
}
