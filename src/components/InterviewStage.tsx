import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Flag,
  Keyboard,
  ListPlus,
  Loader2,
  MessageSquare,
  Mic,
  MicOff,
  Send,
} from 'lucide-react';
import type { CoachingMode, InterviewSession } from '../types/interview';

interface InterviewStageProps {
  session: InterviewSession;
  isSubmitting: boolean;
  isGeneratingDebrief: boolean;
  errorMessage: string | null;
  onSubmitResponse: (text: string, durationSeconds: number) => void;
  onRequestCoaching: () => void;
  onEndInterview: () => void;
  onToggleCoachingMode: (mode: CoachingMode) => void;
  onViewDebrief: () => void;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const InterviewStage: React.FC<InterviewStageProps> = ({
  session,
  isSubmitting,
  isGeneratingDebrief,
  errorMessage,
  onSubmitResponse,
  onRequestCoaching,
  onEndInterview,
  onToggleCoachingMode,
  onViewDebrief,
}) => {
  const [draft, setDraft] = useState('');
  const [planExpanded, setPlanExpanded] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'microphone'>('text');

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const SpeechRecognitionCtor =
    typeof window !== 'undefined'
      ? ((window as unknown as Record<string, unknown>).SpeechRecognition as
          | (new () => SpeechRecognitionInstance)
          | undefined) ||
        ((window as unknown as Record<string, unknown>).webkitSpeechRecognition as
          | (new () => SpeechRecognitionInstance)
          | undefined)
      : undefined;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [session.turns.length, isSubmitting]);

