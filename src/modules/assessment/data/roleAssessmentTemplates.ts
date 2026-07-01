import type { QuestionType } from '../types';
import { BATCH1_TEMPLATES } from './roles/batch1';
import { BATCH2_TEMPLATES } from './roles/batch2';
import { BATCH3_TEMPLATES } from './roles/batch3';

export type TemplateQuestion = {
  question_type: QuestionType;
  title: string;
  prompt: string;
  difficulty: 'easy' | 'medium' | 'hard';
  weight: number;
  tags: string[];
  options?: { option_text: string; is_correct: boolean }[];
  metadata?: Record<string, unknown>;
};

export type RoleAssessmentTemplate = {
  id: string;
  role: string;
  title: string;
  description: string;
  tags: string[];
  passing_score: number;
  time_limit_minutes: number;
  instructions: string;
  sections: {
    title: string;
    instructions?: string;
    questions: TemplateQuestion[];
  }[];
};

export const ROLE_ASSESSMENT_TEMPLATES: RoleAssessmentTemplate[] = [
  ...BATCH1_TEMPLATES,
  ...BATCH2_TEMPLATES,
  ...BATCH3_TEMPLATES,
];

export function getTemplateById(id: string) {
  return ROLE_ASSESSMENT_TEMPLATES.find((t) => t.id === id);
}
