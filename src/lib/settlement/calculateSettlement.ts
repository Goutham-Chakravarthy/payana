import { Bill, ParticipantBalance, Settlement } from '../../types';
import { FIXED_PARTICIPANTS } from '../../constants/participants';

/**
 * Splits an amount in integer paise equally across an array of participants.
 * Automatically distributes any remainder paise (1 or 2 paise) so that:
 * sum(shares) === totalPaise exactly.
 */
export function splitBillEqually(
  totalPaise: number,
  participantIds: string[]
): Record<string, number> {
  if (!participantIds.length || totalPaise <= 0) return {};

  const n = participantIds.length;
  const baseShare = Math.floor(totalPaise / n);
  const remainder = totalPaise % n;

  const shares: Record<string, number> = {};

  participantIds.forEach((id, index) => {
    // First 'remainder' participants absorb 1 extra paise each
    shares[id] = baseShare + (index < remainder ? 1 : 0);
  });

  return shares;
}

/**
 * Calculates total paid, total share consumed, and net balance for each participant across all bills.
 */
export function calculateNetBalances(
  bills: Bill[],
  participants = FIXED_PARTICIPANTS
): Record<string, ParticipantBalance> {
  // Initialize all participants with 0
  const balances: Record<string, ParticipantBalance> = {};

  participants.forEach((p) => {
    balances[p.id] = {
      participantId: p.id,
      totalPaidPaise: 0,
      totalSharePaise: 0,
      netBalancePaise: 0,
      status: 'settled',
    };
  });

  // Accumulate from all bills
  bills.forEach((bill) => {
    // Payer gets credited total amount
    if (balances[bill.paidBy]) {
      balances[bill.paidBy].totalPaidPaise += bill.amountPaise;
    }

    // Each participant gets debited their share
    Object.entries(bill.shares).forEach(([participantId, sharePaise]) => {
      if (balances[participantId]) {
        balances[participantId].totalSharePaise += sharePaise;
      }
    });
  });

  // Compute net balance and status
  Object.values(balances).forEach((b) => {
    b.netBalancePaise = b.totalPaidPaise - b.totalSharePaise;
    if (b.netBalancePaise > 0) {
      b.status = 'receive';
    } else if (b.netBalancePaise < 0) {
      b.status = 'pay';
    } else {
      b.status = 'settled';
    }
  });

  return balances;
}

interface SettlementEntry {
  participantId: string;
  netBalancePaise: number;
}

/**
 * Smart Debt Simplification Algorithm.
 * 
 * Rules & Invariants:
 * 1. Works 100% in integer paise.
 * 2. Total money owed === Total money receivable.
 * 3. Minimizes the total number of transactions.
 * 4. Minimizes repeated payments: keeps most debtors to exactly 1 consolidated payment.
 * 5. If multiple payments are needed, prefers debtors who haven't paid any bills to absorb the split.
 * 
 * @param netBalances Array of participantId and netBalancePaise
 * @param totalPaidMap Optional mapping of participantId -> totalPaidPaise to prioritize non-payers for split transactions
 * @param existingSettlements Optional existing settlements to preserve 'paid' status
 */
export function calculateSettlement(
  netBalances: SettlementEntry[],
  totalPaidMap: Record<string, number> = {},
  existingSettlements: Settlement[] = []
): Settlement[] {
  // Map of previously paid status: "fromId->toId->amount"
  const paidStatusMap = new Map<string, { status: 'paid' | 'pending'; paidAt?: string }>();
  existingSettlements.forEach((s) => {
    const key = `${s.fromParticipantId}->${s.toParticipantId}`;
    paidStatusMap.set(key, { status: s.status, paidAt: s.paidAt });
  });

  // Separate into Creditors (+) and Debtors (-)
  // Debtor amount is positive integer indicating amount owed
  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number; totalPaid: number }[] = [];

  netBalances.forEach((entry) => {
    if (entry.netBalancePaise > 0) {
      creditors.push({ id: entry.participantId, amount: entry.netBalancePaise });
    } else if (entry.netBalancePaise < 0) {
      debtors.push({
        id: entry.participantId,
        amount: Math.abs(entry.netBalancePaise),
        totalPaid: totalPaidMap[entry.participantId] || 0,
      });
    }
  });

  const settlements: Settlement[] = [];

  // Phase 1: Direct 1-to-1 exact match elimination
  // If debtor owes exactly what a creditor needs, settle directly to reduce complexity immediately
  for (let i = debtors.length - 1; i >= 0; i--) {
    const d = debtors[i];
    const matchingCreditorIndex = creditors.findIndex((c) => c.amount === d.amount);

    if (matchingCreditorIndex !== -1) {
      const c = creditors[matchingCreditorIndex];
      const key = `${d.id}->${c.id}`;
      const prev = paidStatusMap.get(key);

      settlements.push({
        id: `settle-${d.id}-${c.id}-${settlements.length}`,
        fromParticipantId: d.id,
        toParticipantId: c.id,
        amountPaise: d.amount,
        status: prev?.status || 'pending',
        createdAt: new Date().toISOString(),
        paidAt: prev?.paidAt,
      });

      debtors.splice(i, 1);
      creditors.splice(matchingCreditorIndex, 1);
    }
  }

  // Phase 2: Debt Simplification with Non-Payer Priority for multi-payment splits
  // Sort creditors descending by amount
  creditors.sort((a, b) => b.amount - a.amount);

  // For debtors:
  // We want debtors who paid some bills or large debtors to make clean single payments,
  // and debtors who paid 0 to absorb any remaining bridge amounts.
  // Secondary sort by amount descending.
  debtors.sort((a, b) => {
    if (a.totalPaid !== b.totalPaid) {
      // Those who paid something go first to get clean single payments to largest creditor
      return b.totalPaid - a.totalPaid;
    }
    return b.amount - a.amount;
  });

  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];

    if (creditor.amount <= 0) {
      creditorIndex++;
      continue;
    }

    if (debtor.amount <= 0) {
      debtorIndex++;
      continue;
    }

    const transferAmount = Math.min(debtor.amount, creditor.amount);

    if (transferAmount > 0) {
      const key = `${debtor.id}->${creditor.id}`;
      const prev = paidStatusMap.get(key);

      settlements.push({
        id: `settle-${debtor.id}-${creditor.id}-${settlements.length}`,
        fromParticipantId: debtor.id,
        toParticipantId: creditor.id,
        amountPaise: transferAmount,
        status: prev?.status || 'pending',
        createdAt: new Date().toISOString(),
        paidAt: prev?.paidAt,
      });

      debtor.amount -= transferAmount;
      creditor.amount -= transferAmount;
    }

    if (debtor.amount === 0) {
      debtorIndex++;
    }

    if (creditor.amount === 0) {
      creditorIndex++;
    }
  }

  // Pending payments appear first in the list, paid go to the last
  return settlements.sort((a, b) => {
    if (a.status === 'pending' && b.status === 'paid') return -1;
    if (a.status === 'paid' && b.status === 'pending') return 1;
    return b.amountPaise - a.amountPaise;
  });
}
