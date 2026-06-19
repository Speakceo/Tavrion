# SCORM Course Troubleshooting Guide

## Overview
This guide helps you troubleshoot issues with uploaded SCORM courses in your LMS.

## Latest Fixes (v2)

### Critical Fixes for Blank Screen Issues

1. **Removed iframe sandbox attribute**
   - Previously preventing iframe from accessing parent window to find SCORM API
   - Now iframe can properly traverse window.parent to discover the API

2. **Simplified SCORM API discovery**
   - Focused on standard SCORM API finding algorithm
   - Searches up through parent windows (up to 7 levels)
   - Better logging to show exactly where API is found

3. **Added CSS injection**
   - Forces html/body to be visible
   - Ensures minimum height of 100vh
   - Prevents common hiding issues

4. **Enhanced diagnostics**
   - Visual indicators showing "SCORM API Ready"
   - Prompt to open console for detailed logs
   - Automatic visibility checks after 2 seconds
   - Logs computed styles of body and children

5. **Better error suppression**
   - Handles empty URL errors gracefully
   - Prevents blob URL errors from breaking content
   - Logs warnings instead of throwing errors

## Previous Fixes (v1)

### 1. Enhanced Error Messages
- Added detailed error messages showing exactly what went wrong
- Included troubleshooting tips in error displays
- Added a "Try Again" button to retry loading

### 2. Loading Progress Indicators
The SCORM player now shows detailed progress messages:
- "Downloading SCORM package..."
- "Extracting ZIP archive..."
- "Processing SCORM content..."
- "Extracted X files. Processing HTML content..."
- "Launching SCORM content..."

### 3. Better Logging
- Comprehensive console logging for debugging
- File size verification
- Download error details with status codes

## How to Upload SCORM Courses

### Step 1: Prepare Your SCORM Package
Your SCORM ZIP file MUST contain:
- `imsmanifest.xml` - The SCORM manifest file
- `index.html` or other entry HTML file
- All referenced assets (CSS, JS, images, etc.)

### Step 2: Upload via Admin Panel
1. Go to **Admin > Uploaded Courses**
2. Click **Upload New Course**
3. Select your SCORM ZIP file
4. Fill in title and description
5. Click **Upload**

### Step 3: Assign to Users
1. Find your uploaded course in the list
2. Click **Assign**
3. Select users to assign the course to
4. Click **Assign to Selected Users**

### Step 4: Users Access Course
1. Users go to **Courses** page
2. Find the assigned course under "Uploaded Courses"
3. Click **View Course** button
4. SCORM player opens and loads the content

## Common Issues and Solutions

### Issue: Blank Screen After Clicking "View Course"

**Possible Causes:**
1. **Invalid SCORM Package**: The ZIP file is not a valid SCORM package
2. **Missing imsmanifest.xml**: The manifest file is missing or invalid
3. **Incorrect File Structure**: Files are nested in wrong directories
4. **Content has hidden elements**: SCORM content CSS is hiding elements
5. **SCORM API not found**: Content can't find the LMS API
6. **JavaScript errors**: Content has errors preventing rendering

**Step-by-Step Diagnosis:**

1. **Open Browser Console (F12)**
   - Click F12 or right-click → Inspect → Console tab
   - Keep console open while loading the SCORM course

2. **Watch for SCORM Shim Messages**
   Look for these key messages:
   ```
   [SCORM Shim] Starting initialization
   [SCORM Shim] Searching for API...
   [SCORM Shim] ✓ Found API (SCORM 1.2) on attempt 1
   [SCORM Shim] ✓ API (SCORM 1.2) set on current window
   [SCORM Shim] ✓ Initialization complete
   ```

3. **Check API Discovery**
   If you see:
   - ✅ `✓ Found API` - GOOD! API is connected
   - ❌ `⚠️ No API found` - BAD! Content can't communicate with LMS
   - ❌ `Cannot access parent window` - BAD! Security issue

4. **Check Iframe Load Status**
   Look for:
   ```
   [SCORM Player] 🎯 Iframe onLoad triggered
   [SCORM Player] 📄 Iframe document details
   [SCORM Player] ✓ Body has content, length: XXXX
   [SCORM Player] 👁️ Total elements: XX Visible: XX
   ```

5. **Look for Visibility Issues**
   After 2 seconds, you'll see diagnostic info:
   ```
   [SCORM Player] 🔍 Visibility check after 2 seconds: X visible elements
   [SCORM Player] 🎨 Body computed styles: {...}
   ```

   Check the computed styles:
   - `display` should NOT be "none"
   - `visibility` should NOT be "hidden"
   - `opacity` should NOT be "0"
   - `width` and `height` should have values

**Common Console Patterns:**

**PATTERN 1: API Not Found (CRITICAL)**
```
[SCORM Shim] ⚠️ No API found after 7 attempts
[SCORM Shim] ❌ CRITICAL: No API found in parent windows!
```
**Solution**: Reload the page. If it persists, the SCORM API setup is broken.

