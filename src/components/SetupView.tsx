import React from 'react';
import { ArrowRight, Loader2, RotateCcw } from 'lucide-react';
import { ROLE_PRESETS } from '../data/presets';
import type {
  CoachingMode,
  InterviewFocus,
  InterviewSetup,
  InterviewTone,
  RoleLevel,
} from '../types/interview';

interface SetupViewProps {
  setup: InterviewSetup;
  isStarting: boolean;
  errorMessage: string | null;
  onChange: (next: InterviewSetup) => void;
  onStart: () => void;
  onReset: () => void;
}

const ROLE_LEVELS: RoleLevel[] = [
  'Internship',
  'Junior',
  'Mid-Level',
  'Senior',
  'Staff / Principal',
  'Manager / Lead',
];

const FOCUS_OPTIONS: InterviewFocus[] = [
  'Mixed',
  'Behavioral',
  'Technical / Case',
  'Role-Specific',
];

const TONE_OPTIONS: InterviewTone[] = ['Supportive', 'Direct / Bar-Raiser'];

export const SetupView: React.FC<SetupViewProps> = ({
  setup,
  isStarting,
  errorMessage,
  onChange,
  onStart,
  onReset,
}) => {
  const update = <K extends keyof InterviewSetup>(key: K, value: InterviewSetup[K]) => {
    onChange({ ...setup, [key]: value });
  };

  const canStart =
    (setup.jobTitle.trim().length > 0 || setup.jobDescription.trim().length > 0) &&
    !isStarting;

  const isSeniorOrAbove =
    setup.roleLevel === 'Senior' ||
    setup.roleLevel === 'Staff / Principal' ||
    setup.roleLevel === 'Manager / Lead';

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 text-balance">
            Configure your mock interview
          </h1>
          <p className="mt-2 text-base text-slate-600 max-w-2xl">
            Paste a job description and target company context. Questions, follow-up probes, and
            rubric scoring calibrate automatically to your target bar.
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 bg-white rounded-lg transition-colors whitespace-nowrap shrink-0 self-start md:self-auto cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" aria-hidden="true" />
          Clear Form
        </button>
      </div>

      {/* Quick-start presets */}
      <section aria-label="Role calibration presets" className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">Quick-start calibration templates</h2>
          <span className="text-xs text-slate-500">Select a template or paste your own below</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {ROLE_PRESETS.map((preset) => {
            const isSelected =
              setup.jobTitle === preset.setup.jobTitle &&
              setup.companyName === preset.setup.companyName;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChange({ ...preset.setup })}
                className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/60 border-blue-700'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-sm font-semibold text-slate-900 truncate">{preset.label}</div>
                <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                  {preset.summary}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Form controls */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-7">
          {errorMessage && (
            <div
              role="alert"
              className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
            >
              {errorMessage}
            </div>
          )}

          {/* 1. Role & Level */}
          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-semibold text-slate-900">01. Role & Seniority Level</h2>
              <span className="text-xs text-slate-500">Required</span>
            </div>

            <div>
              <label htmlFor="job-title" className="block text-sm font-medium text-slate-700 mb-1.5">
                Target Role Title
              </label>
              <input
                id="job-title"
                type="text"
                value={setup.jobTitle}
                onChange={(e) => update('jobTitle', e.target.value)}
                placeholder="e.g., Senior Backend Engineer, Product Manager, Staff UX Designer"
                className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
              />
            </div>

            <div>
              <span className="block text-sm font-medium text-slate-700 mb-2">Role Level</span>
              <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-lg">
                {ROLE_LEVELS.map((level) => {
                  const active = setup.roleLevel === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => update('roleLevel', level)}
                      className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {level}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="job-description"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Job Description
              </label>
              <textarea
                id="job-description"
                rows={5}
                value={setup.jobDescription}
                onChange={(e) => update('jobDescription', e.target.value)}
                placeholder="Paste the job description, key responsibilities, or required competencies here..."
                className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 leading-relaxed"
              />
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* 2. Company & Culture */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-slate-900">
              02. Company Name, Culture & Interview Style
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="company-name"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Target Company
                </label>
                <input
                  id="company-name"
                  type="text"
                  value={setup.companyName}
                  onChange={(e) => update('companyName', e.target.value)}
                  placeholder="e.g., Stripe, Amazon, Series A Startup"
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
                />
              </div>
              <div>
                <label
                  htmlFor="question-count"
                  className="block text-sm font-medium text-slate-700 mb-1.5"
                >
                  Session Length
                </label>
                <select
                  id="question-count"
                  value={setup.targetQuestions}
                  onChange={(e) => update('targetQuestions', Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
                >
                  <option value={4}>4 main questions (Quick drill)</option>
                  <option value={5}>5 main questions (Standard loop)</option>
                  <option value={6}>6 main questions (Full loop)</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="company-culture"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Culture & Interview Bar Notes
              </label>
              <textarea
                id="company-culture"
                rows={3}
                value={setup.companyCulture}
                onChange={(e) => update('companyCulture', e.target.value)}
                placeholder="e.g., Amazon Leadership Principles (Ownership, Dive Deep), Stripe's practical rigor, early-stage startup scrappiness, traditional corporate..."
                className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700 leading-relaxed"
              />
            </div>
          </div>

          <hr className="border-slate-200" />

          {/* 3. Focus, Tone, Coaching Mode */}
          <div className="space-y-5">
            <h2 className="text-base font-semibold text-slate-900">
              03. Interview Focus, Tone & Coaching Mode
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="block text-sm font-medium text-slate-700 mb-2">
                  Question Focus
                </span>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
                  {FOCUS_OPTIONS.map((focus) => {
                    const active = setup.focus === focus;
                    return (
                      <button
                        key={focus}
                        type="button"
                        onClick={() => update('focus', focus)}
                        className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {focus}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="block text-sm font-medium text-slate-700 mb-2">
                  Interviewer Tone
                </span>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
                  {TONE_OPTIONS.map((tone) => {
                    const active = setup.tone === tone;
                    return (
                      <button
                        key={tone}
                        type="button"
                        onClick={() => update('tone', tone)}
                        className={`px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tone}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <span className="block text-sm font-medium text-slate-700 mb-2">
                Coaching Protocol
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(
                  [
                    {
                      value: 'live' as CoachingMode,
                      title: 'Live Simulation (Default)',
                      desc: 'Stays strictly in character until you type "coach me", "feedback", or complete the loop.',
                    },
                    {
                      value: 'instant' as CoachingMode,
                      title: 'Instant Coaching',
                      desc: 'Delivers a Strength, Gap, and Upgraded Approach critique after every answer.',
                    },
                  ] as const
                ).map((opt) => {
                  const active = setup.coachingMode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => update('coachingMode', opt.value)}
                      className={`text-left p-4 rounded-lg border transition-colors cursor-pointer ${
                        active
                          ? 'bg-blue-50/50 border-blue-700'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-sm font-semibold text-slate-900">{opt.title}</div>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              Confirms a 3-point interview plan and opens immediately with Question 1.
            </p>
            <button
              type="button"
              disabled={!canStart}
              onClick={onStart}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  Calibrating Session...
                </>
              ) : (
                <>
                  Start Mock Interview
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right column: Calibration brief preview */}
        <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Calibration Preview</h2>
            <p className="mt-1 text-xs text-slate-500">
              How your interviewer will evaluate answers in this session.
            </p>
          </div>

          <div className="space-y-4 text-sm border-t border-slate-200 pt-4">
            <div>
              <div className="text-xs font-medium text-slate-500">Target Profile</div>
              <div className="mt-1 font-medium text-slate-900">
                {setup.roleLevel} · {setup.jobTitle.trim() || 'Role not specified'}
              </div>
              <div className="mt-0.5 text-xs text-slate-600">
                {setup.companyName.trim() || 'Target Company'} · {setup.focus} Focus
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500">Bar Expectations</div>
              <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                {setup.roleLevel === 'Internship'
                  ? 'Evaluates core fundamentals, intellectual curiosity, coachability, teamwork, and structured reasoning through coursework or personal projects.'
                  : isSeniorOrAbove
                    ? 'Probes for navigating ambiguity, architectural or strategic trade-offs, cross-functional influence, and measurable business impact.'
                    : 'Focuses on hands-on execution, core technical or role fundamentals, coachability, and clear structured problem-solving.'}
              </p>
            </div>

            <div>
              <div className="text-xs font-medium text-slate-500">Follow-Up Triggers</div>
              <ul className="mt-1.5 space-y-1.5 text-xs text-slate-700">
                <li>1. Saying "we" without clarifying personal "I" ownership</li>
                <li>2. Vague outcomes missing baseline metrics or timeframe</li>
                <li>3. Skipping alternatives considered and key trade-offs</li>
              </ul>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <div className="text-xs font-medium text-slate-500">Live Session Commands</div>
              <div className="mt-2 space-y-1.5 text-xs text-slate-600">
                <div>
                  <span className="font-mono text-slate-900">coach me</span> or{' '}
                  <span className="font-mono text-slate-900">feedback</span> — pause for critique
                </div>
                <div>
                  <span className="font-mono text-slate-900">end interview</span> — generate Final
                  Debrief Scorecard
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
