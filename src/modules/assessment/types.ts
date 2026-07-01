export type QuestionType =
  | 'multiple_choice'
  | 'multiple_select'
  | 'true_false'
  | 'short_answer'
  | 'long_answer'
  | 'coding'
  | 'sql'
  | 'excel'
  | 'file_upload'
  | 'video_response'
  | 'audio_response'
  | 'listening'
  | 'personality'
  | 'cognitive'
  | 'situational_judgment'
  | 'custom';

export type AssessmentStatus = 'draft' | 'published' | 'archived';
export type AttemptStatus = 'in_progress' | 'submitted' | 'graded' | 'expired' | 'void';
export type AssigneeType = 'learner' | 'user' | 'cohort' | 'external';
export type SelectionStatus = 'pending' | 'shortlisted' | 'selected' | 'rejected' | 'on_hold';

export interface AssessmentReusableLink {
  id: string;
  organization_id: string;
  assessment_id: string;
  assignment_id?: string | null;
  link_code: string;
  title: string;
  is_active: boolean;
  uses_count: number;
  max_uses?: number | null;
  expires_at?: string | null;
  require_camera: boolean;
  require_microphone: boolean;
  post_form_enabled: boolean;
  created_at: string;
  assessment?: Assessment;
}

export interface SessionAnalytics {
  id: string;
  attempt_id: string;
  overall_score?: number | null;
  communication_score?: number | null;
  aptitude_score?: number | null;
  integrity_score?: number | null;
  strengths: string[];
  weaknesses: string[];
  recommendation?: string;
  ai_summary?: string;
  detailed_scores: Record<string, unknown>;
}

export interface CandidateInfo {
  name: string;
  email: string;
  phone?: string;
  resume_url?: string;
}

export interface AssessmentQuestion {
  id: string;
  organization_id: string;
  question_type: QuestionType;
  title: string;
  prompt: string;
  skill_id?: string | null;
  difficulty: string;
  weight: number;
  tags: string[];
  explanation?: string;
  time_limit_seconds?: number | null;
  is_required: boolean;
  randomize_options: boolean;
  attachments: unknown[];
  metadata: Record<string, unknown>;
  is_archived: boolean;
  created_at: string;
  options?: AssessmentQuestionOption[];
  test_cases?: AssessmentCodingTestCase[];
}

export interface AssessmentQuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
}

export interface AssessmentCodingTestCase {
  id: string;
  question_id: string;
  label?: string;
  input_data: string;
  expected_output: string;
  is_hidden: boolean;
  weight: number;
  sort_order: number;
}

export interface Assessment {
  id: string;
  organization_id: string;
  folder_id?: string | null;
  title: string;
  description: string;
  status: AssessmentStatus;
  version: number;
  tags: string[];
  instructions: string;
  passing_score: number;
  time_limit_minutes?: number | null;
  shuffle_questions: boolean;
  shuffle_answers: boolean;
  branding: Record<string, unknown>;
  settings: Record<string, unknown>;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  sections?: AssessmentSection[];
}

export interface AssessmentSection {
  id: string;
  assessment_id: string;
  title: string;
  instructions: string;
  sort_order: number;
  time_limit_minutes?: number | null;
  question_pool_size?: number | null;
  weight: number;
  shuffle_questions?: boolean;
  questions?: AssessmentSectionQuestion[];
  assessment_section_questions?: AssessmentSectionQuestion[];
}

export interface AssessmentSectionQuestion {
  id: string;
  section_id: string;
  question_id: string;
  sort_order: number;
  weight_override?: number | null;
  question?: AssessmentQuestion;
}

export interface AssessmentAssignment {
  id: string;
  organization_id: string;
  assessment_id: string;
  title: string;
  assignee_type: AssigneeType;
  due_at?: string | null;
  expires_at?: string | null;
  max_attempts: number;
  time_limit_minutes?: number | null;
  passing_score?: number | null;
  reminder_enabled: boolean;
  access_token?: string | null;
  created_at: string;
  assessment?: Assessment;
}

export interface AssessmentAttempt {
  id: string;
  organization_id: string;
  assignment_id: string;
  user_id?: string | null;
  candidate_email?: string | null;
  candidate_name?: string | null;
  status: AttemptStatus;
  attempt_number: number;
  started_at: string;
  submitted_at?: string | null;
  final_score?: number | null;
  passed?: boolean | null;
  integrity_score?: number | null;
  selection_status?: SelectionStatus;
  reusable_link_id?: string | null;
  candidate_info?: Record<string, unknown>;
  post_form_data?: Record<string, unknown>;
  progress: Record<string, unknown>;
  violation_count?: number;
  assignment?: AssessmentAssignment;
}

export interface AssessmentResponse {
  id: string;
  attempt_id: string;
  question_id: string;
  answer: Record<string, unknown>;
  is_flagged: boolean;
  final_score?: number | null;
}

export interface IntegrityViolation {
  id: string;
  attempt_id: string;
  violation_type: string;
  severity: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
