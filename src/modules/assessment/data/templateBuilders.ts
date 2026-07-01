import type { QuestionType } from '../types';
import type { TemplateQuestion } from './roleAssessmentTemplates';

type QOpts = {
  difficulty?: 'easy' | 'medium' | 'hard';
  weight?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export function mc(
  title: string,
  prompt: string,
  choices: [string, boolean][],
  opts: QOpts = {},
): TemplateQuestion {
  return {
    question_type: 'multiple_choice',
    title,
    prompt,
    difficulty: opts.difficulty ?? 'medium',
    weight: opts.weight ?? 1,
    tags: opts.tags ?? [],
    options: choices.map(([option_text, is_correct]) => ({ option_text, is_correct })),
    metadata: opts.metadata,
  };
}

export function ms(
  title: string,
  prompt: string,
  choices: [string, boolean][],
  opts: QOpts = {},
): TemplateQuestion {
  return {
    question_type: 'multiple_select',
    title,
    prompt,
    difficulty: opts.difficulty ?? 'medium',
    weight: opts.weight ?? 1,
    tags: opts.tags ?? [],
    options: choices.map(([option_text, is_correct]) => ({ option_text, is_correct })),
    metadata: opts.metadata,
  };
}

export function tf(
  title: string,
  prompt: string,
  correctIsTrue: boolean,
  opts: QOpts = {},
): TemplateQuestion {
  return {
    question_type: 'true_false',
    title,
    prompt,
    difficulty: opts.difficulty ?? 'easy',
    weight: opts.weight ?? 1,
    tags: opts.tags ?? [],
    options: [
      { option_text: 'True', is_correct: correctIsTrue },
      { option_text: 'False', is_correct: !correctIsTrue },
    ],
    metadata: opts.metadata,
  };
}

export function sjt(
  title: string,
  prompt: string,
  choices: [string, boolean][],
  opts: QOpts = {},
): TemplateQuestion {
  return {
    question_type: 'situational_judgment',
    title,
    prompt,
    difficulty: opts.difficulty ?? 'hard',
    weight: opts.weight ?? 1,
    tags: opts.tags ?? [],
    options: choices.map(([option_text, is_correct]) => ({ option_text, is_correct })),
    metadata: opts.metadata,
  };
}

export function shortQ(
  title: string,
  prompt: string,
  expected?: string,
  opts: QOpts = {},
): TemplateQuestion {
  return {
    question_type: 'short_answer',
    title,
    prompt,
    difficulty: opts.difficulty ?? 'medium',
    weight: opts.weight ?? 1,
    tags: opts.tags ?? [],
    metadata: { ...opts.metadata, ...(expected ? { expected_answer: expected } : {}) },
  };
}

export function longQ(title: string, prompt: string, opts: QOpts = {}): TemplateQuestion {
  return {
    question_type: 'long_answer',
    title,
    prompt,
    difficulty: opts.difficulty ?? 'hard',
    weight: opts.weight ?? 2,
    tags: opts.tags ?? [],
    metadata: opts.metadata,
  };
}

export function listen(
  title: string,
  passage: string,
  prompt: string,
  choices: [string, boolean][],
  opts: QOpts = {},
): TemplateQuestion {
  return {
    question_type: 'listening',
    title,
    prompt,
    difficulty: opts.difficulty ?? 'medium',
    weight: opts.weight ?? 1,
    tags: opts.tags ?? [],
    options: choices.map(([option_text, is_correct]) => ({ option_text, is_correct })),
    metadata: { passage, ...opts.metadata },
  };
}

export function audio(title: string, prompt: string, opts: QOpts = {}): TemplateQuestion {
  return {
    question_type: 'audio_response',
    title,
    prompt,
    difficulty: opts.difficulty ?? 'medium',
    weight: opts.weight ?? 2,
    tags: opts.tags ?? [],
    metadata: { max_duration_seconds: 90, ...opts.metadata },
  };
}

export function video(title: string, prompt: string, opts: QOpts = {}): TemplateQuestion {
  return {
    question_type: 'video_response',
    title,
    prompt,
    difficulty: opts.difficulty ?? 'medium',
    weight: opts.weight ?? 2,
    tags: opts.tags ?? [],
    metadata: { max_duration_seconds: 120, ...opts.metadata },
  };
}

export function code(
  title: string,
  prompt: string,
  starter: string,
  language = 'javascript',
  opts: QOpts = {},
): TemplateQuestion {
  return {
    question_type: 'coding',
    title,
    prompt,
    difficulty: opts.difficulty ?? 'medium',
    weight: opts.weight ?? 2,
    tags: opts.tags ?? [],
    metadata: { starter_code: starter, language, ...opts.metadata },
  };
}

export function sqlQ(title: string, prompt: string, opts: QOpts = {}): TemplateQuestion {
  return {
    question_type: 'sql',
    title,
    prompt,
    difficulty: opts.difficulty ?? 'medium',
    weight: opts.weight ?? 2,
    tags: opts.tags ?? [],
    metadata: { language: 'sql', ...opts.metadata },
  };
}

export function cognitive(
  title: string,
  prompt: string,
  choices: [string, boolean][],
  opts: QOpts = {},
): TemplateQuestion {
  return mc(title, prompt, choices, { ...opts, tags: [...(opts.tags ?? []), 'cognitive'] });
}

export function roleTemplate(
  id: string,
  role: string,
  title: string,
  description: string,
  sections: { title: string; instructions?: string; questions: TemplateQuestion[] }[],
  opts?: { passing_score?: number; time_limit_minutes?: number; tags?: string[] },
) {
  const questionCount = sections.reduce((n, s) => n + s.questions.length, 0);
  return {
    id,
    role,
    title,
    description: `${description} (${questionCount} questions — fully editable after import.)`,
    tags: opts?.tags ?? [role.toLowerCase().replace(/\s+/g, '-'), 'hiring', 'template'],
    passing_score: opts?.passing_score ?? 70,
    time_limit_minutes: opts?.time_limit_minutes ?? Math.max(45, Math.ceil(questionCount * 2)),
    instructions:
      'Read each question carefully. All responses are editable by your administrator after import. For audio/video questions, use a quiet environment with a stable connection.',
    sections,
  };
}
