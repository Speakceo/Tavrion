import { supabase } from '../lib/supabase';

export interface EventJoinInfo {
  id: string;
  event_date: string;
  end_date?: string | null;
  virtual_link?: string | null;
}

const JOIN_EARLY_MS = 15 * 60 * 1000;
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

export function normalizeMeetingUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function getEventEndTime(event: EventJoinInfo): Date {
  if (event.end_date) return new Date(event.end_date);
  return new Date(new Date(event.event_date).getTime() + DEFAULT_DURATION_MS);
}

export function getEventJoinOpensAt(event: EventJoinInfo): Date {
  return new Date(new Date(event.event_date).getTime() - JOIN_EARLY_MS);
}

export function isEventVisible(event: EventJoinInfo, now = new Date()): boolean {
  return now <= getEventEndTime(event);
}

export function canJoinEvent(event: EventJoinInfo, now = new Date()): boolean {
  if (!event.virtual_link?.trim()) return false;
  return now >= getEventJoinOpensAt(event) && now <= getEventEndTime(event);
}

export function getJoinAvailability(
  event: EventJoinInfo,
  now = new Date(),
): 'join' | 'soon' | 'ended' | 'none' {
  if (!event.virtual_link?.trim()) return 'none';
  if (now > getEventEndTime(event)) return 'ended';
  if (now < getEventJoinOpensAt(event)) return 'soon';
  return 'join';
}

export async function recordEventJoin(eventId: string, userId: string): Promise<void> {
  const base = {
    event_id: eventId,
    user_id: userId,
    status: 'attending',
  };

  const withJoined = { ...base, joined_at: new Date().toISOString() };
  const { error } = await supabase
    .from('event_attendees')
    .upsert(withJoined, { onConflict: 'event_id,user_id' });

  if (error?.message?.includes('joined_at')) {
    const { error: retryError } = await supabase
      .from('event_attendees')
      .upsert(base, { onConflict: 'event_id,user_id' });
    if (retryError) throw retryError;
    return;
  }

  if (error) throw error;
}

export async function openEventMeeting(event: EventJoinInfo, userId: string): Promise<void> {
  const url = normalizeMeetingUrl(event.virtual_link || '');
  if (!url) return;

  try {
    await recordEventJoin(event.id, userId);
  } catch (error) {
    console.error('Error recording event attendance:', error);
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}
