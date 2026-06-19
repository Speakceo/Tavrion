# SCORM Query Parameters Fix

## Issue
SCORM packages with query parameters in their launch URLs were failing to load with the error:
```
Launch page "shared/launchpage.html?content=playing" not found in package
```

## Root Cause
The manifest file specified a launch page like `shared/launchpage.html?content=playing`, but the player was looking for a file with that exact name (including the query string) inside the ZIP file. The actual file was just `shared/launchpage.html`.

## Solution
The SCORM player now:

1. **Separates the path from query parameters**
   ```typescript
   const launchPagePath = launchPage.split('?')[0];  // "shared/launchpage.html"
   const launchPageQuery = launchPage.includes('?')
     ? launchPage.substring(launchPage.indexOf('?'))  // "?content=playing"
     : '';
   ```

2. **Looks up the file using just the path**
   ```typescript
   const launchBlob = fileMap.get(launchPagePath);  // Find actual file
   ```

3. **Appends query parameters to the final blob URL**
   ```typescript
   const finalUrlWithQuery = finalUrl + launchPageQuery;
   iframe.src = finalUrlWithQuery;
   ```

4. **Makes query parameters accessible to SCORM content**
   - Via `window.location.search` (standard browser API)
   - Via `window.queryParams` object (parsed for convenience)
   - Logs query parameters to console for debugging

## How It Works

### Before (Broken)
1. Manifest says: `shared/launchpage.html?content=playing`
2. Player looks for: `shared/launchpage.html?content=playing` ❌
3. File doesn't exist with that name
4. Error: "Launch page not found"

### After (Fixed)
1. Manifest says: `shared/launchpage.html?content=playing`
2. Player splits into:
   - Path: `shared/launchpage.html`
   - Query: `?content=playing`
3. Player finds file: `shared/launchpage.html` ✓
4. Player creates blob URL and appends query: `blob:http://...xyz?content=playing`
5. Content loads with query parameters accessible

## Query Parameter Access in SCORM Content

The wrapped SCORM content can now access query parameters in three ways:

### 1. Standard Browser API
```javascript
// Get the full query string
const search = window.location.search;  // "?content=playing"
```

### 2. URLSearchParams (Modern)
```javascript
const params = new URLSearchParams(window.location.search);
const content = params.get('content');  // "playing"
```

### 3. Pre-parsed Object (Legacy Support)
```javascript
// Player provides this for convenience
const content = window.queryParams.content;  // "playing"
```

## Debug Output

The player now logs:
```
[SCORM] Launch page: shared/launchpage.html?content=playing
[SCORM] Launch page path: shared/launchpage.html, query: ?content=playing
[SCORM] Final URL: blob:http://localhost:5173/xyz123?content=playing
[SCORM Content] Query string: content=playing
[SCORM Content] Parsed query params: {content: "playing"}
```

## Testing

To verify the fix works:
1. Upload a SCORM package with query parameters in the launch URL
2. Click Preview
3. Open browser DevTools (F12)
4. Check Console for the debug messages above
5. Content should load and display properly

## Common Use Cases

SCORM packages use query parameters for:
- **Content selection**: `?content=lesson1`, `?content=quiz`
- **Mode selection**: `?mode=test`, `?mode=practice`
- **Configuration**: `?lang=en`, `?theme=dark`
- **State**: `?resume=true`, `?attempts=2`

All of these patterns now work correctly.

## Files Modified

- `src/components/ScormPlayer.tsx`
  - Added query parameter parsing
  - Separated path from query string
  - Appended query params to final URL
  - Added JavaScript to parse and expose query params to content

## Build Status
✅ Build successful
✅ No errors
✅ Ready to use
