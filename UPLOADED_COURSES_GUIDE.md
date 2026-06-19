# Uploaded Courses Feature Guide

## Overview
The Uploaded Courses feature allows admins and trainers to upload PDF and PowerPoint files as course materials and assign them directly to users. This is perfect for existing training materials that don't need to be converted into interactive modules.

---

## For Admins and Trainers

### Accessing Uploaded Courses
1. Navigate to the sidebar
2. Click on "Uploaded Courses" (visible only to admins and trainers)
3. You'll see the Uploaded Courses management page

### Uploading a Course

**Step 1: Click "Upload Course"**
- Click the blue "Upload Course" button in the top right

**Step 2: Fill in Course Details**
- **Course Title** (required): Give your course a clear, descriptive name
  - Example: "Sales Training Q4 2024"
  - Example: "Safety Compliance Manual"
- **Description** (optional): Brief description of what the course covers
- **Category**: Select the appropriate category
  - Options: General, Sales, Customer Service, Product, Compliance, Leadership, Technical

**Step 3: Upload File**
- Click "Click to upload" in the file upload area
- Select your PDF, PPT, or PPTX file
- File size limit: 50MB
- Supported formats: `.pdf`, `.ppt`, `.pptx`

**Step 4: Upload**
- Click "Upload Course" button
- Wait for confirmation message
- File is securely stored in Supabase Storage

### Assigning Courses to Users

**Option 1: From Upload Success**
1. After uploading, find the course in the list
2. Click the "Assign" button on the course card

**Option 2: From Course List**
1. Browse your uploaded courses
2. Click "Assign" on any course card

**Assignment Modal:**
1. Select users from the list (checkboxes)
2. View user roles to assign appropriately
3. Click "Assign to X user(s)" button
4. Users can immediately see and download the file

### Managing Uploaded Courses

**View Courses:**
- All uploaded courses appear as cards
- Each card shows:
  - Course title
  - Description
  - File type (PDF, PPT, PPTX)
  - File size
  - Upload date
  - Action buttons

**Search and Filter:**
- Use the search box to find courses by title or description
- Use the filter dropdown to show only specific file types

**Download Course:**
- Click "Download" button on any course card
- File downloads to your computer
- Useful for reviewing content before assigning

**Delete Course:**
- Click the trash icon on any course card
- Confirm deletion
- File is removed from storage
- All user assignments are also removed

---

## For Users (Employees, Partners)

### Viewing Assigned Courses

**Dashboard Access:**
1. Log in and go to your Dashboard
2. Scroll down to "Uploaded Course Materials" section
3. Only appears if you have assigned PDF/PPT courses

**Course Information:**
Each assigned course shows:
- Course title and description
- File type badge (PDF, PPT, PPTX)
- File size
- Assignment status
  - **Assigned**: Not yet downloaded
  - **Downloaded**: You've downloaded it at least once
  - **Completed**: Marked as complete (future feature)

### Downloading Course Materials

**Simple Download:**
1. Find the course in "Uploaded Course Materials"
2. Click the blue "Download" button
3. File downloads to your device
4. Status automatically updates to "Downloaded"

**Accessing Downloaded Files:**
- Files download to your browser's default download location
- Open with appropriate application:
  - PDFs: Any PDF reader (Adobe, Preview, browser)
  - PPT/PPTX: Microsoft PowerPoint, Google Slides, Keynote

---

## Technical Details

### Database Schema

**Tables Created:**
1. `uploaded_courses` - Stores course metadata and file references
2. `uploaded_course_assignments` - Tracks which users are assigned which courses

**Storage:**
- Uses Supabase Storage bucket: `course-files`
- Files are securely stored with access control
- Only assigned users can download files

### Security (Row Level Security)

**Uploaded Courses Table:**
- All authenticated users can view course list
- Only admins/trainers can upload, edit, or delete
- File access controlled separately

**Assignments Table:**
- Users can only see their own assignments
- Admins/trainers can see all assignments
- Only admins/trainers can create/delete assignments

