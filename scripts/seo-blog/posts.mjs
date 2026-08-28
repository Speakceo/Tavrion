/** @typedef {{ slug: string; title: string; description: string; keywords: string; date: string; readMinutes: number; sections: { heading?: string; paragraphs: string[]; list?: string[] }[] }} BlogPost */

/** @type {BlogPost[]} */
export const BLOG_POSTS = [
  {
    slug: 'what-is-tavrion-lms',
    title: 'What Is Tavrion LMS? Enterprise Learning Platform Explained',
    description:
      'Tavrion LMS is an enterprise learning management system for SCORM training, AI coaching, skills assessments, and analytics. Learn what it does and who it is for.',
    keywords: 'Tavrion LMS, what is Tavrion, enterprise LMS, learning management system',
    date: '2026-08-28',
    readMinutes: 6,
    sections: [
      {
        paragraphs: [
          'If you searched for <strong>Tavrion</strong> or <strong>Tavrion LMS</strong>, you are likely evaluating a learning management system that goes beyond basic course hosting. Tavrion LMS is an enterprise platform that combines SCORM course delivery, AI coaching, live call practice, hiring assessments, certificates, and analytics in one place.',
          'Unlike legacy LMS tools that only track completion, Tavrion is built around a closed loop: <strong>Learn → Practice → Measure</strong>. L&D, people, and operations teams use it to onboard employees, run compliance programs, upskill sales and support teams, and assess candidates before hire.',
        ],
      },
      {
        heading: 'Core modules in Tavrion LMS',
        list: [
          '<strong>SCORM courses</strong> — import SCORM 1.2/2004 packages and track completion, scores, and time on task.',
          '<strong>AI mock calls</strong> — simulated sales or support conversations with automated scoring on tone, structure, and product knowledge.',
          '<strong>AI tutor</strong> — coaching grounded in your course content and company policies.',
          '<strong>Tavrion Test</strong> — role-based hiring and certification assessments with public candidate links and AI video scoring.',
          '<strong>Analytics hub</strong> — completion, scores, leaderboards, and course reports across organisations.',
        ],
      },
      {
        heading: 'Who Tavrion LMS is for',
        paragraphs: [
          'Tavrion LMS fits mid-market and enterprise teams that need multi-organisation tenancy, global rollout, and measurable capability — not just checkbox training. Common use cases include sales enablement, compliance, onboarding at scale, partner training, and pre-hire skills testing.',
          'The Starter plan is free for up to 5 learners, so teams can validate SCORM import and basic workflows before upgrading to Growth or Enterprise for AI coaching, SSO, and dedicated support.',
        ],
      },
      {
        heading: 'Tavrion LMS vs a generic LMS',
        paragraphs: [
          'A generic LMS assigns content and reports completion. Tavrion LMS adds practice layers (mock calls, live coaching) and assessment layers (Tavrion Test) so managers see whether people can perform — not only whether they clicked through a module.',
          'If your goal is to rank training investment to hiring outcomes, revenue enablement, or audit readiness, an integrated LMS + assessment platform reduces tool sprawl and data silos.',
        ],
      },
    ],
  },
  {
    slug: 'enterprise-lms-buyers-guide',
    title: 'Enterprise LMS Buyer\'s Guide: How to Choose the Right Platform',
    description:
      'Compare enterprise LMS features: SCORM support, multi-tenancy, SSO, analytics, assessments, and AI coaching. A practical buyer\'s guide for L&D leaders.',
    keywords: 'enterprise LMS, LMS buyers guide, learning management system comparison, corporate LMS',
    date: '2026-08-27',
    readMinutes: 8,
    sections: [
      {
        paragraphs: [
          'Choosing an enterprise learning management system (LMS) is a multi-year decision. The wrong platform creates content silos, poor completion rates, and reporting gaps. The right LMS becomes infrastructure for onboarding, compliance, enablement, and hiring.',
          'This guide outlines what enterprise buyers should evaluate before signing — whether you choose Tavrion LMS or another vendor.',
        ],
      },
      {
        heading: '1. Content delivery and SCORM',
        paragraphs: [
          'Confirm SCORM 1.2 and SCORM 2004 support if you have existing vendor content. Ask about upload limits, resume behaviour, and whether xAPI is on the roadmap. Rebuilding courses is expensive; import fidelity matters.',
        ],
      },
      {
        heading: '2. Multi-organisation and RBAC',
        paragraphs: [
          'Enterprises often need separate brands, business units, or partner orgs inside one platform. Verify role-based access control (RBAC), admin delegation, and whether learners can belong to multiple teams without duplicate accounts.',
        ],
      },
      {
        heading: '3. Practice and assessment — not just courses',
        list: [
          'Can learners practice skills (calls, scenarios) inside the LMS?',
          'Can you run hiring or certification tests with external candidates?',
          'Does AI scoring exist for open-ended or video responses?',
          'Are manual grading queues available for human review?',
        ],
      },
      {
        heading: '4. Integrations and security',
        paragraphs: [
          'SSO/SAML, HRIS sync, CRM integrations, and webhooks reduce manual admin. For regulated industries, ask about SOC 2, data residency, audit logs, and certificate issuance with traceability.',
        ],
      },
      {
        heading: '5. Time to value',
        paragraphs: [
          'Pilot with a real cohort in two weeks or less. Tavrion LMS teams typically import SCORM, assign a path, and invite learners within a day on the Starter tier. Enterprise rollouts add SSO and custom onboarding playbooks.',
        ],
      },
    ],
  },
  {
    slug: 'scorm-lms-corporate-training',
    title: 'SCORM LMS for Corporate Training: Implementation Checklist',
    description:
      'How to deploy a SCORM LMS for corporate training: package standards, tracking, completion rules, and linking SCORM data to assessments and analytics.',
    keywords: 'SCORM LMS, corporate training LMS, SCORM 1.2, SCORM 2004, enterprise training',
    date: '2026-08-26',
    readMinutes: 7,
    sections: [
      {
        paragraphs: [
          'SCORM remains the lingua franca of corporate e-learning. A SCORM LMS lets you reuse content from authoring tools (Articulate, iSpring, Captivate) without rebuilding modules in a native editor.',
          'Tavrion LMS supports SCORM 1.2 and SCORM 2004 with completion and score tracking per learner — alongside non-SCORM assets like mock calls and skills tests.',
        ],
      },
      {
        heading: 'SCORM implementation checklist',
        list: [
          'Inventory existing packages and note SCORM version per course.',
          'Define completion rules (passed/incomplete, minimum score).',
          'Map courses to roles, regions, or compliance cycles.',
          'Test one package end-to-end: launch, suspend/resume, score reporting.',
          'Connect completion data to certificates and manager dashboards.',
        ],
      },
      {
        heading: 'Common SCORM pitfalls',
        paragraphs: [
          'Broken manifest paths, oversized media inside packages, and inconsistent mastery scores cause reporting noise. Run a pilot with power users before global assign rules fire.',
          'SCORM tracks course activity; it does not prove on-the-job performance. Pair SCORM modules with practice (AI mock calls) and assessments (Tavrion Test) where stakes are high.',
        ],
      },
    ],
  },
  {
    slug: 'ai-mock-call-training-sales',
    title: 'AI Mock Call Training: Practice Sales Conversations at Scale',
    description:
      'AI mock call training helps sales teams practice pitches and objection handling with automated scoring. Learn how LMS platforms like Tavrion integrate call intelligence.',
    keywords: 'AI mock call training, sales enablement LMS, call coaching software, sales training platform',
    date: '2026-08-25',
    readMinutes: 6,
    sections: [
      {
        paragraphs: [
          'Sales leaders know roleplay works — but manager-led coaching does not scale across regions and time zones. AI mock call training simulates buyer conversations, scores responses on rubrics, and surfaces coaching feedback automatically.',
        ],
      },
      {
        heading: 'What good mock call programs measure',
        list: [
          'Objection handling and discovery quality',
          'Product knowledge and talk track adherence',
          'Tone, empathy, and call structure',
          'Next-step clarity and close attempts',
        ],
      },
      {
        heading: 'Integrating mock calls with your LMS',
        paragraphs: [
          'When mock calls live inside your LMS (as in Tavrion LMS), completion, scores, and coaching notes roll up to the same analytics hub as SCORM courses and certifications. Managers see a single view of readiness — not a spreadsheet export from a separate tool.',
          'Combine mock calls with assignment rules so new hires practice before taking live leads, and with assessments when you need a pass/fail gate before certification.',
        ],
      },
    ],
  },
  {
    slug: 'skills-assessment-hiring',
    title: 'Skills Assessment Software for Hiring: Design Tests That Predict Performance',
    description:
      'Use skills assessment software to evaluate candidates with MCQs, situational judgment, and AI-scored video responses. Best practices for fair, scalable hiring tests.',
    keywords: 'skills assessment software, hiring assessment platform, candidate testing, pre-employment assessment',
    date: '2026-08-24',
    readMinutes: 7,
    sections: [
      {
        paragraphs: [
          'Résumés and interviews poorly predict job performance. Skills assessment software lets hiring teams measure role-specific knowledge, judgment, and communication before offer stage — at scale via public candidate links.',
        ],
      },
      {
        heading: 'Assessment types that work',
        list: [
          '<strong>Multiple choice / multiple select</strong> — fast to score; good for knowledge checks.',
          '<strong>Situational judgment</strong> — reveals decision-making under realistic constraints.',
          '<strong>Video responses</strong> — captures communication skills; AI + human grading for scale.',
          '<strong>Language assessments</strong> — e.g. German, Spanish, French operations screens with speaking samples.',
        ],
      },
      {
        heading: 'Integrity and candidate experience',
        paragraphs: [
          'Proctoring signals (tab switches, camera/mic requirements, side-panel detection) protect test validity. Keep the candidate UX simple: clear instructions, resume tokens, and no visible “AI grading” messaging during the test — score on the employer side after submission.',
          'Tavrion Test provides role templates, public links, session review, and OpenAI-powered video scoring for speaking items when configured in org AI settings.',
        ],
      },
    ],
  },
  {
    slug: 'lms-hiring-assessments',
    title: 'LMS with Hiring Assessments: Why Learn and Test in One Platform',
    description:
      'An LMS with built-in hiring assessments connects pre-hire testing to onboarding and upskilling. See how Tavrion LMS unifies Tavrion Test with course delivery.',
    keywords: 'LMS with assessments, hiring LMS, Tavrion Test, learning and assessment platform',
    date: '2026-08-23',
    readMinutes: 5,
    sections: [
      {
        paragraphs: [
          'Many teams use one tool for employee training and another for candidate assessments. That split creates duplicate admin, inconsistent branding, and no line of sight from “hired score” to “90-day performance.”',
          'An LMS with hiring assessments — like Tavrion LMS plus Tavrion Test — keeps candidate sessions, employee learning records, and analytics under one org structure.',
        ],
      },
      {
        heading: 'Workflow example',
        list: [
          'Share a public assessment link for a role (e.g. German Operations).',
          'Auto-score MCQs; AI-score video speaking items; manual review in session dashboard.',
          'On hire, assign onboarding SCORM path and mock call practice in the same platform.',
          'Compare pre-hire assessment scores to completion and call scores over time.',
        ],
      },
    ],
  },
  {
    slug: 'compliance-training-lms',
    title: 'Compliance Training LMS: Certificates, Audit Trails, and Regulator-Ready Reporting',
    description:
      'Compliance training LMS requirements: mandatory assignments, reminders, certificates, audit logs, and exportable reports for regulators and internal audit.',
    keywords: 'compliance training LMS, mandatory training software, audit trail LMS, certificate management',
    date: '2026-08-22',
    readMinutes: 6,
    sections: [
      {
        paragraphs: [
          'Regulated industries need more than course hosting — they need proof. A compliance training LMS assigns mandatory modules, nudges overdue learners, issues certificates, and retains evidence for audits.',
        ],
      },
      {
        heading: 'Must-have compliance features',
        list: [
          'Scheduled assign rules by role, department, or region',
          'Automated email nudges and escalation paths',
          'Branded certificates with completion timestamps',
          'Exportable completion and score reports',
          'Policy version tracking where content changes over time',
        ],
      },
      {
        heading: 'Tavrion LMS for compliance programs',
        paragraphs: [
          'Tavrion supports assignment rules, email nudges, certificates, and analytics across multi-org deployments. Pair SCORM compliance modules with assessments when you need verified understanding — not just click-through completion.',
        ],
      },
    ],
  },
  {
    slug: 'onboarding-lms-global-teams',
    title: 'Onboarding LMS for Global Teams: Roll Out Training in 150+ Countries',
    description:
      'Onboard employees globally with a single LMS: localised paths, timezone-friendly scheduling, role-based assignments, and unified analytics.',
    keywords: 'onboarding LMS, global employee training, multi-country LMS, enterprise onboarding',
    date: '2026-08-21',
    readMinutes: 6,
    sections: [
      {
        paragraphs: [
          'Global onboarding breaks when every region uses different tools, languages, and spreadsheets. An onboarding LMS standardises day-one training while allowing localised content and role-specific paths.',
        ],
      },
      {
        heading: 'Playbook for global rollout',
        list: [
          'Define a global core path (policies, product basics, security).',
          'Add regional modules (language, compliance, local processes).',
          'Auto-assign by hire date, role, and department with assignment rules.',
          'Use mock calls or assessments for roles with customer-facing stakes.',
          'Review completion by country in a single analytics dashboard.',
        ],
      },
      {
        paragraphs: [
          'Tavrion LMS is built for multi-org, multi-region deployment with SCORM import, AI coaching, and assessments so global people teams scale without multiplying vendors.',
        ],
      },
    ],
  },
];

export const SITE_URL = 'https://jointavrion.com';
