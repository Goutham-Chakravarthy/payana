export interface Participant {
  id: string;
  name: string;
  initials: string;
  color: string;
  bgColor: string;
}

export interface BillParticipantShare {
  participantId: string;
  sharePaise: number; // in integer paise
}

export interface Bill {
  id: string;
  title: string;
  amountPaise: number; // Total amount in integer paise
  merchant: string;
  billDate: string; // YYYY-MM-DD
  billImage?: string | null; // Data URL or asset path
  paidBy: string; // Participant ID
  participants: string[]; // Participant IDs who shared the bill
  shares: Record<string, number>; // participantId -> share in paise
  createdAt: string;
}

export interface ParticipantBalance {
  participantId: string;
  totalPaidPaise: number;
  totalSharePaise: number;
  netBalancePaise: number; // totalPaidPaise - totalSharePaise
  status: 'receive' | 'pay' | 'settled';
}

export interface Settlement {
  id: string;
  fromParticipantId: string; // Debtor
  toParticipantId: string; // Creditor
  amountPaise: number;
  status: 'pending' | 'paid';
  createdAt: string;
  paidAt?: string;
}
