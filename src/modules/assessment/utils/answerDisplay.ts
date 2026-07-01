import type { AssessmentQuestion, AssessmentQuestionOption } from '../types';

/** Strip non-serializable fields before persisting to the database. */
export function sanitizeAnswerForStorage(answer: Record<string, unknown>): Record<string, unknown> {
  const clean = { ...answer };
  delete clean.blob;
  delete clean.preview_url;
  return clean;
}

/** Enrich MCQ / multi-select answers with human-readable labels for admin review. */
export function enrichAnswerWithLabels(
  question: AssessmentQuestion,
  answer: Record<string, unknown>,
): Record<string, unknown> {
  const options = question.options || [];
  const byId = new Map(options.map((o) => [o.id, o]));

  if (question.question_type === 'multiple_select') {
    const ids = (answer.selected as string[]) || [];
    const labels = ids.map((id) => byId.get(id)?.option_text).filter(Boolean);
    return { ...answer, selected: ids, selected_labels: labels };
  }

  if (
    ['multiple_choice', 'true_false', 'listening', 'situational_judgment', 'personality', 'cognitive'].includes(
      question.question_type,
    )
  ) {
    const id = String(answer.selected ?? '');
    const opt = byId.get(id);
    return { ...answer, selected: id, selected_text: opt?.option_text ?? '' };
  }

  return answer;
}

function optionLabel(options: AssessmentQuestionOption[] | undefined, id: string): string {
  return options?.find((o) => o.id === id)?.option_text || id;
}

/** Human-readable answer for admin session detail, grading queue, exports. */
export function formatAnswerForDisplay(
  question: AssessmentQuestion | undefined,
  answer: Record<string, unknown> | null | undefined,
): string {
  if (!answer || Object.keys(answer).length === 0) return '—';

  const type = question?.question_type;

  if (typeof answer.text === 'string' && answer.text.trim()) {
    return answer.text.trim();
  }

  if (typeof answer.selected_text === 'string' && answer.selected_text) {
    return answer.selected_text;
  }

  if (Array.isArray(answer.selected_labels) && answer.selected_labels.length) {
    return (answer.selected_labels as string[]).join(', ');
  }

  if (type === 'multiple_select' && Array.isArray(answer.selected)) {
    const ids = answer.selected as string[];
    return ids.map((id) => optionLabel(question?.options, id)).join(', ') || '—';
  }

  if (answer.selected != null && question?.options?.length) {
    return optionLabel(question.options, String(answer.selected));
  }

  if (typeof answer.media_url === 'string' && answer.media_url) {
    return answer.media_url;
  }

  if (typeof answer.code === 'string' && answer.code.trim()) {
    return answer.code.trim();
  }

  if (answer.cells && typeof answer.cells === 'object') {
    const cells = answer.cells as Record<string, string>;
    const filled = Object.entries(cells).filter(([, v]) => v?.trim());
    if (!filled.length) return '—';
    return filled.map(([ref, val]) => `${ref}: ${val}`).join(' · ');
  }

  if (answer.testsPassed != null) {
    return `Tests passed: ${answer.testsPassed}/${answer.testsTotal ?? '?'}`;
  }

  return '—';
}
