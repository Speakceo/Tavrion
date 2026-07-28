import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Course, Module, Lesson } from '../../types';
import { BookOpen, Plus, Trash2, Save, ArrowLeft, GripVertical, Sparkles, Users, Package, HelpCircle } from 'lucide-react';
import { OpenAIService } from '../../services/openai';
import { applyOrgUserScope, filterByDepartment, uniqueSortedStrings } from '../../utils/orgUsers';
import { applyOrgScope } from '../../utils/orgScope';
import {
  buildPersistedLesson,
  normalizeLessonForEditor,
} from '../../utils/linkedUploadedCourseLesson';

interface ModuleFormData extends Omit<Module, 'id' | 'course_id' | 'created_at' | 'updated_at'> {
  id?: string;
  lessons: LessonFormData[];
}

interface LessonFormData extends Omit<Lesson, 'id' | 'module_id' | 'created_at' | 'updated_at'> {
  id?: string;
}

type UploadedCourseOption = {
  id: string;
  title: string;
  description?: string;
  file_name: string;
  file_path: string;
  file_type: string;
};

type QuizQuestionForm = {
  question: string;
  options: [string, string, string, string];
  correct_answer: string;
};

type QuizContentForm = {
  pass_threshold: number;
  questions: QuizQuestionForm[];
};

function emptyQuizQuestion(): QuizQuestionForm {
  return { question: '', options: ['', '', '', ''], correct_answer: '' };
}

function emptyQuizContent(passThreshold = 70): QuizContentForm {
  return { pass_threshold: passThreshold, questions: [emptyQuizQuestion()] };
}

function parseQuizContent(rawContent: unknown): QuizContentForm {
  try {
    const parsed = typeof rawContent === 'string'
      ? JSON.parse(rawContent)
      : (rawContent && typeof rawContent === 'object' ? rawContent as Record<string, any> : {});
    const questions = Array.isArray(parsed.questions) && parsed.questions.length
      ? parsed.questions.map((q: any) => {
          const options: [string, string, string, string] = [
            q?.options?.[0] || '',
            q?.options?.[1] || '',
            q?.options?.[2] || '',
            q?.options?.[3] || '',
          ];
          const correct = q?.correct_answer
            || q?.answer
            || (typeof q?.correct === 'number' ? options[q.correct] || '' : '')
            || '';
          return {
            question: q?.question || q?.question_text || '',
            options,
            correct_answer: correct,
          } as QuizQuestionForm;
        })
      : [emptyQuizQuestion()];
    return {
      pass_threshold: Number(parsed.pass_threshold) || 70,
      questions,
    };
  } catch {
    return emptyQuizContent();
  }
}

