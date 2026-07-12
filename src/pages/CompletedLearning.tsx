import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { CheckCircle, Award, Calendar, FileText } from 'lucide-react';
import { UserCourseEnrollment, Course } from '../types';
import { getCourseFormatLabel } from '../utils/uploadedCourseDisplay';

export function CompletedLearning() {
  const { profile } = useAuth();
  const [completedCourses, setCompletedCourses] = useState<(UserCourseEnrollment & { course: Course })[]>([]);
  const [completedUploaded, setCompletedUploaded] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompletedLearning();
  }, [profile]);

  const fetchCompletedLearning = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      const { data: enrollmentsData } = await supabase
        .from('user_course_enrollments')
        .select(`
          *,
          course:courses(*)
        `)
        .eq('user_id', profile.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (enrollmentsData) {
        setCompletedCourses(enrollmentsData as any);
      }

      const { data: uploadedData } = await supabase
        .from('uploaded_course_assignments')
        .select(`
          *,
          course:uploaded_courses(*)
        `)
        .eq('user_id', profile.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (uploadedData) {
        setCompletedUploaded(uploadedData);
      }
    } catch (error) {
      console.error('Error fetching completed learning:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-emerald-600 absolute top-0 left-0"></div>
          </div>
        </div>
      </Layout>
    );
  }

  const hasCompletedCourses = completedCourses.length > 0 || completedUploaded.length > 0;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="relative overflow-hidden lt-card p-8 text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
          <div className="relative flex items-center gap-4">
            <div style={{backgroundColor:'rgba(255,255,255,0.2)',padding:16,borderRadius:16}}>
              <Award className="w-12 h-12" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Completed Learning</h1>
              <p style={{color:'rgba(255,255,255,0.8)',fontSize:'1.125rem'}}>
                {completedCourses.length + completedUploaded.length} courses completed - Well done!
              </p>
            </div>
          </div>
        </div>

        {!hasCompletedCourses ? (
          <div className="lt-card p-12 text-center">
            <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Completed Courses Yet</h3>
            <p className="text-gray-600">Your completed courses will appear here</p>
          </div>
        ) : (
          <div className="space-y-6">
            {completedCourses.length > 0 && (
              <div className="lt-card overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">Completed Courses</h2>
                  <p className="text-gray-600 text-sm mt-1">Your learning achievements</p>
                </div>
                <div className="divide-y divide-gray-200">
                  {completedCourses.map((enrollment) => (
                    <Link
                      key={enrollment.id}
                      to={`/courses/${enrollment.course_id}`}
                      className="block p-6 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 transition-all duration-200 group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-emerald-700 transition-colors">
                              {enrollment.course.title}
                            </h3>
                            <div className="flex items-center gap-2 text-emerald-600">
                              <CheckCircle className="w-5 h-5 fill-current" />
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {enrollment.course.description}
                          </p>
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-medium text-xs uppercase tracking-wide shadow-sm">
                              Completed
                            </span>
                            {enrollment.completed_at && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(enrollment.completed_at).toLocaleDateString()}</span>
                              </div>
                            )}
                            {enrollment.score !== null && enrollment.score !== undefined && (
                              <span className="text-sm font-semibold text-gray-700">
                                Score: {enrollment.score}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {completedUploaded.length > 0 && (
              <div className="lt-card overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">Completed Materials</h2>
                  <p className="text-gray-600 text-sm mt-1">Finished course materials</p>
                </div>
                <div className="divide-y divide-gray-200">
                  {completedUploaded.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="p-6 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="bg-emerald-100 p-3 rounded-lg">
                            <FileText className="w-6 h-6 text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                {assignment.course.title}
                              </h3>
                              <CheckCircle className="w-5 h-5 text-emerald-600 fill-current" />
                            </div>
                            {assignment.course.description && (
                              <p className="text-gray-600 text-sm mb-3">
                                {assignment.course.description}
                              </p>
                            )}
                            <div className="flex items-center flex-wrap gap-3">
                              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold uppercase">
                                Completed
                              </span>
                              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                                {getCourseFormatLabel(assignment.course.file_type)}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatFileSize(assignment.course.file_size)}
                              </span>
                              {assignment.completed_at && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(assignment.completed_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
