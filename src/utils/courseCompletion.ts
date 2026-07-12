import { supabase } from '../lib/supabase';
import type { CertificateTemplateId } from './certificateTemplates';

async function issueCertificate(params: {
  userId: string;
  courseId?: string | null;
  uploadedCourseId?: string | null;
  courseTitle: string;
  userName: string;
  certificateTemplate?: CertificateTemplateId;
}): Promise<{ ok: boolean; error?: string }> {
  const certNumber = `CERT-${Date.now().toString(36).toUpperCase()}`;
  const row = {
    user_id: params.userId,
    course_id: params.courseId || null,
    uploaded_course_id: params.uploadedCourseId || null,
    course_title: params.courseTitle,
    user_name: params.userName,
    certificate_number: certNumber,
    certificate_template: params.certificateTemplate || 'classic',
    issued_at: new Date().toISOString(),
  };

  if (params.uploadedCourseId) {
    const { data: existing, error: lookupError } = await supabase
      .from('certificates')
      .select('id')
      .eq('user_id', params.userId)
      .eq('uploaded_course_id', params.uploadedCourseId)
      .maybeSingle();

    if (lookupError) {
      console.error('Certificate lookup failed:', lookupError);
      return { ok: false, error: lookupError.message };
    }

    if (existing) {
      const { error } = await supabase.from('certificates').update(row).eq('id', existing.id);
      if (error) {
        console.error('Certificate update failed:', error);
        return { ok: false, error: error.message };
      }
      return { ok: true };
    }

    const { error } = await supabase.from('certificates').insert(row);
    if (error) {
      console.error('Certificate insert failed:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  if (params.courseId) {
    const { error } = await supabase.from('certificates').upsert(row, { onConflict: 'user_id,course_id' });
    if (error) {
      console.error('Certificate upsert failed:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }

  return { ok: false, error: 'No course id provided' };
}

/** After a lesson is completed, check if the whole course is done and issue certificate. */
export async function tryCompleteCourse(
  userId: string,
  courseId: string,
  courseTitle: string,
): Promise<{ completed: boolean; courseTitle: string }> {
  const { data: modules } = await supabase
    .from('modules')
    .select('id, lessons(id)')
    .eq('course_id', courseId);

  const lessonIds = (modules || []).flatMap((m: { lessons?: { id: string }[] }) => (m.lessons || []).map((l) => l.id));
  if (lessonIds.length === 0) return { completed: false, courseTitle };

  const { data: progress } = await supabase
    .from('lesson_progress')
    .select('lesson_id, status')
    .eq('user_id', userId)
    .in('lesson_id', lessonIds);

  const completedIds = new Set((progress || []).filter((p) => p.status === 'completed').map((p) => p.lesson_id));
  const allDone = lessonIds.every((id) => completedIds.has(id));
  if (!allDone) return { completed: false, courseTitle };

  const [{ data: enrollment }, { data: user }] = await Promise.all([
    supabase
      .from('user_course_enrollments')
      .select('certificate_template, status')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle(),
    supabase.from('user_profiles').select('full_name').eq('id', userId).maybeSingle(),
  ]);

  if (enrollment?.status === 'completed') {
    return { completed: false, courseTitle };
  }

  await supabase
    .from('user_course_enrollments')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('course_id', courseId);

  await issueCertificate({
    userId,
    courseId,
    courseTitle,
    userName: user?.full_name || 'Learner',
    certificateTemplate: (enrollment?.certificate_template as CertificateTemplateId) || 'classic',
  });

  return { completed: true, courseTitle };
}

/** Issue certificate when an uploaded/SCORM course is marked complete. */
export async function tryCompleteUploadedCourse(
  userId: string,
  uploadedCourseId: string,
  courseTitle: string,
): Promise<{ completed: boolean; courseTitle: string }> {
  const [{ data: assignment }, { data: user }, { data: existingCert }] = await Promise.all([
    supabase
      .from('uploaded_course_assignments')
      .select('id, status, certificate_template')
      .eq('user_id', userId)
      .eq('course_id', uploadedCourseId)
      .maybeSingle(),
    supabase.from('user_profiles').select('full_name').eq('id', userId).maybeSingle(),
    supabase
      .from('certificates')
      .select('id')
      .eq('user_id', userId)
      .eq('uploaded_course_id', uploadedCourseId)
      .maybeSingle(),
  ]);

  if (assignment && assignment.status !== 'completed') {
    await supabase
      .from('uploaded_course_assignments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        progress_percentage: 100,
      })
      .eq('id', assignment.id);
  }

  if (existingCert) {
    return { completed: false, courseTitle };
  }

  const result = await issueCertificate({
    userId,
    uploadedCourseId,
    courseTitle,
    userName: user?.full_name || 'Learner',
    certificateTemplate: (assignment?.certificate_template as CertificateTemplateId) || 'classic',
  });

  return { completed: result.ok, courseTitle };
}
