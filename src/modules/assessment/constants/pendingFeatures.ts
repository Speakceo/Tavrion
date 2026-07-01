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
