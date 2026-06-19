import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Bookmark, FileText, BarChart3, Calendar, Video } from 'lucide-react';

export function Saved() {
  const { profile } = useAuth();
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedItems();
  }, [profile]);

  const loadSavedItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('saved_items')
        .select('*')
        .eq('user_id', profile?.id || '')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedItems(data || []);
    } catch (error) {
      console.error('Error loading saved items:', error);
    } finally {
      setLoading(false);
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
          <p className="text-gray-600 mt-1">Your bookmarked content</p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="lt-spinner" />
            <p className="mt-4 text-gray-600">Loading saved items...</p>
          </div>
        ) : savedItems.length === 0 ? (
          <div className="lt-card p-12 text-center">
            <Bookmark className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No saved items yet</h3>
            <p className="text-gray-600">Start saving posts, polls, events, and more!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {savedItems.map((item) => (
              <div key={item.id} className="lt-card p-6">
                <div className="flex items-center gap-3">
                  <div className="text-blue-600">
                    {getIcon(item.item_type)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{item.item_type}</p>
                    <p className="text-sm text-gray-500">
                      Saved {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
