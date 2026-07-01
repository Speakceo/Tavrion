export type FeatureStatus = 'planned' | 'in_progress' | 'stub';

export type PendingFeature = {
  id: string;
  title: string;
  category: string;
  status: FeatureStatus;
  description: string;
  priority: 'high' | 'medium' | 'low';
};

export const PENDING_FEATURES: PendingFeature[] = [
  // Builder & library
  {
    id: 'drag-drop-builder',
    title: 'Drag-and-drop assessment builder',
    category: 'Builder',
    status: 'planned',
    description: 'Reorder sections and questions visually, section timers, weighted pools, and live preview.',
    priority: 'high',
  },
  {
    id: 'assessment-folders',
    title: 'Assessment folders & tagging UI',
    category: 'Library',
    status: 'planned',
    description: 'Organize assessments into folders, bulk tag, and filter by skill or department.',
    priority: 'medium',
  },
  {
    id: 'version-history',
    title: 'Version history & rollback',
    category: 'Library',
    status: 'planned',
    description: 'View prior assessment versions, compare changes, and restore a published snapshot.',
    priority: 'medium',
  },

  // Question types & bank
  {
    id: 'monaco-coding',
    title: 'Monaco code editor + test runner',
    category: 'Coding',
    status: 'planned',
    description: 'In-browser IDE with hidden test cases, compile logs, runtime/memory limits, and modular execution engine.',
    priority: 'high',
  },
  {
    id: 'excel-questions',
    title: 'Excel / spreadsheet assessments',
    category: 'Question types',
    status: 'planned',
    description: 'Embedded spreadsheet tasks with formula checks and file upload grading.',
    priority: 'low',
  },
  {
    id: 'psychometric-scoring',
    title: 'Personality & cognitive scoring models',
    category: 'Question types',
    status: 'planned',
    description: 'Norm-referenced scoring for personality, cognitive, and situational judgment items.',
    priority: 'medium',
  },
  {
    id: 'skills-taxonomy',
    title: 'Skills taxonomy management',
    category: 'Question bank',
    status: 'planned',
    description: 'CRUD UI for org skill library, map questions to skills, and skill-gap reports.',
    priority: 'medium',
  },
  {
    id: 'bulk-question-import',
    title: 'Bulk question import (CSV / Excel)',
    category: 'Question bank',
    status: 'planned',
    description: 'Upload question banks in bulk with validation and duplicate detection.',
    priority: 'medium',
  },

  // Assignment & outreach
  {
    id: 'cohort-assignment',
    title: 'Cohort & group assignments',
    category: 'Assignments',
    status: 'planned',
    description: 'Assign to LMS cohorts, teams, or imported candidate lists in one action.',
    priority: 'high',
  },
  {
    id: 'email-invites',
    title: 'Email invites & reminders',
    category: 'Assignments',
    status: 'planned',
    description: 'Automated invite, reminder, and expiry emails via existing nudge service.',
    priority: 'high',
  },
  {
    id: 'magic-link-candidate',
    title: 'Per-candidate magic links',
    category: 'Assignments',
    status: 'in_progress',
    description: 'Unique one-time links per external candidate with usage tracking (reusable links live today).',
    priority: 'medium',
  },

  // Candidate experience
  {
    id: 'resume-upload',
    title: 'Resume upload on candidate entry',
    category: 'Candidate UX',
    status: 'planned',
    description: 'Optional resume capture on public join flow with storage in assessment-responses bucket.',
    priority: 'medium',
  },
  {
    id: 'custom-post-form',
    title: 'Custom post-assessment forms',
    category: 'Candidate UX',
    status: 'planned',
    description: 'Per-assessment configurable fields (ops form, eligibility rules) instead of fixed defaults.',
    priority: 'medium',
  },
  {
    id: 'resume-in-test',
    title: 'Save & resume across devices',
    category: 'Candidate UX',
    status: 'in_progress',
    description: 'Email-based resume token so candidates can continue an in-progress attempt.',
    priority: 'medium',
  },

  // Proctoring & integrity
  {
    id: 'webcam-monitoring',
    title: 'Webcam & face detection',
    category: 'Proctoring',
    status: 'planned',
    description: 'Live camera feed, face-not-detected and multiple-faces alerts.',
    priority: 'high',
  },
  {
    id: 'fullscreen-enforce',
    title: 'Fullscreen enforcement',
    category: 'Proctoring',
    status: 'planned',
    description: 'Require fullscreen for duration of test with auto-submit on exit.',
    priority: 'medium',
  },
  {
    id: 'ip-device-logging',
    title: 'IP & device fingerprint reports',
    category: 'Proctoring',
    status: 'in_progress',
    description: 'Device data captured on start; integrity report UI and export still pending.',
    priority: 'low',
  },
  {
    id: 'screenshot-detection',
    title: 'Screenshot / screen capture warnings',
    category: 'Proctoring',
    status: 'planned',
    description: 'Browser-level deterrents and violation logging where supported.',
    priority: 'low',
  },

  // Scoring & review
  {
    id: 'manual-grading-ui',
    title: 'Manual grading workspace',
    category: 'Scoring',
    status: 'planned',
    description: 'Reviewer UI for long answers, partial credit, rubrics, and grader notes.',
    priority: 'high',
  },
  {
    id: 'negative-marking',
    title: 'Negative marking & partial credit rules',
    category: 'Scoring',
    status: 'planned',
    description: 'Configurable per question and per assessment with section weighting.',
    priority: 'medium',
  },
  {
    id: 'deploy-ai-scoring',
    title: 'Deploy AI scoring edge functions',
    category: 'Scoring',
    status: 'stub',
    description: 'Functions exist (assessment-score-response, assessment-calculate-score) — deploy to Supabase for production AI grading.',
    priority: 'high',
  },

  // Media & interviews
  {
    id: 'video-transcript',
    title: 'Video transcript & playback review',
    category: 'Video / Audio',
    status: 'planned',
    description: 'Auto-transcription placeholder, recruiter playback, and download in session detail.',
    priority: 'medium',
  },
  {
    id: 'video-ai-analysis',
    title: 'AI video interview analysis',
    category: 'Video / Audio',
    status: 'stub',
    description: 'Body language, confidence, and presentation scoring via edge function.',
    priority: 'medium',
  },
  {
    id: 'listening-tts',
    title: 'Listening test TTS generation',
    category: 'Video / Audio',
    status: 'planned',
    description: 'Generate listening passage audio via ElevenLabs or Google TTS edge function.',
    priority: 'low',
  },

  // Analytics & reports
  {
    id: 'skill-gap-analytics',
    title: 'Skill gap & question analytics',
    category: 'Analytics',
    status: 'planned',
    description: 'Item difficulty, discrimination index, time-per-question, and skill heatmaps.',
    priority: 'high',
  },
  {
    id: 'export-pdf-csv',
    title: 'Export PDF / Excel / CSV',
    category: 'Reports',
    status: 'planned',
    description: 'Downloadable assessment, candidate, integrity, and org summary reports.',
    priority: 'high',
  },
  {
    id: 'completion-trends',
    title: 'Completion trends & funnel charts',
    category: 'Analytics',
    status: 'planned',
    description: 'Time-series dashboards for invites sent, started, completed, and drop-off.',
    priority: 'medium',
  },

  // AI features
  {
    id: 'ai-question-gen',
    title: 'AI question & assessment generation',
    category: 'AI',
    status: 'stub',
    description: 'Wire question bank AI stub to assessment-ai edge function with job description parsing.',
    priority: 'high',
  },
  {
    id: 'resume-matching',
    title: 'Resume matching & skill-gap AI',
    category: 'AI',
    status: 'planned',
    description: 'Match candidate resume to role requirements and surface fit score in sessions.',
    priority: 'medium',
  },
  {
    id: 'candidate-summary-ai',
    title: 'AI candidate summaries for recruiters',
    category: 'AI',
    status: 'stub',
    description: 'One-click hiring brief from scores, responses, and proctoring data.',
    priority: 'medium',
  },

  // Platform
  {
    id: 'audit-log-ui',
    title: 'Assessment audit log viewer',
    category: 'Platform',
    status: 'planned',
    description: 'Surface assessment_audit_logs for compliance and change tracking.',
    priority: 'low',
  },
  {
    id: 'question-pool-random',
    title: 'Question pool randomization',
    category: 'Builder',
    status: 'planned',
    description: 'Per-section random N-of-M question pools and answer shuffle (schema ready).',
    priority: 'medium',
  },
  {
    id: 'branding-per-assessment',
    title: 'Per-assessment branding',
    category: 'Platform',
    status: 'planned',
    description: 'Custom logo, colors, and instructions on public candidate pages.',
    priority: 'low',
  },

  // Templates & content
  {
    id: 'custom-template-editor',
    title: 'Custom org template editor',
    category: 'Templates',
    status: 'planned',
    description: 'Save your own assessments as reusable templates and share across teams in the org.',
    priority: 'medium',
  },
  {
    id: 'template-marketplace',
    title: 'Cross-org template marketplace',
    category: 'Templates',
    status: 'planned',
    description: 'Platform-curated and community template packs for industries and roles.',
    priority: 'low',
  },
  {
    id: 'multi-language',
    title: 'Multi-language assessments',
    category: 'Templates',
    status: 'planned',
    description: 'Translate questions, instructions, and candidate UI per locale.',
    priority: 'medium',
  },
  {
    id: 'department-template-packs',
    title: 'Department template packs',
    category: 'Templates',
    status: 'planned',
    description: 'Bundle templates by department with default passing scores and post-forms.',
    priority: 'low',
  },

  // Integrations
  {
    id: 'ats-integration',
    title: 'ATS integrations (Greenhouse, Lever, Ashby)',
    category: 'Integrations',
    status: 'planned',
    description: 'Sync candidates, push scores back, and trigger assessments from ATS stages.',
    priority: 'high',
  },
  {
    id: 'slack-teams-alerts',
    title: 'Slack / Teams hiring alerts',
    category: 'Integrations',
    status: 'planned',
    description: 'Notify recruiters when candidates complete, fail integrity checks, or are shortlisted.',
    priority: 'medium',
  },
  {
    id: 'webhook-api',
    title: 'Assessment webhooks & public API',
    category: 'Integrations',
    status: 'planned',
    description: 'Event webhooks for completion, scoring, and selection status changes.',
    priority: 'high',
  },
  {
    id: 'lms-enrollment-sync',
    title: 'Auto-assign from LMS enrollment rules',
    category: 'Integrations',
    status: 'planned',
    description: 'Trigger assessments when learners complete courses or hit skill milestones.',
    priority: 'medium',
  },

  // Advanced candidate UX
  {
    id: 'conditional-branching',
    title: 'Conditional question branching',
    category: 'Candidate UX',
    status: 'planned',
    description: 'Show follow-up questions based on prior answers or score thresholds.',
    priority: 'high',
  },
  {
    id: 'practice-mode',
    title: 'Candidate practice mode',
    category: 'Candidate UX',
    status: 'planned',
    description: 'Unscored practice attempt before the graded assessment.',
    priority: 'low',
  },
  {
    id: 'mobile-candidate-ui',
    title: 'Mobile-first candidate experience',
    category: 'Candidate UX',
    status: 'planned',
    description: 'Optimized layouts for phone/tablet test-taking and media recording.',
    priority: 'medium',
  },
  {
    id: 'scheduling-slots',
    title: 'Scheduled assessment slots',
    category: 'Candidate UX',
    status: 'planned',
    description: 'Let candidates pick a time window before the timed attempt starts.',
    priority: 'low',
  },
  {
    id: 'pass-certificate',
    title: 'Certificate on pass',
    category: 'Candidate UX',
    status: 'planned',
    description: 'Auto-issue branded PDF certificate using existing LMS certificate engine.',
    priority: 'medium',
  },

  // Recruiter workflow
  {
    id: 'candidate-comparison',
    title: 'Side-by-side candidate comparison',
    category: 'Recruiter',
    status: 'planned',
    description: 'Compare 2–5 candidates on scores, skills, integrity, and AI summaries.',
    priority: 'high',
  },
  {
    id: 'bulk-session-actions',
    title: 'Bulk session actions',
    category: 'Recruiter',
    status: 'planned',
    description: 'Bulk shortlist, reject, delete, resend invite, and export from Sessions.',
    priority: 'medium',
  },
  {
    id: 'live-proctor-review',
    title: 'Live proctoring review queue',
    category: 'Recruiter',
    status: 'planned',
    description: 'Real-time dashboard for reviewers to flag and intervene on active sessions.',
    priority: 'medium',
  },
  {
    id: 'interviewer-scorecards',
    title: 'Structured interviewer scorecards',
    category: 'Recruiter',
    status: 'planned',
    description: 'Post-assessment panel interviews with rubrics linked to assessment skills.',
    priority: 'medium',
  },

  // Advanced analytics & AI
  {
    id: 'question-auto-calibration',
    title: 'Question difficulty auto-calibration',
    category: 'Analytics',
    status: 'planned',
    description: 'Recalculate difficulty and discrimination after each cohort completes.',
    priority: 'medium',
  },
  {
    id: 'anti-ai-plagiarism',
    title: 'Anti-AI / plagiarism detection',
    category: 'AI',
    status: 'planned',
    description: 'Flag written responses likely generated by AI or copied from sources.',
    priority: 'high',
  },
  {
    id: 'role-fit-score',
    title: 'Role-fit composite score',
    category: 'AI',
    status: 'planned',
    description: 'Weighted fit index combining assessment, resume, and post-form eligibility.',
    priority: 'high',
  },
  {
    id: 'timed-sections',
    title: 'Per-section timers',
    category: 'Builder',
    status: 'planned',
    description: 'Enforce section-level time limits with auto-advance to next section.',
    priority: 'medium',
  },
  {
    id: 'white-label-portal',
    title: 'White-label candidate portal',
    category: 'Platform',
    status: 'planned',
    description: 'Custom domain and full brand removal for enterprise hiring portals.',
    priority: 'low',
  },
  {
    id: 'enterprise-candidate-sso',
    title: 'Enterprise candidate SSO',
    category: 'Platform',
    status: 'planned',
    description: 'Optional SAML/OIDC for internal mobility assessments.',
    priority: 'low',
  },
];

export const FEATURE_STATUS_LABEL: Record<FeatureStatus, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  stub: 'Stub built',
};

export const FEATURE_STATUS_COLOR: Record<FeatureStatus, string> = {
  planned: '#808080',
  in_progress: '#2563eb',
  stub: '#d97706',
};

export function pendingFeatureStats() {
  const total = PENDING_FEATURES.length;
  const high = PENDING_FEATURES.filter((f) => f.priority === 'high').length;
  const inProgress = PENDING_FEATURES.filter((f) => f.status === 'in_progress').length;
  const stubs = PENDING_FEATURES.filter((f) => f.status === 'stub').length;
  return { total, high, inProgress, stubs };
}
