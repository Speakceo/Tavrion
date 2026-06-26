import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Clock, BookOpen, ArrowRight, Eye, Download, FileText } from 'lucide-react';
import { ScormPlayer } from '../components/ScormPlayer';
import { tryCompleteUploadedCourse } from '../utils/courseCompletion';
import { useLearnerCourses } from '../hooks/useLearnerCourses';
import { isInProgressStatus, isPendingStatus, statusLabel } from '../utils/learnerCourses';

export function RecentLearning() {
  const { profile } = useAuth();
  const { builtin, uploaded, loading, refresh } = useLearnerCourses(profile?.id);
  const [previewCourse, setPreviewCourse] = useState<any>(null);

  const pendingBuiltin = useMemo(
    () => builtin.filter((course) => isPendingStatus(course.enrollment.status, 'builtin')),
    [builtin]
  );
  const pendingUploaded = useMemo(
    () => uploaded.filter((assignment) => isPendingStatus(assignment.status, 'uploaded')),
    [uploaded]
  );
  const activeBuiltin = useMemo(
    () => builtin.filter((course) => isInProgressStatus(course.enrollment.status, 'builtin')),
    [builtin]
  );
  const activeUploaded = useMemo(
    () => uploaded.filter((assignment) => isInProgressStatus(assignment.status, 'uploaded')),
    [uploaded]
  );

  const handleDownloadFile = async (filePath: string, fileName: string, courseId: string) => {
    if (!profile) return;

    try {
      const { data, error } = await supabase.storage.from('course-files').download(filePath);
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
        .update({ status: 'downloaded', viewed_at: new Date().toISOString() })
        .eq('user_id', profile.id)
        .eq('course_id', courseId);

      refresh();
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

  const hasActivity =
    pendingBuiltin.length + pendingUploaded.length + activeBuiltin.length + activeUploaded.length > 0;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recent Learning</h1>
          <p className="text-gray-600 mt-1">Pending assignments and courses in progress update live</p>
        </div>

        {!hasActivity ? (
          <div className="lt-card p-12 text-center">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No active learning yet</h3>
            <p className="text-gray-600">New assignments will appear here as soon as they are assigned</p>
          </div>
        ) : (
          <div className="space-y-6">
            {(pendingBuiltin.length > 0 || pendingUploaded.length > 0) && (
              <div className="lt-card overflow-hidden">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-8 py-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">Pending Assignments</h2>
                  <p className="text-gray-600 text-sm mt-1">Courses waiting for you to start</p>
                </div>
                <div className="divide-y divide-gray-200">
                  {pendingBuiltin.map((course) => (
                    <Link
                      key={course.id}
                      to={`/courses/${course.id}`}
                      className="block p-6 hover:bg-amber-50 transition-all group"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-amber-800">{course.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{statusLabel(course.enrollment.status)} · Learning module</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-amber-700" />
                      </div>
                    </Link>
                  ))}
                  {pendingUploaded.map((assignment) => (
                    <Link
                      key={assignment.id}
                      to="/courses"
                      className="block p-6 hover:bg-amber-50 transition-all group"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-amber-800">{assignment.course.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{statusLabel(assignment.status)} · {assignment.course.file_type?.toUpperCase()}</p>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-amber-700" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {(activeBuiltin.length > 0 || activeUploaded.length > 0) && (
              <div className="lt-card overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
                  <h2 className="text-2xl font-bold text-gray-900">In Progress</h2>
                  <p className="text-gray-600 text-sm mt-1">Continue your learning journey</p>
                </div>
                <div className="divide-y divide-gray-200">
                  {activeBuiltin.map((enrollment) => (
                    <Link
                      key={enrollment.enrollment.id}
                      to={`/courses/${enrollment.id}`}
                      className="block p-6 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-700">{enrollment.title}</h3>
                          <p className="text-gray-600 text-sm mt-2 line-clamp-2">{enrollment.description}</p>
                          <div className="flex items-center gap-4 mt-4">
                            <div className="flex-1 max-w-xs">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-gray-600">Progress</span>
                                <span className="font-semibold text-blue-600">{enrollment.enrollment.progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-blue-600 to-cyan-500 h-2 rounded-full"
                                  style={{ width: `${enrollment.enrollment.progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600" />
                      </div>
                    </Link>
                  ))}

                  {activeUploaded.map((assignment) => (
                    <div key={assignment.id} className="p-6 hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="bg-red-100 p-3 rounded-lg">
                            <FileText className="w-6 h-6 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">{assignment.course.title}</h3>
                            <div className="flex items-center flex-wrap gap-3">
                              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold uppercase">
                                {assignment.course.file_type}
                              </span>
                              <span className="text-xs text-gray-500">{formatFileSize(assignment.course.file_size || 0)}</span>
                              {assignment.viewed_at && (
                                <span className="text-xs text-gray-500">
                                  Last viewed: {new Date(assignment.viewed_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {assignment.course.file_type === 'zip' && (
                            <button onClick={() => setPreviewCourse(assignment.course)} className="lt-btn-primary" style={{ padding: '9px 16px', borderRadius: 8 }}>
                              <Eye className="w-4 h-4" />
                              Preview
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadFile(assignment.course.file_path!, assignment.course.file_name!, assignment.course_id)}
                            className="lt-btn-primary"
                            style={{ padding: '9px 16px', borderRadius: 8 }}
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
                  progress_percentage: 100,
                })
                .eq('user_id', profile.id)
                .eq('course_id', previewCourse.id);

              await tryCompleteUploadedCourse(profile.id, previewCourse.id, previewCourse.title);
              refresh();
            }
            setPreviewCourse(null);
          }}
        />
      )}
    </Layout>
  );
}
