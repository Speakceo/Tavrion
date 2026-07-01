export interface BestCallCategorySeed {
  category_key: string;
  label: string;
}

export const DEFAULT_BEST_CALL_CATEGORIES: BestCallCategorySeed[] = [
  { category_key: 'objection_handling', label: 'Objection Handling' },
  { category_key: 'urgency', label: 'Urgency' },
  { category_key: 'rapport_building', label: 'Rapport Building' },
  { category_key: 'closing', label: 'Closing' },
  { category_key: 'discovery', label: 'Discovery' },
  { category_key: 'follow_up', label: 'Follow Up' },
];

export type BestCallCategoryRow = BestCallCategorySeed & {
  id: string;
  organization_id: string;
  sort_order: number;
  is_active: boolean;
};