**PATTERN 2: Content Loaded But Hidden**
```
[SCORM Player] ✓ Body has content, length: 50000
[SCORM Player] 👁️ Total elements: 100 Visible: 0
```
**Solution**: The content is there but CSS is hiding it. Check computed styles in console.

**PATTERN 3: Empty Body**
```
[SCORM Player] ⚠️ WARNING: Iframe body is completely empty!
```
**Solution**: The HTML file might be invalid or not loading properly.

**Quick Fixes:**

1. **Reload the page and try again**
2. **Clear browser cache**: Ctrl+Shift+Delete (Chrome)
3. **Try a different browser**: Test in Chrome, Firefox, or Edge
4. **Check for JavaScript errors**: Look for red errors in console
5. **Verify SCORM package structure** (see below)

### Issue: "Failed to Download SCORM Package"

**Possible Causes:**
1. File was not uploaded successfully to storage
2. File path is incorrect
3. Storage permissions issue

**Solutions:**
1. Re-upload the course file
2. Check the browser console for the exact error message
3. Contact admin to verify storage bucket permissions

### Issue: SCORM Content Loads But Doesn't Track Progress

**Possible Causes:**
1. SCORM content is not calling the API correctly
2. Content is SCORM 2004 instead of SCORM 1.2
3. JavaScript errors in the content

**Solutions:**
1. Check browser console for SCORM API calls
2. Verify the SCORM version (our LMS supports SCORM 1.2 and 2004)
3. Test with our sample SCORM course first

## Testing Your SCORM Courses

### Test with Sample Course
We provide a built-in test SCORM course:
1. Go to **Courses**
2. Find "SCORM Test Course"
3. Open "Interactive SCORM Lesson"
4. This course should load and work perfectly
5. If this doesn't work, there's a system issue

### Validate Your SCORM Package
Before uploading, validate your SCORM package:
1. Extract the ZIP and verify `imsmanifest.xml` exists
2. Open `imsmanifest.xml` in a text editor
3. Verify it contains `<manifest>` and `<resources>` tags
4. Check that the `href` attribute points to your entry file

Example valid manifest:
```xml
<?xml version="1.0"?>
<manifest identifier="course_id" version="1.0">
  <organizations>
    <organization identifier="org1">
      <title>My Course</title>
      <item identifier="item1" identifierref="resource1">
        <title>Lesson 1</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="resource1" type="webcontent" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>
```

## Browser Console Debugging

To see detailed SCORM loading information:
1. Open your browser's Developer Tools (F12)
2. Go to the Console tab
3. Click "View Course" on a SCORM package
4. Watch for messages starting with `[SCORM Player]`
5. Look for errors (shown in red)

Key things to check:
- ✅ "File downloaded successfully" - File downloaded OK
- ✅ "Extracted X files from ZIP" - ZIP extraction worked
- ✅ "Launch file from manifest: index.html" - Found entry point
- ✅ "Setting launch URL" - Ready to display
- ✅ "Iframe onLoad triggered" - Content loaded in iframe
- ❌ "Download error" - File couldn't be downloaded
- ❌ "No HTML launch file found" - Missing entry point

## Getting Help

If you continue to have issues:

1. **Check the error message**: The new error display shows exactly what went wrong
2. **Try the retry button**: Click "Try Again" in the error display
3. **Test with sample course**: Verify the built-in SCORM test course works
4. **Check browser console**: Look for detailed error messages
5. **Verify SCORM package**: Use a SCORM validation tool
6. **Re-upload the course**: Sometimes files get corrupted

## Technical Details

### SCORM API Support
Our LMS provides full SCORM 1.2 and SCORM 2004 API support:
- `LMSInitialize()` / `Initialize()`
- `LMSFinish()` / `Terminate()`
- `LMSGetValue()` / `GetValue()`
- `LMSSetValue()` / `SetValue()`
- `LMSCommit()` / `Commit()`

### Tracked Data Elements
- `cmi.core.lesson_status` - Completion status
- `cmi.core.score.raw` - Score
- `cmi.core.lesson_location` - Bookmark position
- `cmi.core.session_time` - Time spent
- `cmi.suspend_data` - Custom data persistence

### Browser Compatibility
Tested and working on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Advanced: Creating SCORM Packages

If you're creating your own SCORM content:

1. **Use a SCORM authoring tool**: Articulate Storyline, Adobe Captivate, iSpring
2. **Or create manually**:
   - Create an `imsmanifest.xml` file
   - Include SCORM API wrapper JavaScript
   - Call API methods to track progress
   - Export as ZIP with all files at root level

3. **Test before uploading**:
   - Extract and verify all files are present
   - Open `index.html` locally to check for errors
   - Use a SCORM validator tool
   - Test in ADL SCORM test suite if available

## Support

For additional help:
- Check browser console for detailed error messages
- Use the "Try Again" button on error screens
- Re-upload courses that aren't working
- Contact your LMS administrator
