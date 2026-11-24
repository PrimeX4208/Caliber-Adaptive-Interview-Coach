import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = 'gemini-4-hydrogen';
const FALLBACK_MODEL_NAME = 'gemini-3.1-flash-lite';

interface InterviewSetup {
  jobTitle: string;
  roleLevel: string;
  jobDescription: string;
  companyName: string;
  companyCulture: string;
  focus: string;
  tone: string;
  coachingMode: 'live' | 'instant';
  targetQuestions: number;
}

interface TranscriptTurn {
  role: 'interviewer' | 'candidate' | 'coach';
  content: string;
  questionNumber?: number;
  questionCategory?: string;
  isFollowUp?: boolean;
}

function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured in environment secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function generateWithFallback(
  ai: GoogleGenAI,
  buildParams: (model: string, useThinking: boolean) => Parameters<typeof ai.models.generateContent>[0],
) {
  const attempts: Array<{ model: string; useThinking: boolean; delayMs: number }> = [
    { model: MODEL_NAME, useThinking: true, delayMs: 300 },
    { model: FALLBACK_MODEL_NAME, useThinking: false, delayMs: 500 },
    { model: MODEL_NAME, useThinking: false, delayMs: 0 },
  ];

  let lastError: unknown;
  for (let i = 0; i < attempts.length; i++) {
    const step = attempts[i];
    try {
      return await ai.models.generateContent(buildParams(step.model, step.useThinking));
    } catch (err: unknown) {
      lastError = err;
      const status = (err as { status?: number })?.status;
      const msg = err instanceof Error ? err.message : '';
      console.warn(`Attempt ${i + 1} (${step.model}) failed:`, status ?? msg);
      const isTransient =
        status === 503 ||
        status === 429 ||
        status === 500 ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('high demand') ||
        msg.includes('RESOURCE_EXHAUSTED');

      if (!isTransient) {
        throw err;
      }
      if (i < attempts.length - 1 && step.delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, step.delayMs));
      }
    }
  }
  throw lastError;
}

function parseJsonResponse<T>(rawText: string | undefined): T {
  const cleaned = (rawText ?? '{}')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(cleaned || '{}') as T;
}

function extractReadableError(rawMessage: string): string {
  try {
    const parsed = JSON.parse(rawMessage) as { error?: { message?: string } | string };
    if (typeof parsed?.error === 'string') return parsed.error;
    if (parsed?.error && typeof parsed.error === 'object' && parsed.error.message) {
      return parsed.error.message;
    }
  } catch {
    // Not JSON
  }
  return rawMessage;
}

function handleApiError(res: express.Response, err: unknown) {
  console.error('Gemini API error:', err);
  const status = (err as { status?: number })?.status;
  const rawMessage = err instanceof Error ? err.message : 'Unexpected server error';
  const cleanMessage = extractReadableError(rawMessage);

  if (cleanMessage.includes('GEMINI_API_KEY')) {
    return res.status(500).json({
      error: 'Gemini API key is missing. Please configure GEMINI_API_KEY in Settings > Secrets.',
    });
  }
  if (status === 403 || cleanMessage.includes('PERMISSION_DENIED')) {
    return res.status(403).json({
      error: 'Permission denied by Gemini API. Please verify your API key in Settings > Secrets.',
    });
  }
  if (status === 429 || cleanMessage.includes('RESOURCE_EXHAUSTED')) {
    return res.status(429).json({
      error: 'Rate limit reached on Gemini API. Please wait a moment and try again.',
    });
  }
  if (status === 503 || cleanMessage.includes('UNAVAILABLE') || cleanMessage.includes('high demand')) {
    return res.status(503).json({
      error: 'The AI model is temporarily busy due to high demand. Please retry in a few seconds.',
    });
  }
  if (status === 404 || cleanMessage.includes('NOT_FOUND')) {
    return res.status(404).json({
      error: `Model ${MODEL_NAME} was not found or is unavailable for this key.`,
    });
  }
  return res.status(status && status >= 400 ? status : 500).json({
    error: cleanMessage,
  });
}

