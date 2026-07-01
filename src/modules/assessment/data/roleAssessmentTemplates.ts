import type { QuestionType } from '../types';

export type TemplateQuestion = {
  question_type: QuestionType;
  title: string;
  prompt: string;
  difficulty: 'easy' | 'medium' | 'hard';
  weight: number;
  tags: string[];
  options?: { option_text: string; is_correct: boolean }[];
  metadata?: Record<string, unknown>;
};

export type RoleAssessmentTemplate = {
  id: string;
  role: string;
  title: string;
  description: string;
  tags: string[];
  passing_score: number;
  time_limit_minutes: number;
  instructions: string;
  sections: {
    title: string;
    instructions?: string;
    questions: TemplateQuestion[];
  }[];
};

export const ROLE_ASSESSMENT_TEMPLATES: RoleAssessmentTemplate[] = [
  {
    id: 'sales-associate',
    role: 'Sales',
    title: 'Sales Associate — Skills Assessment',
    description: 'Evaluate communication, objection handling, product knowledge, and closing aptitude for sales roles.',
    tags: ['sales', 'hiring', 'template'],
    passing_score: 70,
    time_limit_minutes: 35,
    instructions: 'Answer all questions honestly. For speaking and video items, find a quiet place with a stable connection.',
    sections: [
      {
        title: 'Aptitude & product sense',
        questions: [
          {
            question_type: 'multiple_choice',
            title: 'Objection handling',
            prompt: 'A prospect says: "Your price is too high." What is the best first response?',
            difficulty: 'medium',
            weight: 1,
            tags: ['sales', 'objections'],
            options: [
              { option_text: 'Immediately offer a discount', is_correct: false },
              { option_text: 'Acknowledge the concern and ask what they are comparing against', is_correct: true },
              { option_text: 'Ignore the objection and continue your pitch', is_correct: false },
              { option_text: 'Tell them competitors are more expensive', is_correct: false },
            ],
          },
          {
            question_type: 'multiple_select',
            title: 'Discovery questions',
            prompt: 'Which questions help uncover buyer pain points? (Select all that apply)',
            difficulty: 'easy',
            weight: 1,
            tags: ['sales', 'discovery'],
            options: [
              { option_text: 'What problem are you trying to solve this quarter?', is_correct: true },
              { option_text: 'What happens if you do nothing?', is_correct: true },
              { option_text: 'Can you sign today if I drop the price?', is_correct: false },
              { option_text: 'Who else is involved in this decision?', is_correct: true },
            ],
          },
          {
            question_type: 'true_false',
            title: 'Pipeline hygiene',
            prompt: 'True or False: Updating CRM after every customer call is optional if you remember the details.',
            difficulty: 'easy',
            weight: 1,
            tags: ['sales', 'crm'],
            options: [
              { option_text: 'True', is_correct: false },
              { option_text: 'False', is_correct: true },
            ],
          },
          {
            question_type: 'short_answer',
            title: 'Elevator pitch',
            prompt: 'In one sentence, explain why a busy executive should take a 15-minute demo.',
            difficulty: 'medium',
            weight: 1,
            tags: ['sales', 'communication'],
            metadata: { expected_answer: '' },
          },
        ],
      },
      {
        title: 'Communication',
        instructions: 'Record your responses clearly. You may re-record once before submitting.',
        questions: [
          {
            question_type: 'audio_response',
            title: 'Cold call opener',
            prompt: 'Record a 60-second cold call introduction for a B2B SaaS product targeting HR teams.',
            difficulty: 'medium',
            weight: 2,
            tags: ['sales', 'speaking'],
            metadata: { max_duration_seconds: 60 },
          },
          {
            question_type: 'video_response',
            title: 'Role-play close',
            prompt: 'Record a 90-second video explaining how you would ask for commitment at the end of a successful demo.',
            difficulty: 'hard',
            weight: 2,
            tags: ['sales', 'video'],
            metadata: { max_duration_seconds: 90 },
          },
          {
            question_type: 'situational_judgment',
            title: 'Deal stall scenario',
            prompt: 'A deal has been in "negotiation" for 6 weeks with no progress. The champion stopped replying. What do you do first?',
            difficulty: 'hard',
            weight: 1,
            tags: ['sales', 'situational'],
            options: [
              { option_text: 'Send a break-up email to create urgency', is_correct: false },
              { option_text: 'Multi-thread by reaching a new stakeholder with a value recap', is_correct: true },
              { option_text: 'Wait another two weeks', is_correct: false },
              { option_text: 'Escalate to their CEO on LinkedIn', is_correct: false },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'software-engineer',
    role: 'Engineering',
    title: 'Software Engineer — Technical Assessment',
    description: 'Screen coding fundamentals, system thinking, debugging, and technical communication.',
    tags: ['engineering', 'hiring', 'template'],
    passing_score: 75,
    time_limit_minutes: 45,
    instructions: 'Use clear variable names in coding questions. Partial credit may apply on written explanations.',
    sections: [
      {
        title: 'Technical fundamentals',
        questions: [
          {
            question_type: 'multiple_choice',
            title: 'Time complexity',
            prompt: 'What is the average time complexity of looking up a key in a well-implemented hash map?',
            difficulty: 'easy',
            weight: 1,
            tags: ['engineering', 'algorithms'],
            options: [
              { option_text: 'O(1)', is_correct: true },
              { option_text: 'O(log n)', is_correct: false },
              { option_text: 'O(n)', is_correct: false },
              { option_text: 'O(n log n)', is_correct: false },
            ],
          },
          {
            question_type: 'multiple_select',
            title: 'API design',
            prompt: 'Which are good REST API practices? (Select all that apply)',
            difficulty: 'medium',
            weight: 1,
            tags: ['engineering', 'api'],
            options: [
              { option_text: 'Use meaningful HTTP status codes', is_correct: true },
              { option_text: 'Version APIs in the URL or header', is_correct: true },
              { option_text: 'Use GET requests to delete resources', is_correct: false },
              { option_text: 'Return consistent error shapes', is_correct: true },
            ],
          },
          {
            question_type: 'coding',
            title: 'FizzBuzz variant',
            prompt: 'Write a function that returns "Fizz" if n is divisible by 3, "Buzz" if divisible by 5, "FizzBuzz" if both, else return n as a string.',
            difficulty: 'easy',
            weight: 2,
            tags: ['engineering', 'coding'],
            metadata: { language: 'javascript', starter_code: 'function fizzBuzz(n) {\n  // your code\n}' },
          },
          {
            question_type: 'sql',
            title: 'Active users query',
            prompt: 'Write a SQL query to return users who logged in at least once in the last 30 days from a `logins(user_id, logged_at)` table.',
            difficulty: 'medium',
            weight: 2,
            tags: ['engineering', 'sql'],
            metadata: { language: 'sql' },
          },
        ],
      },
      {
        title: 'Problem solving & communication',
        questions: [
          {
            question_type: 'long_answer',
            title: 'Debug production incident',
            prompt: 'Describe the steps you would take to investigate a sudden spike in API latency in production.',
            difficulty: 'hard',
            weight: 2,
            tags: ['engineering', 'debugging'],
          },
          {
            question_type: 'short_answer',
            title: 'Trade-off question',
            prompt: 'When would you choose a queue over synchronous HTTP between two microservices?',
            difficulty: 'medium',
            weight: 1,
            tags: ['engineering', 'architecture'],
          },
          {
            question_type: 'true_false',
            title: 'Testing culture',
            prompt: 'True or False: Unit tests should never touch the database.',
            difficulty: 'easy',
            weight: 1,
            tags: ['engineering', 'testing'],
            options: [
              { option_text: 'True', is_correct: false },
              { option_text: 'False', is_correct: true },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'customer-support',
    role: 'Customer Support',
    title: 'Customer Support — Service Excellence Assessment',
    description: 'Measure empathy, troubleshooting, written clarity, and de-escalation skills.',
    tags: ['support', 'hiring', 'template'],
    passing_score: 70,
    time_limit_minutes: 30,
    instructions: 'Focus on clear, customer-friendly language. Spelling and tone matter on written responses.',
    sections: [
      {
        title: 'Service skills',
        questions: [
          {
            question_type: 'multiple_choice',
            title: 'De-escalation',
            prompt: 'An angry customer demands a refund outside policy. Your best first step is to:',
            difficulty: 'medium',
            weight: 1,
            tags: ['support', 'de-escalation'],
            options: [
              { option_text: 'Repeat the policy verbatim', is_correct: false },
              { option_text: 'Acknowledge frustration and summarize their issue', is_correct: true },
              { option_text: 'Transfer without context', is_correct: false },
              { option_text: 'Offer a refund immediately', is_correct: false },
            ],
          },
          {
            question_type: 'listening',
            title: 'Ticket comprehension',
            prompt: 'Read the scenario and select the customer\'s primary issue.\n\nScenario: "I was charged twice for my subscription. I cancelled last month but still see a pending charge on my card."',
            difficulty: 'easy',
            weight: 1,
            tags: ['support', 'listening'],
            metadata: {
              passage: 'Customer reports duplicate billing after cancellation. Card shows pending charge.',
            },
            options: [
              { option_text: 'Duplicate charge / billing error', is_correct: true },
              { option_text: 'Feature not working', is_correct: false },
              { option_text: 'Password reset', is_correct: false },
              { option_text: 'Product recommendation', is_correct: false },
            ],
          },
          {
            question_type: 'long_answer',
            title: 'Support reply',
            prompt: 'Write a reply to a customer whose shipment is delayed by 5 days. Apologize, explain next steps, and offer a resolution.',
            difficulty: 'medium',
            weight: 2,
            tags: ['support', 'writing'],
          },
          {
            question_type: 'true_false',
            title: 'First response time',
            prompt: 'True or False: A fast first response is more important than a complete first response.',
            difficulty: 'easy',
            weight: 1,
            tags: ['support'],
            options: [
              { option_text: 'True', is_correct: false },
              { option_text: 'False', is_correct: true },
            ],
          },
          {
            question_type: 'audio_response',
            title: 'Voice support sample',
            prompt: 'Record how you would verbally explain a 2-step password reset process to a non-technical user.',
            difficulty: 'medium',
            weight: 2,
            tags: ['support', 'speaking'],
          },
        ],
      },
    ],
  },
  {
    id: 'operations-associate',
    role: 'Operations',
    title: 'Operations Associate — Hiring Assessment',
    description: 'Assess attention to detail, process adherence, numeracy, and operational judgment.',
    tags: ['operations', 'hiring', 'template'],
    passing_score: 65,
    time_limit_minutes: 30,
    instructions: 'Complete all sections. Calculators are allowed for numeric questions.',
    sections: [
      {
        title: 'Operations aptitude',
        questions: [
          {
            question_type: 'multiple_choice',
            title: 'Priority triage',
            prompt: 'You have: (A) vendor payment due today, (B) team lunch order, (C) client escalation. What do you tackle first?',
            difficulty: 'easy',
            weight: 1,
            tags: ['operations', 'prioritization'],
            options: [
              { option_text: 'B, then A, then C', is_correct: false },
              { option_text: 'C, then A, then B', is_correct: true },
              { option_text: 'A, then B, then C', is_correct: false },
              { option_text: 'B, then C, then A', is_correct: false },
            ],
          },
          {
            question_type: 'short_answer',
            title: 'Data accuracy',
            prompt: 'A spreadsheet shows 1,250 units shipped and 1,180 units received. How many units are unaccounted for?',
            difficulty: 'easy',
            weight: 1,
            tags: ['operations', 'numeracy'],
            metadata: { expected_answer: '70' },
          },
          {
            question_type: 'multiple_select',
            title: 'SOP compliance',
            prompt: 'Which actions follow standard onboarding SOP? (Select all that apply)',
            difficulty: 'medium',
            weight: 1,
            tags: ['operations', 'sop'],
            options: [
              { option_text: 'Verify ID documents before system access', is_correct: true },
              { option_text: 'Share admin passwords over chat for speed', is_correct: false },
              { option_text: 'Log equipment handover in the asset register', is_correct: true },
              { option_text: 'Skip background check if referred internally', is_correct: false },
            ],
          },
          {
            question_type: 'situational_judgment',
            title: 'Shift handover',
            prompt: 'You notice incomplete notes from the previous shift about a critical vendor issue. What do you do?',
            difficulty: 'medium',
            weight: 1,
            tags: ['operations', 'situational'],
            options: [
              { option_text: 'Wait until the colleague returns', is_correct: false },
              { option_text: 'Contact the colleague, document findings, and escalate if needed', is_correct: true },
              { option_text: 'Assume it was resolved', is_correct: false },
              { option_text: 'Delete the ticket', is_correct: false },
            ],
          },
          {
            question_type: 'long_answer',
            title: 'Process improvement',
            prompt: 'Describe one way you would reduce errors in a manual data-entry workflow.',
            difficulty: 'medium',
            weight: 2,
            tags: ['operations', 'process'],
          },
        ],
      },
    ],
  },
  {
    id: 'marketing-associate',
    role: 'Marketing',
    title: 'Marketing Associate — Creative & Analytical Assessment',
    description: 'Test campaign thinking, copywriting, channel knowledge, and basic analytics literacy.',
    tags: ['marketing', 'hiring', 'template'],
    passing_score: 70,
    time_limit_minutes: 35,
    instructions: 'Be concise on short answers. Creative questions are evaluated for clarity and audience fit.',
    sections: [
      {
        title: 'Marketing fundamentals',
        questions: [
          {
            question_type: 'multiple_choice',
            title: 'Funnel metrics',
            prompt: 'Which metric best indicates top-of-funnel awareness for a digital campaign?',
            difficulty: 'easy',
            weight: 1,
            tags: ['marketing', 'analytics'],
            options: [
              { option_text: 'Impressions / reach', is_correct: true },
              { option_text: 'Customer churn rate', is_correct: false },
              { option_text: 'Net revenue retention', is_correct: false },
              { option_text: 'Support ticket volume', is_correct: false },
            ],
          },
          {
            question_type: 'short_answer',
            title: 'Headline writing',
            prompt: 'Write a headline (max 10 words) for a webinar on AI productivity for remote teams.',
            difficulty: 'medium',
            weight: 1,
            tags: ['marketing', 'copy'],
          },
          {
            question_type: 'multiple_select',
            title: 'Channel fit',
            prompt: 'Which channels suit B2B thought leadership? (Select all that apply)',
            difficulty: 'easy',
            weight: 1,
            tags: ['marketing', 'channels'],
            options: [
              { option_text: 'LinkedIn', is_correct: true },
              { option_text: 'Industry newsletters', is_correct: true },
              { option_text: 'TikTok dance trends only', is_correct: false },
              { option_text: 'Webinars', is_correct: true },
            ],
          },
          {
            question_type: 'long_answer',
            title: 'Campaign brief',
            prompt: 'Outline a 3-step launch plan for a new feature aimed at existing customers.',
            difficulty: 'hard',
            weight: 2,
            tags: ['marketing', 'strategy'],
          },
          {
            question_type: 'video_response',
            title: 'Pitch practice',
            prompt: 'Record a 60-second pitch explaining why a customer should upgrade to a premium plan.',
            difficulty: 'medium',
            weight: 2,
            tags: ['marketing', 'video'],
          },
        ],
      },
    ],
  },
  {
    id: 'data-analyst',
    role: 'Data & Analytics',
    title: 'Data Analyst — Analytics Assessment',
    description: 'Evaluate SQL, statistics intuition, data storytelling, and business context.',
    tags: ['analytics', 'hiring', 'template'],
    passing_score: 75,
    time_limit_minutes: 40,
    instructions: 'Show your reasoning on written answers. SQL should be readable and correct.',
    sections: [
      {
        title: 'Data skills',
        questions: [
          {
            question_type: 'sql',
            title: 'Monthly revenue',
            prompt: 'Write SQL to calculate total revenue per month from `orders(id, amount, created_at)` for the current year.',
            difficulty: 'medium',
            weight: 2,
            tags: ['analytics', 'sql'],
          },
          {
            question_type: 'multiple_choice',
            title: 'Metric definition',
            prompt: 'What is the difference between mean and median?',
            difficulty: 'easy',
            weight: 1,
            tags: ['analytics', 'statistics'],
            options: [
              { option_text: 'Mean is sum/count; median is the middle value when sorted', is_correct: true },
              { option_text: 'They are always identical', is_correct: false },
              { option_text: 'Median is always higher than mean', is_correct: false },
              { option_text: 'Mean ignores outliers; median does not', is_correct: false },
            ],
          },
          {
            question_type: 'multiple_select',
            title: 'Data quality',
            prompt: 'Which indicate data quality issues? (Select all that apply)',
            difficulty: 'medium',
            weight: 1,
            tags: ['analytics', 'quality'],
            options: [
              { option_text: 'Duplicate primary keys', is_correct: true },
              { option_text: 'Consistent null rate in a required field', is_correct: true },
              { option_text: 'Documented metric definitions', is_correct: false },
              { option_text: 'Future-dated transactions', is_correct: true },
            ],
          },
          {
            question_type: 'long_answer',
            title: 'Insight narrative',
            prompt: 'Conversion dropped 15% week-over-week. Describe how you would investigate and present findings to stakeholders.',
            difficulty: 'hard',
            weight: 2,
            tags: ['analytics', 'storytelling'],
          },
          {
            question_type: 'true_false',
            title: 'Correlation vs causation',
            prompt: 'True or False: Correlation always implies causation.',
            difficulty: 'easy',
            weight: 1,
            tags: ['analytics', 'statistics'],
            options: [
              { option_text: 'True', is_correct: false },
              { option_text: 'False', is_correct: true },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'hr-generalist',
    role: 'Human Resources',
    title: 'HR Generalist — People & Policy Assessment',
    description: 'Screen HR fundamentals, conflict resolution, compliance awareness, and communication.',
    tags: ['hr', 'hiring', 'template'],
    passing_score: 70,
    time_limit_minutes: 30,
    instructions: 'Answer based on standard HR best practices. Scenario questions have one best answer.',
    sections: [
      {
        title: 'HR competencies',
        questions: [
          {
            question_type: 'multiple_choice',
            title: 'Interview bias',
            prompt: 'Which practice reduces unconscious bias in interviews?',
            difficulty: 'medium',
            weight: 1,
            tags: ['hr', 'hiring'],
            options: [
              { option_text: 'Structured scorecards with predefined criteria', is_correct: true },
              { option_text: 'Hiring based on gut feeling', is_correct: false },
              { option_text: 'Single interviewer only', is_correct: false },
              { option_text: 'Asking about personal hobbies unrelated to role', is_correct: false },
            ],
          },
          {
            question_type: 'situational_judgment',
            title: 'Workplace conflict',
            prompt: 'Two team members dispute credit for a project in a meeting. As HR, you should:',
            difficulty: 'hard',
            weight: 2,
            tags: ['hr', 'conflict'],
            options: [
              { option_text: 'Take sides with the senior employee', is_correct: false },
              { option_text: 'Pause the meeting and facilitate a private fact-finding conversation', is_correct: true },
              { option_text: 'Ignore it unless someone complains formally', is_correct: false },
              { option_text: 'Announce a winner in the meeting', is_correct: false },
            ],
          },
          {
            question_type: 'long_answer',
            title: 'Onboarding design',
            prompt: 'List three elements of an effective first-week onboarding experience for a remote hire.',
            difficulty: 'medium',
            weight: 2,
            tags: ['hr', 'onboarding'],
          },
          {
            question_type: 'true_false',
            title: 'Documentation',
            prompt: 'True or False: Verbal policy exceptions do not need documentation.',
            difficulty: 'easy',
            weight: 1,
            tags: ['hr', 'compliance'],
            options: [
              { option_text: 'True', is_correct: false },
              { option_text: 'False', is_correct: true },
            ],
          },
          {
            question_type: 'short_answer',
            title: 'Leave policy',
            prompt: 'What information must an employee include in a formal leave request email?',
            difficulty: 'easy',
            weight: 1,
            tags: ['hr', 'policy'],
          },
        ],
      },
    ],
  },
];

export function getTemplateById(id: string) {
  return ROLE_ASSESSMENT_TEMPLATES.find((t) => t.id === id);
}
