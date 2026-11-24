import { useEffect, useState } from 'react';
import { DebriefScorecard } from './components/DebriefScorecard';
import { HistoryView } from './components/HistoryView';
import { InterviewStage } from './components/InterviewStage';
import { SetupView } from './components/SetupView';
import { TopBar, type AppView } from './components/TopBar';
import type {
  CoachingMode,
  DebriefReport,
  InterviewSession,
  InterviewSetup,
  StartInterviewResponse,
  TranscriptTurn,
  TurnInterviewResponse,
} from './types/interview';

const STORAGE_KEY = 'caliber_interview_sessions_v1';

const DEFAULT_SETUP: InterviewSetup = {
  jobTitle: '',
  roleLevel: 'Senior',
  jobDescription: '',
  companyName: '',
  companyCulture: '',
  focus: 'Mixed',
  tone: 'Direct / Bar-Raiser',
  coachingMode: 'live',
  targetQuestions: 5,
};

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadSessions(): InterviewSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: (T & { error?: string }) | null = null;
  try {
    data = JSON.parse(text) as T & { error?: string };
  } catch {
    throw new Error(
      res.ok
        ? 'Received an invalid response from the server.'
        : `Server returned status ${res.status}. Please try again.`,
    );
  }
  if (!res.ok) {
    throw new Error(data?.error || `Request failed with status ${res.status}.`);
  }
  return data;
}

