import React, { useState } from 'react';
import { Bill, Participant, ParticipantBalance, Settlement } from '../types';
import { FIXED_PARTICIPANTS } from '../constants/participants';
import { formatINR } from '../lib/formatters';
import { Avatar } from './Avatar';
import { PersonDetailModal } from './PersonDetailModal';
import { ChevronRight, ArrowUpRight, ArrowDownLeft, CheckCircle2 } from 'lucide-react';

interface PeopleViewProps {
  balances: Record<string, ParticipantBalance>;
  bills: Bill[];
  settlements: Settlement[];
  onSetViewingUser: (id: string) => void;
  onToggleStatus: (settlementId: string) => void;
  viewingUserId: string | null;
}

export const PeopleView: React.FC<PeopleViewProps> = ({
  balances,
  bills,
  settlements,
  onSetViewingUser,
  onToggleStatus,
  viewingUserId,
}) => {
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

  return (
    <div className="space-y-4">
      {/* People Header */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight uppercase">
            PEOPLE ({FIXED_PARTICIPANTS.length})
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Fixed group participants in alphabetical order · Click any person for their full ledger
          </p>
        </div>

        <div className="text-xs font-semibold text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-lg border border-zinc-200 self-start sm:self-auto">
          Net Position = Total Paid − Consumed Share
        </div>
      </div>

      {/* Alphabetical Participants List */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-xs divide-y divide-zinc-100 overflow-hidden">
        {FIXED_PARTICIPANTS.map((participant, index) => {
          const balance = balances[participant.id] || {
            participantId: participant.id,
            totalPaidPaise: 0,
            totalSharePaise: 0,
            netBalancePaise: 0,
            status: 'settled',
          };

          const isViewing = viewingUserId === participant.id;

          return (
            <div
              key={participant.id}
              onClick={() => setSelectedParticipant(participant)}
              className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-50/80 transition-colors cursor-pointer ${
                isViewing ? 'bg-amber-50/20' : ''
              }`}
            >
              {/* Person Info & Alpha Index */}
              <div className="flex items-center gap-3.5">
                <span className="text-xs font-mono font-bold text-zinc-300 w-4">
                  {index + 1}
                </span>
                <Avatar participant={participant} size="md" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-950 text-base tracking-tight">
                      {participant.name}
                    </span>
                    {isViewing && (
                      <span className="text-[10px] font-semibold bg-zinc-900 text-white px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2">
                    <span>Paid: {formatINR(balance.totalPaidPaise)}</span>
                    <span>•</span>
                    <span>Consumed: {formatINR(balance.totalSharePaise)}</span>
                  </div>
                </div>
              </div>

              {/* Status Badge and Net Amount */}
              <div className="flex items-center justify-between sm:justify-end gap-3 pl-8 sm:pl-0">
                {/* Textual Status Tag (Prompt Section 17) */}
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                      balance.status === 'receive'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : balance.status === 'pay'
                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                        : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                    }`}
                  >
                    {balance.status === 'receive' ? (
                      <>
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" /> Receive
                      </>
                    ) : balance.status === 'pay' ? (
                      <>
                        <ArrowDownLeft className="w-3.5 h-3.5 text-rose-600" /> Pay
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" /> Settled
                      </>
                    )}
                  </span>
                </div>

                {/* Net Amount */}
                <div className="text-right min-w-[90px]">
                  <div
                    className={`text-base sm:text-lg font-black tracking-tight ${
                      balance.netBalancePaise > 0
                        ? 'text-emerald-600'
                        : balance.netBalancePaise < 0
                        ? 'text-rose-600'
                        : 'text-zinc-600'
                    }`}
                  >
                    {formatINR(balance.netBalancePaise, { showSign: true })}
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-zinc-400 hidden sm:block shrink-0" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Ledger Modal */}
      {selectedParticipant && (
        <PersonDetailModal
          participant={selectedParticipant}
          balance={balances[selectedParticipant.id] || null}
          bills={bills}
          settlements={settlements}
          onClose={() => setSelectedParticipant(null)}
          onSetViewingUser={onSetViewingUser}
          onToggleStatus={onToggleStatus}
        />
      )}
    </div>
  );
};
