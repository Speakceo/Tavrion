import JSZip from 'jszip';

export interface ScormCourseData {
  title: string;
  description: string;
  htmlContent: string;
  version?: '1.2' | '2004';
}

export async function createScormPackage(data: ScormCourseData): Promise<Blob> {
  const { title, description, htmlContent, version = '1.2' } = data;

  const zip = new JSZip();

  const manifest = version === '1.2' ? createScorm12Manifest(title, description) : createScorm2004Manifest(title, description);
  zip.file('imsmanifest.xml', manifest);

  const indexHtml = createIndexHtml(title, htmlContent, version);
  zip.file('index.html', indexHtml);

  const apiScript = createScormApiScript(version);
  zip.file('scorm_api.js', apiScript);

  const cssContent = createDefaultStyles();
  zip.file('styles.css', cssContent);

  return await zip.generateAsync({ type: 'blob' });
}

function createScorm12Manifest(title: string, description: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="com.scorm.manifesttpl" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd
                      http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd
                      http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org1">
    <organization identifier="org1">
      <title>${escapeXml(title)}</title>
      <item identifier="item1" identifierref="resource1">
        <title>${escapeXml(title)}</title>
        <adlcp:prerequisites type="aicc_script"/>
        <adlcp:maxtimeallowed/>
        <adlcp:timelimitaction/>
        <adlcp:datafromlms/>
        <adlcp:masteryscore/>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="resource1" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <metadata>
        <lom xmlns="http://www.imsglobal.org/xsd/imsmd_rootv1p2p1">
          <general>
            <title>
              <langstring xml:lang="en">${escapeXml(title)}</langstring>
            </title>
            <description>
              <langstring xml:lang="en">${escapeXml(description)}</langstring>
            </description>
          </general>
        </lom>
      </metadata>
      <file href="index.html"/>
      <file href="scorm_api.js"/>
      <file href="styles.css"/>
    </resource>
  </resources>
</manifest>`;
}

function createScorm2004Manifest(title: string, description: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="com.scorm.manifesttpl" version="1.0"
  xmlns="http://www.imsglobal.org/xsd/imscp_v1p1"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_v1p3"
  xmlns:adlseq="http://www.adlnet.org/xsd/adlseq_v1p3"
  xmlns:adlnav="http://www.adlnet.org/xsd/adlnav_v1p3"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 imscp_v1p2.xsd
                      http://www.adlnet.org/xsd/adlcp_v1p3 adlcp_v1p3.xsd
                      http://www.adlnet.org/xsd/adlseq_v1p3 adlseq_v1p3.xsd
                      http://www.adlnet.org/xsd/adlnav_v1p3 adlnav_v1p3.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>2004 3rd Edition</schemaversion>
  </metadata>
  <organizations default="org1">
    <organization identifier="org1">
      <title>${escapeXml(title)}</title>
      <item identifier="item1" identifierref="resource1">
        <title>${escapeXml(title)}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="resource1" type="webcontent" adlcp:scormType="sco" href="index.html">
      <file href="index.html"/>
      <file href="scorm_api.js"/>
      <file href="styles.css"/>
    </resource>
  </resources>
</manifest>`;
}

function createIndexHtml(title: string, content: string, version: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="styles.css">
  <script src="scorm_api.js"></script>
  <script>
    window.addEventListener('load', function() {
      console.log('SCORM content loaded');

      var API = window.API || window.parent.API;
      var API_1484_11 = window.API_1484_11 || window.parent.API_1484_11;

      if (API || API_1484_11) {
        var scormAPI = API || API_1484_11;
        try {
          var initResult = scormAPI.LMSInitialize ? scormAPI.LMSInitialize('') : scormAPI.Initialize('');
          console.log('SCORM initialized:', initResult);

          scormAPI.LMSSetValue ? scormAPI.LMSSetValue('cmi.core.lesson_status', 'incomplete') :
                                  scormAPI.SetValue('cmi.completion_status', 'incomplete');

          scormAPI.LMSCommit ? scormAPI.LMSCommit('') : scormAPI.Commit('');
        } catch (e) {
          console.error('SCORM initialization error:', e);
        }
      }
    });

    window.addEventListener('beforeunload', function() {
      var API = window.API || window.parent.API;
      var API_1484_11 = window.API_1484_11 || window.parent.API_1484_11;

      if (API || API_1484_11) {
        var scormAPI = API || API_1484_11;
        try {
          scormAPI.LMSSetValue ? scormAPI.LMSSetValue('cmi.core.lesson_status', 'completed') :
                                  scormAPI.SetValue('cmi.completion_status', 'completed');

          scormAPI.LMSCommit ? scormAPI.LMSCommit('') : scormAPI.Commit('');
          scormAPI.LMSFinish ? scormAPI.LMSFinish('') : scormAPI.Terminate('');
        } catch (e) {
          console.error('SCORM finish error:', e);
        }
      }
    });

    function markComplete() {
      var API = window.API || window.parent.API;
      var API_1484_11 = window.API_1484_11 || window.parent.API_1484_11;

      if (API || API_1484_11) {
        var scormAPI = API || API_1484_11;
        try {
          scormAPI.LMSSetValue ? scormAPI.LMSSetValue('cmi.core.lesson_status', 'completed') :
                                  scormAPI.SetValue('cmi.completion_status', 'completed');
          scormAPI.LMSCommit ? scormAPI.LMSCommit('') : scormAPI.Commit('');
          alert('Course marked as complete!');
        } catch (e) {
          console.error('Error marking complete:', e);
        }
      }
    }
  </script>
</head>
<body>
  <div class="scorm-container">
    <header class="scorm-header">
      <h1>${escapeHtml(title)}</h1>
    </header>
    <main class="scorm-content">
      ${content}
    </main>
    <footer class="scorm-footer">
      <button onclick="markComplete()" class="complete-btn">Mark as Complete</button>
    </footer>
  </div>
</body>
</html>`;
}

function createScormApiScript(version: string): string {
  return `// Minimal SCORM API wrapper for ${version}
console.log('SCORM API script loaded');`;
}

function createDefaultStyles(): string {
  return `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.6;
  color: #333;
  background: #f5f5f5;
}

.scorm-container {
  max-width: 1200px;
  margin: 0 auto;
  background: white;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.scorm-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.scorm-header h1 {
  font-size: 2rem;
  font-weight: 600;
}

.scorm-content {
  flex: 1;
  padding: 2rem;
}

.scorm-content h2 {
  color: #667eea;
  margin-top: 2rem;
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.scorm-content h3 {
  color: #764ba2;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  font-size: 1.25rem;
}

.scorm-content p {
  margin-bottom: 1rem;
  line-height: 1.8;
}

.scorm-content ul, .scorm-content ol {
  margin-left: 2rem;
  margin-bottom: 1rem;
}

.scorm-content li {
  margin-bottom: 0.5rem;
}

.scorm-footer {
  background: #f8f9fa;
  padding: 2rem;
  text-align: center;
  border-top: 1px solid #e9ecef;
}

.complete-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 1rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}

.complete-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.15);
}

.complete-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}`;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
