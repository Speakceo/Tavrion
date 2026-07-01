import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchAssignmentById } from '../services/assignmentService';
import { fetchAssessmentWithSections } from '../services/assessmentService';
import { startAttempt, fetchAttemptResponses } from '../services/attemptService';
import { TestInterface } from '../components/TestInterface';
import { PostAssessmentForm } from '../components/PostAssessmentForm';
import { savePostFormData } from '../services/sessionService';
import type { AssessmentQuestion } from '../types';
import { useDocumentTitle } from '../../../lib/seo';

type Step = 'test' | 'post_form' | 'done';

export function TakeAssessment() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const viewer = profile ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id } : null;

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [title, setTitle] = useState('');
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>('test');
  const [result, setResult] = useState<{ percentage: number; passed: boolean } | null>(null);

  useDocumentTitle(title || 'Assessment');

  useEffect(() => {
    if (!assignmentId || !viewer?.id) return;
    (async () => {
      try {
        const assignment = await fetchAssignmentById(assignmentId, viewer);
        if (!assignment) return;
        setTitle(assignment.title);
        const assessment = await fetchAssessmentWithSections(assignment.assessment_id, viewer);
        const qs: AssessmentQuestion[] = [];
        for (const section of assessment?.sections || []) {
          for (const sq of section.assessment_section_questions || []) {
            if (sq.question) qs.push(sq.question);
          }
        }
        setQuestions(qs);
        const att = await startAttempt({ ...viewer, id: viewer.id }, assignmentId);
        setAttemptId(att.id);
        setTimeLimit(assignment.time_limit_minutes || assessment?.time_limit_minutes || null);
        await fetchAttemptResponses(att.id);
      } finally {
        setLoading(false);
      }
    })();
  }, [assignmentId, profile?.id]);

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p>Loading...</p></div>;
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
