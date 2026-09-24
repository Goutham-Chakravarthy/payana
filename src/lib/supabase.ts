import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Bill, Settlement } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

// ==========================================
// DB Mappers
// ==========================================

function mapDbToBill(row: any): Bill {
  return {
    id: row.id,
    title: row.title,
    amountPaise: Number(row.amount_paise) || 0,
    merchant: row.merchant,
    billDate: row.bill_date,
    billImage: row.bill_image || null,
    paidBy: row.paid_by,
    participants: Array.isArray(row.participants) ? row.participants : [],
    shares: typeof row.shares === 'object' && row.shares !== null ? row.shares : {},
    createdAt: row.created_at,
  };
}

function formatDateForDb(dateStr?: string | null): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {}
  return new Date().toISOString().split('T')[0];
}

function mapBillToDb(bill: Bill) {
  return {
    id: bill.id || `bill_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: (bill.title || bill.merchant || 'Expense').trim(),
    amount_paise: Math.round(Number(bill.amountPaise) || 0),
    merchant: (bill.merchant || bill.title || 'General').trim(),
    bill_date: formatDateForDb(bill.billDate),
    bill_image: bill.billImage || null,
    paid_by: bill.paidBy || 'gouthu',
    participants: Array.isArray(bill.participants) ? bill.participants : [],
    shares: typeof bill.shares === 'object' && bill.shares !== null ? bill.shares : {},
    created_at: bill.createdAt || new Date().toISOString(),
  };
}

function mapDbToSettlement(row: any): Settlement {
  return {
    id: row.id,
    fromParticipantId: row.from_participant_id,
    toParticipantId: row.to_participant_id,
    amountPaise: Number(row.amount_paise) || 0,
    status: row.status as 'pending' | 'paid',
    createdAt: row.created_at,
    paidAt: row.paid_at || undefined,
  };
}

function mapSettlementToDb(settlement: Settlement) {
  return {
    id: settlement.id,
    from_participant_id: settlement.fromParticipantId,
    to_participant_id: settlement.toParticipantId,
    amount_paise: settlement.amountPaise,
    status: settlement.status,
    created_at: settlement.createdAt || new Date().toISOString(),
    paid_at: settlement.paidAt || null,
  };
}

// ==========================================
// Bills CRUD
// ==========================================

export async function fetchBills(): Promise<Bill[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Supabase] Failed to fetch bills:', error.message, error.details || '');
      if (error.code === '42P01' || error.message.includes('relation "public.bills" does not exist')) {
        console.error('🚨 [Supabase Action Required] The "bills" table does not exist in your Supabase database yet. Please run supabase_schema.sql in your Supabase SQL Editor.');
      }
      return [];
    }
    return (data || []).map(mapDbToBill);
  } catch (err) {
    console.error('[Supabase] Fetch bills error:', err);
    return [];
  }
}

export async function saveBill(bill: Bill): Promise<boolean> {
  if (!supabase) return false;
  try {
    const payload = mapBillToDb(bill);
    const { error } = await supabase.from('bills').upsert(payload);
    if (error) {
      console.error('[Supabase] Failed to save bill:', error.message, error.details || '');
      if (error.code === '42501' || error.message.includes('row-level security')) {
        console.error('🚨 [Supabase Action Required] Row Level Security blocked the insert. Please run the RLS policies from supabase_schema.sql in Supabase SQL Editor.');
      }
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Save bill error:', err);
    return false;
  }
}

export async function deleteBill(billId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('bills').delete().eq('id', billId);
    if (error) {
      console.error('[Supabase] Failed to delete bill:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Delete bill error:', err);
    return false;
  }
}

// ==========================================
// Settlements CRUD
// ==========================================

export async function fetchSettlements(): Promise<Settlement[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('settlements').select('*');
    if (error) {
      console.warn('[Supabase] Failed to fetch settlements:', error.message);
      return [];
    }
    return (data || []).map(mapDbToSettlement);
  } catch (err) {
    console.error('[Supabase] Fetch settlements error:', err);
    return [];
  }
}

export async function saveSettlement(settlement: Settlement): Promise<boolean> {
  if (!supabase) return false;
  try {
    const payload = mapSettlementToDb(settlement);
    const { error } = await supabase.from('settlements').upsert(payload);
    if (error) {
      console.error('[Supabase] Failed to save settlement:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Save settlement error:', err);
    return false;
  }
}

// ==========================================
// Trip Settings (Budget, etc.)
// ==========================================

export async function fetchTripBudget(): Promise<number | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('trip_settings')
      .select('value')
      .eq('key', 'trip_budget_paise')
      .maybeSingle();

    if (error || !data) return null;
    return Number(data.value) || 0;
  } catch {
    return null;
  }
}

export async function saveTripBudget(budgetPaise: number): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('trip_settings').upsert({
      key: 'trip_budget_paise',
      value: Math.max(0, Math.round(budgetPaise)),
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}

// ==========================================
// Clear All Supabase Data
// ==========================================

export async function clearAllDataInSupabase(): Promise<boolean> {
  if (!supabase) return false;
  try {
    await supabase.from('bills').delete().neq('id', '___non_existent___');
    await supabase.from('settlements').delete().neq('id', '___non_existent___');
    return true;
  } catch (err) {
    console.error('[Supabase] Clear error:', err);
    return false;
  }
}

// ==========================================
// Realtime Subscriptions
// ==========================================

export function subscribeToRealtime(
  onDataChange: () => void
): RealtimeChannel | null {
  if (!supabase) return null;

  const channel = supabase
    .channel('payana-realtime-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bills' },
      () => {
        onDataChange();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'settlements' },
      () => {
        onDataChange();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'trip_settings' },
      () => {
        onDataChange();
      }
    )
    .subscribe();

  return channel;
}
