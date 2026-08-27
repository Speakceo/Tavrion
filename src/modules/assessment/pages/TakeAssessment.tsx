import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchAssignmentById } from '../services/assignmentService';
import { fetchAssessmentWithSections } from '../services/assessmentService';
import { startAttempt, fetchAttemptResponses } from '../services/attemptService';
import { TestInterface } from '../components/TestInterface';
import { PostAssessmentForm } from '../components/PostAssessmentForm';
import { savePostFormData } from '../services/sessionService';
import { MediaPermissionGate, stopMediaStream, verifyMediaAccess } from '../components/MediaPermissionGate';
import type { AssessmentQuestion } from '../types';
import { useDocumentTitle } from '../../../lib/seo';
import { ClipboardCheck } from 'lucide-react';

type Step = 'permissions' | 'test' | 'post_form' | 'done';

export function TakeAssessment() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const viewer = profile ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id } : null;

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [title, setTitle] = useState('');
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [initialAnswers, setInitialAnswers] = useState<Record<string, Record<string, unknown>>>({});
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('permissions');
  const [result, setResult] = useState<{ percentage: number; passed: boolean } | null>(null);
  const [mediaGranted, setMediaGranted] = useState(false);
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [isPreview, setIsPreview] = useState(false);

  useDocumentTitle(title || 'Assessment');

  useEffect(() => {
    if (!assignmentId || !viewer?.id) return;
    (async () => {
      try {
        const assignment = await fetchAssignmentById(assignmentId, viewer);
        if (!assignment) return;
        setTitle(assignment.title);
        setIsPreview(assignment.title.startsWith('Preview:'));
        const assessment = await fetchAssessmentWithSections(assignment.assessment_id, viewer);
        const qs: AssessmentQuestion[] = [];
        for (const section of assessment?.sections || []) {
          for (const sq of section.assessment_section_questions || []) {
            if (sq.question) qs.push(sq.question);
          }
        }
        setQuestions(qs);
        setTimeLimit(assignment.time_limit_minutes || assessment?.time_limit_minutes || null);
      } finally {
        setLoading(false);
      }
    })();
  }, [assignmentId, profile?.id]);

  const beginTest = async () => {
    if (!assignmentId || !viewer?.id) return;
    if (!isPreview) {
      const check = await verifyMediaAccess({ requireCamera: true, requireMicrophone: true });
      if (!check.ok) {
        setMediaGranted(false);
        setError(check.error);
        return;
      }
      stopMediaStream(check.stream);
      setMediaGranted(true);
    }
    setError('');
    setStarting(true);
    try {
      const att = await startAttempt(
        { ...viewer, id: viewer.id },
        assignmentId,
        { is_preview: isPreview },
      );
      setAttemptId(att.id);
      const existing = await fetchAttemptResponses(att.id);
      const mapped: Record<string, Record<string, unknown>> = {};
      for (const row of existing) {
        mapped[row.question_id] = (row.answer || {}) as Record<string, unknown>;
      }
      setInitialAnswers(mapped);
      stopMediaStream(previewStream);
      setPreviewStream(null);
      setStep('test');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not start assessment');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Loading...</p></div>;
  }

  if (step === 'permissions') {
    return (
      <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div className="lt-card" style={{ padding: 28, maxWidth: 480, width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, background: '#171717', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipboardCheck size={20} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title || 'Assessment'}</h1>
              <p style={{ fontSize: 12, color: '#999', margin: '4px 0 0' }}>Camera & microphone required</p>
            </div>
          </div>
          {!isPreview && (
            <MediaPermissionGate
              onGranted={(stream) => {
                stopMediaStream(previewStream);
                setPreviewStream(stream);
                setMediaGranted(true);
                setError('');
              }}
              onRevoked={() => setMediaGranted(false)}
            />
          )}
          {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button
            type="button"
            className="lt-btn-primary"
            style={{ width: '100%', padding: '12px 18px', opacity: (!isPreview && !mediaGranted) || starting ? 0.55 : 1 }}
            disabled={(!isPreview && !mediaGranted) || starting}
            onClick={() => void beginTest()}
          >
            {starting ? 'Starting…' : 'Start assessment'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'post_form' && attemptId) {
    return (
      <PostAssessmentForm
        onSubmit={async (data) => {
          await savePostFormData(attemptId, data);
          setStep('done');
        }}
      />
    );
  }

  if (step === 'done' && result) {
    navigate(`/test/result/${attemptId}`, { state: result });
    return null;
  }

  if (!attemptId || !assignmentId) return <p>Assessment not available.</p>;

  return (
    <TestInterface
      attemptId={attemptId}
      assignmentId={assignmentId}
      questions={questions}
      title={title}
      timeLimitMinutes={timeLimit}
      showPostForm={false}
      initialAnswers={initialAnswers}
      onComplete={(r) => {
        if (r.showPostForm) {
          setResult({ percentage: r.percentage, passed: r.passed });
          setStep('post_form');
        } else {
          navigate(`/test/result/${r.attemptId}`, { state: { showScore: false } });
        }
      }}
    />
  );
}
