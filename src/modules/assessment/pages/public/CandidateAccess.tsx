import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { resolvePublicLink, startPublicAttempt } from '../../services/linkService';
import { fetchAssessmentWithSections } from '../../services/assessmentService';
import { TestInterface } from '../../components/TestInterface';
import { PostAssessmentForm } from '../../components/PostAssessmentForm';
import { savePostFormData } from '../../services/sessionService';
import type { ResolvedPublicLink, CandidateInfo, AssessmentQuestion } from '../../types';
import { ClipboardCheck, ArrowRight } from 'lucide-react';

type Step = 'info' | 'permissions' | 'test' | 'post_form' | 'done';

export function CandidateAccess() {
  const { linkCode } = useParams<{ linkCode: string }>();
  const [resolved, setResolved] = useState<ResolvedPublicLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState<Step>('info');
  const [candidate, setCandidate] = useState<CandidateInfo>({ name: '', email: '', phone: '' });
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const [score, setScore] = useState<{ percentage: number; passed: boolean } | null>(null);

  useEffect(() => {
    if (!linkCode) return;
    (async () => {
      const link = await resolvePublicLink(linkCode);
      if (!link) {
        setError('This assessment link is invalid or has expired.');
      } else {
        setResolved(link);
      }
      setLoading(false);
    })();
  }, [linkCode]);

  const beginTest = async () => {
    if (!resolved || !candidate.name.trim() || !candidate.email.trim()) {
      setError('Name and email are required.');
      return;
    }
    setError('');
    try {
      const attempt = await startPublicAttempt(resolved, candidate);
      setAttemptId(attempt.id);
      setAssignmentId(attempt.assignment_id);

      const assessment = await fetchAssessmentWithSections(resolved.assessment_id);
      const qs: AssessmentQuestion[] = [];
      for (const section of assessment?.sections || []) {
        for (const sq of section.assessment_section_questions || []) {
          if (sq.question) qs.push(sq.question);
        }
      }
      if (assessment?.shuffle_questions) qs.sort(() => Math.random() - 0.5);
      setQuestions(qs);
      setTimeLimit(assessment?.time_limit_minutes || null);
      setStep('test');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not start assessment');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
        <p style={{ color: '#666' }}>Loading assessment...</p>
      </div>
    );
  }

  if (error && !resolved) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', padding: 24 }}>
        <div className="lt-card" style={{ padding: 32, textAlign: 'center', maxWidth: 400 }}>
          <p style={{ color: '#c0392b' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (step === 'test' && attemptId && assignmentId) {
    return (
      <TestInterface
        attemptId={attemptId}
        assignmentId={assignmentId}
        questions={questions}
        title={resolved?.assessment_title || resolved?.title || 'Assessment'}
        timeLimitMinutes={timeLimit}
        showPostForm={resolved?.post_form_enabled}
        onComplete={(r) => {
          setScore({ percentage: r.percentage, passed: r.passed });
          setStep(r.showPostForm ? 'post_form' : 'done');
        }}
      />
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

  if (step === 'done') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', padding: 24 }}>
        <div className="lt-card" style={{ padding: 40, textAlign: 'center', maxWidth: 440 }}>
          <ClipboardCheck size={40} color="#16a34a" style={{ margin: '0 auto 16px' }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Thank you!</h1>
          {score && <p style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>{score.percentage}%</p>}
          <p style={{ fontSize: 14, color: '#666' }}>Your assessment has been submitted. Our team will review your results.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="lt-card" style={{ padding: 32, maxWidth: 480, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, background: '#171717', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ClipboardCheck size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700 }}>{resolved?.assessment_title || 'Skills Assessment'}</h1>
            <p style={{ fontSize: 12, color: '#999' }}>{resolved?.title}</p>
          </div>
        </div>

        {step === 'info' && (
          <>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 20, lineHeight: 1.6 }}>
              Please enter your details to begin. Ensure a stable internet connection and a quiet environment.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <input className="lt-input" placeholder="Full name *" value={candidate.name} onChange={(e) => setCandidate({ ...candidate, name: e.target.value })} />
              <input className="lt-input" placeholder="Email *" type="email" value={candidate.email} onChange={(e) => setCandidate({ ...candidate, email: e.target.value })} />
              <input className="lt-input" placeholder="Phone (optional)" value={candidate.phone || ''} onChange={(e) => setCandidate({ ...candidate, phone: e.target.value })} />
            </div>
            {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button onClick={() => setStep('permissions')} className="lt-btn-primary" style={{ width: '100%', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              Continue <ArrowRight size={16} />
            </button>
          </>
        )}

        {step === 'permissions' && (
          <>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 16, lineHeight: 1.6 }}>
              {resolved?.require_camera || resolved?.require_microphone
                ? 'This assessment may require camera and microphone access for speaking/video questions and integrity monitoring.'
                : 'You may be asked for microphone or camera access for certain question types.'}
            </p>
            <ul style={{ fontSize: 13, color: '#666', marginBottom: 20, paddingLeft: 18, lineHeight: 1.8 }}>
              <li>Do not switch tabs during the test</li>
              <li>Complete within the allotted time</li>
              <li>Your session is monitored for integrity</li>
            </ul>
            {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button onClick={beginTest} className="lt-btn-primary" style={{ width: '100%', padding: '12px 18px' }}>
              Start assessment
            </button>
          </>
        )}
      </div>
    </div>
  );
}
