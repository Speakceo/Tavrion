import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { resolvePublicLink, startPublicAttempt } from '../../services/linkService';
import { fetchAssessmentWithSections } from '../../services/assessmentService';
import { TestInterface } from '../../components/TestInterface';
import { PostAssessmentForm, type PostFormField } from '../../components/PostAssessmentForm';
import { savePostFormData } from '../../services/sessionService';
import { supabase } from '../../../../lib/supabase';
import type { ResolvedPublicLink, CandidateInfo, AssessmentQuestion } from '../../types';
import { ClipboardCheck, ArrowRight, Upload, Info } from 'lucide-react';
import { useDocumentTitle } from '../../../../lib/seo';

type Step = 'info' | 'permissions' | 'test' | 'post_form' | 'done';

type ScheduleWindow = { start: string; end: string; label?: string };

const BUCKET = 'assessment-responses';

function generateResumeToken(email: string): string {
  const seed = `${email.trim().toLowerCase()}:${crypto.randomUUID().slice(0, 8)}`;
  try {
    return btoa(seed).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16).toUpperCase();
  } catch {
    return seed.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16).toUpperCase();
  }
}

async function uploadResume(attemptId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'pdf';
  const path = `${attemptId}/resume-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

const pagePad = { padding: '16px clamp(16px, 4vw, 24px)' };

export function CandidateAccess() {
  const { linkCode } = useParams<{ linkCode: string }>();
  const [resolved, setResolved] = useState<ResolvedPublicLink | null>(null);
  const [linkSettings, setLinkSettings] = useState<Record<string, unknown>>({});
  const [postFormFields, setPostFormFields] = useState<PostFormField[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState<Step>('info');
  const [candidate, setCandidate] = useState<CandidateInfo>({ name: '', email: '', phone: '' });
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeToken, setResumeToken] = useState('');
  const [resumeTokenInput, setResumeTokenInput] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [assignmentId, setAssignmentId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);

  const scheduleWindows = (linkSettings.schedule_windows as ScheduleWindow[] | undefined) || [];
  const practiceMode = Boolean(linkSettings.practice_mode);

  useDocumentTitle(resolved?.assessment_title || resolved?.title || 'Assessment');

  useEffect(() => {
    if (!linkCode) return;
    (async () => {
      const link = await resolvePublicLink(linkCode);
      if (!link) {
        setError('This assessment link is invalid or has expired.');
      } else {
        setResolved(link);
        const assessment = await fetchAssessmentWithSections(link.assessment_id);
        const settings = (assessment?.settings || {}) as Record<string, unknown>;
        setLinkSettings(settings);
        const fields = settings.post_form_fields as PostFormField[] | undefined;
        if (fields?.length) setPostFormFields(fields);
      }
      setLoading(false);
    })();
  }, [linkCode]);

  const loadQuestions = async (assessmentId: string) => {
    const assessment = await fetchAssessmentWithSections(assessmentId);
    const qs: AssessmentQuestion[] = [];
    for (const section of assessment?.sections || []) {
      for (const sq of section.assessment_section_questions || []) {
        if (sq.question) qs.push(sq.question);
      }
    }
    if (assessment?.shuffle_questions) qs.sort(() => Math.random() - 0.5);
    setQuestions(qs);
    setTimeLimit(assessment?.time_limit_minutes || null);
  };

  const resumeExistingAttempt = async () => {
    if (!resumeTokenInput.trim()) {
      setError('Enter your resume token to continue.');
      return;
    }
    setError('');
    const { data: attempt } = await supabase
      .from('assessment_attempts')
      .select('id, assignment_id, candidate_name, candidate_email, reusable_link_id')
      .eq('status', 'in_progress')
      .filter('progress->>resume_token', 'eq', resumeTokenInput.trim().toUpperCase())
      .maybeSingle();

    if (!attempt) {
      setError('No in-progress session found for that token.');
      return;
    }
    if (resolved?.link_id && attempt.reusable_link_id !== resolved.link_id) {
      setError('This token does not match this assessment link.');
      return;
    }

    setAttemptId(attempt.id);
    setAssignmentId(attempt.assignment_id);
    setCandidate({
      name: attempt.candidate_name || '',
      email: attempt.candidate_email || '',
    });
    setResumeToken(resumeTokenInput.trim().toUpperCase());
    if (resolved) await loadQuestions(resolved.assessment_id);
    setStep('test');
  };

  const beginTest = async () => {
    if (!resolved || !candidate.name.trim() || !candidate.email.trim()) {
      setError('Name and email are required.');
      return;
    }
    if (scheduleWindows.length && !selectedSlot) {
      setError('Please select a scheduled time slot.');
      return;
    }
    setError('');
    try {
      const token = resumeToken || generateResumeToken(candidate.email);

      let resumeUrl: string | undefined;
      const attempt = await startPublicAttempt(resolved, { ...candidate, resume_url: undefined });
      setAttemptId(attempt.id);
      setAssignmentId(attempt.assignment_id);

      if (resumeFile) {
        resumeUrl = await uploadResume(attempt.id, resumeFile);
      }

      await supabase.from('assessment_attempts').update({
        progress: {
          resume_token: token,
          scheduled_slot: selectedSlot || null,
          practice_mode: practiceMode || undefined,
        },
        candidate_info: { ...candidate, resume_url: resumeUrl },
      }).eq('id', attempt.id);

      await loadQuestions(resolved.assessment_id);
      setStep('test');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not start assessment');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', ...pagePad }}>
        <p style={{ color: '#666' }}>Loading assessment...</p>
      </div>
    );
  }

  if (error && !resolved) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', ...pagePad }}>
        <div className="lt-card" style={{ padding: 32, textAlign: 'center', maxWidth: 400, width: '100%' }}>
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
        practiceMode={practiceMode}
        showPostForm={resolved?.post_form_enabled}
        onComplete={(r) => {
          setStep(r.showPostForm ? 'post_form' : 'done');
        }}
      />
    );
  }

  if (step === 'post_form' && attemptId) {
    return (
      <PostAssessmentForm
        customFields={postFormFields.length ? postFormFields : undefined}
        onSubmit={async (data) => {
          await savePostFormData(attemptId, data);
          setStep('done');
        }}
      />
    );
  }

  if (step === 'done') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', ...pagePad }}>
        <div className="lt-card" style={{ padding: 40, textAlign: 'center', maxWidth: 440, width: '100%' }}>
          <ClipboardCheck size={40} color="#16a34a" style={{ margin: '0 auto 16px' }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Thank you!</h1>
          <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6 }}>
            Your assessment has been submitted. Our team will review your responses and contact you about next steps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', ...pagePad }}>
      <div className="lt-card" style={{ padding: 'clamp(20px, 4vw, 32px)', maxWidth: 480, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, background: '#171717', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ClipboardCheck size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700 }}>{resolved?.assessment_title || 'Skills Assessment'}</h1>
            <p style={{ fontSize: 12, color: '#999' }}>{resolved?.title}</p>
          </div>
        </div>

        {practiceMode && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 12px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
            <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>Practice mode — your responses are for rehearsal only and will not affect hiring decisions.</span>
          </div>
        )}

        {step === 'info' && (
          <>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 20, lineHeight: 1.6 }}>
              Please enter your details to begin. Ensure a stable internet connection and a quiet environment.
            </p>

            {scheduleWindows.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Select your time slot *</label>
                <select
                  className="lt-input"
                  value={selectedSlot}
                  onChange={(e) => setSelectedSlot(e.target.value)}
                >
                  <option value="">Choose a slot...</option>
                  {scheduleWindows.map((w, i) => (
                    <option key={i} value={w.start}>
                      {w.label || `${new Date(w.start).toLocaleString()} – ${new Date(w.end).toLocaleTimeString()}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <input className="lt-input" placeholder="Full name *" value={candidate.name} onChange={(e) => setCandidate({ ...candidate, name: e.target.value })} />
              <input
                className="lt-input"
                placeholder="Email *"
                type="email"
                value={candidate.email}
                onChange={(e) => setCandidate({ ...candidate, email: e.target.value })}
              />
              <input className="lt-input" placeholder="Phone (optional)" value={candidate.phone || ''} onChange={(e) => setCandidate({ ...candidate, phone: e.target.value })} />

              <label style={{ fontSize: 12, fontWeight: 600 }}>
                Resume (optional)
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label className="lt-btn-secondary" style={{ padding: '8px 12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <Upload size={14} />
                    {resumeFile ? resumeFile.name : 'Upload PDF / DOC'}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      style={{ display: 'none' }}
                      onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </label>
            </div>

            <div style={{ borderTop: '1px solid #eee', paddingTop: 16, marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>Already started? Enter your resume token to continue on this device.</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  className="lt-input"
                  placeholder="Resume token"
                  value={resumeTokenInput}
                  onChange={(e) => setResumeTokenInput(e.target.value.toUpperCase())}
                  style={{ flex: 1, minWidth: 140 }}
                />
                <button type="button" onClick={resumeExistingAttempt} className="lt-btn-secondary" style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
                  Resume
                </button>
              </div>
            </div>

            {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button
              onClick={() => {
                if (!candidate.name.trim() || !candidate.email.trim()) {
                  setError('Name and email are required.');
                  return;
                }
                if (scheduleWindows.length && !selectedSlot) {
                  setError('Please select a scheduled time slot.');
                  return;
                }
                setError('');
                setResumeToken(generateResumeToken(candidate.email));
                setStep('permissions');
              }}
              className="lt-btn-primary"
              style={{ width: '100%', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
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
            {resumeToken && (
              <p style={{ fontSize: 12, background: '#f5f5f5', padding: '8px 10px', borderRadius: 6, marginBottom: 12, wordBreak: 'break-all' }}>
                Save this resume token to continue later: <strong>{resumeToken}</strong>
              </p>
            )}
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