function buildCourseSavePayload(courseData: Partial<Course>, profileId?: string) {
  return {
    title: courseData.title?.trim() || '',
    description: courseData.description?.trim() || '',
    target_role: courseData.target_role || null,
    country: courseData.country || null,
    is_mandatory: !!courseData.is_mandatory,
    status: courseData.status || 'draft',
    version: courseData.version || 1,
    passing_score: Number((courseData as any).passing_score) || 70,
    requires_quiz_pass: !!(courseData as any).requires_quiz_pass,
    ...(profileId && !courseData.id ? { created_by: profileId } : {}),
  };
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
  const [uploadedCourseOptions, setUploadedCourseOptions] = useState<UploadedCourseOption[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [departmentFilter, setDepartmentFilter] = useState('');

  const [courseData, setCourseData] = useState<Partial<Course> & { passing_score?: number; requires_quiz_pass?: boolean }>({
    title: '',
    description: '',
    target_role: '',
    country: '',
    is_mandatory: false,
    status: 'draft',
    passing_score: 70,
    requires_quiz_pass: true,
  });

  const [modules, setModules] = useState<ModuleFormData[]>([]);
  const [contentInput, setContentInput] = useState('');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (courseId) {
      loadCourse();
    }
    if (profile) {
      loadUsers();
      loadUploadedCourses();
    }
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
            lessons: (lessons || []).map(normalizeLessonForEditor),
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

  const loadUploadedCourses = async () => {
    try {
      let query = supabase
        .from('uploaded_courses')
        .select('id, title, description, file_name, file_path, file_type')
        .order('title');
      query = applyOrgScope(query, profile);
      const { data, error } = await query;
      if (error) throw error;
      setUploadedCourseOptions(data || []);
    } catch (error) {
      console.error('Error loading uploaded courses:', error);
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

  const handleSave = async () => {
    if (!courseData.title?.trim()) {
      alert('Please enter a course title');
      return;
    }

    if (modules.length === 0) {
      alert('Please add at least one module');
      return;
    }

    const hasUntitledModule = modules.some((module) => !module.title?.trim());
    if (hasUntitledModule) {
      alert('Please give every module a title');
      return;
    }

    try {
      setSaving(true);

      const payload = buildCourseSavePayload(courseData, profile?.id);
      let savedCourseId = courseId;

      if (courseId) {
        const { error } = await supabase
          .from('courses')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', courseId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('courses')
          .insert(payload)
          .select('id')
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

      for (const [moduleIndex, module] of modules.entries()) {
        const { data: savedModule, error: moduleError } = await supabase
          .from('modules')
          .insert({
            course_id: savedCourseId,
            title: module.title.trim(),
            description: module.description || '',
            order_index: moduleIndex,
          })
          .select('id')
          .single();

        if (moduleError) throw moduleError;

        for (const [lessonIndex, lesson] of module.lessons.entries()) {
          if (!lesson.title?.trim()) {
            throw new Error(`Lesson ${lessonIndex + 1} in module "${module.title}" needs a title`);
          }
          const { type, content } = buildLessonPayload(lesson);
          const { error: lessonError } = await supabase
            .from('lessons')
            .insert({
              module_id: savedModule.id,
              title: lesson.title.trim(),
              type,
              content,
              duration_minutes: Number(lesson.duration_minutes) || 15,
              order_index: lessonIndex,
            });

          if (lessonError) throw lessonError;
        }
      }

      alert('Course saved successfully!');
      navigate('/admin/courses');
    } catch (error: any) {
      console.error('Error saving course:', error);
      alert('Failed to save course: ' + (error?.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const ensureModuleAndExpand = () => {
    if (modules.length > 0) {
      const index = modules.length - 1;
      setExpandedModules((prev) => new Set(prev).add(String(index)));
      return { modules: [...modules], moduleIndex: index };
    }

    const nextModules: ModuleFormData[] = [
      {
        title: 'Course sequence',
        description: 'Uploaded content and quizzes in order',
        order_index: 0,
        lessons: [],
      },
    ];
    setExpandedModules(new Set(['0']));
    return { modules: nextModules, moduleIndex: 0 };
  };

  const addModule = () => {
    const nextIndex = modules.length;
    setModules([
      ...modules,
      {
        title: '',
        description: '',
        order_index: nextIndex,
        lessons: [],
      },
    ]);
    setExpandedModules((prev) => new Set(prev).add(String(nextIndex)));
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

  const addLesson = (moduleIndex: number, type: LessonFormData['type'] = 'text') => {
    const updated = [...modules];
    const content = type === 'uploaded_course'
      ? {}
      : type === 'quiz'
        ? emptyQuizContent()
        : '';
    updated[moduleIndex].lessons.push({
      title: type === 'uploaded_course'
        ? `Content ${updated[moduleIndex].lessons.filter((l) => l.type === 'uploaded_course').length + 1}`
        : type === 'quiz'
          ? `Quiz ${updated[moduleIndex].lessons.filter((l) => l.type === 'quiz').length + 1}`
          : '',
      type,
      content,
      duration_minutes: type === 'quiz' ? 10 : 30,
      order_index: updated[moduleIndex].lessons.length,
    });
    setModules(updated);
    setExpandedModules((prev) => new Set(prev).add(String(moduleIndex)));
  };

  const addUploadedContentLesson = () => {
    if (uploadedCourseOptions.length === 0) {
      alert('No uploaded courses found. Upload SCORM or files under Uploaded Courses first, then come back here.');
      return;
    }
    const { modules: nextModules, moduleIndex } = ensureModuleAndExpand();
    const content = {};
    nextModules[moduleIndex].lessons.push({
      title: `Day ${nextModules[moduleIndex].lessons.filter((l) => l.type === 'uploaded_course').length + 1}`,
      type: 'uploaded_course',
      content,
      duration_minutes: 30,
      order_index: nextModules[moduleIndex].lessons.length,
    });
    setModules(nextModules);
  };

  const addQuizLessonQuick = () => {
    const { modules: nextModules, moduleIndex } = ensureModuleAndExpand();
    nextModules[moduleIndex].lessons.push({
      title: `Quiz ${nextModules[moduleIndex].lessons.filter((l) => l.type === 'quiz').length + 1}`,
      type: 'quiz',
      content: emptyQuizContent(),
      duration_minutes: 10,
      order_index: nextModules[moduleIndex].lessons.length,
    });
    setModules(nextModules);
  };

  const updateLesson = (
    moduleIndex: number,
    lessonIndex: number,
    field: keyof LessonFormData,
    value: any
  ) => {
    const updated = [...modules];
    const currentLesson = updated[moduleIndex].lessons[lessonIndex];
    const nextContent = field === 'type'
      ? value === 'uploaded_course'
        ? (currentLesson.type === 'uploaded_course' && currentLesson.content && typeof currentLesson.content === 'object'
          ? currentLesson.content
          : {})
        : value === 'quiz'
          ? parseQuizContent(currentLesson.type === 'quiz' ? currentLesson.content : emptyQuizContent())
          : typeof currentLesson.content === 'string'
            ? currentLesson.content
            : ''
      : currentLesson.content;
    updated[moduleIndex].lessons[lessonIndex] = {
      ...currentLesson,
      content: nextContent,
      [field]: value,
    };
    setModules(updated);
  };

  const updateLinkedCourse = (moduleIndex: number, lessonIndex: number, uploadedCourseId: string) => {
    const selectedCourse = uploadedCourseOptions.find((course) => course.id === uploadedCourseId);
    const updated = [...modules];
    updated[moduleIndex].lessons[lessonIndex] = {
      ...updated[moduleIndex].lessons[lessonIndex],
      content: selectedCourse
        ? {
            kind: 'uploaded_course',
            uploaded_course_id: selectedCourse.id,
            title: selectedCourse.title,
            description: selectedCourse.description || '',
            file_name: selectedCourse.file_name,
            file_path: selectedCourse.file_path,
            file_type: selectedCourse.file_type,
          }
        : {},
    };
    setModules(updated);
  };

  const getQuizPassThreshold = (lesson: LessonFormData) => parseQuizContent(lesson.content).pass_threshold;

  const updateQuizContent = (moduleIndex: number, lessonIndex: number, next: QuizContentForm) => {
    const updated = [...modules];
    updated[moduleIndex].lessons[lessonIndex] = {
      ...updated[moduleIndex].lessons[lessonIndex],
      content: next,
    };
    setModules(updated);
  };

  const updateQuizPassThreshold = (moduleIndex: number, lessonIndex: number, passThreshold: number) => {
    const quiz = parseQuizContent(modules[moduleIndex].lessons[lessonIndex].content);
    updateQuizContent(moduleIndex, lessonIndex, { ...quiz, pass_threshold: passThreshold });
  };

  const addQuizQuestion = (moduleIndex: number, lessonIndex: number) => {
    const quiz = parseQuizContent(modules[moduleIndex].lessons[lessonIndex].content);
    updateQuizContent(moduleIndex, lessonIndex, {
      ...quiz,
      questions: [...quiz.questions, emptyQuizQuestion()],
    });
  };

  const updateQuizQuestion = (
    moduleIndex: number,
    lessonIndex: number,
    questionIndex: number,
    patch: Partial<QuizQuestionForm>,
  ) => {
    const quiz = parseQuizContent(modules[moduleIndex].lessons[lessonIndex].content);
    const questions = quiz.questions.map((question, idx) => {
      if (idx !== questionIndex) return question;
      const next = { ...question, ...patch };
      if (patch.options && !patch.options.includes(next.correct_answer)) {
        next.correct_answer = patch.options.find((opt) => opt.trim()) || '';
      }
      return next;
    });
    updateQuizContent(moduleIndex, lessonIndex, { ...quiz, questions });
  };

  const removeQuizQuestion = (moduleIndex: number, lessonIndex: number, questionIndex: number) => {
    const quiz = parseQuizContent(modules[moduleIndex].lessons[lessonIndex].content);
    const questions = quiz.questions.filter((_, idx) => idx !== questionIndex);
    updateQuizContent(moduleIndex, lessonIndex, {
      ...quiz,
      questions: questions.length ? questions : [emptyQuizQuestion()],
    });
  };

  const buildLessonPayload = (lesson: LessonFormData) => {
    if (lesson.type === 'quiz') {
      const parsed = parseQuizContent(lesson.content);
      const questions = parsed.questions
        .map((q) => ({
          question: q.question.trim(),
          options: q.options.map((opt) => opt.trim()).filter(Boolean),
          correct_answer: q.correct_answer.trim(),
        }))
        .filter((q) => q.question && q.options.length >= 2 && q.correct_answer);

      if (questions.length === 0) {
        throw new Error(`Add at least one complete quiz question for "${lesson.title || 'Untitled quiz'}".`);
      }

      for (const question of questions) {
        if (!question.options.includes(question.correct_answer)) {
          throw new Error(`Select a correct option for: "${question.question}"`);
        }
      }

      return {
        type: lesson.type,
        content: {
          pass_threshold: parsed.pass_threshold || 70,
          questions,
        },
      };
    }

    if (lesson.type === 'video') {
      throw new Error('Video is not a supported lesson type. Use Uploaded / SCORM for video files.');
    }

    return buildPersistedLesson(lesson);
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Target role</label>
              <input
                type="text"
                value={courseData.target_role || ''}
                onChange={(e) => setCourseData({ ...courseData, target_role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g. sales, support"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input
                type="text"
                value={courseData.country || ''}
                onChange={(e) => setCourseData({ ...courseData, country: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course passing score (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={courseData.passing_score ?? 70}
                onChange={(e) =>
                  setCourseData({ ...courseData, passing_score: parseInt(e.target.value || '0', 10) })
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
            <div className="col-span-2 flex flex-wrap gap-6">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={!!courseData.is_mandatory}
                  onChange={(e) => setCourseData({ ...courseData, is_mandatory: e.target.checked })}
                />
                Mandatory course
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={!!courseData.requires_quiz_pass}
                  onChange={(e) => setCourseData({ ...courseData, requires_quiz_pass: e.target.checked })}
                />
                Require quiz pass to complete
              </label>
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

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-blue-100">
          <div className="flex items-start gap-3 mb-4">
            <div className="rounded-lg bg-blue-50 p-2">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">Bundle uploaded / SCORM content</h2>
              <p className="text-gray-600 mt-1 text-sm">
                Build one assignable course from items already in Uploaded Courses.
                Example: Day 1 SCORM → quiz → Day 2 SCORM → quiz. {uploadedCourseOptions.length} uploaded item{uploadedCourseOptions.length === 1 ? '' : 's'} available.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={addUploadedContentLesson}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Package className="w-4 h-4" />
              Add uploaded / SCORM lesson
            </button>
            <button
              type="button"
              onClick={addQuizLessonQuick}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <HelpCircle className="w-4 h-4" />
              Add quiz after it
            </button>
          </div>
          {uploadedCourseOptions.length === 0 && (
            <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              No uploaded content yet. Upload SCORM/PDF/video under Admin → Uploaded Courses first.
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Modules & Lessons</h2>
              <p className="text-sm text-gray-500 mt-1">
                Or add lessons manually and set type to <span className="font-medium text-gray-700">Uploaded / SCORM</span>.
              </p>
            </div>
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
              <p>No modules yet. Use the buttons above to bundle SCORM content, or add a module manually.</p>
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
                      onClick={() => addLesson(moduleIndex, 'uploaded_course')}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="Add uploaded / SCORM lesson"
                    >
                      <Package className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => addLesson(moduleIndex, 'text')}
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
                              <option value="uploaded_course">Uploaded / SCORM</option>
                              <option value="quiz">Quiz</option>
                              <option value="text">Text</option>
                              <option value="slides">Slides</option>
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
                          {lesson.type === 'uploaded_course' ? (
                            <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
                              <select
                                value={(lesson.content && typeof lesson.content === 'object' && lesson.content.uploaded_course_id) || ''}
                                onChange={(e) => updateLinkedCourse(moduleIndex, lessonIndex, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              >
                                <option value="">Select uploaded content or SCORM</option>
                                {uploadedCourseOptions.map((course) => (
                                  <option key={course.id} value={course.id}>
                                    {course.title} ({course.file_type.toUpperCase()})
                                  </option>
                                ))}
                              </select>
                              <p className="text-xs text-gray-500">
                                Link an item from Uploaded Courses, including SCORM packages, PDFs, videos, docs, or audio.
                              </p>
                            </div>
                          ) : lesson.type === 'quiz' ? (
                            <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
                              <div className="max-w-xs">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Passing score (%)</label>
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  value={getQuizPassThreshold(lesson)}
                                  onChange={(e) => updateQuizPassThreshold(moduleIndex, lessonIndex, parseInt(e.target.value || '0', 10))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                              </div>

                              {parseQuizContent(lesson.content).questions.map((question, questionIndex) => (
                                <div key={questionIndex} className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-3">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-semibold text-gray-800">Question {questionIndex + 1}</p>
                                    <button
                                      type="button"
                                      onClick={() => removeQuizQuestion(moduleIndex, lessonIndex, questionIndex)}
                                      className="text-xs text-red-600 hover:text-red-700"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    value={question.question}
                                    onChange={(e) => updateQuizQuestion(moduleIndex, lessonIndex, questionIndex, { question: e.target.value })}
                                    placeholder="Enter the question"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  />
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {question.options.map((option, optionIndex) => (
                                      <div key={optionIndex} className="flex items-center gap-2">
                                        <span className="text-xs font-semibold text-gray-500 w-5">{String.fromCharCode(65 + optionIndex)}</span>
                                        <input
                                          type="text"
                                          value={option}
                                          onChange={(e) => {
                                            const options = [...question.options] as QuizQuestionForm['options'];
                                            options[optionIndex] = e.target.value;
                                            updateQuizQuestion(moduleIndex, lessonIndex, questionIndex, { options });
                                          }}
                                          placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Correct option</label>
                                    <select
                                      value={question.correct_answer}
                                      onChange={(e) => updateQuizQuestion(moduleIndex, lessonIndex, questionIndex, { correct_answer: e.target.value })}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    >
                                      <option value="">Select correct answer</option>
                                      {question.options.filter((opt) => opt.trim()).map((opt) => (
                                        <option key={opt} value={opt}>{opt}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              ))}

                              <button
                                type="button"
                                onClick={() => addQuizQuestion(moduleIndex, lessonIndex)}
                                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                              >
                                <Plus className="w-4 h-4" />
                                Add question
                              </button>
                            </div>
                          ) : (
                            <textarea
                              value={typeof lesson.content === 'string' ? lesson.content : JSON.stringify(lesson.content ?? {}, null, 2)}
                              onChange={(e) =>
                                updateLesson(moduleIndex, lessonIndex, 'content', e.target.value)
                              }
                              placeholder="Lesson Content"
                              rows={4}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
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
