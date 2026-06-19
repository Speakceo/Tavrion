# Amberstudent LMS - Complete Admin Guide

## Quick Start

### Step 1: Login as Admin

1. Navigate to the login page
2. Enter User ID: `Amberadmin001`
3. Default password is automatically used: `Amber@2024`
4. Click Sign In

### Step 2: Create Training Users

1. Go to **Admin Panel > Users**
2. Click **"Bulk Create Training Users"** button
3. Confirm the action
4. Wait 2-3 minutes while the system creates 100 training users (Ambertraining001-100)
5. All users will have:
   - User ID: Ambertraining001 to Ambertraining100
   - Email: ambertraining001@amberstudent.com to ambertraining100@amberstudent.com
   - Password: Amber@2024
   - Role: Employee
   - Department: Training

### Step 3: Create Courses

You have two options:

#### Option A: AI-Generated Course (Recommended)

1. Go to **Admin Panel > Courses**
2. Click **"AI Generate"** button
3. Fill in the form:
   - Course Topic: e.g., "Handling Student Objections"
   - Target Role: Sales/Operations/Support/Management
   - Country: UK/US/AU/CA
   - Include assessment quiz: Check if needed
4. Click **"Generate with AI"**
5. Wait 10-30 seconds for AI to create comprehensive course content
6. Review the generated modules and lessons
7. Click **"Save Course"**

The AI will create:
- Professional course title and description
- 3-5 detailed modules
- 2-4 lessons per module
- Comprehensive content with practical examples
- Optional quiz questions

#### Option B: Manual Course Creation

1. Go to **Admin Panel > Courses**
2. Click **"New Course"** button
3. Fill in course details manually
4. Add modules and lessons one by one
5. Upload PDFs, add questions, create content

### Step 4: Assign Courses to Users

1. Go to **Admin Panel > Courses**
2. Find the course you want to assign
3. Click the **Users icon** (green button) in the Actions column
4. A modal will open showing all active users
5. Check the boxes next to users you want to assign
6. Or click **"Select All"** to assign to all users
7. Click **"Assign to X User(s)"**
8. The course will now appear in those users' dashboards

### Step 5: Track Completion

1. Go to **Admin Panel > Courses**
2. Find the course you want to track
3. Click the **Report icon** (cyan button) in the Actions column
4. View comprehensive completion report with:
   - Total enrolled users
   - Completed, In Progress, Not Started counts
   - Average progress percentage
   - Individual user progress with lesson completion
   - Progress bars and completion dates
5. Click **"Export CSV"** to download report for external analysis

## Full Feature Guide

### User Management

#### Bulk Create Training Users
- Creates 100 users at once (Ambertraining001-100)
- All users get default password: Amber@2024
- Skips already existing users automatically
- Shows progress during creation

#### Add Single User
- Click **"Add Single User"** button
- Fill in required fields:
  - User ID (required): e.g., Amber001
  - Full Name (required): e.g., John Doe
  - Email (optional): Auto-generates if not provided as `userid@amberstudent.com`
  - Role: Employee/Trainer/Admin/Super Admin
  - Department (optional)
  - Country (optional)
- Default password is always: Amber@2024
- Success message shows the password

#### Edit User Names
- Click the **Edit icon** (pencil) next to any user
- Type the new name
- Click checkmark to save or X to cancel

#### Deactivate/Activate Users
- Click the **User X icon** to toggle user status
- Deactivated users cannot log in
- Can be reactivated at any time

### Course Management

#### AI Course Generation
**Powered by OpenAI GPT-4**

Features:
- Generate complete courses in seconds
- Creates structured modules and lessons
- Context-aware for different roles and countries
- Professional, production-ready content
- Option to include assessment quizzes

How to use:
1. Admin Panel > Courses > AI Generate
2. Enter topic (e.g., "Property Safety Guidelines", "Customer Retention Strategies")
3. Select target role and country
4. Enable quiz if needed
5. Generate and review
6. Save to add to course library

#### Export Course as Presentation
**Powered by Presenton AI**

Convert any course into a professional presentation:
1. Go to Admin Panel > Courses
2. Click the **Presentation icon** (purple button)
3. Confirm the export
4. System automatically:
   - Extracts all course content
   - Organizes modules and lessons
   - Sends to Presenton AI for slide generation
   - Creates professional PowerPoint presentation
5. Navigate to Presentations page to track progress
6. Download or preview when ready

#### Assign Courses to Users
- Individual or bulk assignment
- Modal shows all active users
- Checkbox selection with Select All option
- Prevents duplicate enrollments
- Instant assignment

#### View Completion Reports
Comprehensive analytics per course:
- **Overview Statistics**
  - Total enrolled
  - Completed count
  - In progress count
  - Not started count
  - Average progress percentage

- **Individual User Tracking**
  - User ID and name
  - Current status
  - Progress percentage with visual bar
  - Lessons completed vs total
  - Enrollment date
  - Completion date (if finished)

- **Export to CSV**
  - All data in spreadsheet format
  - Easy to analyze in Excel/Google Sheets
  - Include enrollment and completion dates

#### Delete Courses
- Click the **Trash icon** (red button)
- Confirm deletion
- Automatically removes all related:
  - Modules
  - Lessons
  - User enrollments
  - Progress data

### Presentation Generator

**Powered by Presenton AI**

Create professional presentations from scratch:

