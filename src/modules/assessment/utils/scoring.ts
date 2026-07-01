import type { AssessmentQuestion, AssessmentResponse } from '../types';

export interface ScoreResult {
  autoScore: number;
  maxScore: number;
  percentage: number;
  details: string;
}

export function scoreResponse(
  question: AssessmentQuestion,
  response: AssessmentResponse['answer'],
  options?: { negativeMarking?: boolean },
): ScoreResult {
  const weight = question.weight || 1;
  const type = question.question_type;

  if (type === 'listening' || type === 'multiple_choice' || type === 'true_false') {
    const selected = String(response?.selected ?? '');
    const correct = question.options?.find((o) => o.is_correct);
    const isCorrect = correct && selected === correct.id;
    const autoScore = isCorrect ? weight : (options?.negativeMarking ? -weight * 0.25 : 0);
    return {
      autoScore: Math.max(0, autoScore),
      maxScore: weight,
      percentage: isCorrect ? 100 : 0,
      details: isCorrect ? 'Correct' : 'Incorrect',
    };
  }

  if (type === 'multiple_select') {
    const selected = new Set((response?.selected as string[]) || []);
    const correctIds = new Set(question.options?.filter((o) => o.is_correct).map((o) => o.id) || []);
    if (correctIds.size === 0) {
      return { autoScore: 0, maxScore: weight, percentage: 0, details: 'No correct answers configured' };
    }
    let matches = 0;
    correctIds.forEach((id) => { if (selected.has(id)) matches += 1; });
    const wrong = [...selected].filter((id) => !correctIds.has(id)).length;
    const partial = Math.max(0, (matches - wrong) / correctIds.size);
    const autoScore = weight * partial;
    return {
      autoScore,
      maxScore: weight,
      percentage: Math.round(partial * 100),
      details: `${matches}/${correctIds.size} correct selections`,
    };
  }

  if (type === 'short_answer' || type === 'long_answer') {
    const text = String(response?.text ?? '').trim().toLowerCase();
    const expected = String(question.metadata?.expected_answer ?? '').trim().toLowerCase();
    if (expected && text === expected) {
      return { autoScore: weight, maxScore: weight, percentage: 100, details: 'Exact match' };
    }
    return { autoScore: 0, maxScore: weight, percentage: 0, details: 'Requires manual grading' };
  }

  if (type === 'coding' || type === 'sql') {
    const passed = Number(response?.testsPassed ?? 0);
    const total = Number(response?.testsTotal ?? question.test_cases?.length ?? 0);
    const ratio = total > 0 ? passed / total : 0;
    return {
      autoScore: weight * ratio,
      maxScore: weight,
      percentage: Math.round(ratio * 100),
      details: `${passed}/${total} test cases passed`,
    };
  }

  return { autoScore: 0, maxScore: weight, percentage: 0, details: 'Manual grading required' };
}

export function calculateAttemptScore(
  results: ScoreResult[],
  passingScore = 70,
): { total: number; max: number; percentage: number; passed: boolean } {
  const total = results.reduce((s, r) => s + r.autoScore, 0);
  const max = results.reduce((s, r) => s + r.maxScore, 0);
  const percentage = max > 0 ? Math.round((total / max) * 100) : 0;
  return { total, max, percentage, passed: percentage >= passingScore };
}
