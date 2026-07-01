import type { QuestionType } from './types';

export const QUESTION_TYPES: { value: QuestionType; label: string; category: string }[] = [
  { value: 'multiple_choice', label: 'Multiple Choice', category: 'Standard' },
  { value: 'multiple_select', label: 'Multiple Select', category: 'Standard' },
  { value: 'true_false', label: 'True / False', category: 'Standard' },
  { value: 'short_answer', label: 'Short Answer', category: 'Standard' },
  { value: 'long_answer', label: 'Long Answer', category: 'Standard' },
  { value: 'coding', label: 'Coding', category: 'Technical' },
  { value: 'sql', label: 'SQL', category: 'Technical' },
  { value: 'excel', label: 'Excel', category: 'Technical' },
  { value: 'file_upload', label: 'File Upload', category: 'Media' },
  { value: 'video_response', label: 'Video Response', category: 'Media' },
  { value: 'audio_response', label: 'Speaking / Audio', category: 'Media' },
  { value: 'listening', label: 'Listening Comprehension', category: 'Media' },
  { value: 'personality', label: 'Personality', category: 'Psychometric' },
  { value: 'cognitive', label: 'Cognitive', category: 'Psychometric' },
  { value: 'situational_judgment', label: 'Situational Judgment', category: 'Psychometric' },
  { value: 'custom', label: 'Custom', category: 'Other' },
];

export const CODING_LANGUAGES = [
  'python', 'javascript', 'typescript', 'java', 'c', 'cpp', 'csharp',
  'go', 'rust', 'php', 'ruby', 'kotlin', 'swift', 'sql',
] as const;

export const VIOLATION_TYPES = [
  'tab_switch',
  'focus_loss',
  'copy_paste',
  'right_click',
  'fullscreen_exit',
  'screenshot_warning',
] as const;

export const DEFAULT_INTEGRITY_SETTINGS = {
  maxViolations: 5,
  autoSubmitOnMax: true,
  blockCopyPaste: true,
  requireFullscreen: false,
  logIp: true,
  logDevice: true,
};