**Storage Policies:**
- Admins/trainers can upload and delete files
- Users can only download files they're assigned to
- File paths are not guessable (timestamp + sanitized name)

### File Handling

**Supported Formats:**
- PDF (`.pdf`)
- PowerPoint (`.ppt`, `.pptx`)

**File Size:**
- Maximum: 50MB per file
- Recommended: Under 10MB for faster downloads

**File Naming:**
- Files are renamed on upload: `timestamp_sanitized-name.ext`
- Prevents conflicts and security issues
- Original filename is preserved in metadata

### Status Tracking

**Assignment Statuses:**
1. **assigned** - Initial state when course is assigned
2. **viewed** - User has viewed the course (future feature)
3. **downloaded** - User has downloaded the file
4. **completed** - User has marked as complete (future feature)

**Automatic Updates:**
- Status changes to "downloaded" on first download
- `viewed_at` timestamp recorded on download
- Future: Add manual completion marking

---

## Use Cases

### When to Use Uploaded Courses

**Best For:**
- Existing PDF training materials
- PowerPoint presentations from workshops
- Compliance documents that must be distributed
- Reference materials and handbooks
- One-time training sessions
- External vendor training materials

**Examples:**
1. "Safety Manual 2024.pdf"
2. "Sales Pitch Deck.pptx"
3. "Employee Handbook.pdf"
4. "Product Training Slides.ppt"
5. "Compliance Certification.pdf"

### When to Use Interactive Courses Instead

**Better as Interactive Courses:**
- Multi-module training programs
- Courses requiring progress tracking
- Content with quizzes and assessments
- Lessons needing AI tutor support
- Training requiring mock call practice
- Courses with multiple lessons and structure

---

## Workflows

### Quick Upload and Assign Workflow

**Time: ~2 minutes**

1. Go to Admin → Uploaded Courses
2. Click "Upload Course"
3. Fill in:
   - Title: "Q4 Sales Training"
   - Category: Sales
   - Upload: sales-q4-2024.pdf
4. Click "Upload Course"
5. Click "Assign" on the new course
6. Select target users
7. Click "Assign to X user(s)"
8. Done! Users can now download

### Bulk Upload Workflow

**For Multiple Files:**

1. Prepare files on your computer:
   - Name them clearly
   - Organize by category
   - Check file sizes

2. Upload one at a time:
   - Go to Uploaded Courses
   - Upload first file
   - Assign to relevant users
   - Repeat for each file

3. Verify:
   - Check all files appear in list
   - Test download on one file
   - Confirm users see assignments

### User Download Workflow

**Employee Perspective:**

1. Log in to dashboard
2. See "Uploaded Course Materials" section
3. Read course title and description
4. Click "Download" button
5. Open downloaded file
6. Complete training
7. (Optional) Mark as complete when feature available

---

## Best Practices

### For Admins Uploading

**File Preparation:**
- ✅ Use clear, descriptive titles
- ✅ Add meaningful descriptions
- ✅ Compress large files before uploading
- ✅ Ensure files are final versions
- ✅ Test files open correctly before uploading
- ❌ Don't upload draft versions
- ❌ Don't use special characters in filenames
- ❌ Don't upload confidential content without proper assignment

**Assignment Strategy:**
- ✅ Assign to relevant roles/departments
- ✅ Provide context in description
- ✅ Set expectations for completion
- ✅ Follow up on downloads
- ❌ Don't mass-assign to everyone
- ❌ Don't assign without context

**Organization:**
- Use consistent naming conventions
- Group related courses by category
- Update or delete outdated materials
- Regular cleanup of old files

### For Users

**Download Management:**
- Download to organized folders
- Rename if needed for clarity
- Keep offline copies if needed
- Delete after completion to save space

**Completion:**
- Download promptly after assignment
- Review thoroughly
- Ask questions if unclear
- Provide feedback to trainers

---

## Troubleshooting

### Upload Issues

**Problem: Upload fails**
- Check file size (must be under 50MB)
- Verify file format (PDF, PPT, PPTX only)
- Check internet connection
- Try refreshing page and re-uploading

