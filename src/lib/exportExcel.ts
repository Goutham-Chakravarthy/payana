import * as XLSX from 'xlsx';
import { Bill, Settlement, ParticipantBalance } from '../types';
import { FIXED_PARTICIPANTS, getParticipant } from '../constants/participants';
import { paiseToRupees, formatDate } from './formatters';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const rupees = (paise: number) => paiseToRupees(paise);

function autoWidths(data: Record<string, unknown>[]): XLSX.ColInfo[] {
  const keys = data.length > 0 ? Object.keys(data[0]) : [];
  return keys.map((k) => ({
    wch: Math.max(k.length, ...data.map((row) => String(row[k] ?? '').length)) + 2,
  }));
}

function addSheet(wb: XLSX.WorkBook, sheetName: string, rows: Record<string, unknown>[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = autoWidths(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

// ─── Sheet builders ───────────────────────────────────────────────────────────

function buildBillsSummarySheet(bills: Bill[]) {
  return bills.map((b, idx) => ({
    '#': idx + 1,
    'Bill Title': b.title,
    'Merchant': b.merchant || '-',
    'Date': b.billDate ? formatDate(b.billDate) : '-',
    'Total Amount (Rs)': rupees(b.amountPaise),
    'Paid By': getParticipant(b.paidBy).name,
    'Participants Count': b.participants.length,
    'Participants': b.participants.map((id: string) => getParticipant(id).name).join(', '),
    'Bill ID': b.id,
  }));
}

function buildBillSharesSheet(bills: Bill[]) {
  const rows: Record<string, unknown>[] = [];
  bills.forEach((b) => {
    const payer = getParticipant(b.paidBy).name;
    b.participants.forEach((pid: string) => {
      const sharePaise = b.shares[pid] ?? 0;
      rows.push({
        'Bill Title': b.title,
        'Date': b.billDate ? formatDate(b.billDate) : '-',
        'Total Bill (Rs)': rupees(b.amountPaise),
        'Paid By': payer,
        'Participant': getParticipant(pid).name,
        'Share (Rs)': rupees(sharePaise),
        'Is Payer?': b.paidBy === pid ? 'Yes' : 'No',
        'Net Contribution (Rs)': b.paidBy === pid ? rupees(b.amountPaise - sharePaise) : rupees(-sharePaise),
      });
    });
  });
  return rows;
}

function buildBalanceSummarySheet(balances: Record<string, ParticipantBalance>) {
  return FIXED_PARTICIPANTS.map((p) => {
    const b = balances[p.id];
    if (!b) return { Name: p.name, 'Total Paid (Rs)': 0, 'Total Consumed (Rs)': 0, 'Net Balance (Rs)': 0, Status: '-' };
    return {
      'Name': p.name,
      'Total Paid (Rs)': rupees(b.totalPaidPaise),
      'Total Consumed (Rs)': rupees(b.totalSharePaise),
      'Net Balance (Rs)': rupees(b.netBalancePaise),
      'Status': b.status === 'receive' ? 'Will Receive' : b.status === 'pay' ? 'Needs to Pay' : 'Settled',
    };
  });
}

function buildSettlementsSheet(settlements: Settlement[]) {
  return settlements.map((s: Settlement, idx: number) => ({
    '#': idx + 1,
    'From (Pays)': getParticipant(s.fromParticipantId).name,
    'To (Receives)': getParticipant(s.toParticipantId).name,
    'Amount (Rs)': rupees(s.amountPaise),
    'Status': s.status === 'paid' ? 'Paid & Settled' : 'Pending',
    'Paid On': s.paidAt ? formatDate(s.paidAt) : '-',
    'Created': s.createdAt ? formatDate(s.createdAt) : '-',
  }));
}

function buildParticipantBillMatrixSheet(bills: Bill[]) {
  const sortedBills = [...bills].sort(
    (a, b) => new Date(a.billDate).getTime() - new Date(b.billDate).getTime()
  );

  return FIXED_PARTICIPANTS.map((p) => {
    const row: Record<string, unknown> = { Participant: p.name };
    let totalShare = 0;
    let totalPaid = 0;

    sortedBills.forEach((bill) => {
      const sharePaise = bill.shares[p.id] ?? 0;
      const colName = `${bill.title} (${bill.billDate ? formatDate(bill.billDate) : '-'})`;
      row[colName] = sharePaise > 0 ? rupees(sharePaise) : '-';
      totalShare += sharePaise;
      if (bill.paidBy === p.id) totalPaid += bill.amountPaise;
    });

    row['Total Share (Rs)'] = rupees(totalShare);
    row['Total Bills Paid (Rs)'] = rupees(totalPaid);
    row['Net (Rs)'] = rupees(totalPaid - totalShare);
    return row;
  });
}

// ─── Main Export Function ─────────────────────────────────────────────────────

export function exportToExcel(
  bills: Bill[],
  settlements: Settlement[],
  balances: Record<string, ParticipantBalance>
) {
  const wb = XLSX.utils.book_new();

  const meta = XLSX.utils.aoa_to_sheet([
    ['PAYANA - Trip Bill Export'],
    ['Generated On', new Date().toLocaleString('en-IN')],
    ['Total Bills', bills.length],
    ['Total Amount Spent (Rs)', rupees(bills.reduce((s, b) => s + b.amountPaise, 0))],
    ['Total Pending Settlements', settlements.filter((s) => s.status === 'pending').length],
    ['Total Paid Settlements', settlements.filter((s) => s.status === 'paid').length],
    ['Participants', FIXED_PARTICIPANTS.map((p) => p.name).join(', ')],
  ]);
  meta['!cols'] = [{ wch: 30 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, meta, 'Summary');

  addSheet(wb, 'Bills', buildBillsSummarySheet(bills));
  addSheet(wb, 'Shares Breakdown', buildBillSharesSheet(bills));
  addSheet(wb, 'Balance per Person', buildBalanceSummarySheet(balances));
  addSheet(wb, 'Settlements', buildSettlementsSheet(settlements));
  addSheet(wb, 'Bill Matrix', buildParticipantBillMatrixSheet(bills));

  const fileName = `Payana_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
