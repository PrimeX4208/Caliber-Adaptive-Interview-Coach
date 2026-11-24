import React from 'react';

export type AppView = 'setup' | 'interview' | 'debrief' | 'history';

interface TopBarProps {
  activeView: AppView;
  hasActiveSession: boolean;
  hasDebrief: boolean;
  historyCount: number;
  onNavigate: (view: AppView) => void;
  onNewInterview: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  hasActiveSession,
  hasDebrief,
  historyCount,
  onNavigate,
  onNewInterview,
}) => {
  const navLinkClass = (view: AppView, disabled = false) => {
    if (disabled) {
      return 'text-sm font-medium text-slate-300 cursor-not-allowed whitespace-nowrap shrink-0';
    }
    const isActive = activeView === view;
    return `text-sm font-medium transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b-2 ${
      isActive
        ? 'text-slate-900 border-blue-700'
        : 'text-slate-500 border-transparent hover:text-slate-900 hover:border-slate-300'
    }`;
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-[1320px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={() => onNavigate('setup')}
          className="text-xl font-semibold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 rounded-sm"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Caliber
        </button>

        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7">
          <button
            type="button"
            onClick={() => onNavigate('setup')}
            className={navLinkClass('setup')}
          >
            Setup
          </button>
          <button
            type="button"
            disabled={!hasActiveSession}
            onClick={() => hasActiveSession && onNavigate('interview')}
            className={navLinkClass('interview', !hasActiveSession)}
          >
            Live Session
          </button>
          <button
            type="button"
            disabled={!hasDebrief}
            onClick={() => hasDebrief && onNavigate('debrief')}
            className={navLinkClass('debrief', !hasDebrief)}
          >
            Debrief
          </button>
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className={navLinkClass('history')}
          >
            History{historyCount > 0 ? ` (${historyCount})` : ''}
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onNewInterview}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-700 cursor-pointer"
          >
            New Interview
          </button>
        </div>
      </div>
    </header>
  );
};
