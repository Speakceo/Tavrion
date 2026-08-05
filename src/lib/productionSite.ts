/** True on the public marketing domain (not localhost / preview). */
export function isJointavrionProductionSite(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.replace(/^www\./i, '');
  return host === 'jointavrion.com';
}
