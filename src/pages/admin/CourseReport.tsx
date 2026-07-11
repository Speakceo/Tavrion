import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Layout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { applyOrgUserScope } from '../../utils/orgUsers';
import { ArrowLeft, Download, CheckCircle, Clock, XCircle, TrendingUp } from 'lucide-react';
import { Course } from '../../types';

interface EnrollmentReport {
  user_id: string;
  user_name: string;
  unique_id: string;
  enrolled_at: string;
  started_at: string | null;
  completed_at: string | null;
  status: string;
  progress_percentage: number;
  total_lessons: number;
  completed_lessons: number;
}

export function CourseReport() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) fetchData();
  }, [courseId, profile]);

  const fetchData = async () => {
    if (!courseId || !profile) return;

    const { data: courseData } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseData) setCourse(courseData);

    const { data: orgUsers } = await applyOrgUserScope(
      supabase.from('user_profiles').select('id'),
      profile,
    );
    const orgUserIds = new Set((orgUsers || []).map((u) => u.id));
    const emptyId = '00000000-0000-0000-0000-000000000000';
    const userIdFilter = orgUserIds.size > 0 ? [...orgUserIds] : [emptyId];

    const { data: modulesData } = await supabase
      .from('modules')
      .select('id')
      .eq('course_id', courseId);

    const moduleIds = modulesData?.map((m) => m.id) ?? [];

    let lessonIds: string[] = [];
    if (moduleIds.length > 0) {
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, module_id')
        .in('module_id', moduleIds);
      lessonIds = lessonsData?.map((l) => l.id) ?? [];
    }

    const totalLessons = lessonIds.length;

    const { data: enrollmentData } = await supabase
      .from('user_course_enrollments')
      .select(`
        user_id,
        enrolled_at,
        started_at,
        completed_at,
        status,
        user_profiles!inner(full_name, unique_id)
      `)
      .eq('course_id', courseId)
      .in('user_id', userIdFilter);

    if (enrollmentData) {
      const reports: EnrollmentReport[] = [];

      for (const enrollment of enrollmentData) {
        if (!orgUserIds.has(enrollment.user_id) && !profile.is_platform_owner) continue;

        let completedCount = 0;
        if (lessonIds.length > 0) {
          const { data: completedLessonsData } = await supabase
            .from('lesson_progress')
            .select('lesson_id')
            .eq('user_id', enrollment.user_id)
            .eq('status', 'completed')
            .in('lesson_id', lessonIds);
          completedCount = completedLessonsData?.length || 0;
        }

        const progressPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

        reports.push({
          user_id: enrollment.user_id,
          user_name: (enrollment.user_profiles as any).full_name,
          unique_id: (enrollment.user_profiles as any).unique_id,
          enrolled_at: enrollment.enrolled_at,
          started_at: enrollment.started_at,
          completed_at: enrollment.completed_at,
          status: enrollment.status,
          progress_percentage: progressPercentage,
          total_lessons: totalLessons,
          completed_lessons: completedCount,
        });
      }

      setEnrollments(reports.sort((a, b) => b.progress_percentage - a.progress_percentage));
    }

    setLoading(false);
  };

  const exportToCSV = () => {
    if (!course || enrollments.length === 0) return;

    const headers = ['User ID', 'Name', 'Status', 'Enrolled Date', 'Started Date', 'Completed Date', 'Progress %', 'Lessons Completed', 'Total Lessons'];
    const rows = enrollments.map(e => [
      e.unique_id,
      e.user_name,
      e.status,
      new Date(e.enrolled_at).toLocaleDateString(),
      e.started_at ? new Date(e.started_at).toLocaleDateString() : 'Not started',
      e.completed_at ? new Date(e.completed_at).toLocaleDateString() : 'Not completed',
      `${e.progress_percentage}%`,
      e.completed_lessons,
      e.total_lessons
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${course.title.replace(/[^a-z0-9]/gi, '_')}_report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const stats = {
    total: enrollments.length,
    completed: enrollments.filter(e => e.status === 'completed').length,
    inProgress: enrollments.filter(e => e.status === 'in_progress').length,
    notStarted: enrollments.filter(e => e.status === 'not_started' || e.status === 'assigned').length,
    averageProgress: enrollments.length > 0
      ? Math.round(enrollments.reduce((sum, e) => sum + e.progress_percentage, 0) / enrollments.length)
      : 0
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/admin/courses')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Courses</span>
          </button>
          {enrollments.length > 0 && (
            <button
              onClick={exportToCSV}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          )}
        </div>

        <div className="bg-gradient-to-br from-cyan-600 via-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-2xl">
          <h1 className="text-3xl font-bold mb-2">Course Completion Report</h1>
          <p className="text-cyan-100 text-lg">{course?.title}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Total Enrolled</span>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Completed</span>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-green-600">{stats.completed}</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">In Progress</span>
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-blue-600">{stats.inProgress}</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Not Started</span>
              <XCircle className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-3xl font-bold text-gray-600">{stats.notStarted}</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">Avg. Progress</span>
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-purple-600">{stats.averageProgress}%</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">User Progress Details</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">User ID</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Progress</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Lessons</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Enrolled</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      Loading report...
                    </td>
                  </tr>
                ) : enrollments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No enrollments found for this course
                    </td>
                  </tr>
                ) : (
                  enrollments.map((enrollment) => (
                    <tr key={enrollment.user_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-mono text-gray-900">{enrollment.unique_id}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-medium">{enrollment.user_name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                          enrollment.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : enrollment.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {enrollment.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                            <div
                              className={`h-2 rounded-full ${
                                enrollment.progress_percentage === 100
                                  ? 'bg-green-600'
                                  : enrollment.progress_percentage > 0
                                  ? 'bg-blue-600'
                                  : 'bg-gray-400'
                              }`}
                              style={{ width: `${enrollment.progress_percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-semibold text-gray-700 min-w-[3rem]">
                            {enrollment.progress_percentage}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {enrollment.completed_lessons} / {enrollment.total_lessons}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(enrollment.enrolled_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {enrollment.completed_at
                          ? new Date(enrollment.completed_at).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
