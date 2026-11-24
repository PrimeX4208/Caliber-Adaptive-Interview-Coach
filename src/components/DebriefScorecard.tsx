import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  RotateCcw,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import type { DebriefReport, HireSignal, InterviewSession } from '../types/interview';

interface DebriefScorecardProps {
  session: InterviewSession;
  debrief: DebriefReport;
  onPracticeAgain: () => void;
  onViewTranscript: () => void;
}

function getSignalPresentation(signal: HireSignal) {
  switch (signal) {
    case 'Strong Hire':
      return {
        icon: CheckCircle2,
        textColor: 'text-emerald-800',
        surfaceColor: 'bg-emerald-50/70 border-emerald-200',
        barColor: 'bg-emerald-600',
      };
    case 'Hire':
      return {
        icon: TrendingUp,
        textColor: 'text-sky-800',
        surfaceColor: 'bg-sky-50/70 border-sky-200',
        barColor: 'bg-sky-600',
      };
    case 'Leaning No':
      return {
        icon: AlertTriangle,
        textColor: 'text-amber-800',
        surfaceColor: 'bg-amber-50/70 border-amber-200',
        barColor: 'bg-amber-600',
      };
    case 'No Hire':
      return {
        icon: XCircle,
        textColor: 'text-red-800',
        surfaceColor: 'bg-red-50/70 border-red-200',
        barColor: 'bg-red-600',
      };
    default:
      return {
        icon: TrendingUp,
        textColor: 'text-sky-800',
        surfaceColor: 'bg-sky-50/70 border-sky-200',
        barColor: 'bg-sky-600',
      };
  }
}

function getRatingColor(label: string) {
  switch (label) {
    case 'Exceeds Bar':
      return 'text-emerald-700';
    case 'Meets Bar':
      return 'text-sky-700';
    case 'Mixed Signal':
      return 'text-amber-700';
    default:
      return 'text-red-700';
  }
}

