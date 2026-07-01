import { supabase } from '../../../lib/supabase';
import { applyOrgScope, orgIdForInsert } from '../../../utils/orgScope';
import type { OrgViewer } from '../../../utils/orgScope';
import type { AssessmentQuestion, QuestionType } from '../types';

export async function fetchQuestions(
  viewer: OrgViewer | null | undefined,
  filters?: { search?: string; type?: QuestionType; includeArchived?: boolean },
) {
  let query = supabase
    .from('assessment_questions')
    .select(`
      *,
      assessment_question_options (*),
      assessment_coding_test_cases (*)
    `)
    .order('updated_at', { ascending: false });

  query = applyOrgScope(query, viewer);
  if (!filters?.includeArchived) query = query.eq('is_archived', false);
  if (filters?.type) query = query.eq('question_type', filters.type);
  if (filters?.search?.trim()) {
    query = query.or(`title.ilike.%${filters.search.trim()}%,prompt.ilike.%${filters.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as AssessmentQuestion[];
}

export async function saveQuestion(
  viewer: OrgViewer & { id: string },
  question: Partial<AssessmentQuestion> & { question_type: QuestionType },
  options?: { option_text: string; is_correct: boolean }[],
) {
  const orgId = orgIdForInsert(viewer);
  if (!orgId) throw new Error('Organization required');

  const payload = {
    organization_id: orgId,
    question_type: question.question_type,
    title: question.title || '',
    prompt: question.prompt || '',
    skill_id: question.skill_id,
    difficulty: question.difficulty || 'medium',
    weight: question.weight ?? 1,
    tags: question.tags || [],
    explanation: question.explanation || '',
    time_limit_seconds: question.time_limit_seconds,
    is_required: question.is_required ?? true,
    randomize_options: question.randomize_options ?? false,
    metadata: question.metadata || {},
    updated_at: new Date().toISOString(),
    created_by: viewer.id,
  };

  let questionId = question.id;

  if (questionId) {
    const { error } = await supabase.from('assessment_questions').update(payload).eq('id', questionId);
    if (error) throw error;
    await supabase.from('assessment_question_options').delete().eq('question_id', questionId);
  } else {
    const { data, error } = await supabase.from('assessment_questions').insert(payload).select().single();
    if (error) throw error;
    questionId = data.id;
  }

  if (options?.length && questionId) {
    await supabase.from('assessment_question_options').insert(
      options.map((o, i) => ({
        question_id: questionId,
        option_text: o.option_text,
        is_correct: o.is_correct,
        sort_order: i,
      })),
    );
  }

  return questionId!;
}

export async function archiveQuestion(id: string) {
  const { error } = await supabase
    .from('assessment_questions')
    .update({ is_archived: true, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