1. Go to **Presentations** (from main menu)
2. Enter your content/topic in the text area
3. Customize settings (optional):
   - Number of slides (default: 5)
   - Tone: Professional/Casual/Formal
   - Verbosity: Brief/Standard/Detailed
   - Image type: Stock photos/Illustrations
   - Language: English/Spanish/French/etc.
   - Template: General/Modern/Professional
   - Theme: Professional Blue/Corporate Green/etc.
   - Include title slide
   - Include table of contents
   - Export format: PPTX/PDF

4. Click **"Generate Presentation"**
5. Wait while AI creates slides (30-60 seconds)
6. Status updates show progress
7. Once completed:
   - Preview in browser (if available)
   - Download PPTX file
   - Share presentation URL

All presentations are saved with history:
- View past presentations
- Re-download any time
- Track generation status
- Delete old presentations

### Analytics Dashboard

Coming soon:
- Overall completion rates
- User engagement metrics
- Course popularity rankings
- Time-to-completion analytics
- Quiz performance summaries

## Complete Admin Workflow Example

### Onboarding New Sales Team

1. **Create Users**
   - Click "Bulk Create Training Users" (for 100 users)
   - Or add individual users with "Add Single User"
   - Edit names to match actual employees

2. **Generate Sales Training**
   - AI Generate > Topic: "Handling Student Budget Objections"
   - Target Role: Sales
   - Country: UK
   - Include quiz: Yes
   - Generate > Review > Save

3. **Assign to Team**
   - Find the course
   - Click Users icon
   - Select all sales team members
   - Assign

4. **Track Progress**
   - Click Report icon daily
   - Monitor completion percentages
   - Export CSV for weekly reports
   - Follow up with users at 0% progress

5. **Create Presentation**
   - Export course as presentation
   - Download PPTX for team meetings
   - Use for onboarding sessions

## Authentication System

### How Login Works

- Users enter their unique ID (e.g., Ambertraining001)
- System converts to email format internally
- Authenticates with Supabase Auth
- Password is always: Amber@2024

### User ID Format

- Training users: Ambertraining001-100
- Admin users: Amberadmin001
- Custom users: Any format you create

### Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their assigned courses
- Admin/Trainer roles have elevated permissions
- Passwords are hashed in database
- Secure session management

## Database Structure

### Key Tables

- **user_profiles**: User information and roles
- **courses**: Course metadata
- **modules**: Course sections
- **lessons**: Individual lesson content
- **user_course_enrollments**: Who is assigned what
- **lesson_progress**: Tracks completion per lesson
- **presentations**: Presenton AI generated presentations
- **ai_generated_content**: History of AI generations

### Completion Tracking

Progress is calculated:
1. Count total lessons in course
2. Count completed lessons per user
3. Percentage = (completed / total) * 100
4. Status updates automatically:
   - not_started: 0% progress
   - in_progress: 1-99% progress
   - completed: 100% progress

## Technical Features

### Real AI Integration

- **OpenAI GPT-4**: Course content generation
- **Presenton AI**: Presentation slide creation
- No dummy data - all real API calls
- Professional, production-ready output

### Database

- **Supabase PostgreSQL**: Reliable cloud database
- Automatic backups
- Row Level Security
- Real-time subscriptions
- Cascade deletes for data integrity

### Frontend

- **React + TypeScript**: Type-safe development
- **Tailwind CSS**: Beautiful, responsive design
- **React Router**: Smooth navigation
- **Lucide Icons**: Professional iconography

## Troubleshooting

### Login Issues

**Problem**: "Invalid User ID" error

**Solution**:
1. Verify user exists in Admin > Users
2. Check exact spelling (case-insensitive but must match)
3. If user doesn't exist, create them first
4. Default password is always: Amber@2024

### Course Generation Issues

**Problem**: AI generation fails

**Solution**:
1. Check OpenAI API key is valid in .env
2. Verify API quota hasn't been exceeded
3. Try simpler topic description
4. Check browser console for errors

### Presentation Issues

**Problem**: Presentation not generating

**Solution**:
1. Check Presenton API key in .env
2. Verify content is not empty
3. Wait longer (can take 60+ seconds)
4. Check Presentations page for status
5. Error messages saved in database

### Assignment Issues

**Problem**: Users can't see assigned courses

**Solution**:
1. Verify course status is "Published" not "Draft"
2. Check user is active (not deactivated)
3. Verify enrollment record exists
4. Have user log out and back in

## Best Practices

### User Management

- Create all users before assigning courses
- Use meaningful names (not just "Training User 001")
- Deactivate users who leave instead of deleting
- Export user list regularly for backup

### Course Creation

- Use AI generation for consistency
- Review AI content before saving
- Publish courses only when complete
- Version courses instead of editing live ones
- Use descriptive titles and descriptions

### Course Assignment

- Assign courses to roles, not individuals when possible
- Set clear deadlines (external to system)
- Monitor completion reports weekly
- Follow up with users at 0% after 1 week

### Reporting

- Export CSV reports for leadership
- Track completion trends over time
- Identify popular vs unpopular courses
- Use data to improve training strategy

## Support

For technical issues:
1. Check browser console (F12) for errors
2. Verify .env file has all API keys
3. Check Supabase dashboard for database issues
4. Review error logs in presentations table

## Future Enhancements

Planned features:
- Drag-and-drop course builder
- Video lesson support
- Certificate generation on completion
- Email notifications for assignments
- Mobile app for learning on-the-go
- Advanced analytics dashboard
- Integration with HR systems
- Automated reminders for incomplete courses
