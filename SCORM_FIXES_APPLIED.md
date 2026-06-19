# SCORM Player Fixes - Blank Screen Issue

## Problem
SCORM courses uploaded as ZIP files showed "SCORM loaded" but displayed a blank white screen when opened.

## Root Causes Identified

1. **iframe `sandbox` attribute was blocking API discovery**
   - The sandbox attribute prevented the iframe from accessing `window.parent`
   - SCORM content needs to traverse up through parent windows to find the LMS API
   - Without parent access, content couldn't initialize properly

2. **Complex SCORM shim was causing conflicts**
   - Previous implementation tried to override window.location
   - Created unnecessary complexity in API discovery
   - Could fail in certain SCORM authoring tool outputs

3. **Potential CSS hiding content**
   - Some SCORM packages have CSS that hides content
   - No forced visibility rules to ensure content displays

4. **Insufficient diagnostics**
   - Hard to determine if content loaded but was hidden
   - No visibility into iframe rendering issues

## Fixes Applied

### 1. Removed iframe Sandbox Attribute
**File**: `src/components/ScormPlayer.tsx`

**Before:**
```tsx
<iframe
  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals"
  ...
/>
```

**After:**
```tsx
<iframe
  allow="fullscreen"
  ...
/>
```

**Why**: The sandbox attribute was preventing the iframe from accessing `window.parent`, which is **required** for standard SCORM API discovery. The SCORM specification requires content to search up through parent windows to find the API object.

### 2. Simplified SCORM API Discovery
**File**: `src/components/ScormPlayer.tsx` - `injectScormShims()` function

**Changes:**
- Removed complex location.href override attempts
- Focused on standard SCORM API finding algorithm
- Added clear logging at each step
- Searches up to 7 parent window levels (per SCORM spec)
- Sets both `window.API` (SCORM 1.2) and `window.API_1484_11` (SCORM 2004)

**Key Code:**
```javascript
function findAPI(win) {
  let attempts = 0;
  const maxAttempts = 7;

  while (win && attempts < maxAttempts) {
    if (win.API) return win.API;
    if (win.API_1484_11) return win.API_1484_11;

    if (win.parent && win.parent !== win) {
      attempts++;
      win = win.parent;
    } else {
      break;
    }
  }
  return null;
}
```

### 3. Added CSS Visibility Enforcement
**File**: `src/components/ScormPlayer.tsx` - `injectScormShims()` function

**Added:**
```css
html, body {
  margin: 0 !important;
  padding: 0 !important;
  width: 100% !important;
  height: 100% !important;
  overflow: auto !important;
  display: block !important;
  visibility: visible !important;
}
body {
  min-height: 100vh !important;
}
```

**Why**: Forces the body and html elements to be visible, preventing common CSS hiding issues in SCORM packages.

### 4. Enhanced Visual Indicators
**File**: `src/components/ScormPlayer.tsx`

**Added:**
- "SCORM API Ready" indicator (top right)
- "Open Console (F12) for detailed logs" indicator (bottom left)
- Both are non-interactive (`pointer-events-none`)

### 5. Comprehensive Diagnostics
**File**: `src/components/ScormPlayer.tsx` - iframe `onLoad` handler

**Added automatic checks after 2 seconds:**
- Counts visible elements
- Logs computed styles of body
- Logs computed styles of all direct children
- Shows exact CSS values (display, visibility, opacity, dimensions)
- Helps identify if content is loaded but hidden

**Console Output Example:**
```
[SCORM Player] 🔍 Visibility check after 2 seconds: 3 visible elements
[SCORM Player] 🎨 Body computed styles: {
  display: "block",
  visibility: "visible",
  opacity: "1",
  width: "1200px",
  height: "800px"
}
```

### 6. Better Error Handling
**File**: `src/components/ScormPlayer.tsx`

- Catch and log blob URL fetch failures
- Suppress empty URL errors gracefully
- Show detailed error messages with troubleshooting tips
- Added "Try Again" button to retry without closing

## Testing Your SCORM Courses

### Before Testing
1. Clear browser cache (Ctrl+Shift+Delete)
2. Open browser console (F12)
3. Keep console open during test

### What to Look For

**Success Indicators:**
```
✅ [SCORM Shim] ✓ Found API (SCORM 1.2) on attempt 1
✅ [SCORM Player] ✓ Body has content, length: 50000
✅ [SCORM Player] 👁️ Total elements: 100 Visible: 85
```

**Failure Indicators:**
```
❌ [SCORM Shim] ⚠️ No API found after 7 attempts
❌ [SCORM Player] ⚠️ WARNING: Iframe body is completely empty!
❌ [SCORM Player] 👁️ Total elements: 100 Visible: 0
```

### Test Cases

1. **Test with your uploaded courses**
   - Go to Courses page
   - Click "View Course" on "test222"
   - Click "View Course" on "Test scorm"
   - Watch console for messages

2. **Check for API connection**
   - Should see: `✓ Found API (SCORM 1.2) on attempt 1`
   - If not, the API setup failed

3. **Check for content rendering**
   - After 2 seconds, check visibility report
   - Should see multiple visible elements
   - If visible elements = 0, content is hidden

## Known Limitations

1. **SCORM 2004 4th Edition**
   - Our implementation supports SCORM 1.2 and SCORM 2004 3rd Edition
   - 4th Edition may have compatibility issues

2. **Very old SCORM packages**
   - Packages from legacy authoring tools (pre-2010) may have issues
   - May require specific browser versions or plugins

3. **Packages with external dependencies**
   - Content that loads external scripts/resources will fail
   - All resources must be in the ZIP package

## Troubleshooting Guide

See `SCORM_TROUBLESHOOTING.md` for:
- Step-by-step diagnosis procedures
- Common error patterns
- Console message interpretation
- Quick fixes for common issues

## Reference Implementation

The fixes are based on the SCORM specification and best practices from:
- SCORM 1.2 and 2004 API specifications
- ADL SCORM test suite patterns
- Industry-standard implementations like scorm-again library

Key principle: **The SCORM API must be discoverable through standard window traversal**, which requires removing any iframe sandboxing that prevents parent window access.
