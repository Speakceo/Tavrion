# Amberstudent LMS - Complete Setup and Usage Guide

## Table of Contents
1. [Initial Setup](#initial-setup)
2. [Creating Users](#creating-users)
3. [Admin Features](#admin-features)
4. [User Features](#user-features)
5. [Troubleshooting](#troubleshooting)

---

## Initial Setup

### 1. Login as Admin

**Credentials:**
- User ID: `Amberadmin001`
- Password: `Amber@2024` (auto-filled)

Navigate to the login page and enter your user ID. The system will automatically convert it to the correct email format and authenticate you.

---

## Creating Users

### Method 1: Bulk Create Training Users (RECOMMENDED)

**This is the easiest and fastest way to create all 100 training users.**

1. Login as admin (`Amberadmin001`)
2. Navigate to **Admin Panel > Users**
3. Click the **"Bulk Create Training Users"** button (purple gradient button)
4. Confirm the action
5. Wait 2-3 minutes while the system creates 100 users

**What happens during bulk creation:**
- Creates users: `Ambertraining001` through `Ambertraining100`
- Generates emails: `ambertraining001@amberstudent.com` to `ambertraining100@amberstudent.com`
- Sets password: `Amber@2024` for all users
- Creates both authentication accounts AND user profiles
- Skips any users that already exist
- Shows real-time progress

**After creation:**
- All 100 users are ready to login immediately
- You can edit names individually (see below)
- Users can access their dashboard and assigned courses

### Method 2: Create Single Users

For custom users or additional accounts:

1. Click **"Add Single User"** button
2. Fill in the form:
   - **User ID** (required): e.g., `Amberstaff001`
   - **Full Name** (required): e.g., `John Doe`
   - **Email** (optional): Auto-generates if left blank
   - **Role**: Select from Employee/Trainer/Admin/Super Admin
   - **Department** (optional)
   - **Country** (optional)
3. Click **"Add User"**
4. Success message will show the password: `Amber@2024`

### Editing User Names

**Admin can permanently update user names:**

1. Go to **Admin Panel > Users**
2. Find the user you want to edit
3. Click the **pencil icon** (Edit) next to their name
4. Type the new name
5. Click the **checkmark** to save
6. The name is permanently updated in the database

**Example:**
- Change "Training User 001" → "Sarah Johnson"
- Change "Training User 002" → "Michael Chen"

### Deactivate/Activate Users

- Click the **User X icon** next to any user
- Deactivated users cannot login
- Can be reactivated at any time
- Useful for employees who leave

---

## Admin Features

### 1. Course Management

#### Create Course with AI Generation

**Fastest way to create comprehensive courses:**

1. Navigate to **Admin Panel > Courses**
2. Click **"AI Generate"** button
3. Fill in the form:
   ```
   Course Topic: "Handling Student Budget Objections"
   Target Role: Sales
   Country: UK
   Include Quiz: ✓ Yes
   ```
4. Click **"Generate with AI"**
5. Wait 10-30 seconds
6. Review the generated content:
   - Professional title and description
   - 3-5 comprehensive modules
   - 2-4 lessons per module
   - Real, detailed content (not dummy data)
   - Optional quiz module
7. Click **"Save Course"**

**The AI creates production-ready training content powered by OpenAI GPT-4.**

#### Assign Courses to Users

1. Find the course in **Admin Panel > Courses**
2. Click the **Users icon** (green button)
3. A modal opens with all active users
4. Select users:
   - Check individual boxes
   - Or click **"Select All"** for everyone
5. Click **"Assign to X User(s)"**
6. Course instantly appears in users' dashboards

#### Track Course Completion

**Comprehensive analytics per course:**

1. Click the **Report icon** (cyan button) next to any course
2. View detailed statistics:
   - Total enrolled users
   - Completed, In Progress, Not Started counts
   - Average progress percentage
   - Individual user progress with:
     - User ID and name
     - Status badge
     - Progress percentage (visual bar)
     - Lessons completed / total
     - Enrollment date
     - Completion date (if finished)
3. Click **"Export CSV"** to download for external analysis

#### Export Course as Presentation

**Convert any course into professional slides:**

1. Find the course in **Admin Panel > Courses**
2. Click the **Presentation icon** (purple button)
3. Confirm the export
4. System automatically:
   - Extracts all course content (modules and lessons)
   - Sends to Presenton AI for slide generation
   - Creates professional PowerPoint presentation
5. Navigate to **Presentations** page
6. Wait for generation to complete
7. Download the PPTX file or preview in browser

**Use cases:**
- Team training sessions
- Onboarding presentations
- Manager briefings
- Conference presentations

#### Delete Courses

1. Click the **Trash icon** (red button)
2. Confirm deletion
3. Automatically removes:
   - Course
   - All modules and lessons
   - User enrollments
   - Progress data

### 2. User Management

**Already covered above in "Creating Users" section.**

### 3. Analytics Dashboard

Coming soon - will show:
- Overall completion rates
- User engagement metrics
- Popular courses
- Time-to-completion analytics

---

## User Features

**All employees (training users) have access to:**

### 1. Dashboard

- Overview of assigned courses
- Progress tracking
- Quick links to continue learning
- Recent activity

### 2. My Courses

**View and access all assigned courses:**

1. Navigate to **My Courses**
2. See all courses assigned to you
3. View progress for each course
4. Click on a course to start learning
5. Complete lessons in order
6. Track your progress percentage

**Course Structure:**
- Each course has multiple modules
- Each module has multiple lessons
- Lessons can be:
  - Text content
  - Slides (presentations)
  - Quizzes
  - Mock calls

### 3. AI Tutor

**Personal AI assistant for learning:**

1. Navigate to **AI Tutor**
2. Ask questions about:
   - Course content
   - Sales techniques
   - Student accommodation topics
   - General training questions
3. Get instant, helpful responses
4. Context-aware based on your role and courses
5. Conversation history saved

**Example questions:**
- "How do I handle price objections?"
- "What are the key selling points for our properties?"
- "Explain the lease negotiation process"

### 4. Mock Calls

**Practice real sales conversations with AI customers:**

**16 Different Scenarios:**
1. Budget-Conscious Student
2. Location-Focused Student
3. Concerned Parent
4. Premium Seeker
5. Urgent Booking
6. Payment Complications
7. Roommate Concerns
8. Lease Negotiation
9. Maintenance Worries
10. Cancellation & Refund
11. Group Booking
12. Pet-Friendly Needs
13. Accessibility Requirements
14. Cultural & Dietary Needs
15. Late Night Inquiry
16. Competitive Offer

**How to Practice:**

1. Navigate to **Mock Calls**
2. Browse available scenarios
3. Read the character description and difficulty level
4. Click **"Start Call"**
5. Have a turn-based conversation:
   - **You speak first** (type your message)
   - **AI customer responds** (realistic objections and questions)
   - Continue back and forth
   - Handle objections professionally
   - Try to close or move forward
6. Click **"End Call"** when done
7. Receive immediate evaluation:
   - **Score** (0-100)
   - **Feedback** (detailed assessment)
   - **Strengths** (what you did well)
   - **Areas to Improve** (specific suggestions)

**Features:**
- **Voice Mode** (optional): Toggle voice to hear AI speak responses
- **Text Mode** (default): Type and read responses
- **Recording**: All calls are saved with scores
- **Progress Tracking**: View past calls and improvement over time

**Tips for Success:**
- Build rapport early
- Listen actively to concerns
- Address objections directly
- Demonstrate product knowledge
- Always try to move the conversation forward

### 5. Presentations

**Create professional PowerPoint presentations with AI:**

1. Navigate to **Presentations**
2. Enter your content or topic in the text area
3. Customize settings (optional):
   - **Number of slides**: 5-20
   - **Tone**: Professional, Casual, Formal, Educational, Sales Pitch
   - **Verbosity**: Brief, Standard, Detailed
   - **Image Type**: Stock photos, AI-generated illustrations
   - **Language**: English, Spanish, French, etc.
   - **Export Format**: PPTX or PDF
4. Click **"Generate Presentation"**
5. Wait 30-60 seconds
6. Preview in browser (if available)
7. Download PPTX/PDF file

**Use Cases:**
- Create training materials
- Prepare for client meetings
- Build course content
- Design onboarding decks

**All presentations are saved:**
- View history of past presentations
- Re-download at any time
- Track generation status

---

## How the System Works

### Authentication System

**Login Flow:**
1. User enters unique ID (e.g., `Ambertraining001`)
2. System converts to email format: `ambertraining001@amberstudent.com`
3. Uses default password: `Amber@2024`
4. Authenticates via Supabase
5. Loads user profile
6. Redirects to dashboard

**Security:**
- Row Level Security (RLS) on all database tables
- Users only see their assigned content
- Admin/Trainer roles have elevated permissions
- Secure session management
- Passwords hashed in database

### Course Progress Tracking

**How it works:**
1. When a user is assigned a course, an enrollment record is created
2. As they complete lessons, progress is tracked per lesson
3. Progress percentage = (completed lessons / total lessons) × 100
4. Status updates automatically:
   - `not_started`: 0% progress
   - `in_progress`: 1-99% progress
   - `completed`: 100% progress
5. Completion date recorded when 100% reached

### AI Integration

**Three AI Services:**

1. **OpenAI GPT-4** (Course Generation, AI Tutor, Mock Calls)
   - Generates comprehensive course content
   - Powers conversational AI tutor
   - Simulates realistic customer personas
   - Evaluates mock call performance

2. **Presenton AI** (Presentation Generation)
   - Converts text to professional slides
   - Adds stock images
   - Formats content beautifully
   - Exports to PPTX or PDF

3. **OpenAI Whisper** (Speech-to-Text - optional)
   - Converts voice to text
   - Used in mock calls voice mode

4. **OpenAI TTS** (Text-to-Speech - optional)
   - Converts AI responses to speech
   - Realistic voice output
   - Used in mock calls voice mode

---

## Complete Workflow Example

### Scenario: Onboarding 100 New Sales Team Members

#### Step 1: Create All Users (5 minutes)
1. Login as `Amberadmin001`
2. Go to Admin Panel > Users
3. Click "Bulk Create Training Users"
4. Wait 2-3 minutes for 100 users to be created
5. Edit names for actual employees

#### Step 2: Create Sales Training Course (2 minutes)
1. Go to Admin Panel > Courses
2. Click "AI Generate"
3. Enter:
   ```
   Topic: "Amberstudent Sales Excellence Program"
   Role: Sales
   Country: UK
   Include Quiz: Yes
   ```
4. Generate and review
5. Save course

#### Step 3: Assign to All Sales Team (1 minute)
1. Find the course in Admin Panel > Courses
2. Click Users icon
3. Click "Select All"
4. Assign to 100 users

#### Step 4: Monitor Progress (ongoing)
1. Daily: Check completion report
2. Weekly: Export CSV for management
3. Follow up with users at 0% progress after 1 week
4. Celebrate completions!

#### Step 5: Practice with Mock Calls (for users)
1. Users complete course modules
2. Then practice with mock call scenarios
3. Get evaluated and improve
4. Repeat different scenarios

#### Total Time: ~10 minutes for complete setup!

---

## Troubleshooting

### Issue: User Can't Login

**Symptoms:**
- "Invalid User ID" error message

**Solutions:**
1. Verify user exists in Admin Panel > Users
2. Check exact spelling (case-insensitive)
3. If user doesn't exist:
   - Admin creates user via "Bulk Create" or "Add Single User"
4. Default password is always: `Amber@2024`
5. Try clearing browser cache/cookies

### Issue: Bulk User Creation Not Working

**Symptoms:**
- Progress bar stuck
- Error messages
- Users not appearing

**Solutions:**
1. Check browser console (F12) for errors
2. Verify Supabase connection in .env file
3. Check Supabase Auth settings:
   - Email confirmation should be disabled
   - Auto-confirm enabled
4. Try creating one user manually first to test
5. If still failing, contact system administrator

### Issue: Presentation Not Generating

**Symptoms:**
- Stuck on "Generating"
- No download button appears
- Error in presentations table

**Solutions:**
1. Check Presenton API key in .env file:
   ```
   VITE_PRESENTON_API_KEY=your-presenton-key-here
   ```
2. Verify API quota hasn't been exceeded
3. Try with simpler content first
4. Wait longer (can take 60+ seconds for complex presentations)
5. Check browser console for specific errors
6. Navigate to Presentations page to see status

### Issue: AI Course Generation Failing

**Symptoms:**
- Error message "Failed to generate course"
- No content appears
- Timeout errors

**Solutions:**
1. Verify OpenAI API key in .env file
2. Check API quota/billing status
3. Try simpler topic description
4. Reduce scope (fewer modules)
5. Check browser console for errors
6. Ensure stable internet connection

### Issue: Mock Calls Not Responding

**Symptoms:**
- AI doesn't respond to messages
- Stuck on "typing..."
- Timeout errors

**Solutions:**
1. Check OpenAI API key
2. Verify API quota
3. Check browser console
4. Try without voice mode first
5. Ensure microphone permissions if using voice
6. Check network connection

### Issue: Users Can't See Assigned Courses

**Symptoms:**
- Course list empty
- "No courses assigned" message

**Solutions:**
1. Verify course status is "Published" (not "Draft")
2. Check enrollment exists in database
3. Confirm user is active (not deactivated)
4. Have user log out and log back in
5. Admin: Go to Admin Panel > Courses > Click Users icon to verify assignment

### Issue: Name Changes Not Saving

**Symptoms:**
- Edited name reverts to original
- Error when clicking checkmark

**Solutions:**
1. Ensure you're logged in as Admin
2. Check that name field is not empty
3. Verify Supabase connection
4. Check RLS policies allow update
5. Try refreshing the page and editing again

---

## Technical Details

### Database Schema

**Key Tables:**
- `user_profiles` - User information and roles
- `courses` - Course metadata
- `modules` - Course sections
- `lessons` - Individual lesson content
- `user_course_enrollments` - Assignment tracking
- `lesson_progress` - Completion tracking per lesson
- `presentations` - Generated presentations
- `mock_call_sessions` - Practice call history
- `ai_chat_history` - AI tutor conversations

### API Keys Required

Add these to your `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_PRESENTON_API_KEY=your-presenton-key-here
```

### Technology Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **AI Services**: OpenAI GPT-4, Presenton AI
- **Build Tool**: Vite
- **Routing**: React Router
- **Icons**: Lucide React

---

## Best Practices

### For Admins

1. **User Management**
   - Create all users before assigning courses
   - Use meaningful names (edit after bulk creation)
   - Deactivate users instead of deleting
   - Export user list regularly

2. **Course Creation**
   - Use AI generation for consistency
   - Always review AI content before publishing
   - Publish courses only when complete
   - Use descriptive titles

3. **Course Assignment**
   - Assign by role when possible
   - Set clear deadlines externally
   - Monitor completion reports weekly
   - Follow up with 0% progress users

4. **Reporting**
   - Export CSV reports regularly
   - Track completion trends
   - Identify popular vs unpopular courses
   - Use data to improve training

### For Users

1. **Learning**
   - Complete courses in order
   - Don't rush through content
   - Use AI Tutor for questions
   - Practice with mock calls after theory

2. **Mock Calls**
   - Try all 16 scenarios
   - Review feedback carefully
   - Repeat scenarios to improve
   - Apply learnings to real calls

3. **Presentations**
   - Be specific with content
   - Choose appropriate tone
   - Review before downloading
   - Save presentations for reference

---

## Support

For technical issues:
1. Check this guide first
2. Check browser console (F12 > Console tab)
3. Verify .env file has all API keys
4. Check Supabase dashboard for database issues
5. Contact system administrator with:
   - Screenshot of error
   - Browser console logs
   - Steps to reproduce

---

## Conclusion

The Amberstudent LMS is a comprehensive, AI-powered training platform designed to make onboarding and continuous learning effortless. With one-click user creation, AI-generated courses, realistic mock call practice, and professional presentation generation, you have everything needed to train a world-class team.

**Key Advantages:**
- ✅ Bulk create 100 users in 2 minutes
- ✅ AI generates real, comprehensive course content
- ✅ Track individual and team progress
- ✅ Practice with 16 realistic sales scenarios
- ✅ Create professional presentations instantly
- ✅ All features available to regular users
- ✅ Secure, scalable, production-ready

**Get Started Now:**
1. Login as admin: `Amberadmin001`
2. Bulk create training users
3. Generate your first AI course
4. Assign to team
5. Watch them learn and grow!
