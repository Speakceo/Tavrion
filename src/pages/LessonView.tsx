import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Lesson } from '../types';
import { ScormPlayer } from '../components/ScormPlayer';
import { CourseCompletionCelebration } from '../components/CourseCompletionCelebration';
import { tryCompleteCourse } from '../utils/courseCompletion';

type QuizQuestion = {
  id: string;
  question_text: string;
  options: string[];
  correct_answer: string;
};

export function LessonView() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [startTime] = useState(Date.now());
  const [quizStarted, setQuizStarted] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizMeta, setQuizMeta] = useState<{ id: string; pass_threshold: number } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [completedCourseTitle, setCompletedCourseTitle] = useState<string | null>(null);

  // Setup SCORM API for simple HTML lessons
  useEffect(() => {
    setupScormAPI();
  }, []);

  const setupScormAPI = () => {
    const scormData: Record<string, string> = {
      'cmi.core.lesson_status': 'incomplete',
      'cmi.core.score.raw': '0',
      'cmi.core.session_time': '00:00:00',
      'cmi.core.lesson_location': '',
      'cmi.core.student_id': profile?.id || 'student_001',
      'cmi.core.student_name': profile?.full_name || 'Student',
      'cmi.core.lesson_mode': 'normal',
      'cmi.core.credit': 'credit',
      'cmi.core.entry': 'ab-initio',
    };

    const scormAPI = {
      Initialize: () => { console.log('SCORM: Initialize'); return 'true'; },
      Terminate: () => {
        console.log('SCORM: Terminate');
        const status = scormData['cmi.core.lesson_status'];
        if (status === 'completed' || status === 'passed') {
          markComplete();
        }
        return 'true';
      },
      GetValue: (key: string) => scormData[key] || '',
      SetValue: (key: string, value: string) => {
        console.log('SCORM: SetValue', key, value);
        scormData[key] = value;
        return 'true';
      },
      Commit: () => { console.log('SCORM: Commit'); return 'true'; },
      GetLastError: () => '0',
      GetErrorString: () => '',
      GetDiagnostic: () => '',
      LMSInitialize: () => { console.log('SCORM: LMSInitialize'); return 'true'; },
      LMSFinish: () => {
        console.log('SCORM: LMSFinish');
        const status = scormData['cmi.core.lesson_status'];
        if (status === 'completed' || status === 'passed') {
          markComplete();
        }
        return 'true';
      },
      LMSGetValue: (key: string) => scormData[key] || '',
      LMSSetValue: (key: string, value: string) => {
        console.log('SCORM: LMSSetValue', key, value);
        scormData[key] = value;
        return 'true';
      },
      LMSCommit: () => { console.log('SCORM: LMSCommit'); return 'true'; },
      LMSGetLastError: () => '0',
      LMSGetErrorString: () => '',
      LMSGetDiagnostic: () => '',
    };

    (window as any).API = scormAPI;
    (window as any).API_1484_11 = scormAPI;
  };

  useEffect(() => {
    fetchLesson();
  }, [lessonId]);

  const fetchLesson = async () => {
    if (!lessonId) return;

    try {
      const { data } = await supabase
        .from('lessons')
        .select('*, module:modules(*, course:courses(*))')
        .eq('id', lessonId)
        .single();

      if (data) setLesson(data as any);
    } catch (error) {
      console.error('Error fetching lesson:', error);
    } finally {
      setLoading(false);
    }
  };

  const markComplete = async (options?: { skipNavigate?: boolean }) => {
    if (!lessonId || !profile || !lesson) return;

    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    await supabase.from('lesson_progress').upsert({
      user_id: profile.id,
      lesson_id: lessonId,
      status: 'completed',
      time_spent_seconds: timeSpent,
      completed_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,lesson_id'
    });

    await supabase.from('analytics_events').insert({
      user_id: profile.id,
      event_type: 'lesson_completed',
      event_data: { lesson_id: lessonId, time_spent: timeSpent }
    });

    const courseId = (lesson as any).module?.course?.id;
    const courseTitle = (lesson as any).module?.course?.title;
    if (courseId && courseTitle) {
      const result = await tryCompleteCourse(profile.id, courseId, courseTitle);
      if (result.completed) {
        setCompletedCourseTitle(result.courseTitle);
        return;
      }
    }

    if (!options?.skipNavigate) navigate(-1);
  };

  const handleCelebrationClose = () => {
    setCompletedCourseTitle(null);
    navigate(-1);
  };

  const loadQuiz = async () => {
    if (!lessonId) return;
    setQuizLoading(true);
    try {
      const { data: quiz } = await supabase
        .from('quizzes')
        .select('id, pass_threshold, questions(*)')
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (quiz?.questions?.length) {
        setQuizMeta({ id: quiz.id, pass_threshold: quiz.pass_threshold || 70 });
        setQuizQuestions(quiz.questions.map((q: any) => ({
          id: q.id,
          question_text: q.question_text,
          options: Array.isArray(q.options) ? q.options : [],
          correct_answer: q.correct_answer || '',
        })));
        setQuizStarted(true);
        return;
      }

      const contentQs = (lesson?.content as any)?.questions;
      if (Array.isArray(contentQs) && contentQs.length) {
        setQuizMeta({ id: 'inline', pass_threshold: 70 });
        setQuizQuestions(contentQs.map((q: any, i: number) => ({
          id: `inline-${i}`,
          question_text: q.question || q.question_text,
          options: q.options || [],
          correct_answer: q.correct_answer || q.answer || '',
        })));
        setQuizStarted(true);
        return;
      }

      alert('No quiz questions found for this lesson yet.');
    } finally {
      setQuizLoading(false);
    }
  };

  const submitQuiz = async () => {
    if (!profile || !quizQuestions.length) return;
    const total = quizQuestions.length;
    let correct = 0;
    const answerMap: Record<string, string> = {};

    quizQuestions.forEach((q) => {
      const selected = answers[q.id] || '';
      answerMap[q.id] = selected;
      if (selected && selected === q.correct_answer) correct += 1;
    });

    const score = Math.round((correct / total) * 100);
    const threshold = quizMeta?.pass_threshold || 70;
    const passed = score >= threshold;
    setQuizResult({ score, passed });

    if (quizMeta?.id && quizMeta.id !== 'inline') {
      const { count } = await supabase
        .from('quiz_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('quiz_id', quizMeta.id)
        .eq('user_id', profile.id);

      await supabase.from('quiz_attempts').insert({
        quiz_id: quizMeta.id,
        user_id: profile.id,
        score,
        answers: answerMap,
        passed,
        attempt_number: (count || 0) + 1,
      });
    }

    if (passed) await markComplete({ skipNavigate: true });
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

  if (!lesson) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Lesson not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Course</span>
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-8 border-b border-gray-200">
            <span className="text-sm font-medium text-blue-600 uppercase tracking-wide">
              {lesson.type.replace('_', ' ')}
            </span>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">{lesson.title}</h1>
          </div>

          <div className="p-8">
            {lesson.type === 'text' && (
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: lesson.content.html || '<p>No content available</p>' }} />
              </div>
            )}

            {lesson.type === 'slides' && (
              <div className="space-y-8">
                {lesson.content.slides?.map((slide: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">{slide.title}</h2>
                    <div className="space-y-3">
                      {slide.bullets?.map((bullet: string, idx: number) => (
                        <div key={idx} className="flex items-start space-x-3">
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                          <p className="text-gray-700 flex-1">{bullet}</p>
                        </div>
                      ))}
                    </div>
                    {slide.notes && (
                      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-900 font-medium mb-1">Speaker Notes:</p>
                        <p className="text-sm text-blue-800">{slide.notes}</p>
                      </div>
                    )}
                  </div>
                )) || <p className="text-gray-500">No slides available</p>}
              </div>
            )}

            {lesson.type === 'scorm' && lesson.content?.scorm_url && (
              <>
                {lesson.content.scorm_url.endsWith('.html') || lesson.content.scorm_url.endsWith('.htm') ? (
                  <div className="relative w-full bg-white" style={{ height: 'calc(100vh - 400px)', minHeight: '600px' }}>
                    <iframe
                      src={`/${lesson.content.scorm_url}`}
                      className="w-full h-full border-2 border-gray-200 rounded-lg"
                      style={{ backgroundColor: 'white', display: 'block' }}
                      title="SCORM Content"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                      allow="fullscreen"
                      onLoad={(e) => {
                        console.log('✅ SCORM iframe loaded:', lesson.content.scorm_url);
                        const iframe = e.currentTarget;
                        try {
                          const doc = iframe.contentDocument;
                          if (doc) {
                            console.log('✅ Iframe accessible, body children:', doc.body?.children.length);
                            console.log('📄 Body HTML length:', doc.body?.innerHTML?.length);
                          } else {
                            console.warn('⚠️ Cannot access iframe document');
                          }
                        } catch (err) {
                          console.error('❌ Iframe access error:', err);
                        }
                      }}
                      onError={(e) => {
                        console.error('❌ SCORM iframe error:', e);
                      }}
                    />
                  </div>
                ) : (
                  <ScormPlayer
                    courseId={lesson.module?.course?.id || ''}
                    courseTitle={lesson.title}
                    filePath={lesson.content.scorm_url}
                    subtitle="Interactive course"
                    onClose={() => navigate(-1)}
                    onComplete={() => markComplete()}
                  />
                )}
              </>
            )}

            {lesson.type === 'quiz' && (
              <div className="py-6">
                {!quizStarted ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-6">Test your knowledge from this module</p>
                    <button
                      onClick={loadQuiz}
                      disabled={quizLoading}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                      {quizLoading ? 'Loading…' : 'Start Quiz'}
                    </button>
                  </div>
                ) : quizResult ? (
                  <div className="text-center py-8">
                    <p className={`text-2xl font-bold mb-2 ${quizResult.passed ? 'text-green-600' : 'text-amber-600'}`}>
                      {quizResult.score}% — {quizResult.passed ? 'Passed!' : 'Not passed'}
                    </p>
                    <p className="text-gray-600 mb-4">
                      {quizResult.passed ? 'Lesson marked complete. You can return to the course.' : 'Review the material and try again.'}
                    </p>
                    {quizResult.passed ? (
                      <button onClick={() => (completedCourseTitle ? handleCelebrationClose() : navigate(-1))} className="px-4 py-2 bg-green-600 text-white rounded-lg">
                        Back to Course
                      </button>
                    ) : (
                      <button onClick={() => { setQuizResult(null); setAnswers({}); }} className="px-4 py-2 border border-gray-300 rounded-lg">
                        Retry Quiz
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 max-w-2xl mx-auto">
                    {quizQuestions.map((q, i) => (
                      <div key={q.id} className="border border-gray-200 rounded-lg p-5">
                        <p className="font-semibold text-gray-900 mb-3">{i + 1}. {q.question_text}</p>
                        <div className="space-y-2">
                          {q.options.map((opt) => (
                            <label key={opt} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer">
                              <input
                                type="radio"
                                name={q.id}
                                value={opt}
                                checked={answers[q.id] === opt}
                                onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                              />
                              <span className="text-gray-700">{opt}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={submitQuiz}
                      disabled={Object.keys(answers).length < quizQuestions.length}
                      className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                    >
                      Submit Quiz
                    </button>
                  </div>
                )}
              </div>
            )}

            {lesson.type === 'mock_call' && (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-6">Practice your skills with an AI-powered mock call</p>
                <button
                  onClick={() => navigate('/mock-calls')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                  Start Mock Call
                </button>
              </div>
            )}
          </div>

          <div className="p-8 border-t border-gray-200 flex justify-end">
            {lesson.type !== 'quiz' && (
              <button
                onClick={() => markComplete()}
                className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
              >
                <CheckCircle className="w-5 h-5" />
                <span>Mark as Complete</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {completedCourseTitle && (
        <CourseCompletionCelebration
          courseTitle={completedCourseTitle}
          onClose={handleCelebrationClose}
        />
      )}
    </Layout>
  );
}
