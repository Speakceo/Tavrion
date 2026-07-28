import { useState, useEffect, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Bookmark, FileText, BarChart3, Calendar, Video, Trash2, ArrowRight } from 'lucide-react';
import { getSavedItemHref } from '../utils/deepLinkScroll';

type SavedRow = {
  id: string;
  item_type: string;
  item_id: string;
  created_at: string;
  title: string;
  preview?: string;
  author?: string;
  sourceDate?: string;
  mediaUrl?: string;
  mediaType?: string;
  meta?: string;
  unavailable?: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  post: 'Social post',
  poll: 'Poll',
  event: 'Event',
  shot: 'Shot',
  course: 'Course',
};

function SavedAvatar({ name }: { name?: string }) {
  const initial = (name?.trim()?.charAt(0) || 'U').toUpperCase();
  return (
    <div
      className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-sm font-semibold bg-[#171717] text-white"
      aria-hidden
    >
      {initial}
    </div>
  );
}

function formatWhen(iso?: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function Saved() {
  const { profile } = useAuth();
  const [savedItems, setSavedItems] = useState<SavedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile?.id) {
      setSavedItems([]);
      setLoading(false);
      return;
    }
    loadSavedItems();
  }, [profile?.id]);

  const loadSavedItems = async () => {
    if (!profile?.id) return;
    try {
      setLoading(true);
      setError('');
      const { data, error: loadError } = await supabase
        .from('saved_items')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (loadError) throw loadError;

      const rows = data || [];
      const postIds = rows.filter((r) => r.item_type === 'post').map((r) => r.item_id);
      const pollIds = rows.filter((r) => r.item_type === 'poll').map((r) => r.item_id);
      const eventIds = rows.filter((r) => r.item_type === 'event').map((r) => r.item_id);

      const postsById: Record<string, any> = {};
      const pollsById: Record<string, any> = {};
      const eventsById: Record<string, any> = {};
      const authorsById: Record<string, string> = {};

      if (postIds.length) {
        const { data: posts } = await supabase
          .from('social_posts')
          .select('id, content, media_url, media_type, created_at, user_id')
          .in('id', postIds);

        const authorIds = [...new Set((posts || []).map((p) => p.user_id).filter(Boolean))];
        if (authorIds.length) {
          const { data: authors } = await supabase
            .from('user_profiles')
            .select('id, full_name')
            .in('id', authorIds);
          for (const author of authors || []) {
            authorsById[author.id] = author.full_name;
          }
        }

        for (const post of posts || []) {
          postsById[post.id] = {
            ...post,
            author: authorsById[post.user_id] || 'Unknown user',
          };
        }
      }

      if (pollIds.length) {
        const { data: polls } = await supabase
          .from('polls')
          .select('id, title, description, created_at, created_by')
          .in('id', pollIds);

        const creatorIds = [...new Set((polls || []).map((p) => p.created_by).filter(Boolean))];
        if (creatorIds.length) {
          const { data: creators } = await supabase
            .from('user_profiles')
            .select('id, full_name')
            .in('id', creatorIds);
          for (const creator of creators || []) {
            if (!authorsById[creator.id]) authorsById[creator.id] = creator.full_name;
          }
        }

        for (const poll of polls || []) {
          pollsById[poll.id] = {
            ...poll,
            author: authorsById[poll.created_by] || 'Unknown user',
          };
        }
      }

      if (eventIds.length) {
        const { data: events } = await supabase
          .from('events')
          .select('id, title, description, event_date, location, virtual_link, created_by')
          .in('id', eventIds);

        const creatorIds = [...new Set((events || []).map((e) => e.created_by).filter(Boolean))];
        if (creatorIds.length) {
          const { data: creators } = await supabase
            .from('user_profiles')
            .select('id, full_name')
            .in('id', creatorIds);
          for (const creator of creators || []) {
            if (!authorsById[creator.id]) authorsById[creator.id] = creator.full_name;
          }
        }

        for (const event of events || []) {
          eventsById[event.id] = {
            ...event,
            author: authorsById[event.created_by] || 'Unknown user',
          };
        }
      }

      setSavedItems(
        rows.map((item) => {
          if (item.item_type === 'post') {
            const post = postsById[item.item_id];
            if (!post) {
              return {
                ...item,
                title: 'Post unavailable',
                preview: 'This post may have been deleted.',
                unavailable: true,
              };
            }

            const content = (post.content || '').trim();
            return {
              ...item,
              title: content ? content.split('\n')[0].slice(0, 120) : 'Social post',
              preview: content || undefined,
              author: post.author,
              sourceDate: post.created_at,
              mediaUrl: post.media_url || undefined,
              mediaType: post.media_type || undefined,
            };
          }

          if (item.item_type === 'poll') {
            const poll = pollsById[item.item_id];
            if (!poll) {
              return {
                ...item,
                title: 'Poll unavailable',
                preview: 'This poll may have been removed.',
                unavailable: true,
              };
            }

            return {
              ...item,
              title: poll.title,
              preview: poll.description || undefined,
              author: poll.author,
              sourceDate: poll.created_at,
              meta: 'Poll',
            };
          }

          if (item.item_type === 'event') {
            const event = eventsById[item.item_id];
            if (!event) {
              return {
                ...item,
                title: 'Event unavailable',
                preview: 'This event may have been removed.',
                unavailable: true,
              };
            }

            const when = formatWhen(event.event_date);
            const place = event.location || (event.virtual_link ? 'Virtual event' : '');
            return {
              ...item,
              title: event.title,
              preview: event.description || undefined,
              author: event.author,
              sourceDate: event.event_date,
              meta: [when, place].filter(Boolean).join(' · '),
            };
          }

          return {
            ...item,
            title: TYPE_LABELS[item.item_type] || item.item_type,
          };
        }),
      );
    } catch (err: any) {
      console.error('Error loading saved items:', err);
      setError(err?.message || 'Failed to load saved items');
      setSavedItems([]);
    } finally {
      setLoading(false);
    }
  };

  const unsave = async (item: SavedRow, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!profile?.id) return;
    setBusyId(item.id);
    try {
      const { error: delError } = await supabase
        .from('saved_items')
        .delete()
        .eq('id', item.id)
        .eq('user_id', profile.id);
      if (delError) throw delError;
      setSavedItems((prev) => prev.filter((r) => r.id !== item.id));
    } catch (err: any) {
      console.error('Error unsaving:', err);
      alert(err?.message || 'Could not remove saved item');
    } finally {
      setBusyId(null);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'post': return <FileText className="w-4 h-4" />;
      case 'poll': return <BarChart3 className="w-4 h-4" />;
      case 'event': return <Calendar className="w-4 h-4" />;
      case 'shot': return <Video className="w-4 h-4" />;
      default: return <Bookmark className="w-4 h-4" />;
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Saved Items</h1>
          <p className="text-gray-600 mt-1">Posts, polls, and events you bookmarked</p>
        </div>

        {error && (
          <div className="lt-card p-4 text-sm text-red-700 bg-red-50">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="lt-spinner" />
            <p className="mt-4 text-gray-600">Loading saved items...</p>
          </div>
        ) : savedItems.length === 0 ? (
          <div className="lt-card p-12 text-center">
            <Bookmark className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No saved items yet</h3>
            <p className="text-gray-600 mb-4">Save posts from Social, or bookmark polls and events from their pages.</p>
            <Link to="/social" className="lt-btn-primary inline-flex px-4 py-2 text-sm">
              Go to Social
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {savedItems.map((item) => {
              const href = item.unavailable ? null : getSavedItemHref(item.item_type, item.item_id);
              const card = (
                <div className="lt-card overflow-hidden transition-shadow hover:shadow-md">
                  <div className="p-5 flex gap-4">
                    {item.item_type === 'post' && item.author ? (
                      <SavedAvatar name={item.author} />
                    ) : (
                      <div className="w-9 h-9 shrink-0 rounded-lg bg-[#f5f5f5] flex items-center justify-center text-[#171717]">
                        {getIcon(item.item_type)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="inline-flex items-center gap-1.5 rounded-md bg-[#f5f5f5] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#666]">
                          {getIcon(item.item_type)}
                          {TYPE_LABELS[item.item_type] || item.item_type}
                        </span>
                        {item.author && (
                          <span className="text-sm font-medium text-gray-900">{item.author}</span>
                        )}
                        {item.sourceDate && (
                          <span className="text-sm text-gray-400">
                            {formatWhen(item.sourceDate)}
                          </span>
                        )}
                      </div>

                      <h2 className={`text-base font-semibold leading-snug mb-2 ${item.unavailable ? 'text-gray-500' : 'text-gray-900'}`}>
                        {item.title}
                      </h2>

                      {item.preview && (
                        <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap mb-3">
                          {item.preview}
                        </p>
                      )}

                      {item.meta && (
                        <p className="text-sm text-gray-500 mb-3">{item.meta}</p>
                      )}

                      {item.mediaUrl && item.mediaType === 'image' && (
                        <div className="mb-3 rounded-lg overflow-hidden border border-gray-100 bg-gray-50 max-w-sm">
                          <img
                            src={item.mediaUrl}
                            alt=""
                            className="w-full h-40 object-cover"
                          />
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <p className="text-xs text-gray-400">
                          Saved {formatWhen(item.created_at)}
                        </p>
                        <div className="flex items-center gap-2">
                          {href && (
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[#171717]">
                              View original
                              <ArrowRight className="w-4 h-4" />
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => unsave(item, e)}
                            disabled={busyId === item.id}
                            className="lt-btn-secondary px-3 py-1.5 text-sm text-red-600"
                            title="Remove from saved"
                          >
                            <Trash2 size={14} className="inline mr-1" />
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );

              if (!href) {
                return <div key={item.id}>{card}</div>;
              }

              return (
                <Link key={item.id} to={href} className="block no-underline text-inherit">
                  {card}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
