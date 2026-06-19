-- Seed Data for Amberstudent LMS
-- This script creates demo users, courses, and sample data for testing

-- Note: User profiles will be created when users sign up through the app
-- For demo purposes, you can manually insert users after they've been created in auth.users

-- Sample Courses
INSERT INTO courses (id, title, description, target_role, country, is_mandatory, version, status, created_at) VALUES
('11111111-1111-1111-1111-111111111111', 'Student Objection Handling Masterclass', 'Learn proven techniques to address common student concerns and objections during the sales process. Covers budget concerns, location preferences, and booking hesitations.', 'sales', 'UK', true, 1, 'published', now()),
('22222222-2222-2222-2222-222222222222', 'Property Safety & Compliance Training', 'Essential training on property safety standards, compliance requirements, and emergency procedures for operations team.', 'operations', 'UK', true, 1, 'published', now()),
('33333333-3333-3333-3333-333333333333', 'Customer Support Excellence', 'Deliver exceptional customer service to students and parents. Master communication skills, problem-solving, and conflict resolution.', 'support', 'US', false, 1, 'published', now()),
('44444444-4444-4444-4444-444444444444', 'Partner Relationship Management', 'Build and maintain strong relationships with property partners. Learn negotiation strategies and partnership best practices.', 'sales', 'AU', false, 1, 'published', now());

-- Sample Modules for Course 1
INSERT INTO modules (id, course_id, title, description, order_index) VALUES
('11111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Introduction to Objection Handling', 'Understanding the psychology of objections and why students hesitate', 0),
('11111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Common Objections & Responses', 'Master responses to the most frequent student concerns', 1),
('11111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'Practice & Assessment', 'Test your skills with real scenarios', 2);

-- Sample Lessons for Module 1
INSERT INTO lessons (id, module_id, title, type, content, duration_minutes, order_index) VALUES
('11111111-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111112', 'Welcome to Objection Handling', 'slides',
'{"slides": [
  {
    "title": "Why Students Object",
    "bullets": [
      "Natural part of decision-making process",
      "Often masks deeper concerns",
      "Opportunity to build trust and provide value"
    ],
    "notes": "Emphasize that objections are normal and healthy. They show engagement."
  },
  {
    "title": "Types of Objections",
    "bullets": [
      "Price and budget concerns",
      "Location and distance worries",
      "Timing and availability questions",
      "Trust and credibility issues"
    ],
    "notes": "Review each type with real examples from team experience"
  }
]}', 15, 0),
('11111111-1111-1111-1111-111111111116', '11111111-1111-1111-1111-111111111112', 'Active Listening Techniques', 'text',
'{"html": "<h2>The Power of Active Listening</h2><p>Before responding to objections, you must truly understand them. Active listening involves:</p><ul><li>Giving full attention to the student</li><li>Avoiding interruptions</li><li>Asking clarifying questions</li><li>Paraphrasing to confirm understanding</li></ul><p><strong>Example:</strong> When a student says ''It''s too expensive,'' don''t immediately discount. Ask: ''Can you help me understand what aspect of the pricing concerns you most?''</p>"}', 10, 1);

-- Sample Lessons for Module 2
INSERT INTO lessons (id, module_id, title, type, content, duration_minutes, order_index) VALUES
('11111111-1111-1111-1111-111111111117', '11111111-1111-1111-1111-111111111113', 'Budget Objections', 'slides',
'{"slides": [
  {
    "title": "Handling Budget Concerns",
    "bullets": [
      "Understand their actual budget constraints",
      "Emphasize value, not just price",
      "Offer flexible payment options",
      "Compare with alternatives honestly"
    ],
    "notes": "Always validate their concern first before offering solutions"
  }
]}', 20, 0),
('11111111-1111-1111-1111-111111111118', '11111111-1111-1111-1111-111111111113', 'Location Concerns', 'text',
'{"html": "<h2>Addressing Location Worries</h2><p>Students often worry about distance to campus, safety, and neighborhood amenities.</p><h3>Key Strategies:</h3><ol><li>Provide specific transport options and times</li><li>Highlight local amenities and student community</li><li>Share testimonials from current residents</li><li>Offer virtual neighborhood tours</li></ol>"}', 15, 1);

