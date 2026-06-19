import JSZip from 'jszip';

export interface ScormValidationResult {
  isValid: boolean;
  version: '1.2' | '2004' | 'unknown';
  errors: string[];
  warnings: string[];
  launchFile?: string;
  title?: string;
  description?: string;
}

export async function validateScormPackage(file: File): Promise<ScormValidationResult> {
  const result: ScormValidationResult = {
    isValid: false,
    version: 'unknown',
    errors: [],
    warnings: [],
  };

  try {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);
    const fileNames = Object.keys(zipContent.files);

    let manifestFile = zipContent.files['imsmanifest.xml'];
    if (!manifestFile) {
      const manifestKey = fileNames.find(k => k.toLowerCase().endsWith('imsmanifest.xml'));
      if (manifestKey) {
        manifestFile = zipContent.files[manifestKey];
      }
    }

    if (!manifestFile) {
      result.errors.push('Missing imsmanifest.xml - not a valid SCORM package');
      return result;
    }

    const manifestContent = await manifestFile.async('text');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(manifestContent, 'text/xml');

    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      result.errors.push('Invalid XML in manifest file');
      return result;
    }

    const schemaVersion = xmlDoc.querySelector('schemaversion')?.textContent?.trim();
    if (schemaVersion) {
      if (schemaVersion === '1.2') {
        result.version = '1.2';
      } else if (schemaVersion.startsWith('2004') || schemaVersion.startsWith('CAM')) {
        result.version = '2004';
      }
    }

    const titleElement = xmlDoc.querySelector('title');
    if (titleElement) {
      result.title = titleElement.textContent?.trim();
    }

    const descElement = xmlDoc.querySelector('description');
    if (descElement) {
      result.description = descElement.textContent?.trim();
    }

    const resource = xmlDoc.querySelector('resource[href]');
    if (!resource) {
      result.errors.push('No launch page (resource with href) found in manifest');
      return result;
    }

    const launchHref = resource.getAttribute('href');
    if (!launchHref) {
      result.errors.push('Launch page href is empty');
      return result;
    }

    result.launchFile = launchHref;

    const launchFile = zipContent.files[launchHref];
    if (!launchFile) {
      result.errors.push(`Launch file "${launchHref}" not found in package`);
      return result;
    }

    if (result.version === 'unknown') {
      result.warnings.push('Could not detect SCORM version - may have compatibility issues');
    }

    const hasHtmlFiles = fileNames.some(name => name.toLowerCase().endsWith('.html') || name.toLowerCase().endsWith('.htm'));
    if (!hasHtmlFiles) {
      result.warnings.push('No HTML files found in package');
    }

    result.isValid = result.errors.length === 0;

    return result;
  } catch (error: any) {
    result.errors.push(`Failed to validate package: ${error.message}`);
    return result;
  }
}

export function isSupportedScormVersion(version: string): boolean {
  return version === '1.2' || version === '2004';
}

export async function extractScormMetadata(file: File) {
  try {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(file);

    let manifestFile = zipContent.files['imsmanifest.xml'];
    if (!manifestFile) {
      const manifestKey = Object.keys(zipContent.files).find(k => k.toLowerCase().endsWith('imsmanifest.xml'));
      if (manifestKey) {
        manifestFile = zipContent.files[manifestKey];
      }
    }

    if (!manifestFile) return null;

    const manifestContent = await manifestFile.async('text');
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(manifestContent, 'text/xml');

    return {
      title: xmlDoc.querySelector('title')?.textContent?.trim() || '',
      description: xmlDoc.querySelector('description')?.textContent?.trim() || '',
      version: xmlDoc.querySelector('schemaversion')?.textContent?.trim() || 'unknown',
    };
  } catch (error) {
    console.error('Error extracting SCORM metadata:', error);
    return null;
  }
}

export function getScormFileIcon(version: string) {
  if (version === '1.2') return '📦';
  if (version === '2004') return '📚';
  return '📄';
}

export function getScormVersionBadgeColor(version: string) {
  if (version === '1.2') return 'bg-green-100 text-green-700';
  if (version === '2004') return 'bg-blue-100 text-blue-700';
  return 'bg-gray-100 text-gray-700';
}
