import { Participant } from '../types';

/**
 * PAYANA Fixed Participants (9 people)
 * Strictly ordered alphabetically:
 * 1. Gouthu
 * 2. Preethu
 * 3. Rishab
 * 4. Shrinivas
 * 5. Srujan
 * 6. Sujith
 * 7. Teju
 * 8. Thanmay
 * 9. Thanush
 */
export const FIXED_PARTICIPANTS: Participant[] = [
  {
    id: 'gouthu',
    name: 'Gouthu',
    initials: 'GO',
    color: '#0D9488', // Teal
    bgColor: '#CCFBF1',
  },
  {
    id: 'preethu',
    name: 'Preethu',
    initials: 'PR',
    color: '#E11D48', // Rose
    bgColor: '#FFE4E6',
  },
  {
    id: 'rishab',
    name: 'Rishab',
    initials: 'RI',
    color: '#4F46E5', // Indigo
    bgColor: '#E0E7FF',
  },
  {
    id: 'shrinivas',
    name: 'Shrinivas',
    initials: 'SH',
    color: '#0284C7', // Sky
    bgColor: '#E0F2FE',
  },
  {
    id: 'srujan',
    name: 'Srujan',
    initials: 'SR',
    color: '#D97706', // Amber
    bgColor: '#FEF3C7',
  },
  {
    id: 'sujith',
    name: 'Sujith',
    initials: 'SU',
    color: '#7C3AED', // Violet
    bgColor: '#EDE9FE',
  },
  {
    id: 'teju',
    name: 'Teju',
    initials: 'TE',
    color: '#059669', // Emerald
    bgColor: '#D1FAE5',
  },
  {
    id: 'thanmay',
    name: 'Thanmay',
    initials: 'TM',
    color: '#EA580C', // Orange
    bgColor: '#FFEDD5',
  },
  {
    id: 'thanush',
    name: 'Thanush',
    initials: 'TN',
    color: '#DB2777', // Pink
    bgColor: '#FCE7F3',
  },
];

export const PARTICIPANT_MAP: Record<string, Participant> = FIXED_PARTICIPANTS.reduce(
  (acc, participant) => {
    acc[participant.id] = participant;
    return acc;
  },
  {} as Record<string, Participant>
);

export function getParticipant(id: string): Participant {
  return (
    PARTICIPANT_MAP[id] || {
      id,
      name: id,
      initials: id.slice(0, 2).toUpperCase(),
      color: '#64748B',
      bgColor: '#F1F5F9',
    }
  );
}
