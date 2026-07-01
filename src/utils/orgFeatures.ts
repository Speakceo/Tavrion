/** Feature keys may differ between owner UI and DB defaults — aliases resolve both. */
const ALIASES: Record<string, string[]> = {
  social: ['social', 'social_feed'],
  social_feed: ['social', 'social_feed'],
  scorm_upload: ['scorm_upload', 'scorm'],
};

export const ORG_FEATURE_DEFAULTS: Record<string, boolean> = {
  ai_tutor: true,
  mock_calls: true,
  live_calls: true,
  social: true,
  polls: true,
  events: true,
  vault: true,
  shots: true,
  best_calls: true,
  leaderboard: false,
  email_nudges: false,
  tavrion_test: false,
  scorm_upload: true,
  certificates: true,
  books: false,
};

export function isOrgFeatureEnabled(
  features: Record<string, boolean> | null | undefined,
  key: string,
  options?: { platformOwner?: boolean },
): boolean {
  if (options?.platformOwner) return true;

  const keys = ALIASES[key] || [key];
  for (const k of keys) {
    if (features && k in features) return Boolean(features[k]);
  }
  return ORG_FEATURE_DEFAULTS[key] ?? true;
}

export type NavFeatureKey =
  | 'social'
  | 'polls'
  | 'events'
  | 'shots'
  | 'best_calls'
  | 'vault'
  | 'certificates'
  | 'books'
  | 'ai_tutor'
  | 'mock_calls'
  | 'live_calls'
  | 'email_nudges'
  | 'tavrion_test';

export const NAV_FEATURE_MAP: Record<string, NavFeatureKey | null> = {
  '/social': 'social',
  '/polls': 'polls',
  '/events': 'events',
  '/shots': 'shots',
  '/best-calls': 'best_calls',
  '/vault': 'vault',
  '/certificates': 'certificates',
  '/books': 'books',
  '/ai-tutor': 'ai_tutor',
  '/mock-calls': 'mock_calls',
  '/live-calls': 'live_calls',
  '/admin/best-calls': 'best_calls',
  '/admin/email-nudges': 'email_nudges',
};

export function isNavRouteEnabled(
  href: string,
  features: Record<string, boolean> | null | undefined,
  options?: { platformOwner?: boolean },
): boolean {
  const key = NAV_FEATURE_MAP[href];
  if (!key) return true;
  return isOrgFeatureEnabled(features, key, options);
}