**Problem: File too large**
- Compress PDF using online tools
- Reduce image quality in PowerPoint
- Split into multiple files
- Convert to different format

### Download Issues

**Problem: Download doesn't start**
- Check browser popup blockers
- Verify you're assigned to the course
- Try different browser
- Check internet connection

**Problem: File won't open**
- Verify you have appropriate software
- Check file isn't corrupted
- Try downloading again
- Contact admin if persistent

### Assignment Issues

**Problem: User can't see course**
- Verify assignment was successful
- Check user is logged in
- Have user refresh dashboard
- Verify user account is active

**Problem: Wrong users assigned**
- Delete existing assignments
- Re-assign to correct users
- Users may need to refresh

---

## Integration with Existing Features

### Complements Interactive Courses

**Combined Approach:**
1. Create interactive course modules
2. Upload related PDF reference materials
3. Assign both to same users
4. Users get structured learning + reference docs

**Example:**
- Interactive Course: "Sales Fundamentals" (modules with lessons)
- Uploaded Course: "Sales Playbook 2024.pdf" (reference material)
- Both assigned to sales team

### Works with Presentations

**Content Reuse:**
1. Generate presentation from interactive course
2. Download as HTML
3. Convert to PDF or PowerPoint
4. Upload as "Uploaded Course" for offline access
5. Assign to users who need offline version

---

## Roadmap

### Current Features (v1.0)
- ✅ Upload PDF, PPT, PPTX files
- ✅ Assign courses to users
- ✅ Download tracking
- ✅ Search and filter
- ✅ Secure file storage
- ✅ Role-based access control

### Planned Enhancements
- 📋 Completion marking by users
- 📋 Completion tracking and reporting
- 📋 Due dates for assignments
- 📋 Email notifications on assignment
- 📋 Bulk upload (multiple files at once)
- 📋 Inline preview (view without downloading)
- 📋 Comments and discussions per course
- 📋 Version control for updated files
- 📋 Analytics on downloads and completion

---

## API Endpoints

### Database Tables

**uploaded_courses**
```sql
id              uuid (PK)
title           text
description     text
file_name       text
file_path       text
file_type       text ('pdf', 'ppt', 'pptx')
file_size       bigint
category        text
uploaded_by     uuid (FK → user_profiles)
created_at      timestamptz
updated_at      timestamptz
```

**uploaded_course_assignments**
```sql
id              uuid (PK)
course_id       uuid (FK → uploaded_courses)
user_id         uuid (FK → user_profiles)
assigned_by     uuid (FK → user_profiles)
status          text ('assigned', 'viewed', 'downloaded', 'completed')
viewed_at       timestamptz
completed_at    timestamptz
created_at      timestamptz
```

### Storage Bucket

**Bucket Name:** `course-files`
**Public:** No (requires authentication)
**Path:** Files stored with timestamped names

### Example Queries

**Get User's Assigned Courses:**
```javascript
const { data } = await supabase
  .from('uploaded_course_assignments')
  .select(`
    *,
    course:uploaded_courses(*)
  `)
  .eq('user_id', userId);
```

**Upload File:**
```javascript
const filePath = `${Date.now()}_${sanitizedFileName}`;
await supabase.storage
  .from('course-files')
  .upload(filePath, file);
```

**Download File:**
```javascript
const { data } = await supabase.storage
  .from('course-files')
  .download(filePath);
```

---

## Summary

The Uploaded Courses feature provides a simple, secure way to distribute PDF and PowerPoint training materials to users. It complements the interactive course system by allowing quick distribution of existing materials without requiring conversion to modules and lessons.

**Key Benefits:**
- Quick deployment of existing materials
- Secure file storage and access control
- User-friendly interface for both admins and users
- Automatic download tracking
- Integrates seamlessly with existing LMS features

**Perfect For:**
- Reference documents
- Presentation files
- Compliance materials
- Quick training distribution
- Supplementary materials

For more complex, interactive training, continue using the full course creation system with modules, lessons, and AI generation.
