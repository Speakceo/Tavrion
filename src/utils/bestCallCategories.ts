import { supabase } from '../lib/supabase';
import {
  DEFAULT_BEST_CALL_CATEGORIES,
  type BestCallCategoryRow,
  type BestCallCategorySeed,
} from '../data/defaultBestCallCategories';

export async function ensureOrgBestCallCategories(orgId: string) {
  const { count } = await supabase
    .from('best_call_categories')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  if ((count || 0) > 0) return;

  const rows = DEFAULT_BEST_CALL_CATEGORIES.map((c, i) => ({
    organization_id: orgId,
    category_key: c.category_key,
    label: c.label,
    sort_order: i,
    is_active: true,
  }));

  await supabase.from('best_call_categories').insert(rows);
}

export async function fetchOrgBestCallCategories(orgId: string | null | undefined): Promise<BestCallCategoryRow[]> {
  if (!orgId) {
    return DEFAULT_BEST_CALL_CATEGORIES.map((c, i) => ({
      ...c,
      id: c.category_key,
      organization_id: '',
      sort_order: i,
      is_active: true,
    }));
  }

  await ensureOrgBestCallCategories(orgId);

  const { data, error } = await supabase
    .from('best_call_categories')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data || []) as BestCallCategoryRow[];
}

export async function saveBestCallCategory(
  orgId: string,
  category: Partial<BestCallCategorySeed> & { id?: string; category_key: string; is_active?: boolean },
) {
  const payload = {
    organization_id: orgId,
    category_key: category.category_key,
    label: category.label,
    is_active: category.is_active ?? true,
    updated_at: new Date().toISOString(),
  };

  if (category.id) {
    const { error } = await supabase.from('best_call_categories').update(payload).eq('id', category.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('best_call_categories').upsert(payload, {
    onConflict: 'organization_id,category_key',
  });
  if (error) throw error;
}

export async function resetOrgBestCallCategories(orgId: string) {
  await supabase.from('best_call_categories').delete().eq('organization_id', orgId);
  await ensureOrgBestCallCategories(orgId);
}

export function categoryLabel(
  categories: BestCallCategoryRow[],
  key: string,
): string {
  return categories.find((c) => c.category_key === key)?.label || key.replace(/_/g, ' ');
}
