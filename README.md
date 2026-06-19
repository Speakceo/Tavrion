# Amberstudent LMS - AI-Powered Learning Management System

A production-ready Learning Management System built exclusively for Amberstudent internal teams and partners, featuring AI-powered course generation, intelligent tutoring, mock call simulations, and professional presentation generation.

## 📚 Documentation

- **[COMPLETE_GUIDE.md](COMPLETE_GUIDE.md)** - Comprehensive setup and usage guide
- **[SETUP_USERS.md](SETUP_USERS.md)** - User creation instructions
- **[ADMIN_GUIDE.md](ADMIN_GUIDE.md)** - Admin features and workflows
- **[QUICK_START.md](QUICK_START.md)** - Get started in 5 minutes

## Features

### Core Functionality
- **Role-Based Access Control**: Super Admin, Admin, Trainer, Employee, and Partner roles
- **Course Management**: Comprehensive course creation with modules and lessons
- **Multiple Lesson Types**: Text, Slides, Quizzes, and Mock Calls
- **Progress Tracking**: Detailed analytics and completion tracking
- **Certification System**: Automated certificate issuance

### AI-Powered Features
- **AI Course Generator**: Create complete courses instantly with OpenAI GPT-4
- **AI Tutor**: Context-aware chat assistant for learning support
- **Mock Call Simulator**: 16 realistic sales scenarios with AI customers
- **Presentation Generator**: Convert content to professional PPTX/PDF slides
- **Smart Assessments**: AI-evaluated answers with personalized feedback

### Analytics & Reporting
- **Real-time Dashboard**: Track enrollments, completions, and engagement
- **User Analytics**: Individual and team performance metrics
- **Learning Insights**: Identify skill gaps and drop-off points
- **Leaderboards**: Gamification and peer motivation

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS
- **Routing**: React Router v6
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **AI Services**:
  - OpenAI GPT-4 (Course generation, tutor, mock calls)
  - Presenton AI (Presentation generation)
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account
- OpenAI API key (optional, for AI features)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Environment variables are pre-configured in `.env`

