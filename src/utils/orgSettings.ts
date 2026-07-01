import type { Organization } from '../types';

export interface OrgSettings {
  email_domain?: string;
  ai_context?: string;
  logo_url?: string;
  primary_color?: string;
  certificate_issuer?: string;
  certificate_signatory?: string;
  certificate_footer?: string;
  evaluation_rubric?: string;
}

export function getOrgSettings(org?: Organization | null): OrgSettings {
  return (org?.settings || {}) as OrgSettings;
}

export function getAiTutorContext(org?: Organization | null): string {
  const settings = getOrgSettings(org);
  if (settings.ai_context?.trim()) return settings.ai_context.trim();
  const name = org?.name || 'this organisation';
  return `${name} LMS training assistant. Help learners with courses, SOPs, sales skills, and workplace best practices. Stay professional and concise.`;
}

export function getEvaluationRubric(org?: Organization | null): string | undefined {
  const rubric = getOrgSettings(org).evaluation_rubric?.trim();
  return rubric || undefined;
}

export function getOrgLogoUrl(org?: Organization | null): string | undefined {
  const fromSettings = getOrgSettings(org).logo_url?.trim();
  if (fromSettings) return fromSettings;
  return org?.logo_url?.trim() || undefined;
}

export function getPrimaryColor(org?: Organization | null): string {
  return getOrgSettings(org).primary_color?.trim() || '#171717';
}

export function getCertificateBranding(org?: Organization | null) {
  const settings = getOrgSettings(org);
  return {
    issuer: settings.certificate_issuer?.trim() || org?.name || 'Tavrion',
    signatory: settings.certificate_signatory?.trim() || 'Training Director',
    footer: settings.certificate_footer?.trim() || 'Enterprise Learning Platform',
    logoUrl: getOrgLogoUrl(org),
    primaryColor: getPrimaryColor(org),
  };
}