export const DebriefScorecard: React.FC<DebriefScorecardProps> = ({
  session,
  debrief,
  onPracticeAgain,
  onViewTranscript,
}) => {
  const signalUI = getSignalPresentation(debrief.hireSignal);
  const SignalIcon = signalUI.icon;

  const dimensions = debrief.dimensions ?? [];
  const rewriteExamples = debrief.rewriteExamples ?? [];

  const avgScore = (
    dimensions.reduce((sum, d) => sum + d.score, 0) /
    Math.max(dimensions.length, 1)
  ).toFixed(2);

  const handleExportMarkdown = () => {
    const lines: string[] = [
      `# Interview Debrief Scorecard — ${session.setup.jobTitle || 'Role'}`,
      `- **Company:** ${session.setup.companyName || 'Target Company'}`,
      `- **Level:** ${session.setup.roleLevel}`,
      `- **Focus / Tone:** ${session.setup.focus} · ${session.setup.tone}`,
      `- **Hire Signal:** ${debrief.hireSignal} (${avgScore} / 4.00 avg)`,
      '',
      `## Committee Rationale`,
      debrief.hireSignalRationale,
      '',
      `## Executive Summary`,
      debrief.overallSummary,
      '',
      `## Dimension Breakdown`,
      ...dimensions.flatMap((d) => [
        `### ${d.name} — ${d.score.toFixed(1)} / 4.0 (${d.ratingLabel})`,
        `- **Observed Evidence:** ${d.evidence}`,
        `- **Growth Focus:** ${d.growthFocus}`,
        '',
      ]),
      `## Top 2 Rewrite Examples`,
      ...rewriteExamples.flatMap((ex, i) => [
        `### Example ${i + 1}: ${ex.questionAsked}`,
        `- **Original Response:** "${ex.originalExcerpt}"`,
        `- **Why It Fell Short:** ${ex.weaknessDiagnosis}`,
        `- **Elevated Rewrite:** ${ex.elevatedRewrite}`,
        '',
      ]),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debrief-${(session.setup.jobTitle || 'interview')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1160px] mx-auto px-6 py-8 space-y-8">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="text-xs text-slate-500">
            Final Debrief Scorecard · {session.setup.roleLevel} ·{' '}
            {session.setup.companyName || 'Target Company'} ·{' '}
            {new Date(debrief.generatedAt).toLocaleDateString()}
          </div>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-slate-900 text-balance">
            {session.setup.jobTitle || 'Mock Interview Evaluation'}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onViewTranscript}
            className="px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            View Transcript
          </button>
          <button
            type="button"
            onClick={handleExportMarkdown}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            Export Markdown
          </button>
          <button
            type="button"
            onClick={onPracticeAgain}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            Practice Again
          </button>
        </div>
      </div>

      {/* 1. Hire Signal Banner */}
      <section
        aria-label="Hiring committee signal"
        className={`rounded-xl border p-6 sm:p-7 ${signalUI.surfaceColor}`}
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className={`inline-flex items-center gap-2 text-sm font-semibold ${signalUI.textColor}`}>
              <SignalIcon className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>Hire Signal: {debrief.hireSignal}</span>
            </div>
            <p className="text-[15px] text-slate-800 leading-relaxed">
              {debrief.hireSignalRationale}
            </p>
            <p className="text-sm text-slate-600 leading-relaxed pt-1">
              {debrief.overallSummary}
            </p>
          </div>

          <div className="md:text-right shrink-0 border-t md:border-t-0 pt-4 md:pt-0 border-slate-200/70">
            <div className="text-xs font-medium text-slate-500">Composite Rubric Average</div>
            <div className="mt-1 text-3xl font-semibold font-mono tabular-nums text-slate-900">
              {avgScore} <span className="text-base font-normal text-slate-500">/ 4.00</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Dimension Breakdown */}
      <section aria-label="Dimension breakdown" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-slate-900">01. Dimension Breakdown</h2>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            Calibrated to {session.setup.roleLevel} bar (1.0–4.0 scale)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dimensions.map((dim) => {
            const pct = Math.min(100, Math.max(0, (dim.score / 4) * 100));
            return (
              <div
                key={dim.name}
                className="bg-white border border-slate-200 rounded-xl p-6 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{dim.name}</h3>
                    <div className={`mt-0.5 text-xs font-semibold ${getRatingColor(dim.ratingLabel)}`}>
                      {dim.ratingLabel}
                    </div>
                  </div>
                  <div className="font-mono text-lg font-semibold tabular-nums text-slate-900 shrink-0">
                    {dim.score.toFixed(1)} <span className="text-xs text-slate-400">/ 4.0</span>
                  </div>
                </div>

                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      dim.score >= 3
                        ? 'bg-emerald-600'
                        : dim.score >= 2.5
                          ? 'bg-amber-600'
                          : 'bg-red-600'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="space-y-3 text-sm pt-1">
                  <div>
                    <div className="text-xs font-medium text-slate-500">Observed Evidence</div>
                    <p className="mt-1 text-slate-700 leading-relaxed">{dim.evidence}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-xs font-medium text-slate-500">Growth Focus</div>
                    <p className="mt-1 text-slate-800 leading-relaxed">{dim.growthFocus}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Top 2 Rewrite Examples */}
      <section aria-label="Top 2 rewrite examples" className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold text-slate-900">02. Top 2 Rewrite Examples</h2>
          <span className="text-xs text-slate-500">
            Concrete upgrades for your lowest-signal answers
          </span>
        </div>

        <div className="space-y-5">
          {rewriteExamples.map((example, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden"
            >
              <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                <div className="text-xs font-mono font-medium text-slate-500">
                  Rewrite 0{idx + 1}
                </div>
                <h3 className="mt-1 text-base font-semibold text-slate-900">
                  {example.questionAsked}
                </h3>
                <p className="mt-1 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Gap diagnosed: </span>
                  {example.weaknessDiagnosis}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                <div className="p-6 space-y-2">
                  <div className="text-xs font-semibold text-slate-500">Your Original Response</div>
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                    {example.originalExcerpt}
                  </p>
                </div>

                <div className="p-6 space-y-2 bg-emerald-50/25">
                  <div className="text-xs font-semibold text-emerald-800">
                    Elevated High-Signal Rewrite
                  </div>
                  <p className="text-sm text-slate-900 leading-relaxed whitespace-pre-wrap">
                    {example.elevatedRewrite}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
