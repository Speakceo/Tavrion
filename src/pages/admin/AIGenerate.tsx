import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Layout } from '../../components/Layout';
import { Sparkles, Loader, CheckCircle, Users, FileText } from 'lucide-react';
import { openaiService } from '../../services/openai';
import { applyOrgUserScope, filterByDepartment, uniqueSortedStrings } from '../../utils/orgUsers';
import { getSupabaseAnonKey, getSupabaseUrl } from '../../lib/supabaseEnv';

export function AIGenerate() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    topic: '',
    targetRole: 'sales',
    country: 'UK',
    includeQuiz: true,
    includeMockCall: false,
    contentInput: ''
  });
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [savedCourseId, setSavedCourseId] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [generatingPresentation, setGeneratingPresentation] = useState(false);

  useEffect(() => {
    if (profile) loadUsers();
  }, [profile]);

  const loadUsers = async () => {
    try {
      const { data, error } = await applyOrgUserScope(
        supabase
          .from('user_profiles')
          .select('id, email, full_name, role, department')
          .in('role', ['employee', 'trainer', 'partner'])
          .eq('is_active', true)
          .order('full_name'),
        profile,
      );

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
    }
  };

  const departments = uniqueSortedStrings(users.map((u) => u.department));
  const filteredAssignUsers = filterByDepartment(users, departmentFilter);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);

    try {
      const additionalContext = formData.contentInput
        ? `Based on this content, create a structured course:\n\n${formData.contentInput}`
        : undefined;

      const generatedCourse = await openaiService.generateCourse({
        topic: formData.topic || 'Training Course',
        targetRole: formData.targetRole,
        country: formData.country,
        additionalContext
      });

      if (formData.includeQuiz && generatedCourse.modules) {
        generatedCourse.modules.push({
          title: 'Assessment',
          description: 'Test your knowledge',
          lessons: [
            {
              title: 'Knowledge Check Quiz',
              type: 'quiz',
              content: {
                text: 'Quiz questions will be available after the course content is reviewed.'
              }
            }
          ]
        });
      }

      setGeneratedContent(generatedCourse);
    } catch (error) {
      console.error('Error generating course:', error);
      alert('Failed to generate course. Please check your API key and try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!generatedContent || !profile) return;

    try {
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .insert({
          title: generatedContent.title,
          description: generatedContent.description,
          target_role: formData.targetRole,
          country: formData.country,
          status: 'published',
          created_by: profile.id
        })
        .select()
        .single();

      if (courseError) throw courseError;

      if (course) {
        for (const [moduleIndex, module] of generatedContent.modules.entries()) {
          const { data: moduleData } = await supabase
            .from('modules')
            .insert({
              course_id: course.id,
              title: module.title,
              description: module.description,
              order_index: moduleIndex
            })
            .select()
            .single();

          if (moduleData) {
            for (const [lessonIndex, lesson] of module.lessons.entries()) {
              await supabase.from('lessons').insert({
                module_id: moduleData.id,
                title: lesson.title,
                type: lesson.type || 'text',
                content: lesson.content,
                order_index: lessonIndex,
                duration_minutes: lesson.duration || 15
              });
            }
          }
        }

        await supabase.from('ai_generated_content').insert({
          type: 'course',
          input_params: formData,
          output_data: generatedContent,
          created_by: profile.id
        });

        setSavedCourseId(course.id);
        alert('Course saved successfully! You can now assign users or generate a presentation.');
      }
    } catch (error) {
      console.error('Error saving course:', error);
      alert('Failed to save course: ' + error);
    }
  };

  const handleAssignUsers = async () => {
    if (!savedCourseId || selectedUsers.size === 0) {
      alert('Please select at least one user');
      return;
    }

    try {
      const enrollments = Array.from(selectedUsers).map((userId) => ({
        user_id: userId,
        course_id: savedCourseId,
        status: 'assigned',
      }));

      const { error } = await supabase.from('user_course_enrollments').upsert(enrollments, {
        onConflict: 'user_id,course_id',
      });

      if (error) throw error;

      alert(`Course assigned to ${selectedUsers.size} user(s) successfully!`);
      setShowAssignModal(false);
      setSelectedUsers(new Set());
    } catch (error: any) {
      console.error('Error assigning course:', error);
      alert('Failed to assign course: ' + error.message);
    }
  };

  const handleGeneratePresentation = async () => {
    if (!generatedContent || !profile) {
      alert('Please generate a course first');
      return;
    }

    try {
      setGeneratingPresentation(true);

      let presentationContent = `${generatedContent.title}\n\n${generatedContent.description}\n\n`;
      generatedContent.modules.forEach((module: any) => {
        presentationContent += `\n## ${module.title}\n${module.description}\n`;
        module.lessons.forEach((lesson: any) => {
          const body = typeof lesson.content === 'string' ? lesson.content : lesson.content?.text || lesson.content?.html || '';
          presentationContent += `\n### ${lesson.title}\n${body}\n`;
        });
      });

      const response = await fetch(`${getSupabaseUrl()}/functions/v1/generate-presentation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getSupabaseAnonKey()}`,
        },
        body: JSON.stringify({
          content: presentationContent,
          n_slides: Math.min(generatedContent.modules.length + 2, 12),
          tone: 'professional',
          organizationId: profile?.organization_id || null,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Presentation generation failed');

      const { error } = await supabase.from('presentations').insert({
        user_id: profile.id,
        title: `${generatedContent.title} - Presentation`,
        status: 'completed',
        view_url: result.html ? `data:text/html;base64,${btoa(result.html)}` : null,
        params: { slides: result.slides, presentationId: result.presentationId },
        completed_at: new Date().toISOString(),
      });

      if (error) throw error;

      if (result.html) {
        const win = window.open('', '_blank');
        win?.document.write(result.html);
        win?.document.close();
      }

      alert('Presentation generated successfully!');
    } catch (error: any) {
      console.error('Error generating presentation:', error);
      alert('Failed to generate presentation: ' + error.message);
    } finally {
      setGeneratingPresentation(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Course Generator</h1>
          <p className="text-gray-600">Let AI create a comprehensive course for you</p>
        </div>

        {!generatedContent ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <form onSubmit={handleGenerate} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Topic
                </label>
                <input
                  type="text"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Handling Student Objections, Property Safety Guidelines"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paste Content (Optional)
                </label>
                <textarea
                  value={formData.contentInput}
                  onChange={(e) => setFormData({ ...formData, contentInput: e.target.value })}
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Paste your training content, documentation, or any text here. AI will structure it into modules and lessons..."
                />
                <p className="text-sm text-gray-500 mt-1">
                  Pro tip: Paste existing content and AI will automatically create a structured course with modules and lessons
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Role
                  </label>
                  <select
                    value={formData.targetRole}
                    onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="sales">Sales</option>
                    <option value="operations">Operations</option>
                    <option value="support">Support</option>
                    <option value="management">Management</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="UK">United Kingdom</option>
                    <option value="US">United States</option>
                    <option value="AU">Australia</option>
                    <option value="CA">Canada</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.includeQuiz}
                    onChange={(e) => setFormData({ ...formData, includeQuiz: e.target.checked })}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Include assessment quiz</span>
                </label>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.includeMockCall}
                    onChange={(e) => setFormData({ ...formData, includeMockCall: e.target.checked })}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Include mock call practice</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={generating}
                className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Generating Course...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Generate with AI</span>
                  </>
                )}
              </button>
              <p className="text-center text-sm text-gray-500">
                Powered by AI to create comprehensive training content
              </p>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 flex items-center space-x-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-green-900">Course Generated!</h3>
                <p className="text-green-700">Review the content below and save when ready</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{generatedContent.title}</h2>
              <p className="text-gray-600 mb-6">{generatedContent.description}</p>

              <div className="space-y-6">
                {generatedContent.modules.map((module: any, idx: number) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Module {idx + 1}: {module.title}
                    </h3>
                    <p className="text-gray-600 mb-4">{module.description}</p>
                    <div className="space-y-2">
                      {module.lessons.map((lesson: any, lessonIdx: number) => (
                        <div key={lessonIdx} className="flex items-center space-x-3 text-gray-700">
                          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          <span>{lesson.title} ({lesson.type})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 mt-8">
                {!savedCourseId ? (
                  <div className="flex space-x-4">
                    <button
                      onClick={handleSave}
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                    >
                      Save Course
                    </button>
                    <button
                      onClick={() => setGeneratedContent(null)}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                    >
                      Regenerate
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-green-800 font-medium">Course saved successfully!</p>
                    </div>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => {
                          setDepartmentFilter('');
                          setSelectedUsers(new Set());
                          setShowAssignModal(true);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
                      >
                        <Users className="w-5 h-5" />
                        Assign to Users
                      </button>
                      <button
                        onClick={handleGeneratePresentation}
                        disabled={generatingPresentation}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                      >
                        <FileText className="w-5 h-5" />
                        {generatingPresentation ? 'Generating...' : 'Generate Presentation'}
                      </button>
                    </div>
                    <button
                      onClick={() => navigate('/admin/courses')}
                      className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                    >
                      Go to Courses
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Assign Course to Users</h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2 mb-4">
              {filteredAssignUsers.map((user) => (
                <label key={user.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(user.id)}
                    onChange={(e) => {
                      const updated = new Set(selectedUsers);
                      if (e.target.checked) {
                        updated.add(user.id);
                      } else {
                        updated.delete(user.id);
                      }
                      setSelectedUsers(updated);
                    }}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-medium">{user.full_name || user.email}</div>
                    <div className="text-sm text-gray-500">
                      {user.role}{user.department ? ` · ${user.department}` : ''}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignUsers}
                disabled={selectedUsers.size === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Assign to {selectedUsers.size} user(s)
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
