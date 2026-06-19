import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Lesson } from '../types';
import { ScormPlayer } from '../components/ScormPlayer';

export function LessonView() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [startTime] = useState(Date.now());

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

  const markComplete = async () => {
    if (!lessonId || !profile) return;

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

    navigate(-1);
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
                    fileName={lesson.content.scorm_file_name || 'SCORM Package'}
                    onClose={() => navigate(-1)}
                    onComplete={() => markComplete()}
                  />
                )}
              </>
            )}

            {lesson.type === 'quiz' && (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-6">This lesson contains a quiz</p>
                <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                  Start Quiz
                </button>
              </div>
            )}

            {lesson.type === 'mock_call' && (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-6">Practice your skills with an AI-powered mock call</p>
                <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                  Start Mock Call
                </button>
              </div>
            )}
          </div>

          <div className="p-8 border-t border-gray-200 flex justify-end">
            <button
              onClick={markComplete}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
            >
              <CheckCircle className="w-5 h-5" />
              <span>Mark as Complete</span>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
