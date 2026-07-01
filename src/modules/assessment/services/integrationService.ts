import { supabase } from '../../../lib/supabase';
import { applyOrgScope, orgIdForInsert } from '../../../utils/orgScope';
import type { OrgViewer } from '../../../utils/orgScope';

export type IntegrationProvider =
  | 'greenhouse'
  | 'lever'
  | 'ashby'
  | 'slack'
  | 'teams'
  | 'webhook'
  | 'lms_rules'
  | 'sso';

export interface AssessmentIntegration {
  id: string;
  organization_id: string;
  provider: IntegrationProvider;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

export interface WebhookEvent {
  id: string;
  organization_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  delivered: boolean;
  created_at: string;
}

const ATS_PROVIDERS: IntegrationProvider[] = ['greenhouse', 'lever', 'ashby'];

export async function getIntegrations(viewer: OrgViewer | null | undefined) {
  let query = supabase
    .from('assessment_integrations')
    .select('*')
    .order('provider');

  query = applyOrgScope(query, viewer);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as AssessmentIntegration[];
}

export async function getIntegration(
  viewer: OrgViewer | null | undefined,
  provider: IntegrationProvider,
) {
  let query = supabase
    .from('assessment_integrations')
    .select('*')
    .eq('provider', provider);

  query = applyOrgScope(query, viewer);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as AssessmentIntegration | null;
}

export async function setIntegration(
  viewer: OrgViewer & { id: string },
  provider: IntegrationProvider,
  config: Record<string, unknown>,
  isActive = true,
) {
  const orgId = orgIdForInsert(viewer);
  if (!orgId) throw new Error('Organization required');

  const { data, error } = await supabase
    .from('assessment_integrations')
    .upsert(
      {
        organization_id: orgId,
        provider,
        config,
        is_active: isActive,
      },
      { onConflict: 'organization_id,provider' },
    )
    .select()
    .single();

  if (error) throw error;
  return data as AssessmentIntegration;
}

export async function triggerWebhook(
  viewer: OrgViewer | null | undefined,
  eventType: string,
  payload: Record<string, unknown>,
) {
  const orgId = orgIdForInsert(viewer);
  if (!orgId) throw new Error('Organization required');

  const integration = await getIntegration(viewer, 'webhook');
  const webhookUrl = integration?.is_active
    ? (integration.config.url as string | undefined)
    : undefined;

  let delivered = false;

  if (webhookUrl) {
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: eventType, organization_id: orgId, ...payload }),
      });
      delivered = res.ok;
    } catch {
      delivered = false;
    }
  }

  const { data, error } = await supabase
    .from('assessment_webhook_events')
    .insert({
      organization_id: orgId,
      event_type: eventType,
      payload,
      delivered,
    })
    .select()
    .single();

  if (error) throw error;
  return data as WebhookEvent;
}

export async function listWebhookEvents(
  viewer: OrgViewer | null | undefined,
  filters?: { eventType?: string; limit?: number },
) {
  let query = supabase
    .from('assessment_webhook_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filters?.limit ?? 50);

  query = applyOrgScope(query, viewer);
  if (filters?.eventType) query = query.eq('event_type', filters.eventType);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as WebhookEvent[];
}

/** ATS sync stub — persists provider config; full sync wired via edge function later. */
export async function syncAtsIntegration(
  viewer: OrgViewer & { id: string },
  provider: IntegrationProvider,
  config: Record<string, unknown>,
) {
  if (!ATS_PROVIDERS.includes(provider)) {
    throw new Error(`Provider ${provider} is not an ATS integration`);
  }

  const stored = await setIntegration(viewer, provider, {
    ...config,
    last_sync_at: new Date().toISOString(),
    sync_status: 'configured',
  });

  return {
    provider,
    status: 'configured' as const,
    message: 'ATS config stored — candidate sync will run via edge function.',
    integration: stored,
  };
}
