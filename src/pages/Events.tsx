import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { AppModal } from '../components/AppModal';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar, MapPin, Users, Plus, Check, X, Trash2, Clock, Link as LinkIcon, Video, Bookmark } from 'lucide-react';
import { applyOrgScope, orgIdForInsert } from '../utils/orgScope';
import {
  getEventJoinOpensAt,
  getJoinAvailability,
  isUpcomingEvent,
  localDatetimeToIso,
  normalizeMeetingUrl,
  openEventMeeting,
} from '../utils/eventJoin';
import { fetchSavedItemIds, toggleSavedItem } from '../utils/savedItems';
import { scrollToHashTarget } from '../utils/deepLinkScroll';

interface Event {
  id: string;
  title: string;
  description: string;
  event_date: string;
  end_date?: string;
  location?: string;
  virtual_link?: string;
  max_attendees?: number;
  created_by: string;
  created_at: string;
  creator: {
    full_name: string;
  };
  attendees_count: number;
  user_status?: string;
  user_joined_at?: string;
  is_saved?: boolean;
}

export function Events() {
  const { profile } = useAuth();
  const location = useLocation();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const isAdmin = ['super_admin', 'admin'].includes(profile?.role || '');
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_date: '',
    end_date: '',
    location: '',
    virtual_link: '',
  });
  const [joiningEventId, setJoiningEventId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingEventId, setSavingEventId] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, [profile]);

  useEffect(() => {
    scrollToHashTarget('event', loading);
  }, [loading, events, location.hash]);

  const loadEvents = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true });

      query = applyOrgScope(query, profile);

      const { data: eventsData, error: eventsError } = await query;

      if (eventsError) throw eventsError;

      const upcoming = (eventsData || []).filter((event) => isUpcomingEvent(event));
      const eventIds = upcoming.map((event) => event.id);
      const savedIds = profile?.id
        ? await fetchSavedItemIds(profile.id, 'event', eventIds)
        : new Set<string>();

      const eventsWithAttendees = await Promise.all(upcoming.map(async (event) => {
        const [creatorData, attendeesCount, userStatus] = await Promise.all([
          supabase.from('user_profiles').select('full_name').eq('id', event.created_by).maybeSingle(),
          supabase.from('event_attendees').select('id', { count: 'exact', head: true }).eq('event_id', event.id).eq('status', 'attending'),
          supabase.from('event_attendees').select('status, joined_at').eq('event_id', event.id).eq('user_id', profile?.id || '').maybeSingle(),
        ]);

        return {
          ...event,
          creator: creatorData.data || { full_name: 'Unknown' },
          attendees_count: attendeesCount.count || 0,
          user_status: userStatus.data?.status,
          user_joined_at: userStatus.data?.joined_at,
          is_saved: savedIds.has(event.id),
        };
      }));

      setEvents(eventsWithAttendees);
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.event_date) {
      alert('Please provide title and date');
      return;
    }

    const eventDateIso = localDatetimeToIso(newEvent.event_date);
    if (!eventDateIso) {
      alert('Please enter a valid start date and time');
      return;
    }

    const endDateIso = localDatetimeToIso(newEvent.end_date);

    try {
      setCreating(true);
      const { error } = await supabase.from('events').insert({
        title: newEvent.title.trim(),
        description: newEvent.description.trim() || null,
        event_date: eventDateIso,
        end_date: endDateIso,
        location: newEvent.location.trim() || null,
        virtual_link: newEvent.virtual_link.trim() || null,
        created_by: profile?.id,
        organization_id: orgIdForInsert(profile),
      });

      if (error) throw error;

      setShowCreateModal(false);
      setNewEvent({ title: '', description: '', event_date: '', end_date: '', location: '', virtual_link: '' });
      await loadEvents();
    } catch (error: any) {
      console.error('Error creating event:', error);
      alert(error?.message || 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveEvent = async (eventId: string, isSaved: boolean) => {
    if (!profile?.id) {
      alert('You must be logged in to save events');
      return;
    }

    setEvents((prev) => prev.map((event) => (
      event.id === eventId ? { ...event, is_saved: !isSaved } : event
    )));
    setSavingEventId(eventId);

    try {
      await toggleSavedItem(profile.id, 'event', eventId, isSaved);
    } catch (error: any) {
      console.error('Error saving event:', error);
      setEvents((prev) => prev.map((event) => (
        event.id === eventId ? { ...event, is_saved: isSaved } : event
      )));
      alert(error?.message || 'Could not save this event');
    } finally {
      setSavingEventId(null);
    }
  };

  const handleJoinEvent = async (event: Event) => {
    if (!profile?.id || !event.virtual_link || joiningEventId) return;

    setJoiningEventId(event.id);
    try {
      await openEventMeeting(event, profile.id);
      setEvents((prev) => prev.map((item) => (
        item.id === event.id
          ? { ...item, user_status: 'attending', user_joined_at: new Date().toISOString() }
          : item
      )));
    } finally {
      setJoiningEventId(null);
    }
  };

  const handleRSVP = async (eventId: string, status: string) => {
    try {
      const { error } = await supabase.from('event_attendees').upsert({
        event_id: eventId,
        user_id: profile?.id,
        status,
      }, {
        onConflict: 'event_id,user_id',
      });

      if (error) throw error;
      loadEvents();
    } catch (error) {
      console.error('Error updating RSVP:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? All attendee data will be removed.')) return;

    try {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;
      loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Events</h1>
            <p className="text-gray-600 mt-1">Discover and join upcoming events</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="lt-btn-primary"
              style={{padding:'9px 16px',borderRadius:8}}
            >
              <Plus className="w-5 h-5" />
              Create Event
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="lt-spinner" />
            <p className="mt-4 text-gray-600">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="lt-card p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No upcoming events</h3>
            <p className="text-gray-600">Check back later for new events</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {events.map((event) => (
              <div key={event.id} id={`event-${event.id}`} className="lt-card p-6">
                <div className="flex gap-6">
                  <div className="flex flex-col items-center justify-center bg-blue-50 rounded-lg p-4 min-w-[100px]">
                    <span className="text-3xl font-bold text-blue-600">
                      {new Date(event.event_date).getDate()}
                    </span>
                    <span className="text-sm font-semibold text-blue-600">
                      {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2 gap-3">
                      <h3 className="text-xl font-semibold text-gray-900 flex-1">{event.title}</h3>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSaveEvent(event.id, !!event.is_saved)}
                          disabled={savingEventId === event.id}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            event.is_saved
                              ? 'bg-[#171717] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          aria-label={event.is_saved ? 'Remove from saved' : 'Save event'}
                        >
                          <Bookmark className={`w-4 h-4 ${event.is_saved ? 'fill-current' : ''}`} />
                          {event.is_saved ? 'Saved' : 'Save'}
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete event (Admin)"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600 mb-4">{event.description}</p>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(event.event_date).toLocaleDateString()} at{' '}
                          {new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      {event.virtual_link && (
                        <div className="flex items-center gap-2">
                          <LinkIcon className="w-4 h-4 shrink-0" />
                          <a
                            href={normalizeMeetingUrl(event.virtual_link)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              if (!profile?.id) return;
                              e.preventDefault();
                              void handleJoinEvent(event);
                            }}
                            className="text-[#171717] hover:underline truncate"
                          >
                            {event.location ? 'Join virtual meeting' : 'Open meeting link'}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{event.attendees_count} attending</span>
                      </div>
                    </div>

                    {event.virtual_link && (
                      <div className="mb-4">
                        {getJoinAvailability(event) === 'join' ? (
                          <button
                            type="button"
                            onClick={() => handleJoinEvent(event)}
                            disabled={joiningEventId === event.id}
                            className="lt-btn-primary inline-flex items-center gap-2"
                            style={{ padding: '10px 16px', borderRadius: 8 }}
                          >
                            <Video className="w-4 h-4" />
                            {joiningEventId === event.id ? 'Opening meeting...' : 'Join now'}
                          </button>
                        ) : getJoinAvailability(event) === 'soon' ? (
                          <p className="text-sm text-gray-500">
                            Join opens at{' '}
                            {getEventJoinOpensAt(event).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        ) : null}
                        {event.user_joined_at && (
                          <p className="mt-2 text-xs font-medium text-green-700">
                            Attendance recorded
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleRSVP(event.id, 'attending')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                          event.user_status === 'attending'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        Going
                      </button>
                      <button
                        onClick={() => handleRSVP(event.id, 'maybe')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                          event.user_status === 'maybe'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Maybe
                      </button>
                      <button
                        onClick={() => handleRSVP(event.id, 'declined')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                          event.user_status === 'declined'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <X className="w-4 h-4" />
                        Can't Go
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <AppModal open={showCreateModal} onClose={() => setShowCreateModal(false)} maxHeight="min(92vh, 860px)">
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 'min(92vh, 860px)' }}>
              <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexShrink: 0 }}>
                <div>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 700, color: '#0a72ef', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                    <Calendar size={12} />
                    Events
                  </div>
                  <h3 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', color: '#171717', marginBottom: 6 }}>Create New Event</h3>
                  <p style={{ fontSize: 14, color: '#666666', lineHeight: 1.6 }}>
                    Share the details clearly so learners know when and where to join.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: 8, color: '#808080', background: '#fafafa', border: '1px solid #ebebeb', borderRadius: 10, cursor: 'pointer', flexShrink: 0 }}
                  aria-label="Close create event modal"
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ padding: 24, overflowY: 'auto', flex: 1, minHeight: 0 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 18 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Event Title *</label>
                    <input
                      type="text"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Quarterly kickoff, workshop, town hall..."
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={newEvent.description}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="What is this event about, who should attend, and what should they prepare?"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date & Time *</label>
                    <div className="relative">
                      <Clock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="datetime-local"
                        value={newEvent.event_date}
                        onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 py-3 pl-11 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Date & Time</label>
                    <div className="relative">
                      <Clock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="datetime-local"
                        value={newEvent.end_date}
                        onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 py-3 pl-11 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={newEvent.location}
                        onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 py-3 pl-11 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Office, auditorium, campus..."
                      />
                    </div>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Virtual Link</label>
                    <div className="relative">
                      <LinkIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="url"
                        value={newEvent.virtual_link}
                        onChange={(e) => setNewEvent({ ...newEvent, virtual_link: e.target.value })}
                        className="w-full rounded-xl border border-gray-300 py-3 pl-11 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="https://meet.google.com/... or Zoom link"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '18px 24px 24px', borderTop: '1px solid #ebebeb', display: 'flex', gap: 12, justifyContent: 'flex-end', background: '#fafafa', flexShrink: 0 }}>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="lt-btn-secondary"
                  style={{ minWidth: 120, padding: '10px 16px', borderRadius: 10 }}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEvent}
                  className="lt-btn-primary"
                  style={{ minWidth: 160, padding: '10px 16px', borderRadius: 10 }}
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Event'}
                </button>
              </div>
          </div>
        </AppModal>
      </div>
    </Layout>
  );
}
