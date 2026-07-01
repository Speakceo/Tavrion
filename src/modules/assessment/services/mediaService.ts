import { supabase } from '../../../lib/supabase';

const BUCKET = 'assessment-responses';

export async function uploadAssessmentMedia(
  attemptId: string,
  questionId: string,
  file: Blob,
  ext: string,
): Promise<string> {
  const path = `${attemptId}/${questionId}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function invokeScoreResponse(payload: {
  attemptId: string;
  responseId: string;
  questionType: string;
  text?: string;
  mediaUrl?: string;
  rubric?: string;
}) {
  const { data, error } = await supabase.functions.invoke('assessment-score-response', {
    body: payload,
  });
  if (error) throw error;
  return data as { score?: number; feedback?: Record<string, unknown>; summary?: string };
}

export async function invokeCalculateOverallScore(attemptId: string) {
  const { data, error } = await supabase.functions.invoke('assessment-calculate-score', {
    body: { attemptId },
  });
  if (error) throw error;
  return data as {
    overall_score?: number;
    passed?: boolean;
    ai_summary?: string;
    strengths?: string[];
    weaknesses?: string[];
    recommendation?: string;
  };
}
