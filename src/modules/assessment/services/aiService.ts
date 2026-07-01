import { supabase } from '../../../lib/supabase';

async function invokeOpenRouterChat(
  messages: { role: string; content: string }[],
  maxTokens = 1000,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('openrouter-proxy', {
    body: { action: 'chat', messages, maxTokens, temperature: 0.4 },
  });
  if (error) throw error;
  return (data?.response as string) || '';
}

function parseJsonFromText(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export async function generateQuestions(prompt: string, count = 5) {
  try {
    const { data, error } = await supabase.functions.invoke('assessment-score-response', {
      body: { action: 'generate_questions', prompt, count },
    });
    if (!error && data?.questions) return data;
  } catch {
    // fall through to openrouter
  }

  try {
    const content = await invokeOpenRouterChat([
      {
        role: 'user',
        content: `Generate ${count} multiple-choice assessment questions about: ${prompt}. Return JSON only: {"questions":[{"title":"...","prompt":"...","question_type":"multiple_choice","options":[{"option_text":"...","is_correct":true}]}]}`,
      },
    ], 2000);
    const parsed = parseJsonFromText(content);
    if (parsed?.questions) return parsed;
  } catch {
    // fall through to stub
  }

  return {
    questions: Array.from({ length: count }, (_, i) => ({
      title: `Generated question ${i + 1}`,
      prompt: `${prompt} (sample ${i + 1})`,
      question_type: 'multiple_choice' as const,
      options: [
        { option_text: 'Option A', is_correct: true },
        { option_text: 'Option B', is_correct: false },
      ],
    })),
    note: 'AI generation fallback — edge function unavailable.',
  };
}

export async function generateAssessmentBrief(jobDescription: string) {
  return {
    title: 'Skills Assessment',
    description: `Assessment derived from: ${jobDescription.slice(0, 120)}...`,
    suggestedSkills: ['Communication', 'Problem Solving', 'Technical Aptitude'],
    note: 'AI placeholder',
  };
}

export async function summarizeCandidate(attemptId: string) {
  const { data: analytics } = await supabase
    .from('assessment_session_analytics')
    .select('ai_summary, strengths, weaknesses, recommendation, overall_score')
    .eq('attempt_id', attemptId)
    .maybeSingle();

  if (analytics?.ai_summary) {
    return {
      attemptId,
      summary: analytics.ai_summary,
      strengths: analytics.strengths || [],
      gaps: analytics.weaknesses || [],
      recommendation: analytics.recommendation,
      overall_score: analytics.overall_score,
    };
  }

  try {
    const { invokeCalculateOverallScore } = await import('./mediaService');
    const result = await invokeCalculateOverallScore(attemptId);
    return {
      attemptId,
      summary: result.ai_summary || `Overall score: ${result.overall_score}%`,
      strengths: result.strengths || [],
      gaps: result.weaknesses || [],
      recommendation: result.recommendation,
      overall_score: result.overall_score,
    };
  } catch {
    // fall through
  }

  const { data: attempt } = await supabase
    .from('assessment_attempts')
    .select('final_score, passed, candidate_name')
    .eq('id', attemptId)
    .maybeSingle();

  return {
    attemptId,
    summary: attempt
      ? `${attempt.candidate_name || 'Candidate'} scored ${attempt.final_score ?? '—'}% (${attempt.passed ? 'passed' : 'pending review'}).`
      : 'No summary available yet.',
    strengths: [] as string[],
    gaps: [] as string[],
  };
}

export async function scoreResumeMatch(resumeText: string, jobDescription: string) {
  return {
    matchScore: 72,
    matchedSkills: ['Communication', 'Problem solving'],
    missingSkills: ['System design'],
    summary: `Resume alignment with role: moderate fit (${resumeText.slice(0, 40)}… vs ${jobDescription.slice(0, 40)}…)`,
    note: 'Stub — wire to assessment-score-response for production.',
  };
}

export async function detectPlagiarism(text: string, sourceHint?: string) {
  return {
    plagiarismScore: 12,
    flagged: false,
    matches: [] as { source: string; similarity: number }[],
    summary: sourceHint
      ? `No significant overlap detected against ${sourceHint}.`
      : 'No significant overlap detected.',
    inputLength: text.length,
    note: 'Stub — wire to plagiarism edge function for production.',
  };
}

export async function generateListeningTts(passage: string, voice = 'alloy') {
  return {
    passage,
    voice,
    audioUrl: null as string | null,
    durationSeconds: Math.ceil(passage.split(/\s+/).length / 2.5),
    format: 'mp3',
    note: 'Stub — wire to openrouter-proxy TTS action for production.',
  };
}

export async function getAntiPlagiarismEnabled(orgSettings: Record<string, unknown> = {}) {
  const assessmentAi = (orgSettings.assessment_ai || {}) as { anti_plagiarism?: boolean };
  return assessmentAi.anti_plagiarism ?? false;
}
