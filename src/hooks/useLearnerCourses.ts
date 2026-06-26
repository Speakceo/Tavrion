import { useCallback, useEffect, useState } from 'react';
import {
  fetchLearnerCourses,
  subscribeLearnerCourses,
  type BuiltinLearnerCourse,
  type UploadedCourseAssignment,
} from '../utils/learnerCourses';

export function useLearnerCourses(userId: string | undefined) {
  const [builtin, setBuiltin] = useState<BuiltinLearnerCourse[]>([]);
  const [uploaded, setUploaded] = useState<UploadedCourseAssignment[]>([]);
  const [stats, setStats] = useState({ enrolled: 0, inProgress: 0, completed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setBuiltin([]);
      setUploaded([]);
      setStats({ enrolled: 0, inProgress: 0, completed: 0, pending: 0 });
      setLoading(false);
      return;
    }

    try {
      const data = await fetchLearnerCourses(userId);
      setBuiltin(data.builtin);
      setUploaded(data.uploaded);
      setStats(data.stats);
    } catch (error) {
      console.error('Error loading learner courses:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    refresh();
    const unsubscribe = subscribeLearnerCourses(userId, refresh);
    return unsubscribe;
  }, [userId, refresh]);

  return { builtin, uploaded, stats, loading, refresh };
}
