import type { InterviewSetup } from '../types/interview';

export interface RolePreset {
  id: string;
  label: string;
  summary: string;
  setup: InterviewSetup;
}

export const ROLE_PRESETS: RolePreset[] = [
  {
    id: 'stripe-senior-backend',
    label: 'Senior Backend Engineer · Stripe',
    summary: 'API craft, payment reliability, practical system trade-offs',
    setup: {
      jobTitle: 'Senior Backend Engineer, Payments Infrastructure',
      roleLevel: 'Senior',
      companyName: 'Stripe',
      companyCulture:
        'High practical rigor, crisp written/verbal clarity, first-principles reasoning, obsession with reliability, idempotency, and merchant empathy.',
      jobDescription: `We are looking for a Senior Backend Engineer to design and scale resilient payment processing APIs.
Key responsibilities:
- Architect fault-tolerant distributed workflows handling high-throughput financial transactions with strict consistency guarantees.
- Drive technical design reviews, evaluate storage and queuing trade-offs, and mentor mid-level engineers.
- Collaborate with Product and Risk teams to launch new global payment rails while maintaining 99.999% uptime.`,
      focus: 'Mixed',
      tone: 'Direct / Bar-Raiser',
      coachingMode: 'live',
      targetQuestions: 5,
    },
  },
  {
    id: 'amazon-staff-pm',
    label: 'Principal Product Manager · Amazon',
    summary: 'Leadership Principles, customer obsession, measurable business impact',
    setup: {
      jobTitle: 'Principal Product Manager, Fulfillment Experience',
      roleLevel: 'Staff / Principal',
      companyName: 'Amazon',
      companyCulture:
        'Amazon Leadership Principles (Customer Obsession, Ownership, Dive Deep, Bias for Action, Have Backbone; Disagree and Commit). Expects sharp data-backed STAR answers and personal "I" accountability.',
      jobDescription: `Own the multi-year product strategy for same-day fulfillment orchestration across North America.
Key responsibilities:
- Define north-star customer and operational metrics across supply chain, warehouse robotics, and last-mile delivery.
- Align VP-level engineering, operations, and finance stakeholders on complex trade-offs between delivery speed and unit economics.
- Turn ambiguous customer pain points into PR/FAQs and measurable product launches.`,
      focus: 'Behavioral',
      tone: 'Direct / Bar-Raiser',
      coachingMode: 'live',
      targetQuestions: 5,
    },
  },
  {
    id: 'startup-mid-frontend',
    label: 'Product Frontend Engineer · Series A Startup',
    summary: 'Scrappy shipping velocity, UX polish, pragmatic architecture',
    setup: {
      jobTitle: 'Frontend Product Engineer',
      roleLevel: 'Mid-Level',
      companyName: 'Vellum Labs (Series A)',
      companyCulture:
        'Early-stage startup scrappiness, high ownership, rapid iteration with customers, pragmatic engineering choices without over-engineering.',
      jobDescription: `Build fast, intuitive collaborative workflows in React and TypeScript for our B2B design operations platform.
Key responsibilities:
- Ship end-to-end user-facing features weekly alongside founders and designers.
- Optimize client-side state, rendering performance, and accessibility across complex interactive canvases.
- Debug customer issues directly and turn user feedback into immediate product improvements.`,
      focus: 'Mixed',
      tone: 'Supportive',
      coachingMode: 'instant',
      targetQuestions: 5,
    },
  },
  {
    id: 'enterprise-em',
    label: 'Engineering Manager · Enterprise Cloud',
    summary: 'Org scaling, delivery predictability, cross-functional conflict',
    setup: {
      jobTitle: 'Engineering Manager, Developer Platform',
      roleLevel: 'Manager / Lead',
      companyName: 'Atlassian-style Enterprise Cloud',
      companyCulture:
        'Structured engineering governance, psychological safety balanced with high accountability, clear cross-team alignment, and sustainable delivery.',
      jobDescription: `Lead two platform teams (14 engineers) building internal CI/CD, observability, and deployment tooling.
Key responsibilities:
- Partner with Product and Security leadership to prioritize platform roadmap against enterprise reliability SLAs.
- Coach engineers through career progression, run effective performance calibration, and resolve cross-team dependencies.
- Improve engineering velocity and incident response maturity.`,
      focus: 'Mixed',
      tone: 'Direct / Bar-Raiser',
      coachingMode: 'live',
      targetQuestions: 5,
    },
  },
];
