export type RoleLevel =
  | 'Internship'
  | 'Junior'
  | 'Mid-Level'
  | 'Senior'
  | 'Staff / Principal'
  | 'Manager / Lead';

export type InterviewFocus =
  | 'Mixed'
  | 'Behavioral'
  | 'Technical / Case'
  | 'Role-Specific';

export type InterviewTone = 'Supportive' | 'Direct / Bar-Raiser';

export type CoachingMode = 'live' | 'instant';

export interface InterviewSetup {
  jobTitle: string;
  roleLevel: RoleLevel;
  jobDescription: string;
  companyName: string;
  companyCulture: string;
  focus: InterviewFocus;
  tone: InterviewTone;
  coachingMode: CoachingMode;
  targetQuestions: number;
}

export interface CoachingFeedback {
  strength: string;
  gap: string;
  upgradedApproach: string;
}

export interface TranscriptTurn {
  id: string;
  role: 'interviewer' | 'candidate' | 'coach';
  content: string;
  questionNumber?: number;
  questionCategory?: string;
  isFollowUp?: boolean;
  coachingFeedback?: CoachingFeedback;
  durationSeconds?: number;
  timestamp: string;
}

export type HireSignal = 'Strong Hire' | 'Hire' | 'Leaning No' | 'No Hire';

export interface RubricDimension {
  name: string;
  score: number;
  ratingLabel: 'Exceeds Bar' | 'Meets Bar' | 'Mixed Signal' | 'Below Bar';
  evidence: string;
  growthFocus: string;
}

export interface RewriteExample {
  questionAsked: string;
  originalExcerpt: string;
  weaknessDiagnosis: string;
  elevatedRewrite: string;
}

export interface DebriefReport {
  hireSignal: HireSignal;
  hireSignalRationale: string;
  overallSummary: string;
  dimensions: RubricDimension[];
  rewriteExamples: RewriteExample[];
  generatedAt: string;
}

export interface InterviewSession {
  id: string;
  setup: InterviewSetup;
  planBullets: string[];
  turns: TranscriptTurn[];
  questionCount: number;
  followUpCountOnCurrent: number;
  shouldWrapUp: boolean;
  debrief?: DebriefReport;
  status: 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface StartInterviewResponse {
  planBullets: string[];
  openingGreeting: string;
  question: string;
  questionCategory: string;
}

export interface TurnInterviewResponse {
  action: 'follow_up' | 'next_question' | 'coach_only' | 'suggest_debrief';
  interviewerReply: string;
  nextQuestion: string;
  questionCategory: string;
  isFollowUp: boolean;
  shouldWrapUp: boolean;
  coachingFeedback?: CoachingFeedback;
}
