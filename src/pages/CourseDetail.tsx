import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { BookOpen, PlayCircle, FileText, HelpCircle, Phone, CheckCircle } from 'lucide-react';
import { Course, Module, Lesson, LessonProgress } from '../types';

export function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const { profile } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<(Module & { lessons: (Lesson & { progress?: LessonProgress })[] })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourseData();
  }, [courseId, profile]);

  const fetchCourseData = async () => {
    if (!courseId || !profile) return;

    try {
      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      const { data: modulesData } = await supabase
        .from('modules')
        .select(`
          *,
          lessons(*)
        `)
        .eq('course_id', courseId)
        .order('order_index');

      const { data: progressData } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', profile.id);

      if (courseData) setCourse(courseData);

      if (modulesData) {
        const modulesWithProgress = modulesData.map((module: any) => ({
          ...module,
          lessons: module.lessons.map((lesson: Lesson) => ({
            ...lesson,
            progress: progressData?.find((p: LessonProgress) => p.lesson_id === lesson.id)
          }))
        }));
        setModules(modulesWithProgress);
      }

      await supabase
        .from('user_course_enrollments')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('user_id', profile.id)
        .eq('course_id', courseId)
        .eq('status', 'assigned');

    } catch (error) {
      console.error('Error fetching course data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'text': return FileText;
      case 'slides': return PlayCircle;
      case 'quiz': return HelpCircle;
      case 'mock_call': return Phone;
      default: return FileText;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (!course) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Course not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{course.title}</h1>
              <p className="text-gray-600">{course.description}</p>
            </div>
            {course.is_mandatory && (
              <span className="px-4 py-2 rounded-full bg-red-100 text-red-700 text-sm font-medium">
                MANDATORY
              </span>
            )}
          </div>

          <div className="flex items-center space-x-6 text-sm text-gray-600">
            {course.target_role && (
              <div>
                <span className="font-medium">Target Role:</span> <span className="capitalize">{course.target_role}</span>
              </div>
            )}
            {course.country && (
              <div>
                <span className="font-medium">Country:</span> {course.country}
              </div>
            )}
            <div>
              <span className="font-medium">Version:</span> {course.version}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {modules.map((module, moduleIndex) => (
            <div key={module.id} className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  Module {moduleIndex + 1}: {module.title}
                </h2>
                {module.description && (
                  <p className="text-gray-600 mt-2">{module.description}</p>
                )}
              </div>
              <div className="divide-y divide-gray-200">
                {module.lessons.map((lesson, lessonIndex) => {
                  const Icon = getLessonIcon(lesson.type);
                  const isCompleted = lesson.progress?.status === 'completed';

                  return (
                    <Link
                      key={lesson.id}
                      to={`/lesson/${lesson.id}`}
                      className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-lg ${
                          isCompleted ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Icon className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {lessonIndex + 1}. {lesson.title}
                          </h3>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm text-gray-500 capitalize">{lesson.type.replace('_', ' ')}</span>
                            {lesson.duration_minutes > 0 && (
                              <span className="text-sm text-gray-500">{lesson.duration_minutes} min</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {isCompleted && (
                        <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                          COMPLETED
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {modules.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No modules available yet</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
