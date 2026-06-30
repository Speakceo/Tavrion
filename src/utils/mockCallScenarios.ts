import {
  DollarSign, MapPin, Shield, Award, Clock, Users, FileText, AlertCircle, X, Heart,
  Accessibility, Globe, Moon, Zap, Phone, type LucideIcon,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DEFAULT_MOCK_SCENARIOS, type MockScenarioRow, type MockScenarioSeed } from '../data/defaultMockScenarios';

const ICONS: Record<string, LucideIcon> = {
  DollarSign, MapPin, Shield, Award, Clock, Users, FileText, AlertCircle, X, Heart,
  Accessibility, Globe, Moon, Zap, Phone,
};

export function getScenarioIcon(name: string): LucideIcon {
  return ICONS[name] || Phone;
}

export async function ensureOrgMockScenarios(orgId: string) {
  const { count } = await supabase
    .from('mock_call_scenarios')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  if ((count || 0) > 0) return;

  const rows = DEFAULT_MOCK_SCENARIOS.map((s, i) => ({
    organization_id: orgId,
    scenario_key: s.scenario_key,
    title: s.title,
    character_name: s.character_name,
    description: s.description,
    system_prompt: s.system_prompt,
    difficulty: s.difficulty,
    icon_name: s.icon_name,
    color: s.color,
    voice: s.voice,
    sort_order: i,
    is_active: true,
  }));

  await supabase.from('mock_call_scenarios').insert(rows);
}

export async function fetchOrgMockScenarios(orgId: string | null | undefined): Promise<MockScenarioRow[]> {
  if (!orgId) {
    return DEFAULT_MOCK_SCENARIOS.map((s, i) => ({
      ...s,
      id: s.scenario_key,
      organization_id: '',
      sort_order: i,
      is_active: true,
    }));
  }

  await ensureOrgMockScenarios(orgId);

  const { data, error } = await supabase
    .from('mock_call_scenarios')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data || []) as MockScenarioRow[];
}

export async function saveMockScenario(
  orgId: string,
  scenario: Partial<MockScenarioSeed> & { id?: string; scenario_key: string; is_active?: boolean },
) {
  const payload = {
    organization_id: orgId,
    scenario_key: scenario.scenario_key,
    title: scenario.title,
    character_name: scenario.character_name,
    description: scenario.description,
    system_prompt: scenario.system_prompt,
    difficulty: scenario.difficulty,
    icon_name: scenario.icon_name,
    color: scenario.color,
    voice: scenario.voice,
    is_active: scenario.is_active ?? true,
    updated_at: new Date().toISOString(),
  };

  if (scenario.id) {
    const { error } = await supabase.from('mock_call_scenarios').update(payload).eq('id', scenario.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('mock_call_scenarios').upsert(payload, {
    onConflict: 'organization_id,scenario_key',
  });
  if (error) throw error;
}

export async function resetOrgMockScenarios(orgId: string) {
  await supabase.from('mock_call_scenarios').delete().eq('organization_id', orgId);
  await ensureOrgMockScenarios(orgId);
}