  useEffect(() => {
    if (session.status === 'completed' || isSubmitting || isGeneratingDebrief) {
      return;
    }
    setElapsedSeconds(0);
    const interval = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [session.turns.length, session.status, isSubmitting, isGeneratingDebrief]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore teardown errors
        }
      }
    };
  }, []);

  const toggleDictation = () => {
    if (!SpeechRecognitionCtor) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.onresult = (event) => {
        let appended = '';
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result && result[0]?.transcript) {
            appended += `${result[0].transcript} `;
          }
        }
        if (appended.trim()) {
          setDraft((prev) => `${prev ? `${prev.trim()} ` : ''}${appended.trim()}`);
        }
      };
      recognition.onerror = () => {
        setIsListening(false);
        setInputMode('text');
      };
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
      setInputMode('text');
    }
  };

  const handleSubmit = () => {
    const trimmed = draft.trim();
    if (!trimmed || isSubmitting || isGeneratingDebrief) return;
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    setDraft('');
    onSubmitResponse(trimmed, elapsedSeconds);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectInputMode = (mode: 'text' | 'microphone') => {
    setInputMode(mode);
    if (mode === 'text' && isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleInsertStarOutline = () => {
    const template = `Situation: \nTask: \nAction (what I personally drove): \nResult (metrics & outcome): `;
    setDraft((prev) => (prev.trim() ? `${prev.trim()}\n\n${template}` : template));
  };

  const wordCount = draft.trim() ? draft.trim().split(/\s+/).length : 0;

  const hasCandidateTurns = session.turns.some((t) => t.role === 'candidate');
  const progressPct = Math.min(
    100,
    Math.round((session.questionCount / Math.max(session.setup.targetQuestions, 1)) * 100),
  );

  return (
    <div className="max-w-[1320px] mx-auto px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Interview Stage */}
        <div className="lg:col-span-8 space-y-6">
          {/* Confirmed 3-Bullet Plan */}
          <section
            aria-label="Interview Plan"
            className="bg-white border border-slate-200 rounded-xl overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setPlanExpanded((p) => !p)}
              className="w-full px-5 py-3.5 flex items-center justify-between gap-4 text-left hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="text-sm font-semibold text-slate-900">Interview Plan</span>
                <span className="text-xs text-slate-500 truncate">
                  {session.setup.roleLevel} · {session.setup.companyName || 'Target Company'} ·{' '}
                  {session.setup.focus}
                </span>
              </div>
              {planExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
              )}
            </button>

            {planExpanded && (
              <div className="px-5 pb-4 pt-2 border-t border-slate-100">
                <ol className="space-y-2">
                  {session.planBullets.map((bullet, idx) => (
                    <li key={idx} className="flex items-baseline gap-3 text-sm text-slate-700">
                      <span className="font-mono text-xs font-medium text-blue-700 tabular-nums shrink-0">
                        0{idx + 1}.
                      </span>
                      <span className="leading-relaxed">{bullet}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>

          {/* Transcript Stream */}
          <div className="space-y-5">
            {session.turns.map((turn) => {
              if (turn.role === 'interviewer') {
                return (
                  <article
                    key={turn.id}
                    className="bg-white border border-slate-200 rounded-xl p-6 space-y-3"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-900">
                        {turn.isFollowUp
                          ? `Follow-Up Probe${turn.questionNumber ? ` (Q${turn.questionNumber})` : ''}`
                          : turn.questionNumber
                            ? `Question ${String(turn.questionNumber).padStart(2, '0')}`
                            : 'Interviewer'}
                      </span>
                      {turn.questionCategory && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{turn.questionCategory}</span>
                        </>
                      )}
                    </div>

                    <div className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap">
                      {turn.content}
                    </div>

                    {turn.coachingFeedback && (
                      <div className="mt-4 pt-4 border-t border-slate-200 space-y-3 bg-slate-50/70 -mx-6 -mb-6 px-6 py-4 rounded-b-xl">
                        <div className="text-xs font-semibold text-blue-800">
                          Coaching Critique
                        </div>
                        <div className="grid grid-cols-1 gap-2.5 text-sm">
                          <div>
                            <span className="font-semibold text-emerald-800">Strength: </span>
                            <span className="text-slate-700">{turn.coachingFeedback.strength}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-amber-800">Gap: </span>
                            <span className="text-slate-700">{turn.coachingFeedback.gap}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900">Upgraded Approach: </span>
                            <span className="text-slate-700">
                              {turn.coachingFeedback.upgradedApproach}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              }

              if (turn.role === 'candidate') {
                return (
                  <article
                    key={turn.id}
                    className="bg-slate-100/90 border border-slate-200 rounded-xl p-5 ml-0 sm:ml-8 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-800">Your Response</span>
                      {typeof turn.durationSeconds === 'number' && (
                        <span className="font-mono tabular-nums">
                          {formatDuration(turn.durationSeconds)}
                        </span>
                      )}
                    </div>
                    <div className="text-[15px] text-slate-900 leading-relaxed whitespace-pre-wrap">
                      {turn.content}
                    </div>
                  </article>
                );
              }

              return (
                <article
                  key={turn.id}
                  className="bg-blue-50/50 border border-blue-200 rounded-xl p-5 space-y-2"
                >
                  <div className="text-xs font-semibold text-blue-900">Coach Feedback</div>
                  <div className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {turn.content}
                  </div>
                </article>
              );
            })}

            {isSubmitting && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-3 text-sm text-slate-600">
                <Loader2 className="w-4 h-4 animate-spin text-blue-700 shrink-0" aria-hidden="true" />
                <span>Evaluating response and preparing next calibration step...</span>
              </div>
            )}

            {session.shouldWrapUp && !session.debrief && (
              <div className="bg-white border border-blue-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Interview Loop Complete
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-600">
                    All planned questions are finished. Generate your calibrated Final Debrief
                    Scorecard now.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isGeneratingDebrief}
                  onClick={onEndInterview}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isGeneratingDebrief ? 'Scoring Rubric...' : 'Generate Final Debrief'}
                </button>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div
              role="alert"
              className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
            >
              {errorMessage}
            </div>
          )}

          {/* Candidate Composer */}
          {session.status === 'active' ? (
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => handleSelectInputMode('text')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      inputMode === 'text'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Keyboard className="w-3.5 h-3.5" aria-hidden="true" />
                    Text Response
                  </button>
                  <button
                    type="button"
                    disabled={!SpeechRecognitionCtor}
                    onClick={() => handleSelectInputMode('microphone')}
                    title={
                      SpeechRecognitionCtor
                        ? 'Use browser microphone dictation'
                        : 'Microphone dictation is not supported in this browser — use Text Response'
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      !SpeechRecognitionCtor
                        ? 'text-slate-400 cursor-not-allowed'
                        : inputMode === 'microphone'
                          ? 'bg-white text-slate-900 shadow-sm cursor-pointer'
                          : 'text-slate-600 hover:text-slate-900 cursor-pointer'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" aria-hidden="true" />
                    Microphone
                  </button>
                </div>

                {inputMode === 'text' ? (
                  <button
                    type="button"
                    onClick={handleInsertStarOutline}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <ListPlus className="w-3.5 h-3.5" aria-hidden="true" />
                    Insert STAR Outline
                  </button>
                ) : (
                  SpeechRecognitionCtor && (
                    <button
                      type="button"
                      onClick={toggleDictation}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        isListening
                          ? 'bg-red-50 border-red-300 text-red-700'
                          : 'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100'
                      }`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-3.5 h-3.5" aria-hidden="true" />
                          Stop Microphone
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5" aria-hidden="true" />
                          Start Dictation
                        </>
                      )}
                    </button>
                  )
                )}
              </div>

              <label htmlFor="candidate-response" className="sr-only">
                Your interview response
              </label>
              <textarea
                id="candidate-response"
                rows={5}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSubmitting || isGeneratingDebrief}
                placeholder={
                  inputMode === 'microphone'
                    ? 'Click "Start Dictation" above to speak your answer, or edit the transcribed text here before submitting...'
                    : 'Write your response here (focus on personal "I" actions, trade-offs, and metrics). Press Ctrl/Cmd+Enter to submit, or type "coach me" / "end interview".'
                }
                className="w-full px-3 py-2 text-[15px] text-slate-900 placeholder:text-slate-400 bg-transparent resize-y focus:outline-none leading-relaxed"
              />

              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span
                    aria-label="Response timer"
                    className="font-mono tabular-nums"
                  >
                    {formatDuration(elapsedSeconds)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{wordCount} words</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!hasCandidateTurns || isSubmitting || isGeneratingDebrief}
                    onClick={onRequestCoaching}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                    Coach Me
                  </button>

                  <button
                    type="button"
                    disabled={!hasCandidateTurns || isSubmitting || isGeneratingDebrief}
                    onClick={onEndInterview}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {isGeneratingDebrief ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    End Interview
                  </button>

                  <button
                    type="button"
                    disabled={!draft.trim() || isSubmitting || isGeneratingDebrief}
                    onClick={handleSubmit}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    Submit Answer
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-900">Session Completed</div>
                <p className="mt-0.5 text-xs text-slate-600">
                  This mock interview is archived with its rubric evaluation.
                </p>
              </div>
              {session.debrief && (
                <button
                  type="button"
                  onClick={onViewDebrief}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  View Final Debrief
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Calibration & Rubric Rail */}
        <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
            <div>
              <div className="text-xs font-medium text-slate-500">Active Loop</div>
              <h2 className="mt-1 text-base font-semibold text-slate-900">
                {session.setup.jobTitle || 'Mock Interview'}
              </h2>
              <div className="mt-1 text-xs text-slate-600">
                {session.setup.roleLevel} · {session.setup.companyName || 'Target Company'} ·{' '}
                {session.setup.tone}
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-medium text-slate-700">Question Progress</span>
                <span className="font-mono tabular-nums text-slate-600">
                  {session.questionCount} / {session.setup.targetQuestions}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-700 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <span className="block text-xs font-medium text-slate-700 mb-2">
                Coaching Mode
              </span>
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => onToggleCoachingMode('live')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    session.setup.coachingMode === 'live'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Live Simulation
                </button>
                <button
                  type="button"
                  onClick={() => onToggleCoachingMode('instant')}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    session.setup.coachingMode === 'instant'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Instant Coaching
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                {session.setup.coachingMode === 'live'
                  ? 'Interviewer stays in character. Click "Coach Me" anytime for mid-loop critique.'
                  : 'Concise Strength, Gap, and Upgraded Approach critique follows every answer.'}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-2.5">
              <div className="text-xs font-medium text-slate-700">Scored Rubric Dimensions</div>
              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-start justify-between gap-2">
                  <span className="font-medium text-slate-800">01. Role Competency</span>
                  <span className="font-mono text-slate-400">1–4</span>
                </li>
                <li className="flex items-start justify-between gap-2">
                  <span className="font-medium text-slate-800">02. Company Culture Fit</span>
                  <span className="font-mono text-slate-400">1–4</span>
                </li>
                <li className="flex items-start justify-between gap-2">
                  <span className="font-medium text-slate-800">03. Communication & Structure</span>
                  <span className="font-mono text-slate-400">1–4</span>
                </li>
                <li className="flex items-start justify-between gap-2">
                  <span className="font-medium text-slate-800">04. Depth & Trade-offs</span>
                  <span className="font-mono text-slate-400">1–4</span>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
