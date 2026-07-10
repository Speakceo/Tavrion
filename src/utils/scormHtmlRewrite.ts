import {
  getCourseFilePublicUrl,
  normalizeZipEntryPath,
  type ScormPlaybackResolver,
} from './scormStorage';

const STREAMABLE_MEDIA = /\.(mp4|webm|mov|m4v|m4a|mp3|wav|ogg|oga|aac|avi)$/i;

export function isStreamableMedia(path: string) {
  return STREAMABLE_MEDIA.test(path.split('?')[0].split('#')[0]);
}

export function resolveAssetZipPath(assetPath: string, baseZipPath: string) {
  const trimmed = assetPath.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return null;
  }

  const baseDir = baseZipPath.includes('/')
    ? baseZipPath.slice(0, baseZipPath.lastIndexOf('/') + 1)
    : '';
  const withoutQuery = trimmed.split('?')[0].split('#')[0];
  const combined = withoutQuery.startsWith('/')
    ? withoutQuery.slice(1)
    : `${baseDir}${withoutQuery}`;

  return normalizeZipEntryPath(combined);
}

export function assetPathToPublicUrl(
  rawPath: string,
  baseZipPath: string,
  storagePrefix: string,
  resolver: ScormPlaybackResolver,
) {
  const zipPath = resolveAssetZipPath(rawPath, baseZipPath);
  if (!zipPath) return rawPath;

  const storagePath = resolver.resolveStoragePath(zipPath);
  const suffix = rawPath.includes('?') ? rawPath.slice(rawPath.indexOf('?')) : '';
  return `${getCourseFilePublicUrl(`${storagePrefix}/${storagePath}`)}${suffix}`;
}

export function rewriteScormHtmlAssets(
  html: string,
  htmlZipPath: string,
  storagePrefix: string,
  resolver: ScormPlaybackResolver,
) {
  const toPublicUrl = (rawPath: string) => assetPathToPublicUrl(rawPath, htmlZipPath, storagePrefix, resolver);

  let output = html;

  output = output.replace(
    /(<(?:video|audio|source|track|embed)\b[^>]*\ssrc=)(["'])([^"']+)\2/gi,
    (_match, prefix, quote, src) => `${prefix}${quote}${toPublicUrl(src)}${quote}`,
  );

  output = output.replace(
    /(<object\b[^>]*\sdata=)(["'])([^"']+)\2/gi,
    (_match, prefix, quote, src) => `${prefix}${quote}${toPublicUrl(src)}${quote}`,
  );

  output = output.replace(
    /(\sposter=)(["'])([^"']+)\2/gi,
    (_match, prefix, quote, src) => `${prefix}${quote}${toPublicUrl(src)}${quote}`,
  );

  output = output.replace(
    /url\((["']?)([^"')]+)\1\)/gi,
    (match, quote, rawPath) => {
      const cleaned = rawPath.trim();
      if (!cleaned || /^https?:\/\//i.test(cleaned) || cleaned.startsWith('data:')) return match;
      const resolved = toPublicUrl(cleaned);
      return resolved === cleaned ? match : `url(${quote || ''}${resolved}${quote || ''})`;
    },
  );

  return output;
}

export function rewriteScormJsAssets(
  js: string,
  jsZipPath: string,
  storagePrefix: string,
  resolver: ScormPlaybackResolver,
) {
  let output = js;
  const seen = new Set<string>();

  for (const entry of resolver.entries) {
    if (seen.has(entry.zipPath)) continue;
    seen.add(entry.zipPath);

    const publicUrl = getCourseFilePublicUrl(`${storagePrefix}/${entry.storagePath}`);

    output = output.split(entry.zipPath).join(publicUrl);
    const basename = entry.zipPath.split('/').pop();
    if (basename) {
      output = output.split(`assets/${basename}`).join(publicUrl);
    }
  }

  return output;
}

export function rewriteScormCssAssets(
  css: string,
  cssZipPath: string,
  storagePrefix: string,
  resolver: ScormPlaybackResolver,
) {
  const toPublicUrl = (rawPath: string) => assetPathToPublicUrl(rawPath, cssZipPath, storagePrefix, resolver);

  return css.replace(/url\((["']?)([^"')]+)\1\)/gi, (match, quote, rawPath) => {
    const cleaned = rawPath.trim();
    if (!cleaned || /^https?:\/\//i.test(cleaned) || cleaned.startsWith('data:')) return match;
    const resolved = toPublicUrl(cleaned);
    return resolved === cleaned ? match : `url(${quote || ''}${resolved}${quote || ''})`;
  });
}
