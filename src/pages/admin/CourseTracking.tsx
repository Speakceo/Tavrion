import { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { applyOrgUserScope } from '../../utils/orgUsers';
import { Filter, Search, Download, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface TeamMember {
  user_id: string;
  user: {
    full_name: string;
    email: string;
    department?: string;
  };
}

interface Team {
  id: string;
  name: string;
  team_members: TeamMember[];
}

interface Course {
  id: string;
  title: string;
}

interface EnrollmentTracking {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  started_at?: string;
  completed_at?: string;
  status: string;
  progress_percentage: number;
  user: {
    full_name: string;
    email: string;
    department?: string;
  };
  course: {
    title: string;
  };
  team_name?: string;
}

export function CourseTracking() {
  const { profile } = useAuth();
  const [enrollments, setEnrollments] = useState<EnrollmentTracking[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (profile) loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      const { data: orgUsers } = await applyOrgUserScope(
        supabase.from('user_profiles').select('id'),
        profile,
      );
      const orgUserIds = new Set((orgUsers || []).map((u) => u.id));
      const emptyId = '00000000-0000-0000-0000-000000000000';
      const userIdFilter = orgUserIds.size > 0 ? [...orgUserIds] : [emptyId];

      let teamsQuery = supabase
        .from('teams')
        .select('id, name, team_members(user_id, user:user_profiles(full_name, email, department))');

      if (profile.organization_id && !profile.is_platform_owner) {
        teamsQuery = teamsQuery.in('created_by', userIdFilter);
      }

      let enrollmentsQuery = supabase
        .from('user_course_enrollments')
        .select('*')
        .order('enrolled_at', { ascending: false });

      let uploadedAssignmentsQuery = supabase
        .from('uploaded_course_assignments')
        .select('*')
        .order('created_at', { ascending: false });

      if (profile.organization_id && !profile.is_platform_owner) {
        enrollmentsQuery = enrollmentsQuery.in('user_id', userIdFilter);
        uploadedAssignmentsQuery = uploadedAssignmentsQuery.in('user_id', userIdFilter);
      }

      const [teamsRes, coursesRes, uploadedCoursesRes, enrollmentsRes, uploadedAssignmentsRes] = await Promise.all([
        teamsQuery,
        supabase.from('courses').select('id, title').eq('status', 'published').order('title'),
        supabase.from('uploaded_courses').select('id, title').order('title'),
        enrollmentsQuery,
        uploadedAssignmentsQuery,
      ]);

      if (teamsRes.error) throw teamsRes.error;
      if (coursesRes.error) throw coursesRes.error;
      if (uploadedCoursesRes.error) throw uploadedCoursesRes.error;
      if (enrollmentsRes.error) throw enrollmentsRes.error;
      if (uploadedAssignmentsRes.error) throw uploadedAssignmentsRes.error;

      setTeams((teamsRes.data || []) as unknown as Team[]);

      const allCourses = [
        ...(coursesRes.data || []),
        ...(uploadedCoursesRes.data || [])
      ];
      setCourses(allCourses);

      const scopedEnrollments = (enrollmentsRes.data || []).filter((e) => orgUserIds.has(e.user_id));
      const scopedAssignments = (uploadedAssignmentsRes.data || []).filter((a) => orgUserIds.has(a.user_id));

      const regularEnrollments = await Promise.all(
        scopedEnrollments.map(async (enrollment) => {
          const [userRes, courseRes, lessonsRes, progressRes] = await Promise.all([
            supabase.from('user_profiles').select('full_name, email, department').eq('id', enrollment.user_id).maybeSingle(),
            supabase.from('courses').select('title').eq('id', enrollment.course_id).maybeSingle(),
            supabase
              .from('lessons')
              .select('id')
              .in(
                'module_id',
                (
                  await supabase.from('modules').select('id').eq('course_id', enrollment.course_id)
                ).data?.map((m) => m.id) || []
              ),
            supabase.from('lesson_progress').select('*').eq('user_id', enrollment.user_id),
          ]);

          const totalLessons = lessonsRes.data?.length || 0;
          const completedLessons =
            progressRes.data?.filter((p) => p.status === 'completed' && lessonsRes.data?.some((l) => l.id === p.lesson_id))
              .length || 0;
          const progressPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

          const userTeam = (teamsRes.data || []).find((team) =>
            team.team_members?.some((member) => member.user_id === enrollment.user_id)
          );

          return {
            id: enrollment.id,
            user_id: enrollment.user_id,
            course_id: enrollment.course_id,
            enrolled_at: enrollment.enrolled_at,
            started_at: enrollment.started_at,
            completed_at: enrollment.completed_at,
            status: enrollment.status,
            user: userRes.data || { full_name: 'Unknown', email: '', department: '' },
            course: courseRes.data || { title: 'Unknown Course' },
            progress_percentage: progressPercentage,
            team_name: userTeam?.name,
          };
        })
      );

      const uploadedEnrollments = await Promise.all(
        scopedAssignments.map(async (assignment) => {
          const [userRes, courseRes] = await Promise.all([
            supabase.from('user_profiles').select('full_name, email, department').eq('id', assignment.user_id).maybeSingle(),
            supabase.from('uploaded_courses').select('title').eq('id', assignment.course_id).maybeSingle(),
          ]);

          const userTeam = (teamsRes.data || []).find((team) =>
            team.team_members?.some((member) => member.user_id === assignment.user_id)
          );

          return {
            id: assignment.id,
            user_id: assignment.user_id,
            course_id: assignment.course_id,
            enrolled_at: assignment.created_at,
            started_at: assignment.viewed_at,
            completed_at: assignment.completed_at,
            status: assignment.status,
            user: userRes.data || { full_name: 'Unknown', email: '', department: '' },
            course: courseRes.data || { title: 'Unknown Course' },
            progress_percentage: assignment.progress_percentage || 0,
            team_name: userTeam?.name,
          };
        })
      );

      setEnrollments([...regularEnrollments, ...uploadedEnrollments]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEnrollments = enrollments.filter((enrollment) => {
    if (selectedTeam !== 'all') {
      const userInTeam = teams
        .find((t) => t.id === selectedTeam)
        ?.team_members?.some((m) => m.user_id === enrollment.user_id);
      if (!userInTeam) return false;
    }

    if (selectedCourse !== 'all' && enrollment.course_id !== selectedCourse) return false;

    if (selectedStatus !== 'all' && enrollment.status !== selectedStatus) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        enrollment.user.full_name.toLowerCase().includes(query) ||
        enrollment.user.email.toLowerCase().includes(query) ||
        enrollment.course.title.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      not_started: 'bg-gray-100 text-gray-800',
      assigned: 'bg-yellow-100 text-yellow-800',
    };
    return styles[status as keyof typeof styles] || styles.assigned;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const stats = {
    total: filteredEnrollments.length,
    completed: filteredEnrollments.filter((e) => e.status === 'completed').length,
    inProgress: filteredEnrollments.filter((e) => e.status === 'in_progress').length,
    notStarted: filteredEnrollments.filter((e) => e.status === 'not_started' || e.status === 'assigned').length,
  };

  const exportToCSV = () => {
    const headers = ['User Name', 'Email', 'Department', 'Team', 'Course', 'Status', 'Progress %', 'Enrolled At', 'Started At', 'Completed At'];
    const rows = filteredEnrollments.map((e) => [
      e.user.full_name,
      e.user.email,
      e.user.department || 'N/A',
      e.team_name || 'N/A',
      e.course.title,
      e.status,
      e.progress_percentage,
      new Date(e.enrolled_at).toLocaleDateString(),
      e.started_at ? new Date(e.started_at).toLocaleDateString() : 'N/A',
      e.completed_at ? new Date(e.completed_at).toLocaleDateString() : 'N/A',
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `course-tracking-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Course Completion Tracking</h1>
            <p className="text-gray-600 mt-1">Monitor learner progress and course completion</p>
          </div>
          <button
            onClick={exportToCSV}
            className="lt-btn-primary"
            style={{padding:'9px 16px',borderRadius:8}}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="lt-card p-6">
            <div className="flex items-center gap-3">
              <div style={{padding:12,backgroundColor:'#dbeafe',borderRadius:8}}>
                <Filter className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Enrollments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="lt-card p-6">
            <div className="flex items-center gap-3">
              <div style={{padding:12,backgroundColor:'#dcfce7',borderRadius:8}}>
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
              </div>
            </div>
          </div>

          <div className="lt-card p-6">
            <div className="flex items-center gap-3">
              <div style={{padding:12,backgroundColor:'#dbeafe',borderRadius:8}}>
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
              </div>
            </div>
          </div>

          <div className="lt-card p-6">
            <div className="flex items-center gap-3">
              <div style={{padding:12,backgroundColor:'#f3f4f6',borderRadius:8}}>
                <AlertCircle className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Not Started</p>
                <p className="text-2xl font-bold text-gray-900">{stats.notStarted}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="lt-card p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by user name, email, or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Teams</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>

            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Courses</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
              <option value="not_started">Not Started</option>
              <option value="assigned">Assigned</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="lt-spinner" />
              <p className="mt-4 text-gray-600">Loading tracking data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="lt-table w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">User</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Team</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Course</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Progress</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Enrolled</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Started</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEnrollments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-gray-500">
                        No enrollments found matching your filters
                      </td>
                    </tr>
                  ) : (
                    filteredEnrollments.map((enrollment) => (
                      <tr key={enrollment.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{enrollment.user.full_name}</p>
                            <p className="text-sm text-gray-500">{enrollment.user.email}</p>
                            {enrollment.user.department && (
                              <p className="text-xs text-gray-400">{enrollment.user.department}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-700">{enrollment.team_name || 'N/A'}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm font-medium text-gray-900">{enrollment.course.title}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(
                              enrollment.status
                            )}`}
                          >
                            {getStatusIcon(enrollment.status)}
                            {enrollment.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-[100px]">
                              <div
                                className="h-full bg-blue-600 rounded-full"
                                style={{ width: `${enrollment.progress_percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-700">{enrollment.progress_percentage}%</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600">
                            {new Date(enrollment.enrolled_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600">
                            {enrollment.started_at ? new Date(enrollment.started_at).toLocaleDateString() : '-'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600">
                            {enrollment.completed_at ? new Date(enrollment.completed_at).toLocaleDateString() : '-'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
