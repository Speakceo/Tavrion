import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Layout } from '../../components/Layout';
import { Plus, Search, CreditCard as Edit, Trash2, Sparkles, Users, FileCheck, ToggleLeft, ToggleRight } from 'lucide-react';
import { Course, UserProfile } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

export function AdminCourses() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState('');
  const [certificateTemplate, setCertificateTemplate] = useState<'classic' | 'modern' | 'executive'>('classic');

  useEffect(() => {
    fetchCourses();
    fetchUsers();
  }, []);

  const fetchCourses = async () => {
    const { data } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setCourses(data);
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (data) setAllUsers(data);
  };

  const deleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? This will also delete all modules, lessons, and enrollments.')) return;

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) {
        console.error('Delete error:', error);
        alert(`Failed to delete course: ${error.message}`);
        return;
      }

      alert('Course deleted successfully!');
      fetchCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Failed to delete course. Please try again.');
    }
  };

  const openAssignModal = (course: Course) => {
    setSelectedCourse(course);
    setShowAssignModal(true);
    setSelectedUsers([]);
    setAssignSuccess('');
  };

  const handleAssignCourse = async () => {
    if (!selectedCourse || selectedUsers.length === 0) return;

    setAssignLoading(true);
    try {
      const enrollments = selectedUsers.map(userId => ({
        user_id: userId,
        course_id: selectedCourse.id,
        status: 'assigned',
        certificate_template: certificateTemplate,
      }));

      const { error } = await supabase
        .from('user_course_enrollments')
        .upsert(enrollments, { onConflict: 'user_id,course_id' });

      if (error) throw error;

      setAssignSuccess(`Course assigned to ${selectedUsers.length} user(s) successfully!`);
      setTimeout(() => {
        setShowAssignModal(false);
        setAssignSuccess('');
      }, 2000);
    } catch (error) {
      console.error('Error assigning course:', error);
      alert('Failed to assign course');
    } finally {
      setAssignLoading(false);
    }
  };


  const viewCompletionReport = (course: Course) => {
    navigate(`/admin/courses/${course.id}/report`);
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(search.toLowerCase()) ||
    course.description?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleCourseStatus = async (course: Course) => {
    const next = course.status === 'published' ? 'draft' : 'published';
    const { error } = await supabase
      .from('courses')
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq('id', course.id);

    if (error) {
      alert(`Failed to update course: ${error.message}`);
      return;
    }

    setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...c, status: next } : c)));
  };

  return (
    <Layout>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#808080', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Admin</p>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#171717', marginBottom: 4 }}>Course Management</h1>
            <p style={{ fontSize: 14, color: '#4d4d4d' }}>Create and manage learning content</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link
              to="/admin/courses/generate"
              className="lt-btn-secondary"
              style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8, textDecoration: 'none' }}
            >
              <Sparkles size={14} /> AI Generate
            </Link>
            <Link
              to="/admin/courses/new"
              className="lt-btn-primary"
              style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8, textDecoration: 'none' }}
            >
              <Plus size={14} /> New Course
            </Link>
          </div>
        </div>

        <div className="lt-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #ebebeb', position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 28, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses..."
              className="lt-input"
              style={{ width: '100%', padding: '8px 12px 8px 32px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="lt-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>Title</th><th>Status</th><th>Target Role</th><th>Mandatory</th><th>Version</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#808080', padding: 40 }}>Loading courses...</td></tr>
                ) : filteredCourses.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#808080', padding: 40 }}>No courses found</td></tr>
                ) : (
                  filteredCourses.map((course) => (
                    <tr key={course.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#171717', fontSize: 13 }}>{course.title}</div>
                        <div style={{ fontSize: 11, color: '#808080', marginTop: 2, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.description}</div>
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => toggleCourseStatus(course)}
                          title={course.status === 'published' ? 'Unpublish (hide from learners)' : 'Publish (show to learners)'}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
                            borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
                            background: course.status === 'published' ? '#ecfdf5' : '#f5f5f5',
                            color: course.status === 'published' ? '#047857' : '#666',
                          }}
                        >
                          {course.status === 'published' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          {course.status === 'published' ? 'Live' : 'Off'}
                        </button>
                      </td>
                      <td style={{ textTransform: 'capitalize' }}>{course.target_role || '-'}</td>
                      <td>{course.is_mandatory ? 'Yes' : 'No'}</td>
                      <td>v{course.version}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Link to={`/admin/courses/${course.id}/edit`} style={{ padding: 6, color: '#4d4d4d', borderRadius: 6, display: 'flex', transition: 'background 0.1s', textDecoration: 'none' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          ><Edit size={14} /></Link>
                          <button onClick={() => openAssignModal(course)} style={{ padding: 6, color: '#4d4d4d', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          ><Users size={14} /></button>
                          <button onClick={() => viewCompletionReport(course)} style={{ padding: 6, color: '#4d4d4d', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          ><FileCheck size={14} /></button>
                          <button onClick={() => deleteCourse(course.id)} style={{ padding: 6, color: '#c0392b', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          ><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showAssignModal && selectedCourse && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
            <div className="lt-card" style={{ maxWidth: 560, width: '100%', maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #ebebeb' }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#171717' }}>Assign Course to Users</h2>
                <p style={{ fontSize: 13, color: '#666666', marginTop: 4 }}>{selectedCourse.title}</p>
              </div>

              <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                {assignSuccess && (
                  <div className="lt-badge lt-badge-success" style={{ display: 'block', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontWeight: 400 }}>
                    {assignSuccess}
                  </div>
                )}
                <p style={{ fontSize: 12, fontWeight: 600, color: '#666666', marginBottom: 6 }}>Certificate layout</p>
                <select
                  value={certificateTemplate}
                  onChange={(e) => setCertificateTemplate(e.target.value as 'classic' | 'modern' | 'executive')}
                  className="lt-input"
                  style={{ width: '100%', padding: '8px 12px', marginBottom: 16, boxSizing: 'border-box' }}
                >
                  <option value="classic">Classic Gold</option>
                  <option value="modern">Modern Blue</option>
                  <option value="executive">Executive Dark</option>
                </select>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#666666', marginBottom: 10 }}>Select Users ({selectedUsers.length} selected)</p>
                <div style={{ maxHeight: 320, overflowY: 'auto', boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px', borderRadius: 8, overflow: 'hidden' }}>
                  {allUsers.map((user, i) => (
                    <label
                      key={user.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer',
                        borderBottom: i < allUsers.length - 1 ? '1px solid #f5f5f5' : 'none',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                    >
                      <input type="checkbox" checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedUsers([...selectedUsers, user.id]);
                          else setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                        }} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#171717' }}>{user.full_name}</div>
                        <div style={{ fontSize: 11, color: '#808080' }}>{user.unique_id} · {user.role}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ padding: '16px 24px', borderTop: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button onClick={() => selectedUsers.length === allUsers.length ? setSelectedUsers([]) : setSelectedUsers(allUsers.map(u => u.id))}
                  style={{ fontSize: 12, color: '#666666', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {selectedUsers.length === allUsers.length ? 'Deselect All' : 'Select All'}
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => { setShowAssignModal(false); setSelectedUsers([]); setAssignSuccess(''); }}
                    className="lt-btn-secondary" style={{ padding: '8px 16px' }}>Cancel</button>
                  <button onClick={handleAssignCourse} disabled={assignLoading || selectedUsers.length === 0}
                    className="lt-btn-primary" style={{ padding: '8px 16px' }}>
                    {assignLoading ? 'Assigning...' : `Assign to ${selectedUsers.length} User(s)`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
