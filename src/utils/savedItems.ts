import { supabase } from '../lib/supabase';

export type SavedItemType = 'post' | 'poll' | 'event' | 'shot' | 'course';

export async function toggleSavedItem(
  userId: string,
  itemType: SavedItemType,
  itemId: string,
  isSaved: boolean,
): Promise<void> {
  if (isSaved) {
    const { error } = await supabase
      .from('saved_items')
      .delete()
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .eq('user_id', userId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase
    .from('saved_items')
    .insert({ item_type: itemType, item_id: itemId, user_id: userId });
  if (error) throw error;
}

export async function fetchSavedItemIds(
  userId: string,
  itemType: SavedItemType,
  itemIds: string[],
): Promise<Set<string>> {
  if (!itemIds.length) return new Set();

  const { data, error } = await supabase
    .from('saved_items')
    .select('item_id')
    .eq('user_id', userId)
    .eq('item_type', itemType)
    .in('item_id', itemIds);

  if (error) throw error;
  return new Set((data || []).map((row) => row.item_id));
}
