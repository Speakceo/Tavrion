import { supabase } from '../lib/supabase';

/** After a lesson is completed, check if the whole course is done and issue certificate. */
export async function tryCompleteCourse(userId: string, courseId: string, courseTitle: string) {
  const { data: modules } = await supabase
    .from('modules')
    .select('id, lessons(id)')
    .eq('course_id', courseId);

  const lessonIds = (modules || []).flatMap((m: any) => (m.lessons || []).map((l: { id: string }) => l.id));
  if (lessonIds.length === 0) return;

  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('lesson_id, status')
    .eq('user_id', userId)
    .in('lesson_id', lessonIds);

  const completedIds = new Set((progress || []).filter((p) => p.status === 'completed').map((p) => p.lesson_id));
  const allDone = lessonIds.every((id) => completedIds.has(id));
  if (!allDone) return;

  await supabase
    .from('user_course_enrollments')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('course_id', courseId);

  const certNumber = `CERT-${Date.now().toString(36).toUpperCase()}`;
  await supabase.from('certificates').upsert(
    {
      user_id: userId,
      course_id: courseId,
      course_title: courseTitle,
      certificate_number: certNumber,
      issued_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,course_id' },
  );
}
