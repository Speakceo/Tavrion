export type UserRole = 'super_admin' | 'admin' | 'trainer' | 'employee' | 'partner';

export type CourseStatus = 'draft' | 'published' | 'archived';

export type LessonType = 'text' | 'slides' | 'quiz' | 'mock_call' | 'scorm';

export type QuestionType = 'mcq' | 'subjective' | 'scenario';

export type ProgressStatus = 'assigned' | 'not_started' | 'in_progress' | 'completed';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  features: Record<string, boolean>;
  settings: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  unique_id: string;
  role: UserRole;
  full_name: string;
  email: string;
  department?: string;
  country?: string;
  is_active: boolean;
  organization_id?: string;
  password?: string | null;
  is_platform_owner?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  target_role?: string;
  country?: string;
  category?: string;
  difficulty_level?: string;
  estimated_duration?: number;
  is_mandatory: boolean;
  version: number;
  status: CourseStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: string;
  course_id: string;
  title: string;
  description?: string;
  order_index: number;
  created_at: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  type: LessonType;
  content: any;
  duration_minutes: number;
  order_index: number;
  created_at: string;
  module?: {
    course?: { id: string };
  };
}

export interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  pass_threshold: number;
  max_attempts: number;
  created_at: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  type: QuestionType;
  options: any[];
  correct_answer: string;
  explanation?: string;
  points: number;
  order_index: number;
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  answers: any;
  passed: boolean;
  attempt_number: number;
  completed_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  course_id?: string;
  message: string;
  role: 'user' | 'assistant';
  context: any;
  created_at: string;
}

export interface MockCallSession {
  id: string;
  user_id: string;
  scenario_type: string;
  scenario_details: any;
  transcript: any[];
  score?: number;
  feedback: any;
  completed_at: string;
}

export interface UserCourseEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  started_at?: string;
  completed_at?: string;
  status: ProgressStatus;
  progress?: number;
  score?: number;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  status: ProgressStatus;
  time_spent_seconds: number;
  last_accessed_at: string;
  completed_at?: string;
}

export interface AnalyticsEvent {
  id: string;
  user_id: string;
  event_type: string;
  event_data: any;
  created_at: string;
}

export interface Certificate {
  id: string;
  user_id: string;
  course_id: string;
  issued_at: string;
  certificate_url?: string;
  certificate_number?: string;
  expiry_date?: string;
  course_title?: string;
  user_name?: string;
}

export type RecurrenceInterval = 'none' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';

export interface CourseAssignmentRule {
  id: string;
  course_id: string;
  organization_id?: string;
  rule_name: string;
  department?: string;
  country?: string;
  designation?: string;
  role?: UserRole;
  min_tenure_days?: number;
  max_tenure_days?: number;
  recurrence_interval: RecurrenceInterval;
  auto_enroll: boolean;
  is_active: boolean;
  created_by?: string;
  created_at: string;
}

export interface CoursePolicyVersion {
  id: string;
  course_id: string;
  version_number: number;
  version_notes?: string;
  changelog?: string;
  effective_date: string;
  requires_reacknowledgment: boolean;
  created_by?: string;
  created_at: string;
}

export interface PolicyAcknowledgment {
  id: string;
  policy_version_id: string;
  user_id: string;
  acknowledged_at: string;
}

export interface Presentation {
  id: string;
  user_id: string;
  title: string;
  task_id?: string;
  status: 'pending' | 'completed' | 'error';
  download_url?: string;
  view_url?: string;
  html_content?: string;
  params: any;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}
