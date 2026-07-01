import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar, MapPin, Users, Plus, Check, X, Trash2 } from 'lucide-react';
import { applyOrgScope, orgIdForInsert } from '../utils/orgScope';

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
}

export function Events() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const isAdmin = ['super_admin', 'admin'].includes(profile?.role || '');
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_date: '',
    location: '',
    virtual_link: '',
  });

  useEffect(() => {
    loadEvents();
  }, [profile]);

  const loadEvents = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('events')
        .select('*')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true });

      query = applyOrgScope(query, profile);

      const { data: eventsData, error: eventsError } = await query;

      if (eventsError) throw eventsError;

      const eventsWithAttendees = await Promise.all((eventsData || []).map(async (event) => {
        const [creatorData, attendeesCount, userStatus] = await Promise.all([
          supabase.from('user_profiles').select('full_name').eq('id', event.created_by).maybeSingle(),
          supabase.from('event_attendees').select('id', { count: 'exact', head: true }).eq('event_id', event.id).eq('status', 'attending'),
          supabase.from('event_attendees').select('status').eq('event_id', event.id).eq('user_id', profile?.id || '').maybeSingle(),
        ]);

        return {
          ...event,
          creator: creatorData.data || { full_name: 'Unknown' },
          attendees_count: attendeesCount.count || 0,
          user_status: userStatus.data?.status,
        };
      }));

      setEvents(eventsWithAttendees);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title.trim() || !newEvent.event_date) {
      alert('Please provide title and date');
      return;
    }

    try {
      const { error } = await supabase.from('events').insert({
        ...newEvent,
        created_by: profile?.id,
        organization_id: orgIdForInsert(profile),
      });

      if (error) throw error;

      setShowCreateModal(false);
      setNewEvent({ title: '', description: '', event_date: '', location: '', virtual_link: '' });
      loadEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event');
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
              <div key={event.id} className="lt-card p-6">
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
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{event.title}</h3>
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
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{event.attendees_count} attending</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
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

        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
              <h3 className="text-2xl font-semibold mb-6">Create New Event</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Title *</label>
                  <input
                    type="text"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Event name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Event details..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={newEvent.event_date}
                    onChange={(e) => setNewEvent({ ...newEvent, event_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Event location"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Virtual Link</label>
                  <input
                    type="url"
                    value={newEvent.virtual_link}
                    onChange={(e) => setNewEvent({ ...newEvent, virtual_link: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Meeting link (optional)"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEvent}
                  className="lt-btn-primary flex-1"
                  style={{padding:'9px 16px',borderRadius:8}}
                >
                  Create Event
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