function buildInterviewerSystemInstruction(setup: InterviewSetup): string {
  const toneRules =
    setup.tone === 'Direct / Bar-Raiser'
      ? 'Adopt a crisp, high-bar, Bar-Raiser tone: polite and respectful, never harsh, but uncompromising on specificity, metrics, trade-offs, and personal "I" accountability.'
      : 'Adopt a supportive, encouraging yet rigorous interviewer tone: help the candidate feel comfortable while still probing gently for concrete evidence, clarity, and trade-offs.';

  const levelCalibration =
    setup.roleLevel === 'Internship'
      ? `Calibrate strictly for an Internship candidate: focus on core fundamentals, problem-solving clarity, intellectual curiosity, coachability, and collaboration using coursework, hackathons, capstone/personal projects, or early experience rather than multi-year production leadership.`
      : setup.roleLevel === 'Junior' || setup.roleLevel === 'Mid-Level'
        ? `Calibrate strictly for a ${setup.roleLevel} candidate: focus on hands-on execution, core fundamentals, debugging/problem-solving clarity, coachability, and ownership of individual deliverables.`
        : `Calibrate strictly for a ${setup.roleLevel} candidate: probe deeply for handling ambiguity, architectural/strategic trade-offs, cross-functional influence without authority, measurable business impact, and systems-level thinking.`;

  return `You are an adaptive, high-precision Interview Coach and realistic Mock Interviewer.

TARGET CONTEXT:
- Role: ${setup.jobTitle || 'Not specified'}
- Level: ${setup.roleLevel}
- Company: ${setup.companyName || 'Target Company'}
- Company Culture & Bar: ${setup.companyCulture || 'High-bar modern technology company'}
- Preferred Focus: ${setup.focus}
- Target Question Count: ${setup.targetQuestions} main questions
- Job Description:
${setup.jobDescription || 'No detailed job description pasted; infer standard expectations from role and level.'}

CALIBRATION RULES:
1. ${levelCalibration}
2. Mirror ${setup.companyName || 'the target company'}'s interview values and pacing.
3. ${toneRules}
4. ONE QUESTION AT A TIME: Never ask multiple questions in a single turn. Ask exactly ONE clear, focused question and wait for the candidate's response.
5. DYNAMIC FOLLOW-UPS: If the candidate's answer is vague, skips trade-offs, lacks measurable outcomes, or hides behind "we" instead of clarifying what "I" specifically drove, ask 1 sharp follow-up probe before moving to the next main topic.
6. QUESTION MIX: Unless Preferred Focus is purely Behavioral or purely Technical/Case, alternate naturally across Behavioral (STAR), Situational/Case, and Role-Specific problem-solving.`;
}

