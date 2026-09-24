import { Bill, Settlement } from '../types';

const STORAGE_KEYS = {
  BILLS: 'payana_bills_v2',
  SETTLEMENTS: 'payana_settlements_v2',
  VIEWING_USER: 'payana_viewing_user_v2',
  TRIP_BUDGET: 'payana_trip_budget_v2',
};

export function getInitialBills(): Bill[] {
  return [];
}

export function loadBills(): Bill[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BILLS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load bills from storage:', err);
    return [];
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
  saveBills([]);
  saveSettlements([]);
  return { bills: [], settlements: [] };
}

export function loadTripBudgetPaise(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRIP_BUDGET);
    if (!raw) return 3300000; // Default ₹33,000 in integer paise
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) || parsed <= 0 ? 3300000 : parsed;
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
