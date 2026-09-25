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
 * 6. Already-paid settlements are LOCKED and preserved as-is; only remaining unpaid balances
 *    are fed into the simplification engine, producing fresh pending settlements.
 * 
 * @param netBalances Array of participantId and netBalancePaise (from bills only)
 * @param totalPaidMap Optional mapping of participantId -> totalPaidPaise to prioritize non-payers for split transactions
 * @param existingSettlements Optional existing settlements to preserve 'paid' entries
 */
export function calculateSettlement(
  netBalances: SettlementEntry[],
  totalPaidMap: Record<string, number> = {},
  existingSettlements: Settlement[] = []
): Settlement[] {
  // -----------------------------------------------------------------------
  // Step 1: Separate paid (locked) settlements from pending ones.
  //         Paid settlements are returned as-is and their amounts are
  //         subtracted from the raw net balances so the remaining algorithm
  //         only deals with genuinely unresolved debt.
  // -----------------------------------------------------------------------
  const paidSettlements = existingSettlements.filter((s) => s.status === 'paid');

  // Build a mutable copy of net balances as a map for easy adjustment
  const adjustedBalances = new Map<string, number>();
  netBalances.forEach((e) => {
    adjustedBalances.set(e.participantId, e.netBalancePaise);
  });

  // For each paid settlement, reduce the creditor's receivable and the
  // debtor's payable by the paid amount so we don't re-settle paid debt.
  paidSettlements.forEach((s) => {
    const fromBal = adjustedBalances.get(s.fromParticipantId) ?? 0;
    const toBal   = adjustedBalances.get(s.toParticipantId)   ?? 0;
    // fromParticipant paid s.amountPaise to toParticipant → their debt is reduced
    adjustedBalances.set(s.fromParticipantId, fromBal + s.amountPaise);
    adjustedBalances.set(s.toParticipantId,   toBal   - s.amountPaise);
  });

  // -----------------------------------------------------------------------
  // Step 2: Run the minimization algorithm on the remaining (adjusted) balances
  //         to produce fresh PENDING settlements for the outstanding debt.
  // -----------------------------------------------------------------------
  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number; totalPaid: number }[] = [];

  adjustedBalances.forEach((bal, participantId) => {
    // Round to avoid floating-point drift (all values should be integers)
    const rounded = Math.round(bal);
    if (rounded > 0) {
      creditors.push({ id: participantId, amount: rounded });
    } else if (rounded < 0) {
      debtors.push({
        id: participantId,
        amount: Math.abs(rounded),
        totalPaid: totalPaidMap[participantId] || 0,
      });
    }
  });

  const newSettlements: Settlement[] = [];

  // Phase 1: Direct 1-to-1 exact match elimination
  for (let i = debtors.length - 1; i >= 0; i--) {
    const d = debtors[i];
    const matchingCreditorIndex = creditors.findIndex((c) => c.amount === d.amount);

    if (matchingCreditorIndex !== -1) {
      const c = creditors[matchingCreditorIndex];

      newSettlements.push({
        id: `settle-${d.id}-${c.id}-${newSettlements.length}`,
        fromParticipantId: d.id,
        toParticipantId: c.id,
        amountPaise: d.amount,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      debtors.splice(i, 1);
      creditors.splice(matchingCreditorIndex, 1);
    }
  }

  // Phase 2: Debt Simplification with Non-Payer Priority for multi-payment splits
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => {
    if (a.totalPaid !== b.totalPaid) return b.totalPaid - a.totalPaid;
    return b.amount - a.amount;
  });

  let creditorIndex = 0;
  let debtorIndex = 0;

  while (creditorIndex < creditors.length && debtorIndex < debtors.length) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];

    if (creditor.amount <= 0) { creditorIndex++; continue; }
    if (debtor.amount <= 0)   { debtorIndex++;   continue; }

    const transferAmount = Math.min(debtor.amount, creditor.amount);

    if (transferAmount > 0) {
      newSettlements.push({
        id: `settle-${debtor.id}-${creditor.id}-${newSettlements.length}`,
        fromParticipantId: debtor.id,
        toParticipantId: creditor.id,
        amountPaise: transferAmount,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      debtor.amount   -= transferAmount;
      creditor.amount -= transferAmount;
    }

    if (debtor.amount === 0)   debtorIndex++;
    if (creditor.amount === 0) creditorIndex++;
  }

  // -----------------------------------------------------------------------
  // Step 3: Merge paid (locked) settlements + new pending settlements.
  //         Pending settlements appear first, paid go to the bottom.
  // -----------------------------------------------------------------------
  const allSettlements = [...paidSettlements, ...newSettlements];

  return allSettlements.sort((a, b) => {
    if (a.status === 'pending' && b.status === 'paid') return -1;
    if (a.status === 'paid'    && b.status === 'pending') return 1;
    return b.amountPaise - a.amountPaise;
  });
}

