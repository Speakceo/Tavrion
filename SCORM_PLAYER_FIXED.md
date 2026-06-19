# SCORM Player - Complete Rewrite

## What Was Fixed

The SCORM Player has been completely rewritten with a more robust approach to handle SCORM packages properly.

### Key Improvements

1. **Better Content Processing**
   - Wraps SCORM content in a custom HTML shell
   - Automatically resolves all relative paths (scripts, stylesheets, images)
   - Converts all resources to blob URLs for proper iframe loading
   - **Handles query parameters in launch URLs** (e.g., `launchpage.html?content=playing`)

2. **Improved SCORM API Access**
   - API is exposed on the parent window
   - Iframe content can access via `window.parent.API` or `window.parent.API_1484_11`
   - Automatic API detection and initialization
   - Supports both SCORM 1.2 and SCORM 2004

3. **Query Parameter Support**
   - Separates file path from query parameters
   - Preserves query parameters in final iframe URL
   - Makes query parameters accessible via `window.location.search`
   - Provides `window.queryParams` object for easy access

4. **Comprehensive Debugging**
   - Real-time debug logging to console (check browser DevTools)
   - Debug information displayed in error screen
   - Timestamped log entries for troubleshooting
   - Clear error messages

5. **Enhanced Error Handling**
   - Detailed error messages
   - Shows debug log when errors occur
   - Lists all processing steps
   - Helps identify exactly where issues occur

## How to Use

1. **Upload SCORM Package**
   - Go to Admin → Uploaded Courses
   - Click "Upload Course"
   - Select your SCORM .zip file
   - Fill in title and description
   - Click "Upload"

2. **Preview SCORM Content**
   - Find your uploaded course in the list
   - Click the green "Preview" button
   - Wait for the content to load

## Troubleshooting

### If Preview Shows Blank Screen

1. **Check Browser Console**
   - Open DevTools (F12 or right-click → Inspect)
   - Go to Console tab
   - Look for `[SCORM]` messages
   - These will show you exactly what's happening

2. **Look for Debug Info**
   - If an error occurs, the error modal will show debug information
   - Read through the timestamped log entries
   - They show each step of the loading process

### Common Issues and Solutions

#### Issue: "imsmanifest.xml not found"
**Solution**: Your SCORM package is missing the required manifest file. Ensure your .zip file contains `imsmanifest.xml` at the root level.

#### Issue: "Launch page not found"
**Solution**: The manifest references a file that doesn't exist in the package. Check the debug log to see which files were found vs. which file was requested.

#### Issue: "Failed to get download URL"
**Solution**: There's an issue with Supabase storage access. Verify the file was uploaded correctly and storage policies are set up properly.

#### Issue: SCORM content loads but buttons don't work
**Solution**: This is likely an issue with the SCORM content itself. Check the console for JavaScript errors from the SCORM package.

#### Issue: Content shows but doesn't track progress
**Solution**: The SCORM package may not be calling the LMS API correctly. Check console for `[SCORM Content]` messages to see if API is found.

### Debug Log Messages

The player logs these key events:
- `Starting SCORM package initialization...` - Beginning of load process
- `Package downloaded: X MB` - Package successfully fetched
- `ZIP extracted: X files` - Number of files in package
- `Manifest found and loaded` - Manifest successfully read
- `SCORM version detected: X` - Which SCORM version (1.2 or 2004)
- `Launch page: X` - Which HTML file will be loaded
- `Processed X files` - How many files were converted
- `SCORM API initialized and exposed to window` - API ready for use
- `Creating iframe with processed content...` - About to display content
- `Iframe loaded successfully` - Content visible

### What the Player Does

1. Downloads SCORM .zip from Supabase storage
2. Extracts all files from the ZIP
3. Reads imsmanifest.xml to find launch page
4. Converts all files to blob URLs
5. Processes launch HTML to replace relative URLs
6. Wraps content in custom HTML shell
7. Initializes SCORM 1.2 or 2004 API
8. Loads content in iframe
9. Tracks all SCORM API calls (Initialize, GetValue, SetValue, Commit, Terminate)
10. Saves progress to database

## Testing with Sample SCORM

You can test with this free SCORM package:
- Download from: https://scorm.com/scorm-solved/scorm-sample-course/
- It's a simple SCORM 1.2 package that should work perfectly

## Browser Compatibility

The player works in:
- Chrome/Edge (recommended)
- Firefox
- Safari

**Note**: Some older SCORM packages may use Flash or other deprecated technologies that won't work in modern browsers.

## Console Commands for Debugging

You can test the SCORM API from the browser console:

```javascript
// Check if API is available
console.log('SCORM 1.2 API:', window.API);
console.log('SCORM 2004 API:', window.API_1484_11);

// For SCORM 1.2
if (window.API) {
  console.log('Student Name:', window.API.LMSGetValue('cmi.core.student_name'));
  console.log('Lesson Status:', window.API.LMSGetValue('cmi.core.lesson_status'));
}

// For SCORM 2004
if (window.API_1484_11) {
  console.log('Learner Name:', window.API_1484_11.GetValue('cmi.learner_name'));
  console.log('Completion Status:', window.API_1484_11.GetValue('cmi.completion_status'));
}
```

## Next Steps

If you're still experiencing issues after checking the console and debug logs:

1. Verify your SCORM package is valid (test it in another SCORM player like SCORM Cloud)
2. Check that all files are included in the .zip
3. Ensure imsmanifest.xml is at the root of the .zip
4. Try a known-good SCORM package to rule out player issues
5. Check browser console for any CORS or security errors

## Support

If you encounter specific errors, please provide:
1. The complete console log (all `[SCORM]` messages)
2. The debug information from the error screen
3. The SCORM package you're testing with (if possible)
4. Your browser and version
