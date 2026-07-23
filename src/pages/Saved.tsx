import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Bookmark, FileText, BarChart3, Calendar, Video, Trash2, ExternalLink } from 'lucide-react';

type SavedRow = {
  id: string;
  item_type: string;
  item_id: string;
  created_at: string;
  title?: string;
  preview?: string;
};

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

      let postsById: Record<string, { content?: string }> = {};
      if (postIds.length) {
        const { data: posts } = await supabase
          .from('social_posts')
          .select('id, content')
          .in('id', postIds);
        for (const p of posts || []) postsById[p.id] = p;
      }

      setSavedItems(
        rows.map((item) => {
          const post = postsById[item.item_id];
          const content = (post?.content || '').trim();
          return {
            ...item,
            title: content
              ? content.slice(0, 80) + (content.length > 80 ? '…' : '')
              : `${item.item_type.charAt(0).toUpperCase()}${item.item_type.slice(1)}`,
            preview: content || undefined,
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

  const unsave = async (item: SavedRow) => {
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

  const getItemLink = (item: { item_type: string }) => {
    switch (item.item_type) {
      case 'post': return '/social';
      case 'poll': return '/polls';
      case 'event': return '/events';
      case 'shot': return '/shots';
      case 'course': return '/courses';
      default: return null;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'post': return <FileText className="w-5 h-5" />;
      case 'poll': return <BarChart3 className="w-5 h-5" />;
      case 'event': return <Calendar className="w-5 h-5" />;
      case 'shot': return <Video className="w-5 h-5" />;
      default: return <Bookmark className="w-5 h-5" />;
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Saved Items</h1>
          <p className="text-gray-600 mt-1">Posts and content you bookmarked</p>
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
            <p className="text-gray-600 mb-4">Bookmark a post from Social to see it here.</p>
            <Link to="/social" className="lt-btn-primary inline-flex px-4 py-2 text-sm">
              Go to Social
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {savedItems.map((item) => {
              const href = getItemLink(item);
              return (
                <div key={item.id} className="lt-card p-5 flex items-start gap-3">
                  <div className="text-blue-600 mt-0.5">{getIcon(item.item_type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">{item.item_type}</p>
                    <p className="font-medium text-gray-900">{item.title}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Saved {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {href && (
                      <Link
                        to={href}
                        className="lt-btn-secondary p-2"
                        title="Open"
                      >
                        <ExternalLink size={14} />
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => unsave(item)}
                      disabled={busyId === item.id}
                      className="lt-btn-secondary p-2 text-red-600"
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
