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

  if (type === 'listening' || type === 'multiple_choice' || type === 'true_false' || type === 'situational_judgment') {
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

  if (type === 'personality' || type === 'cognitive') {
    return scorePsychometricItem(question, response, weight);
  }

  if (type === 'excel') {
    const expected = (question.metadata?.expected_cells as Record<string, string>) || {};
    const cells = (response?.cells as Record<string, string>) || {};
    const keys = Object.keys(expected);
    if (!keys.length) {
      return { autoScore: 0, maxScore: weight, percentage: 0, details: 'Requires manual grading' };
    }
    const matches = keys.filter((k) => String(cells[k] ?? '').trim() === String(expected[k]).trim()).length;
    const ratio = matches / keys.length;
    return {
      autoScore: weight * ratio,
      maxScore: weight,
      percentage: Math.round(ratio * 100),
      details: `${matches}/${keys.length} cells correct`,
    };
  }

  return { autoScore: 0, maxScore: weight, percentage: 0, details: 'Manual grading required' };
}

/** Norm tables: raw score → percentile (0–100) */
const NORM_TABLES: Record<string, { mean: number; sd: number; maxRaw: number }> = {
  big_five_openness: { mean: 32, sd: 8, maxRaw: 50 },
  big_five_conscientiousness: { mean: 35, sd: 7, maxRaw: 50 },
  big_five_extraversion: { mean: 30, sd: 9, maxRaw: 50 },
  big_five_agreeableness: { mean: 34, sd: 8, maxRaw: 50 },
  big_five_neuroticism: { mean: 28, sd: 9, maxRaw: 50 },
  cognitive_verbal: { mean: 18, sd: 5, maxRaw: 30 },
  cognitive_numerical: { mean: 16, sd: 6, maxRaw: 30 },
  cognitive_abstract: { mean: 14, sd: 5, maxRaw: 25 },
  cognitive_general: { mean: 20, sd: 6, maxRaw: 35 },
  situational_judgment: { mean: 22, sd: 5, maxRaw: 35 },
};

function rawToPercentile(raw: number, normKey: string): number {
  const norm = NORM_TABLES[normKey] || NORM_TABLES.cognitive_general;
  const z = (raw - norm.mean) / norm.sd;
  const percentile = 50 + 50 * Math.tanh(z * 0.6);
  return Math.round(Math.max(1, Math.min(99, percentile)));
}

function scorePsychometricItem(
  question: AssessmentQuestion,
  response: AssessmentResponse['answer'],
  weight: number,
): ScoreResult {
  const normKey = String(question.metadata?.norm_key ?? 'cognitive_general');
  const traitScores = (question.metadata?.trait_scores as Record<string, number>) || {};
  let raw = Number(response?.raw_score);

  if (Number.isNaN(raw)) {
    const selected = response?.selected;
    if (Array.isArray(selected)) {
      raw = (selected as string[]).reduce((sum, id) => sum + (traitScores[id] ?? 1), 0);
    } else if (selected) {
      raw = traitScores[String(selected)] ?? 1;
    } else {
      raw = 0;
    }
  }

  const maxRaw = NORM_TABLES[normKey]?.maxRaw ?? 30;
  const percentile = rawToPercentile(raw, normKey);
  const autoScore = weight * (percentile / 100);
  return {
    autoScore,
    maxScore: weight,
    percentage: percentile,
    details: `Norm ${normKey}: raw ${raw}/${maxRaw} → ${percentile}th percentile`,
  };
}

export function scoreNormReferenced(
  questions: AssessmentQuestion[],
  responses: Map<string, AssessmentResponse['answer']>,
): { normKey: string; raw: number; percentile: number; label: string }[] {
  const byNorm = new Map<string, { raw: number; count: number }>();

  for (const q of questions) {
    if (!['personality', 'cognitive'].includes(q.question_type)) continue;
    const normKey = String(q.metadata?.norm_key ?? 'cognitive_general');
    const resp = responses.get(q.id) || {};
    const traitScores = (q.metadata?.trait_scores as Record<string, number>) || {};
    let raw = Number(resp?.raw_score);
    if (Number.isNaN(raw)) {
      const selected = resp?.selected;
      if (Array.isArray(selected)) {
        raw = (selected as string[]).reduce((sum, id) => sum + (traitScores[id] ?? 1), 0);
      } else if (selected) {
        raw = traitScores[String(selected)] ?? 1;
      } else {
        raw = 0;
      }
    }
    const entry = byNorm.get(normKey) || { raw: 0, count: 0 };
    entry.raw += raw;
    entry.count += 1;
    byNorm.set(normKey, entry);
  }

  return [...byNorm.entries()].map(([normKey, { raw, count }]) => ({
    normKey,
    raw,
    percentile: rawToPercentile(raw / Math.max(1, count), normKey),
    label: normKey.replace(/_/g, ' '),
  }));
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
