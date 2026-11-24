import React, { useState } from 'react';
import { Trash2, ArrowUpRight, FileText } from 'lucide-react';
import type { HireSignal, InterviewSession } from '../types/interview';

interface HistoryViewProps {
  sessions: InterviewSession[];
  activeSessionId: string | null;
  onOpenSession: (session: InterviewSession, view: 'interview' | 'debrief') => void;
  onDeleteSession: (id: string) => void;
  onStartNew: () => void;
}

type SignalFilter = 'All' | HireSignal | 'In Progress';

export const HistoryView: React.FC<HistoryViewProps> = ({
  sessions,
  activeSessionId,
  onOpenSession,
  onDeleteSession,
  onStartNew,
}) => {
  const [filter, setFilter] = useState<SignalFilter>('All');

  const filtered = sessions.filter((s) => {
    if (filter === 'All') return true;
    if (filter === 'In Progress') return !s.debrief;
    return s.debrief?.hireSignal === filter;
  });

  const signalTextClass = (signal?: HireSignal) => {
    switch (signal) {
      case 'Strong Hire':
        return 'text-emerald-700 font-semibold';
      case 'Hire':
        return 'text-sky-700 font-semibold';
      case 'Leaning No':
        return 'text-amber-700 font-semibold';
      case 'No Hire':
        return 'text-red-700 font-semibold';
      default:
        return 'text-slate-600 font-medium';
    }
  };

  return (
    <div className="max-w-[1120px] mx-auto px-6 py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Saved Interview Sessions
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Review past transcripts, compare rubric scores across dimensions, or resume an active
            mock loop.
          </p>
        </div>
        <button
          type="button"
          onClick={onStartNew}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto cursor-pointer"
        >
          Start New Session
        </button>
      </div>

      {sessions.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
          {(
            ['All', 'Strong Hire', 'Hire', 'Leaning No', 'No Hire', 'In Progress'] as SignalFilter[]
          ).map((item) => {
            const active = filter === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <FileText className="w-8 h-8 text-slate-400 mx-auto mb-3" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900">
            {sessions.length === 0 ? 'No saved mock interviews yet' : 'No matching sessions'}
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 max-w-md mx-auto">
            {sessions.length === 0
              ? 'Configure your target role and company to run your first calibrated interview and generate a rubric scorecard.'
              : 'Try selecting another filter above or start a new practice session.'}
          </p>
          {sessions.length === 0 && (
            <button
              type="button"
              onClick={onStartNew}
              className="mt-5 px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
            >
              Configure First Interview
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
          {filtered.map((session) => {
            const avgScore = session.debrief
              ? (
                  session.debrief.dimensions.reduce((acc, d) => acc + d.score, 0) /
                  Math.max(session.debrief.dimensions.length, 1)
                ).toFixed(1)
              : null;

            return (
              <div
                key={session.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className={signalTextClass(session.debrief?.hireSignal)}>
                      {session.debrief ? session.debrief.hireSignal : 'In Progress'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{session.setup.roleLevel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{session.setup.companyName || 'Target Company'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      Q{session.questionCount}/{session.setup.targetQuestions}
                    </span>
                    {avgScore && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums text-slate-700">
                          {avgScore} / 4.0 avg
                        </span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>{new Date(session.updatedAt).toLocaleDateString()}</span>
                  </div>

                  <h3 className="mt-1.5 text-base font-semibold text-slate-900 truncate">
                    {session.setup.jobTitle || 'Untitled Mock Interview'}
                    {session.id === activeSessionId ? ' (Current)' : ''}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenSession(session, 'interview')}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Transcript
                  </button>
                  {session.debrief && (
                    <button
                      type="button"
                      onClick={() => onOpenSession(session, 'debrief')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Scorecard
                      <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={`Delete ${session.setup.jobTitle || 'session'}`}
                    onClick={() => onDeleteSession(session.id)}
                    className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