function formatTranscript(history: TranscriptTurn[]): string {
  if (!history.length) return '(No prior turns)';
  return history
    .map((t) => {
      const label =
        t.role === 'interviewer'
          ? `INTERVIEWER${t.questionNumber ? ` [Q${t.questionNumber}${t.isFollowUp ? ' Follow-up' : ''}]` : ''}`
          : t.role === 'candidate'
            ? 'CANDIDATE'
            : 'COACH NOTE';
      return `${label}: ${t.content}`;
    })
    .join('\n\n');
}

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/favicon.ico', (_req, res) => {
    res.status(204).end();
  });

  app.post('/api/interview/start', async (req, res) => {
    try {
      const setup = req.body?.setup as InterviewSetup | undefined;
      if (!setup || (!setup.jobDescription?.trim() && !setup.jobTitle?.trim())) {
        return res.status(400).json({
          error: 'Please provide a Job Description or target Role Title before starting.',
        });
      }

      const ai = getGenAIClient();
      const systemInstruction = buildInterviewerSystemInstruction(setup);

      const response = await generateWithFallback(ai, (model, useThinking) => ({
        model,
        contents: `Begin Phase 1 (Session Setup confirmation) and immediately ask Question 1.
Requirements:
- planBullets: Produce EXACTLY 3 concise bullet strings summarizing:
  1. Role & Level Calibration (e.g. what bar is being tested for ${setup.roleLevel} ${setup.jobTitle})
  2. Company Style (${setup.companyName || 'Target Company'} values & interview lens)
  3. Question Mix & Pacing (${setup.focus} focus across ~${setup.targetQuestions} main questions, ${setup.coachingMode === 'instant' ? 'instant coaching after each turn' : 'live simulation mode'})
- openingGreeting: Brief 1-2 sentence in-character welcome as an interviewer at ${setup.companyName || 'the company'}.
- question: Exactly ONE strong, context-calibrated Question 1 tailored to this role, level, and company. Do NOT bundle multiple questions.
- questionCategory: One of "Behavioral (STAR)", "Situational / Case", "Role-Specific", or "Technical Depth".`,
        config: {
          systemInstruction,
          ...(useThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              planBullets: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Exactly 3 concise interview plan bullets.',
              },
              openingGreeting: {
                type: Type.STRING,
                description: 'Brief 1-2 sentence in-character greeting.',
              },
              question: {
                type: Type.STRING,
                description: 'Question 1 — strictly one single question.',
              },
              questionCategory: {
                type: Type.STRING,
                description: 'Category of Question 1.',
              },
            },
            required: ['planBullets', 'openingGreeting', 'question', 'questionCategory'],
          },
        },
      }));

      const parsed = parseJsonResponse<Record<string, unknown>>(response.text);
      return res.json(parsed);
    } catch (err) {
      return handleApiError(res, err);
    }
  });

  app.post('/api/interview/turn', async (req, res) => {
    try {
      const {
        setup,
        history,
        userMessage,
        questionCount,
        followUpCountOnCurrent,
        modeOverride,
      } = req.body as {
        setup: InterviewSetup;
        history: TranscriptTurn[];
        userMessage: string;
        questionCount: number;
        followUpCountOnCurrent: number;
        modeOverride?: 'coach_me' | 'normal';
      };

      if (!setup || !userMessage?.trim()) {
        return res.status(400).json({ error: 'Setup and candidate message are required.' });
      }

      const normalizedMsg = userMessage.trim().toLowerCase();
      const explicitCoachRequest =
        modeOverride === 'coach_me' ||
        normalizedMsg === 'coach me' ||
        normalizedMsg === 'feedback' ||
        normalizedMsg.startsWith('coach me:') ||
        normalizedMsg.startsWith('feedback:');

      const isInstantCoaching = setup.coachingMode === 'instant';
      const reachedTargetQuestions = questionCount >= (setup.targetQuestions || 5);

      const ai = getGenAIClient();
      const systemInstruction = buildInterviewerSystemInstruction(setup);

      const prompt = `TRANSCRIPT SO FAR:
${formatTranscript(history)}

LATEST CANDIDATE INPUT:
${userMessage}

SESSION STATE:
- Current main question number: ${questionCount} of ${setup.targetQuestions || 5}
- Follow-ups already asked on current main question: ${followUpCountOnCurrent} (max 2 follow-ups per main question)
- Active Coaching Mode: ${setup.coachingMode}
- Explicit Coach/Feedback Request This Turn: ${explicitCoachRequest ? 'YES' : 'NO'}

INSTRUCTIONS FOR THIS TURN:
1. Evaluate the candidate's latest input:
   - If Explicit Coach Request is YES:
     - Set action = "coach_only".
     - Provide sharp, honest coachingFeedback (strength, gap, upgradedApproach) based on their most recent substantive answer.
     - In interviewerReply, briefly step back into character or summarize how to refine it, and in nextQuestion ask ONE targeted follow-up or invite them to continue on the current topic (or move forward if ready).
   - Otherwise, evaluate whether their answer is vague, lacks measurable impact, skips architectural/strategic trade-offs, or relies on "we" without clarifying personal "I" ownership:
     - If it needs probing AND followUpCountOnCurrent < 2:
       - Set action = "follow_up", isFollowUp = true, questionCategory = "Follow-Up Probe".
       - Ask ONE sharp, realistic follow-up question in nextQuestion.
     - Else if reachedTargetQuestions is TRUE:
       - Set action = "suggest_debrief", shouldWrapUp = true, isFollowUp = false, questionCategory = "Session Complete".
       - In interviewerReply, thank the candidate realistically as the interview wraps up and let them know they can generate their Final Debrief Scorecard (or ask a closing question if they wish). Set nextQuestion = "".
       - Also populate coachingFeedback summarizing their strongest and weakest moment from the final exchange if helpful.
     - Else (answer is solid enough or 2 follow-ups already asked):
       - Set action = "next_question", isFollowUp = false.
       - Acknowledge concisely in interviewerReply (1 sentence, realistic interviewer cadence, no spoilers or coaching unless Instant Coaching is active).
       - Ask ONE new main question in nextQuestion, alternating naturally across Behavioral (STAR), Situational / Case, and Role-Specific / Technical Depth (respecting Preferred Focus: ${setup.focus}).
2. COACHING PROTOCOL:
   - Populate coachingFeedback ONLY IF (${isInstantCoaching} || ${explicitCoachRequest} || reachedTargetQuestions).
   - In Live Simulation mode without an explicit coach request before wrap-up, you MUST omit coachingFeedback (leave it null/absent) so the simulation stays 100% in character.
3. STRICT ONE-QUESTION RULE: nextQuestion must contain at most ONE single question.`;

      const response = await generateWithFallback(ai, (model, useThinking) => ({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          ...(useThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              action: {
                type: Type.STRING,
                description:
                  'One of: follow_up, next_question, coach_only, suggest_debrief',
              },
              interviewerReply: {
                type: Type.STRING,
                description: 'Concise in-character acknowledgment or transition.',
              },
              nextQuestion: {
                type: Type.STRING,
                description:
                  'Exactly ONE clear question to ask next, or empty string if suggest_debrief.',
              },
              questionCategory: {
                type: Type.STRING,
                description:
                  'E.g., Behavioral (STAR), Situational / Case, Role-Specific, Technical Depth, Follow-Up Probe, Coaching Pause, Session Complete.',
              },
              isFollowUp: {
                type: Type.BOOLEAN,
                description: 'True only when probing the current main question.',
              },
              shouldWrapUp: {
                type: Type.BOOLEAN,
                description: 'True when 5-6 main questions are complete.',
              },
              coachingFeedback: {
                type: Type.OBJECT,
                nullable: true,
                description:
                  'Include ONLY when Instant Coaching is enabled, user requested coaching/feedback, or wrapping up.',
                properties: {
                  strength: { type: Type.STRING },
                  gap: { type: Type.STRING },
                  upgradedApproach: { type: Type.STRING },
                },
                required: ['strength', 'gap', 'upgradedApproach'],
              },
            },
            required: [
              'action',
              'interviewerReply',
              'nextQuestion',
              'questionCategory',
              'isFollowUp',
              'shouldWrapUp',
            ],
          },
        },
      }));

      const parsed = parseJsonResponse<Record<string, unknown>>(response.text);
      if (!isInstantCoaching && !explicitCoachRequest && !parsed.shouldWrapUp) {
        delete parsed.coachingFeedback;
      }
      return res.json(parsed);
    } catch (err) {
      return handleApiError(res, err);
    }
  });

  app.post('/api/interview/debrief', async (req, res) => {
    try {
      const { setup, history } = req.body as {
        setup: InterviewSetup;
        history: TranscriptTurn[];
      };

      if (!setup || !history?.length) {
        return res.status(400).json({
          error: 'At least one interview exchange is required to generate a debrief.',
        });
      }

      const ai = getGenAIClient();
      const systemInstruction = `You are a Principal Hiring Committee Bar-Raiser & Executive Interview Coach.
Evaluate the mock interview transcript strictly against the bar for:
- Role: ${setup.jobTitle}
- Seniority Level: ${setup.roleLevel}
- Company: ${setup.companyName || 'Target Company'} (${setup.companyCulture || 'High-bar tech'})
- Job Description: ${setup.jobDescription || 'Standard expectations for role and level'}

Be objective, evidence-driven, and constructive. Do not inflate scores if answers lacked specificity, personal "I" ownership, metrics, or trade-offs.`;

      const prompt = `INTERVIEW TRANSCRIPT:
${formatTranscript(history)}

Produce the Phase 3 Final Debrief Scorecard in JSON:
1. hireSignal: Strictly one of "Strong Hire", "Hire", "Leaning No", or "No Hire", calibrated to ${setup.roleLevel} at ${setup.companyName || 'the target company'}.
2. hireSignalRationale: 2-3 crisp sentences explaining the hiring committee verdict.
3. overallSummary: 2-3 sentence executive summary of interview performance.
4. dimensions: Exactly 4 objects in this exact order:
   - "Role Competency"
   - "Company Culture Fit"
   - "Communication & Structure"
   - "Depth & Trade-offs"
   For each dimension provide:
   - score: number from 1.0 to 4.0 in 0.5 increments (1.0=Below Bar, 2.0=Mixed, 3.0=Meets Bar, 4.0=Exceeds Bar)
   - ratingLabel: Strictly one of "Exceeds Bar", "Meets Bar", "Mixed Signal", "Below Bar"
   - evidence: Concrete evidence citing what the candidate actually said or missed
   - growthFocus: One actionable improvement for the next interview
5. rewriteExamples: Exactly 2 objects showing how to elevate the candidate's weakest or most improvable answers using concrete framing (STAR, "I" ownership, trade-offs, metrics):
   - questionAsked: The question from the transcript
   - originalExcerpt: Faithful quote or close summary of what the candidate answered
   - weaknessDiagnosis: Why it fell short for ${setup.roleLevel}
   - elevatedRewrite: Concrete, realistic, high-signal rewritten response`;

      const response = await generateWithFallback(ai, (model, useThinking) => ({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          ...(useThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM } } : {}),
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hireSignal: { type: Type.STRING },
              hireSignalRationale: { type: Type.STRING },
              overallSummary: { type: Type.STRING },
              dimensions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    score: { type: Type.NUMBER },
                    ratingLabel: { type: Type.STRING },
                    evidence: { type: Type.STRING },
                    growthFocus: { type: Type.STRING },
                  },
                  required: ['name', 'score', 'ratingLabel', 'evidence', 'growthFocus'],
                },
              },
              rewriteExamples: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    questionAsked: { type: Type.STRING },
                    originalExcerpt: { type: Type.STRING },
                    weaknessDiagnosis: { type: Type.STRING },
                    elevatedRewrite: { type: Type.STRING },
                  },
                  required: [
                    'questionAsked',
                    'originalExcerpt',
                    'weaknessDiagnosis',
                    'elevatedRewrite',
                  ],
                },
              },
            },
            required: [
              'hireSignal',
              'hireSignalRationale',
              'overallSummary',
              'dimensions',
              'rewriteExamples',
            ],
          },
        },
      }));

      const parsed = parseJsonResponse<Record<string, unknown>>(response.text);
      parsed.generatedAt = new Date().toISOString();
      return res.json(parsed);
    } catch (err) {
      return handleApiError(res, err);
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Caliber Interview Studio server running on http://0.0.0.0:${PORT}`);
  });
}

createApp();