3. Database is already set up with all tables and seed data

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:5173](http://localhost:5173)

### User Setup - The Easy Way

**One-Click User Creation:**

1. Login as admin: `Amberadmin001` (password: `Amber@2024`)
2. Go to **Admin Panel > Users**
3. Click **"Bulk Create Training Users"**
4. Wait 2-3 minutes
5. Done! 100 users created (Ambertraining001-100)

**All accounts use password:** `Amber@2024`

For detailed setup instructions, see [COMPLETE_GUIDE.md](COMPLETE_GUIDE.md).

### Login

1. Open the application at [http://localhost:5173](http://localhost:5173)
2. Enter User ID: `Amberadmin001` (or `Ambertraining001`)
3. Click "Sign In"
4. Start learning!

### User Roles

- `super_admin`: Full system access
- `admin`: User and course management, analytics
- `trainer`: Course creation and management
- `employee`: Course consumption
- `partner`: Limited course access

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.tsx      # Main layout with navigation
│   └── ProtectedRoute.tsx  # Route protection
├── contexts/           # React contexts
│   └── AuthContext.tsx # Authentication state
├── lib/               # Utilities
│   └── supabase.ts    # Supabase client
├── pages/             # Application pages
│   ├── Dashboard.tsx
│   ├── Courses.tsx
│   ├── CourseDetail.tsx
│   ├── LessonView.tsx
│   ├── AITutor.tsx
│   ├── MockCalls.tsx
│   └── admin/         # Admin pages
│       ├── Users.tsx
│       ├── AdminCourses.tsx
│       ├── Analytics.tsx
│       └── AIGenerate.tsx
├── services/          # Business logic
│   └── openai.ts      # OpenAI integration
├── types/             # TypeScript types
│   └── index.ts
└── App.tsx           # Main app with routing
```

## Database Schema

### Core Tables
- `user_profiles`: Extended user information with roles
- `courses`: Course metadata and settings
- `modules`: Course sections
- `lessons`: Individual learning units
- `quizzes`: Assessment metadata
- `questions`: Quiz questions

### Progress & Analytics
- `user_course_enrollments`: Course assignments
- `lesson_progress`: Individual lesson tracking
- `quiz_attempts`: Quiz submissions and scores
- `analytics_events`: Detailed activity logging

### AI Features
- `ai_chat_history`: AI tutor conversations
- `mock_call_sessions`: Practice session recordings
- `ai_generated_content`: Track AI-generated courses

### Certificates
- `certificates`: Course completion records

All tables include Row Level Security (RLS) policies for data protection.

## OpenAI Integration

### Setup

Add your OpenAI API key to enable AI features:

1. Create/edit `.env`:
```
VITE_OPENAI_API_KEY=sk-your-key-here
```

2. Restart the dev server

### Available AI Features

**Course Generation**
- Navigate to Admin → Courses → AI Generate
- Enter topic, target role, and country
- AI creates complete course structure with slides and quizzes

**AI Tutor**
- Chat with context-aware AI assistant
- Ask questions about course content
- Get explanations and examples

**Mock Calls**
- Practice with AI agents (student, parent, partner)
- Realistic scenarios and objections
- Automated scoring and feedback

## API Integration

The OpenAI service (`src/services/openai.ts`) provides these methods:

```typescript
// Generate complete course
await openaiService.generateCourse({ topic, targetRole, country });

// Generate presentation slides
await openaiService.generateSlides({ topic, targetRole, country });

// Create quiz questions
await openaiService.generateQuiz({ topic, targetRole });

// Chat tutor
await openaiService.chatTutor({ userMessage, context, userRole });

// Mock call simulation
await openaiService.mockCallAgent({ scenarioType, userMessage, conversationHistory });

// Evaluate answers
await openaiService.evaluateAnswer({ question, userAnswer, correctAnswer });
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks
```

## User Roles & Permissions

### Super Admin
- Full system access
- User management
- Course management
- Analytics access
- System configuration

### Admin (L&D)
- User management
- Course management
- Analytics access
- Assign courses to users

### Trainer
- Create and edit courses
- Manage own content
- View student progress

### Employee
- View assigned courses
- Complete lessons and quizzes
- Use AI Tutor and Mock Calls
- Track own progress

### Partner
- Limited course access
- View partner-specific content
- Complete assigned training

## Sample Data

The database includes sample courses:

1. **Student Objection Handling Masterclass** (Sales, UK)
   - Objection handling techniques
   - Active listening
   - Common scenarios

2. **Property Safety & Compliance Training** (Operations, UK)
   - Safety regulations
   - Emergency procedures

3. **Customer Support Excellence** (Support, US)
   - Communication fundamentals
   - Empathy training

4. **Partner Relationship Management** (Sales, AU)
   - Partnership strategies
   - Negotiation skills

## Security

- **Authentication**: Supabase Auth with email/password
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: Row Level Security (RLS) on all tables
- **API Security**: Server-side API key management
- **Input Validation**: Client and server-side validation

## Production Deployment

### Build

```bash
npm run build
```

### Environment Variables

Ensure these are set in production:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
- `VITE_OPENAI_API_KEY`: Your OpenAI API key

### Deployment Platforms

Compatible with:
- Vercel
- Netlify
- AWS Amplify
- CloudFlare Pages
- Any static hosting

## Future Enhancements

- Video lessons support
- Live session scheduling
- Mobile app (React Native)
- Advanced analytics with ML insights
- Integration with HR systems
- Automated certification expiry
- Multi-language support
- Offline mode

## Support

For issues or questions:
1. Check existing documentation
2. Review sample courses for examples
3. Contact the development team

## License

Proprietary - Amberstudent Internal Use Only

---

Built with precision for Amberstudent teams worldwide.
