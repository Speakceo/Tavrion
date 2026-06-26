import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Clock, BookOpen, ArrowRight, Eye, Download, FileText } from 'lucide-react';
import { ScormPlayer } from '../components/ScormPlayer';
import { UserCourseEnrollment, Course } from '../types';
import { tryCompleteUploadedCourse } from '../utils/courseCompletion';

export function RecentLearning() {
  const { profile } = useAuth();
  const [recentCourses, setRecentCourses] = useState<(UserCourseEnrollment & { course: Course })[]>([]);
  const [recentUploaded, setRecentUploaded] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewCourse, setPreviewCourse] = useState<any>(null);

  useEffect(() => {
    fetchRecentLearning();
  }, [profile]);

  const fetchRecentLearning = async () => {
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
        .eq('status', 'in_progress')
        .order('last_accessed_at', { ascending: false })
        .limit(10);

      if (enrollmentsData) {
        setRecentCourses(enrollmentsData as any);
      }

      const { data: uploadedData } = await supabase
        .from('uploaded_course_assignments')
        .select(`
          *,
          course:uploaded_courses(*)
        `)
        .eq('user_id', profile.id)
        .in('status', ['downloaded', 'in_progress'])
        .order('viewed_at', { ascending: false })
        .limit(10);

      if (uploadedData) {
        setRecentUploaded(uploadedData);
      }
    } catch (error) {
      console.error('Error fetching recent learning:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFile = async (filePath: string, fileName: string, courseId: string) => {
    if (!profile) return;

    try {
      const { data, error } = await supabase.storage
        .from('course-files')
        .download(filePath);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      await supabase
        .from('uploaded_course_assignments')
        .update({
          status: 'downloaded',
          viewed_at: new Date().toISOString()
        })
        .eq('user_id', profile.id)
        .eq('course_id', courseId);

      fetchRecentLearning();
    } catch (error: any) {
      console.error('Error downloading file:', error);
      alert('Failed to download file: ' + error.message);
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
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 absolute top-0 left-0"></div>
          </div>
        </div>
      </Layout>
    );
  }

  const hasRecentActivity = recentCourses.length > 0 || recentUploaded.length > 0;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recent Learning</h1>
          <p className="text-gray-600 mt-1">Continue where you left off</p>
        </div>

        {!hasRecentActivity ? (
          <div className="lt-card p-12 text-center">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Recent Activity</h3>
            <p className="text-gray-600">Your recent learning will appear here</p>
          </div>
        ) : (
          <div className="space-y-6">
            {recentCourses.length > 0 && (
              <div className="lt-card overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">In Progress Courses</h2>
                  <p className="text-gray-600 text-sm mt-1">Continue your learning journey</p>
                </div>
                <div className="divide-y divide-gray-200">
                  {recentCourses.map((enrollment) => (
                    <Link
                      key={enrollment.id}
                      to={`/courses/${enrollment.course_id}`}
                      className="block p-6 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-all duration-200 group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                              {enrollment.course.title}
                            </h3>
                            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                          </div>
                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {enrollment.course.description}
                          </p>
                          <div className="flex items-center gap-4">
                            <div className="flex-1 max-w-xs">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-gray-600">Progress</span>
                                <span className="font-semibold text-blue-600">{enrollment.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-blue-600 to-cyan-500 h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${enrollment.progress}%` }}
                                />
                              </div>
                            </div>
                            <span className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-medium text-xs uppercase tracking-wide shadow-sm">
                              In Progress
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {recentUploaded.length > 0 && (
              <div className="lt-card overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">Recent Materials</h2>
                  <p className="text-gray-600 text-sm mt-1">Recently viewed course materials</p>
                </div>
                <div className="divide-y divide-gray-200">
                  {recentUploaded.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="p-6 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="bg-red-100 p-3 rounded-lg">
                            <FileText className="w-6 h-6 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {assignment.course.title}
                            </h3>
                            {assignment.course.description && (
                              <p className="text-gray-600 text-sm mb-3">
                                {assignment.course.description}
                              </p>
                            )}
                            <div className="flex items-center flex-wrap gap-3">
                              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold uppercase">
                                {assignment.course.file_type}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatFileSize(assignment.course.file_size)}
                              </span>
                              <span className="text-xs text-gray-500">
                                Last viewed: {new Date(assignment.viewed_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {assignment.course.file_type === 'zip' && (
                            <button
                              onClick={() => setPreviewCourse(assignment.course)}
                              className="lt-btn-primary"
                            style={{padding:'9px 16px',borderRadius:8}}
                            >
                              <Eye className="w-4 h-4" />
                              Preview
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadFile(assignment.course.file_path, assignment.course.file_name, assignment.course_id)}
                            className="lt-btn-primary"
                            style={{padding:'9px 16px',borderRadius:8}}
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </button>
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

      {previewCourse && previewCourse.file_type === 'zip' && (
        <ScormPlayer
          courseId={previewCourse.id}
          courseTitle={previewCourse.title}
          filePath={previewCourse.file_path}
          fileName={previewCourse.file_name}
          onClose={() => setPreviewCourse(null)}
          onComplete={async () => {
            if (profile) {
              await supabase
                .from('uploaded_course_assignments')
                .update({
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                  progress_percentage: 100
                })
                .eq('user_id', profile.id)
                .eq('course_id', previewCourse.id);

              await tryCompleteUploadedCourse(profile.id, previewCourse.id, previewCourse.title);
              fetchRecentLearning();
            }
            setPreviewCourse(null);
          }}
        />
      )}
    </Layout>
  );
}
