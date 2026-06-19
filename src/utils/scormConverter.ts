import JSZip from 'jszip';
import { validateScormPackage, type ScormValidationResult } from './scormValidator';

export interface ConversionResult {
  success: boolean;
  convertedBlob?: Blob;
  originalValidation: ScormValidationResult;
  fixesApplied: string[];
  errors: string[];
}

export async function convertScormForCompatibility(file: File): Promise<ConversionResult> {
  const result: ConversionResult = {
    success: false,
    originalValidation: {
      isValid: false,
      version: 'unknown',
      errors: [],
      warnings: [],
    },
    fixesApplied: [],
    errors: [],
  };

  try {
    result.originalValidation = await validateScormPackage(file);

    const zip = new JSZip();
    const originalZip = await zip.loadAsync(file);

    const manifestKey = Object.keys(originalZip.files).find(k => k.toLowerCase().endsWith('imsmanifest.xml'));
    if (!manifestKey) {
      result.errors.push('No manifest file found');
      return result;
    }

    const manifestFile = originalZip.files[manifestKey];
    let manifestContent = await manifestFile.async('text');
    const parser = new DOMParser();
    let xmlDoc = parser.parseFromString(manifestContent, 'text/xml');

    const newZip = new JSZip();

    let launchFile = '';
    const resourceElement = xmlDoc.querySelector('resource[href]');
    if (resourceElement) {
      launchFile = resourceElement.getAttribute('href') || '';
    }

    if (!launchFile) {
      const possibleLaunchFiles = ['index.html', 'index.htm', 'start.html', 'launch.html'];
      for (const fileName of possibleLaunchFiles) {
        if (originalZip.files[fileName]) {
          launchFile = fileName;
          result.fixesApplied.push(`Auto-detected launch file: ${fileName}`);
          break;
        }
      }
    }

    if (!launchFile) {
      result.errors.push('Could not determine launch file');
      return result;
    }

    const normalizedManifest = normalizeManifest(manifestContent, launchFile);
    newZip.file('imsmanifest.xml', normalizedManifest);
    result.fixesApplied.push('Normalized manifest file');

    for (const [path, fileData] of Object.entries(originalZip.files)) {
      if (path === manifestKey) continue;
      if (fileData.dir) {
        continue;
      }

      const normalizedPath = path.replace(/\\/g, '/');

      if (normalizedPath.toLowerCase().endsWith('.html') || normalizedPath.toLowerCase().endsWith('.htm')) {
        let htmlContent = await fileData.async('text');
        htmlContent = injectScormAPI(htmlContent, result.originalValidation.version);
        newZip.file(normalizedPath, htmlContent);
        result.fixesApplied.push(`Injected SCORM API into ${normalizedPath}`);
      } else {
        const fileBlob = await fileData.async('blob');
        newZip.file(normalizedPath, fileBlob);
      }
    }

    const scormApiScript = createCompatibleScormAPI(result.originalValidation.version);
    newZip.file('scorm-api-wrapper.js', scormApiScript);
    result.fixesApplied.push('Added SCORM API wrapper');

    result.convertedBlob = await newZip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    result.success = true;

  } catch (error: any) {
    result.errors.push(`Conversion failed: ${error.message}`);
  }

  return result;
}

function normalizeManifest(manifestContent: string, launchFile: string): string {
  let normalized = manifestContent;

  normalized = normalized.replace(/\\/g, '/');

  if (!normalized.includes('schemaversion')) {
    normalized = normalized.replace(
      '</metadata>',
      '  <schemaversion>1.2</schemaversion>\n  </metadata>'
    );
  }

  const hasResource = /<resource[^>]+href\s*=\s*["'][^"']*["']/i.test(normalized);
  if (!hasResource) {
    normalized = normalized.replace(
      /<resource([^>]*)>/,
      `<resource$1 href="${launchFile}">`
    );
  }

  if (!normalized.includes('adlcp:scormtype') && !normalized.includes('adlcp:scormType')) {
    normalized = normalized.replace(
      /<resource([^>]*)>/,
      '<resource$1 adlcp:scormtype="sco">'
    );
  }

  return normalized;
}