export default function App() {
  const [view, setView] = useState<AppView>('setup');
  const [setup, setSetup] = useState<InterviewSetup>(DEFAULT_SETUP);
  const [sessions, setSessions] = useState<InterviewSession[]>(() => loadSessions());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  const [isStarting, setIsStarting] = useState(false);
  const [isSubmittingTurn, setIsSubmittingTurn] = useState(false);
  const [isGeneratingDebrief, setIsGeneratingDebrief] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch {
      // Ignore storage quota errors
    }
  }, [sessions]);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  const upsertSession = (next: InterviewSession) => {
    setSessions((prev) => {
      const exists = prev.some((s) => s.id === next.id);
      if (exists) {
        return prev.map((s) => (s.id === next.id ? next : s));
      }
      return [next, ...prev];
    });
  };

  const handleStartInterview = async () => {
    setErrorMessage(null);
    setIsStarting(true);
    try {
      const data = await postJson<StartInterviewResponse>('/api/interview/start', { setup });

      const now = new Date().toISOString();
      const firstTurn: TranscriptTurn = {
        id: createId(),
        role: 'interviewer',
        content: `${data.openingGreeting}\n\n${data.question}`,
        questionNumber: 1,
        questionCategory: data.questionCategory,
        isFollowUp: false,
        timestamp: now,
      };

      const newSession: InterviewSession = {
        id: createId(),
        setup: { ...setup },
        planBullets: data.planBullets,
        turns: [firstTurn],
        questionCount: 1,
        followUpCountOnCurrent: 0,
        shouldWrapUp: false,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      upsertSession(newSession);
      setActiveSessionId(newSession.id);
      setView('interview');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to start interview.');
    } finally {
      setIsStarting(false);
    }
  };

  const sendTurnToServer = async (
    session: InterviewSession,
    userMessage: string,
    durationSeconds?: number,
    modeOverride?: 'coach_me' | 'normal',
  ) => {
    setErrorMessage(null);
    setIsSubmittingTurn(true);

    const now = new Date().toISOString();
    const candidateTurn: TranscriptTurn = {
      id: createId(),
      role: 'candidate',
      content: userMessage,
      durationSeconds,
      timestamp: now,
    };

    const updatedTurns = [...session.turns, candidateTurn];
    const optimisticSession: InterviewSession = {
      ...session,
      turns: updatedTurns,
      updatedAt: now,
    };
    upsertSession(optimisticSession);

    try {
      const data = await postJson<TurnInterviewResponse>('/api/interview/turn', {
        setup: session.setup,
        history: session.turns,
        userMessage,
        questionCount: session.questionCount,
        followUpCountOnCurrent: session.followUpCountOnCurrent,
        modeOverride,
      });

      const nextQuestionCount =
        data.action === 'next_question' ? session.questionCount + 1 : session.questionCount;

      const nextFollowUpCount =
        data.action === 'follow_up'
          ? session.followUpCountOnCurrent + 1
          : data.action === 'next_question'
            ? 0
            : session.followUpCountOnCurrent;

      const combinedReply = [data.interviewerReply, data.nextQuestion]
        .filter((part) => part && part.trim().length > 0)
        .join('\n\n');

      const interviewerTurn: TranscriptTurn = {
        id: createId(),
        role: 'interviewer',
        content: combinedReply,
        questionNumber:
          data.action === 'suggest_debrief' ? undefined : nextQuestionCount,
        questionCategory: data.questionCategory,
        isFollowUp: data.isFollowUp,
        coachingFeedback: data.coachingFeedback,
        timestamp: new Date().toISOString(),
      };

      upsertSession({
        ...optimisticSession,
        turns: [...updatedTurns, interviewerTurn],
        questionCount: nextQuestionCount,
        followUpCountOnCurrent: nextFollowUpCount,
        shouldWrapUp: Boolean(data.shouldWrapUp),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Unable to send response.');
    } finally {
      setIsSubmittingTurn(false);
    }
  };

  const handleEndInterview = async (targetSession?: InterviewSession) => {
    const session = targetSession ?? activeSession;
    if (!session) return;

    setErrorMessage(null);
    setIsGeneratingDebrief(true);
    try {
      const data = await postJson<DebriefReport>('/api/interview/debrief', {
        setup: session.setup,
        history: session.turns,
      });

      const completed: InterviewSession = {
        ...session,
        debrief: data,
        status: 'completed',
        updatedAt: new Date().toISOString(),
      };
      upsertSession(completed);
      setView('debrief');
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to generate Final Debrief Scorecard.',
      );
    } finally {
      setIsGeneratingDebrief(false);
    }
  };

  const handleSubmitResponse = (text: string, durationSeconds: number) => {
    if (!activeSession) return;
    const normalized = text.trim().toLowerCase();
    if (normalized === 'end interview' || normalized === 'end session') {
      void handleEndInterview(activeSession);
      return;
    }
    const isCoachCmd =
      normalized === 'coach me' ||
      normalized === 'feedback' ||
      normalized.startsWith('coach me:') ||
      normalized.startsWith('feedback:');
    void sendTurnToServer(
      activeSession,
      text,
      durationSeconds,
      isCoachCmd ? 'coach_me' : 'normal',
    );
  };

  const handleRequestCoaching = () => {
    if (!activeSession) return;
    void sendTurnToServer(
      activeSession,
      'Please give me direct coaching feedback on my last answer.',
      undefined,
      'coach_me',
    );
  };

  const handleToggleCoachingMode = (mode: CoachingMode) => {
    if (!activeSession) return;
    upsertSession({
      ...activeSession,
      setup: { ...activeSession.setup, coachingMode: mode },
      updatedAt: new Date().toISOString(),
    });
  };

  const handleOpenSession = (session: InterviewSession, targetView: 'interview' | 'debrief') => {
    setErrorMessage(null);
    setActiveSessionId(session.id);
    setView(targetView);
  };

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
      if (view === 'interview' || view === 'debrief') {
        setView('history');
      }
    }
  };

  const handleNewInterview = () => {
    setErrorMessage(null);
    setView('setup');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <TopBar
        activeView={view}
        hasActiveSession={Boolean(activeSession)}
        hasDebrief={Boolean(activeSession?.debrief)}
        historyCount={sessions.length}
        onNavigate={(nextView) => {
          setErrorMessage(null);
          setView(nextView);
        }}
        onNewInterview={handleNewInterview}
      />

      <main className="flex-1">
        {view === 'setup' && (
          <SetupView
            setup={setup}
            isStarting={isStarting}
            errorMessage={errorMessage}
            onChange={setSetup}
            onStart={() => void handleStartInterview()}
            onReset={() => {
              setSetup(DEFAULT_SETUP);
              setErrorMessage(null);
            }}
          />
        )}

        {view === 'interview' && activeSession && (
          <InterviewStage
            session={activeSession}
            isSubmitting={isSubmittingTurn}
            isGeneratingDebrief={isGeneratingDebrief}
            errorMessage={errorMessage}
            onSubmitResponse={handleSubmitResponse}
            onRequestCoaching={handleRequestCoaching}
            onEndInterview={() => void handleEndInterview()}
            onToggleCoachingMode={handleToggleCoachingMode}
            onViewDebrief={() => setView('debrief')}
          />
        )}

        {view === 'debrief' && activeSession?.debrief && (
          <DebriefScorecard
            session={activeSession}
            debrief={activeSession.debrief}
            onPracticeAgain={() => {
              setSetup({ ...activeSession.setup });
              setErrorMessage(null);
              setView('setup');
            }}
            onViewTranscript={() => setView('interview')}
          />
        )}

        {view === 'history' && (
          <HistoryView
            sessions={sessions}
            activeSessionId={activeSessionId}
            onOpenSession={handleOpenSession}
            onDeleteSession={handleDeleteSession}
            onStartNew={handleNewInterview}
          />
        )}
      </main>
    </div>
  );
}
