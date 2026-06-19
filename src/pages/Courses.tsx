import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { ScormPlayer } from '../components/ScormPlayer';
import { BookOpen, Clock, Award, FileText, Download, Eye } from 'lucide-react';
import { Course, UserCourseEnrollment } from '../types';

interface UploadedCourseAssignment {
  id: string;
  course_id: string;
  status: string;
  viewed_at: string | null;
  completed_at: string | null;
  created_at: string;
  course: {
    id: string;
    title: string;
    description: string;
    file_name: string;
    file_path: string;
    file_type: string;
    file_size: number;
    category: string;
    created_at: string;
  };
}

export function Courses() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<(Course & { enrollment?: UserCourseEnrollment })[]>([]);
  const [uploadedCourses, setUploadedCourses] = useState<UploadedCourseAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'assigned' | 'in_progress' | 'completed'>('all');
  const [viewingCourse, setViewingCourse] = useState<any>(null);

  useEffect(() => {
    fetchCourses();
  }, [profile]);

  const fetchCourses = async () => {
    if (!profile) return;

    try {
      const { data: enrollmentsData } = await supabase
        .from('user_course_enrollments')
        .select(`
          *,
          course:courses(*)
        `)
        .eq('user_id', profile.id);

      if (enrollmentsData) {
        const coursesWithEnrollment = enrollmentsData.map((e: any) => ({
          ...e.course,
          enrollment: e
        }));
        setCourses(coursesWithEnrollment);
      }

      const { data: uploadedAssignments } = await supabase
        .from('uploaded_course_assignments')
        .select(`
          *,
          course:uploaded_courses(*)
        `)
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (uploadedAssignments) {
        setUploadedCourses(uploadedAssignments as any);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(course => {
    if (filter === 'all') return true;
    return course.enrollment?.status === filter;
  });

  const filteredUploadedCourses = uploadedCourses.filter(assignment => {
    if (filter === 'all') return true;
    if (filter === 'assigned') return assignment.status === 'assigned';
    if (filter === 'in_progress') return assignment.status === 'viewed' || assignment.status === 'downloaded';
    if (filter === 'completed') return assignment.status === 'completed';
    return false;
  });

  const handleDownloadCourse = async (assignment: UploadedCourseAssignment) => {
    try {
      const { data, error } = await supabase.storage
        .from('course-files')
        .download(assignment.course.file_path);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = assignment.course.file_name;
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
        .eq('id', assignment.id);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      alert('Failed to download file: ' + error.message);
    }
  };

  const handleViewCourse = async (assignment: UploadedCourseAssignment) => {
    console.log('📂 [Courses] Opening SCORM viewer with assignment:', {
      id: assignment.id,
      courseId: assignment.course.id,
      title: assignment.course.title,
      filePath: assignment.course.file_path,
      fileName: assignment.course.file_name,
      fileType: assignment.course.file_type
    });
    setViewingCourse(assignment);

    if (assignment.status === 'assigned') {
      await supabase
        .from('uploaded_course_assignments')
        .update({
          status: 'viewed',
          viewed_at: new Date().toISOString()
        })
        .eq('id', assignment.id);
    }
  };

  const handleCourseComplete = async (assignmentId: string) => {
    await supabase
      .from('uploaded_course_assignments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', assignmentId);

    fetchCourses();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getFileIcon = (type: string) => {
    return <FileText className="w-16 h-16 text-blue-600 opacity-80" />;
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
          <div className="lt-spinner" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#808080', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Learning</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#171717', marginBottom: 4 }}>My Courses</h1>
          <p style={{ fontSize: 14, color: '#4d4d4d' }}>Explore and continue your learning journey</p>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {[
            { value: 'all', label: 'All Courses' },
            { value: 'assigned', label: 'Assigned' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as any)}
              style={{
                padding: '7px 14px', borderRadius: 7, border: 'none',
                fontWeight: filter === tab.value ? 600 : 500, fontSize: 13, cursor: 'pointer',
                background: filter === tab.value ? '#171717' : '#ffffff',
                color: filter === tab.value ? '#ffffff' : '#4d4d4d',
                boxShadow: filter === tab.value ? 'none' : 'rgba(0,0,0,0.08) 0px 0px 0px 1px',
                transition: 'all 0.12s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filteredUploadedCourses.length > 0 && (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#171717', marginBottom: 16, marginTop: 24 }}>Uploaded Courses</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {filteredUploadedCourses.map((assignment) => (
                <div
                  key={assignment.id}
                  className="lt-card"
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ height: 140, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #ebebeb' }}>
                    <FileText size={40} color="#bbb" />
                  </div>
                  <div style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#171717', flex: 1 }}>{assignment.course.title}</h3>
                      <span className="lt-badge" style={{ marginLeft: 8, flexShrink: 0 }}>{assignment.course.file_type?.toUpperCase()}</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#666666', marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{assignment.course.description}</p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <span className={`lt-badge ${assignment.status === 'completed' ? 'lt-badge-success' : assignment.status === 'viewed' || assignment.status === 'downloaded' ? 'lt-badge-blue' : ''}`}>
                        {assignment.status.toUpperCase()}
                      </span>
                      <span style={{ fontSize: 11, color: '#808080' }}>{formatFileSize(assignment.course.file_size)}</span>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      {(assignment.course.file_type === 'pdf' || assignment.course.file_type === 'zip' || assignment.course.file_type === 'scorm') ? (
                        <button
                          onClick={() => handleViewCourse(assignment)}
                          className="lt-btn-primary"
                          style={{ flex: 1, padding: '9px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 8 }}
                        >
                          <Eye size={13} /> View Course
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDownloadCourse(assignment)}
                          className="lt-btn-primary"
                          style={{ flex: 1, padding: '9px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 8 }}
                        >
                          <Download size={13} /> Download
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {filteredCourses.length > 0 && (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#171717', marginBottom: 16, marginTop: 24 }}>Learning Modules</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <Link
                  key={course.id}
                  to={`/courses/${course.id}`}
                  className="lt-card"
                  style={{ overflow: 'hidden', textDecoration: 'none', display: 'block', transition: 'box-shadow 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = 'rgba(0,0,0,0.12) 0px 0px 0px 1px, rgba(0,0,0,0.08) 0px 4px 8px')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 4px, rgba(0,0,0,0.03) 0px 8px 16px -8px')}
                >
                  <div style={{ height: 120, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #ebebeb' }}>
                    <BookOpen size={32} color="#bbb" />
                  </div>
                  <div style={{ padding: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: '#171717', marginBottom: 6 }}>{course.title}</h3>
                    <p style={{ fontSize: 12, color: '#666666', marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{course.description}</p>

                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {course.is_mandatory && <span className="lt-badge lt-badge-error">MANDATORY</span>}
                      {course.enrollment && (
                        <span className={`lt-badge ${course.enrollment.status === 'completed' ? 'lt-badge-success' : course.enrollment.status === 'in_progress' ? 'lt-badge-blue' : ''}`}>
                          {course.enrollment.status.replace('_', ' ').toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#808080' }}>
                      {course.target_role && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Award size={11} />{course.target_role}</span>}
                      {course.country && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={11} />{course.country}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {filteredCourses.length === 0 && filteredUploadedCourses.length === 0 && (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: '#808080', fontSize: 14 }}>
            No courses found for this filter
          </div>
        )}

        {viewingCourse && (viewingCourse.course.file_type === 'zip' || viewingCourse.course.file_type === 'scorm') && (
          <>
            {console.log('🎯 [Courses] Rendering ScormPlayer component')}
            <ScormPlayer
              courseId={viewingCourse.course.id}
              courseTitle={viewingCourse.course.title}
              filePath={viewingCourse.course.file_path}
              fileName={viewingCourse.course.file_name}
              onClose={() => {
                console.log('❌ [Courses] Closing SCORM viewer');
                setViewingCourse(null);
              }}
              onComplete={() => {
                console.log('✅ [Courses] SCORM course completed');
                handleCourseComplete(viewingCourse.id);
              }}
            />
          </>
        )}

        {viewingCourse && viewingCourse.course.file_type === 'pdf' && (
          <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full h-full max-w-7xl max-h-[95vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b bg-gray-50">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{viewingCourse.course.title}</h2>
                  <p className="text-sm text-gray-600">{viewingCourse.course.file_name}</p>
                </div>
                <button
                  onClick={() => setViewingCourse(null)}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
                >
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <iframe
                  src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/course-files/${viewingCourse.course.file_path}`}
                  className="w-full h-full"
                  title="Course Content"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