function injectScormAPI(htmlContent: string, version: string): string {
  const hasScormAPI = htmlContent.toLowerCase().includes('scorm') ||
                      htmlContent.toLowerCase().includes('api') ||
                      htmlContent.toLowerCase().includes('lmsinitialize') ||
                      htmlContent.toLowerCase().includes('initialize');

  if (hasScormAPI) {
    return htmlContent;
  }

  const scormInitScript = `
<script src="scorm-api-wrapper.js"></script>
<script>
(function() {
  if (window.location !== window.parent.location) {
    try {
      var API = window.parent.API || window.parent.parent.API;
      var API_1484_11 = window.parent.API_1484_11 || window.parent.parent.API_1484_11;

      if (API || API_1484_11) {
        var scormAPI = API || API_1484_11;
        var initialized = false;

        window.addEventListener('load', function() {
          try {
            if (!initialized) {
              var result = scormAPI.LMSInitialize ? scormAPI.LMSInitialize('') : scormAPI.Initialize('');
              initialized = result === 'true';
              console.log('SCORM initialized:', initialized);

              if (initialized) {
                scormAPI.LMSSetValue ?
                  scormAPI.LMSSetValue('cmi.core.lesson_status', 'incomplete') :
                  scormAPI.SetValue('cmi.completion_status', 'incomplete');

                scormAPI.LMSCommit ? scormAPI.LMSCommit('') : scormAPI.Commit('');
              }
            }
          } catch (e) {
            console.error('SCORM init error:', e);
          }
        });

        window.addEventListener('beforeunload', function() {
          try {
            if (initialized) {
              scormAPI.LMSSetValue ?
                scormAPI.LMSSetValue('cmi.core.lesson_status', 'completed') :
                scormAPI.SetValue('cmi.completion_status', 'completed');

              scormAPI.LMSCommit ? scormAPI.LMSCommit('') : scormAPI.Commit('');
              scormAPI.LMSFinish ? scormAPI.LMSFinish('') : scormAPI.Terminate('');
            }
          } catch (e) {
            console.error('SCORM finish error:', e);
          }
        });
      }
    } catch (e) {
      console.error('SCORM setup error:', e);
    }
  }
})();
</script>`;

  if (htmlContent.includes('</head>')) {
    return htmlContent.replace('</head>', scormInitScript + '\n</head>');
  } else if (htmlContent.includes('<body')) {
    return htmlContent.replace('<body', scormInitScript + '\n<body');
  } else {
    return scormInitScript + '\n' + htmlContent;
  }
}

function createCompatibleScormAPI(version: string): string {
  return `// SCORM API Wrapper for compatibility
(function() {
  console.log('[SCORM Wrapper] Initializing for version: ${version}');

  // Make sure we can find the API even if injected at different levels
  window.API = window.API || window.parent.API || window.parent.parent.API;
  window.API_1484_11 = window.API_1484_11 || window.parent.API_1484_11 || window.parent.parent.API_1484_11;

  // Helper function to find API
  function findAPI(win) {
    var attempts = 0;
    var maxAttempts = 20;

    while (win && attempts < maxAttempts) {
      if (win.API || win.API_1484_11) {
        return win.API || win.API_1484_11;
      }

      if (win.parent && win.parent !== win) {
        attempts++;
        win = win.parent;
      } else {
        break;
      }
    }
    return null;
  }

  // Try to locate API if not already found
  if (!window.API && !window.API_1484_11) {
    var api = findAPI(window);
    if (api) {
      if (api.LMSInitialize) {
        window.API = api;
      } else if (api.Initialize) {
        window.API_1484_11 = api;
      }
    }
  }

  console.log('[SCORM Wrapper] API found:', !!(window.API || window.API_1484_11));
})();`;
}

export function needsConversion(validation: ScormValidationResult): boolean {
  return validation.warnings.length > 0 ||
         validation.version === 'unknown' ||
         !validation.isValid;
}
