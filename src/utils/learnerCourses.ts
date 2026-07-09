import { supabase } from '../lib/supabase';
import type { Course, UserCourseEnrollment } from '../types';

export type LearnerCourseKind = 'builtin' | 'uploaded';

export type UploadedCourseAssignment = {
  id: string;
  course_id: string;
  status: string;
  viewed_at: string | null;
  completed_at: string | null;
  created_at: string;
  progress_percentage?: number;
  course: {
    id: string;
    title: string;
    description?: string;
    file_name?: string;
    file_path?: string;
    file_type?: string;
    file_size?: number;
    thumbnail_path?: string | null;
  };
};

export type BuiltinLearnerCourse = Course & { enrollment: UserCourseEnrollment };

const PENDING_BUILTIN = new Set(['assigned', 'not_started']);
const PENDING_UPLOADED = new Set(['assigned', 'not_started', 'viewed', 'downloaded']);
const IN_PROGRESS_BUILTIN = new Set(['in_progress']);
const IN_PROGRESS_UPLOADED = new Set(['in_progress', 'viewed', 'downloaded']);

export function isPendingStatus(status: string, kind: LearnerCourseKind) {
  return kind === 'builtin' ? PENDING_BUILTIN.has(status) : PENDING_UPLOADED.has(status);
}

export function isInProgressStatus(status: string, kind: LearnerCourseKind) {
  return kind === 'builtin' ? IN_PROGRESS_BUILTIN.has(status) : IN_PROGRESS_UPLOADED.has(status);
}

export function statusLabel(status: string) {
  return status.replace(/_/g, ' ');
}

export async function fetchLearnerCourses(userId: string) {
  const [{ data: enrollmentsData }, { data: uploadedAssignments }] = await Promise.all([
    supabase
      .from('user_course_enrollments')
      .select('*, course:courses(*)')
      .eq('user_id', userId)
      .order('enrolled_at', { ascending: false }),
    supabase
      .from('uploaded_course_assignments')
      .select('*, course:uploaded_courses(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  const builtin = (enrollmentsData || [])
    .filter((row: any) => row.course)
    .map((row: any) => ({ ...row.course, enrollment: row })) as BuiltinLearnerCourse[];

  const uploaded = (uploadedAssignments || []).filter((row: any) => row.course) as UploadedCourseAssignment[];

  const enrolled = builtin.length + uploaded.length;
  const inProgress =
    builtin.filter((c) => isInProgressStatus(c.enrollment.status, 'builtin')).length +
    uploaded.filter((a) => isInProgressStatus(a.status, 'uploaded')).length;
  const completed =
    builtin.filter((c) => c.enrollment.status === 'completed').length +
    uploaded.filter((a) => a.status === 'completed').length;
  const pending =
    builtin.filter((c) => isPendingStatus(c.enrollment.status, 'builtin')).length +
    uploaded.filter((a) => isPendingStatus(a.status, 'uploaded')).length;

  return {
    builtin,
    uploaded,
    stats: { enrolled, inProgress, completed, pending },
  };
}

export function subscribeLearnerCourses(userId: string, onChange: () => void) {
  const channel = supabase
    .channel(`learner-courses-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_course_enrollments', filter: `user_id=eq.${userId}` },
      onChange
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'uploaded_course_assignments', filter: `user_id=eq.${userId}` },
      onChange
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