-- Sample Quiz
INSERT INTO quizzes (id, lesson_id, title, pass_threshold, max_attempts) VALUES
('11111111-1111-1111-1111-111111111119', '11111111-1111-1111-1111-111111111117', 'Budget Objections Quiz', 70, 3);

-- Sample Questions
INSERT INTO questions (id, quiz_id, question_text, type, options, correct_answer, explanation, points, order_index) VALUES
('11111111-1111-1111-1111-111111111120', '11111111-1111-1111-1111-111111111119',
'A student says: "Your property is £50 more per week than the competitor down the street." What should you do first?',
'mcq',
'["Immediately offer a discount", "Ask questions to understand their priorities", "Explain why you''re better", "Tell them to go with the competitor"]',
'Ask questions to understand their priorities',
'Always understand needs before offering solutions. Questions reveal what matters most to them.',
1, 0),
('11111111-1111-1111-1111-111111111121', '11111111-1111-1111-1111-111111111119',
'Which of these is the BEST way to handle price objections?',
'mcq',
'["Focus on features and amenities", "Immediately reduce the price", "Compare value over cost", "Ignore the objection"]',
'Compare value over cost',
'Value-based selling helps students see beyond just the price tag to the overall benefits and experience.',
1, 1);

-- Sample Modules for Course 2
INSERT INTO modules (id, course_id, title, description, order_index) VALUES
('22222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222', 'Safety Standards Overview', 'Introduction to UK safety regulations for student accommodation', 0),
('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Emergency Procedures', 'How to handle emergencies and evacuations', 1);

-- Sample Lessons for Course 2
INSERT INTO lessons (id, module_id, title, type, content, duration_minutes, order_index) VALUES
('22222222-2222-2222-2222-222222222223', '22222222-2222-2222-2222-222222222221', 'UK Fire Safety Regulations', 'slides',
'{"slides": [
  {
    "title": "Fire Safety Requirements",
    "bullets": [
      "Working smoke alarms on every floor",
      "Clear fire escape routes",
      "Fire extinguishers and blankets",
      "Annual fire risk assessments"
    ],
    "notes": "These are legal requirements, not optional"
  }
]}', 20, 0);

-- Sample Modules for Course 3
INSERT INTO modules (id, course_id, title, description, order_index) VALUES
('33333333-3333-3333-3333-333333333331', '33333333-3333-3333-3333-333333333333', 'Communication Fundamentals', 'Master the basics of effective customer communication', 0);

-- Sample Lessons for Course 3
INSERT INTO lessons (id, module_id, title, type, content, duration_minutes, order_index) VALUES
('33333333-3333-3333-3333-333333333332', '33333333-3333-3333-3333-333333333331', 'Empathy in Customer Service', 'text',
'{"html": "<h2>The Power of Empathy</h2><p>Empathy transforms customer service from transactional to transformational.</p><p>Practice putting yourself in the student''s shoes - they''re often far from home, stressed about housing, and need reassurance.</p>"}', 15, 0);

-- Note: After users sign up through the app, you can insert enrollments like this:
-- INSERT INTO user_course_enrollments (user_id, course_id, status) VALUES
-- ('user-uuid-here', 'course-uuid-here', 'assigned');

-- Sample Analytics Events (replace user_id with actual user IDs after signup)
-- INSERT INTO analytics_events (user_id, event_type, event_data) VALUES
-- ('user-uuid', 'course_started', '{"course_id": "11111111-1111-1111-1111-111111111111"}'),
-- ('user-uuid', 'lesson_completed', '{"lesson_id": "11111111-1111-1111-1111-111111111115"}');
