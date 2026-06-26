import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Course, Module, Lesson } from '../../types';
import { BookOpen, Plus, Trash2, Save, ArrowLeft, GripVertical, Sparkles, Users } from 'lucide-react';
import { OpenAIService } from '../../services/openai';
import { applyOrgUserScope, filterByDepartment, uniqueSortedStrings } from '../../utils/orgUsers';

interface ModuleFormData extends Omit<Module, 'id' | 'course_id' | 'created_at' | 'updated_at'> {
  id?: string;
  lessons: LessonFormData[];
}

interface LessonFormData extends Omit<Lesson, 'id' | 'module_id' | 'created_at' | 'updated_at'> {
  id?: string;
}

export default function CourseEditor() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiEnhancing, setAiEnhancing] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [departmentFilter, setDepartmentFilter] = useState('');

  const [courseData, setCourseData] = useState<Partial<Course>>({
    title: '',
    description: '',
    category: 'sales',
    difficulty_level: 'beginner',
    estimated_duration: 60,
    status: 'draft',
  });

  const [modules, setModules] = useState<ModuleFormData[]>([]);
  const [contentInput, setContentInput] = useState('');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (courseId) {
      loadCourse();
    }
    if (profile) loadUsers();
  }, [courseId, profile]);

  const loadCourse = async () => {
    try {
      setLoading(true);
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      setCourseData(course);

      const { data: modulesData, error: modulesError } = await supabase
        .from('modules')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index');

      if (modulesError) throw modulesError;

      const modulesWithLessons = await Promise.all(
        modulesData.map(async (module) => {
          const { data: lessons } = await supabase
            .from('lessons')
            .select('*')
            .eq('module_id', module.id)
            .order('order_index');

          return {
            ...module,
            lessons: lessons || [],
          };
        })
      );

      setModules(modulesWithLessons);
    } catch (error: any) {
      console.error('Error loading course:', error);
      alert('Failed to load course: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

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

  const handleAIEnhance = async () => {
    if (!contentInput.trim()) {
      alert('Please paste some content to enhance');
      return;
    }

    try {
      setAiEnhancing(true);
      const openai = new OpenAIService();
      const result = await openai.generateCourse({
        topic: courseData.title || 'Training Course',
        targetRole: 'general',
        country: 'global',
        additionalContext: `Based on this content, create a structured course:\n\n${contentInput}`,
      });

      setCourseData((prev) => ({
        ...prev,
        title: result.title || prev.title,
        description: result.description || prev.description,
      }));

      const enhancedModules: ModuleFormData[] = result.modules.map((module: { title: string; description?: string; lessons: { title: string; type?: string; content?: string; duration_minutes?: number }[] }, idx: number) => ({
        title: module.title,
        description: module.description,
        order_index: idx,
        lessons: module.lessons.map((lesson: { title: string; type?: string; content?: string; duration_minutes?: number }, lessonIdx: number) => ({
          title: lesson.title,
          type: lesson.type || 'text',
          content: lesson.content,
          duration_minutes: lesson.duration_minutes || 15,
          order_index: lessonIdx,
        })),
      }));

      setModules(enhancedModules);
      setContentInput('');
      alert('Content enhanced successfully! Review and save when ready.');
    } catch (error: any) {
      console.error('Error enhancing content:', error);
      alert('Failed to enhance content: ' + error.message);
    } finally {
      setAiEnhancing(false);
    }
  };


  const handleAssignUsers = async () => {
    if (!courseId || selectedUsers.size === 0) {
      alert('Please select at least one user');
      return;
    }

    try {
      const enrollments = Array.from(selectedUsers).map((userId) => ({
        user_id: userId,
        course_id: courseId,
        status: 'assigned',
      }));

      const { error } = await supabase.from('user_course_enrollments').upsert(enrollments);

      if (error) throw error;

      alert(`Course assigned to ${selectedUsers.size} user(s) successfully!`);
      setShowAssignModal(false);
      setSelectedUsers(new Set());
    } catch (error: any) {
      console.error('Error assigning course:', error);
      alert('Failed to assign course: ' + error.message);
    }
  };

  const handleSave = async () => {
    if (!courseData.title || !courseData.description) {
      alert('Please enter course title and description');
      return;
    }

    if (modules.length === 0) {
      alert('Please add at least one module');
      return;
    }

    try {
      setSaving(true);

      let savedCourseId = courseId;

      if (courseId) {
        const { error } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', courseId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('courses')
          .insert(courseData)
          .select()
          .single();
        if (error) throw error;
        savedCourseId = data.id;
      }

      if (courseId) {
        const { error: deleteModulesError } = await supabase
          .from('modules')
          .delete()
          .eq('course_id', courseId);
        if (deleteModulesError) throw deleteModulesError;
      }

      for (const module of modules) {
        const { data: savedModule, error: moduleError } = await supabase
          .from('modules')
          .insert({
            course_id: savedCourseId,
            title: module.title,
            description: module.description,
            order_index: module.order_index,
          })
          .select()
          .single();

        if (moduleError) throw moduleError;

        for (const lesson of module.lessons) {
          const { error: lessonError } = await supabase
            .from('lessons')
            .insert({
              module_id: savedModule.id,
              title: lesson.title,
              type: lesson.type,
              content: lesson.content,
              duration_minutes: lesson.duration_minutes,
              order_index: lesson.order_index,
            });

          if (lessonError) throw lessonError;
        }
      }

      alert('Course saved successfully!');
      navigate('/admin/courses');
    } catch (error: any) {
      console.error('Error saving course:', error);
      alert('Failed to save course: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const addModule = () => {
    setModules([
      ...modules,
      {
        title: '',
        description: '',
        order_index: modules.length,
        lessons: [],
      },
    ]);
  };

  const updateModule = (index: number, field: keyof ModuleFormData, value: any) => {
    const updated = [...modules];
    updated[index] = { ...updated[index], [field]: value };
    setModules(updated);
  };

  const deleteModule = (index: number) => {
    if (confirm('Delete this module and all its lessons?')) {
      setModules(modules.filter((_, i) => i !== index));
    }
  };

  const addLesson = (moduleIndex: number) => {
    const updated = [...modules];
    updated[moduleIndex].lessons.push({
      title: '',
      type: 'text',
      content: '',
      duration_minutes: 15,
      order_index: updated[moduleIndex].lessons.length,
    });
    setModules(updated);
    expandedModules.add(moduleIndex.toString());
    setExpandedModules(new Set(expandedModules));
  };

  const updateLesson = (
    moduleIndex: number,
    lessonIndex: number,
    field: keyof LessonFormData,
    value: any
  ) => {
    const updated = [...modules];
    updated[moduleIndex].lessons[lessonIndex] = {
      ...updated[moduleIndex].lessons[lessonIndex],
      [field]: value,
    };
    setModules(updated);
  };

  const deleteLesson = (moduleIndex: number, lessonIndex: number) => {
    if (confirm('Delete this lesson?')) {
      const updated = [...modules];
      updated[moduleIndex].lessons = updated[moduleIndex].lessons.filter((_, i) => i !== lessonIndex);
      setModules(updated);
    }
  };

  const toggleModule = (index: string) => {
    const updated = new Set(expandedModules);
    if (updated.has(index)) {
      updated.delete(index);
    } else {
      updated.add(index);
    }
    setExpandedModules(updated);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading course...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin/courses')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              {courseId ? 'Edit Course' : 'Create Course'}
            </h1>
          </div>
          <div className="flex gap-3">
            {courseId && (
              <>
                <button
                  onClick={() => {
                    setDepartmentFilter('');
                    setSelectedUsers(new Set());
                    setShowAssignModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Users className="w-5 h-5" />
                  Assign Users
                </button>
              </>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Course'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Course Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={courseData.title}
                onChange={(e) => setCourseData({ ...courseData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter course title"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={courseData.description}
                onChange={(e) => setCourseData({ ...courseData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter course description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={courseData.category}
                onChange={(e) => setCourseData({ ...courseData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="sales">Sales</option>
                <option value="customer_service">Customer Service</option>
                <option value="product">Product</option>
                <option value="compliance">Compliance</option>
                <option value="leadership">Leadership</option>
                <option value="technical">Technical</option>
                <option value="soft_skills">Soft Skills</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                value={courseData.difficulty_level}
                onChange={(e) => setCourseData({ ...courseData, difficulty_level: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={courseData.estimated_duration}
                onChange={(e) =>
                  setCourseData({ ...courseData, estimated_duration: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={courseData.status}
                onChange={(e) => setCourseData({ ...courseData, status: e.target.value as Course['status'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">AI Content Enhancement</h2>
          <p className="text-gray-600 mb-4">
            Paste your content below and let AI create a structured course with modules and lessons
          </p>
          <textarea
            value={contentInput}
            onChange={(e) => setContentInput(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
            placeholder="Paste training content, documentation, or any text you want to convert into a structured course..."
          />
          <button
            onClick={handleAIEnhance}
            disabled={aiEnhancing || !contentInput.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
          >
            <Sparkles className="w-5 h-5" />
            {aiEnhancing ? 'Enhancing...' : 'Enhance with AI'}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Modules & Lessons</h2>
            <button
              onClick={addModule}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5" />
              Add Module
            </button>
          </div>

          {modules.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No modules yet. Add a module or use AI to generate content.</p>
            </div>
          )}

          {modules.map((module, moduleIndex) => (
            <div key={moduleIndex} className="border border-gray-200 rounded-lg mb-4">
              <div className="bg-gray-50 p-4">
                <div className="flex items-start gap-3">
                  <GripVertical className="w-5 h-5 text-gray-400 mt-2 cursor-move" />
                  <div className="flex-1">
                    <input
                      type="text"
                      value={module.title}
                      onChange={(e) => updateModule(moduleIndex, 'title', e.target.value)}
                      placeholder="Module Title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 font-semibold"
                    />
                    <textarea
                      value={module.description}
                      onChange={(e) => updateModule(moduleIndex, 'description', e.target.value)}
                      placeholder="Module Description"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => addLesson(moduleIndex)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="Add Lesson"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => toggleModule(moduleIndex.toString())}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                    >
                      {expandedModules.has(moduleIndex.toString()) ? '▼' : '▶'}
                    </button>
                    <button
                      onClick={() => deleteModule(moduleIndex)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Delete Module"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {expandedModules.has(moduleIndex.toString()) && (
                <div className="p-4 space-y-3">
                  {module.lessons.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-4">
                      No lessons. Click + to add a lesson.
                    </p>
                  )}
                  {module.lessons.map((lesson, lessonIndex) => (
                    <div key={lessonIndex} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="flex gap-3">
                        <GripVertical className="w-4 h-4 text-gray-400 mt-2 cursor-move" />
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={lesson.title}
                            onChange={(e) =>
                              updateLesson(moduleIndex, lessonIndex, 'title', e.target.value)
                            }
                            placeholder="Lesson Title"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <select
                              value={lesson.type}
                              onChange={(e) =>
                                updateLesson(moduleIndex, lessonIndex, 'type', e.target.value)
                              }
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            >
                              <option value="text">Text</option>
                              <option value="video">Video</option>
                              <option value="slides">Slides</option>
                              <option value="quiz">Quiz</option>
                              <option value="mock_call">Mock Call</option>
                            </select>
                            <input
                              type="number"
                              value={lesson.duration_minutes}
                              onChange={(e) =>
                                updateLesson(
                                  moduleIndex,
                                  lessonIndex,
                                  'duration_minutes',
                                  parseInt(e.target.value)
                                )
                              }
                              placeholder="Duration"
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <textarea
                            value={lesson.content}
                            onChange={(e) =>
                              updateLesson(moduleIndex, lessonIndex, 'content', e.target.value)
                            }
                            placeholder={lesson.type === 'quiz' ? 'Quiz content (JSON format: {"questions": [{"question": "...", "options": ["A", "B", "C", "D"], "correct": 0}]})' : 'Lesson Content'}
                            rows={lesson.type === 'quiz' ? 8 : 4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                          />
                          {lesson.type === 'quiz' && (
                            <div className="mt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const sampleQuiz = JSON.stringify({
                                    questions: [
                                      {
                                        question: "Sample question?",
                                        options: ["Option A", "Option B", "Option C", "Option D"],
                                        correct: 0,
                                        explanation: "Explanation for correct answer"
                                      }
                                    ]
                                  }, null, 2);
                                  updateLesson(moduleIndex, lessonIndex, 'content', sampleQuiz);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-700"
                              >
                                Insert Sample Quiz Format
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => deleteLesson(moduleIndex, lessonIndex)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded h-fit"
                          title="Delete Lesson"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
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
    </div>
  );
}
