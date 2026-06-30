import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { applyOrgScope, orgIdForInsert } from '../utils/orgScope';

interface BestCall {
  id: string;
  title: string;
  description: string;
  category: string;
  file_name: string;
  file_path: string;
  file_size: number;
  duration: number | null;
  uploaded_by: string;
  created_at: string;
  uploader?: {
    full_name: string;
  };
}

interface CallWithStats extends BestCall {
  likes_count: number;
  comments_count: number;
  user_has_liked: boolean;
  comments: Comment[];
}

interface Comment {
  id: string;
  comment: string;
  created_at: string;
  user: {
    full_name: string;
  };
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'objection_handling', label: 'Objection Handling' },
  { value: 'urgency', label: 'Urgency' },
  { value: 'rapport_building', label: 'Rapport Building' },
  { value: 'closing', label: 'Closing' },
  { value: 'discovery', label: 'Discovery' },
  { value: 'follow_up', label: 'Follow Up' },
];

export function BestCalls() {
  const { profile } = useAuth();
  const [calls, setCalls] = useState<CallWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    loadCalls();
  }, [profile]);

  const loadCalls = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      let query = supabase
        .from('best_calls')
        .select(`
          *,
          uploader:user_profiles!best_calls_uploaded_by_fkey(full_name)
        `)
        .order('created_at', { ascending: false });
      query = applyOrgScope(query, profile);
      const { data, error } = await query;

      if (error) throw error;

      const callsWithStats = await Promise.all(
        (data || []).map(async (call) => {
          const [likesResult, commentsResult, userLikeResult] = await Promise.all([
            supabase.from('best_call_likes').select('id', { count: 'exact', head: true }).eq('call_id', call.id),
            supabase
              .from('best_call_comments')
              .select(`
                id,
                comment,
                created_at,
                user:user_profiles!best_call_comments_user_id_fkey(full_name)
              `)
              .eq('call_id', call.id)
              .order('created_at', { ascending: false }),
            supabase
              .from('best_call_likes')
              .select('id')
              .eq('call_id', call.id)
              .eq('user_id', profile.id)
              .maybeSingle(),
          ]);

          return {
            ...call,
            likes_count: likesResult.count || 0,
            comments_count: commentsResult.count || 0,
            user_has_liked: !!userLikeResult.data,
            comments: commentsResult.data || [],
          };
        })
      );

      setCalls(callsWithStats);
    } catch (error) {
      console.error('Error loading best calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (callId: string) => {
    if (!profile) return;

    const call = calls.find(c => c.id === callId);
    if (!call) return;

    try {
      if (call.user_has_liked) {
        await supabase
          .from('best_call_likes')
          .delete()
          .eq('call_id', callId)
          .eq('user_id', profile.id);
      } else {
        await supabase
          .from('best_call_likes')
          .insert({ call_id: callId, user_id: profile.id });
      }
      loadCalls();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleSubmitComment = async (callId: string) => {
    if (!profile || !commentText.trim()) return;

    try {
      setSubmittingComment(true);
      await supabase
        .from('best_call_comments')
        .insert({
          call_id: callId,
          user_id: profile.id,
          comment: commentText.trim(),
        });
      setCommentText('');
      loadCalls();
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('Failed to submit comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const getAudioUrl = (filePath: string) => {
    const { data } = supabase.storage.from('call-recordings').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.label || category;
  };

  const filteredCalls = selectedCategory === 'all'
    ? calls
    : calls.filter(call => call.category === selectedCategory);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Best Calls</h1>
          <p className="text-gray-600">Learn from top-performing call recordings</p>
        </div>

        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === cat.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="lt-spinner" />
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="text-center py-12 lt-card">
            <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No call recordings found in this category</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredCalls.map(call => (
              <div key={call.id} className="lt-card overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h2 className="text-xl font-semibold text-gray-900">{call.title}</h2>
                        <span className="lt-badge lt-badge-blue text-xs font-medium rounded-full">
                          {getCategoryLabel(call.category)}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{call.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>{call.uploader?.full_name}</span>
                        <span>{formatDuration(call.duration)}</span>
                        <span>{new Date(call.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <audio
                    controls
                    className="w-full mb-4"
                    src={getAudioUrl(call.file_path)}
                  />

                  <div className="flex items-center space-x-6 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleLike(call.id)}
                      className={`flex items-center space-x-2 ${
                        call.user_has_liked ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'
                      } transition-colors`}
                    >
                      <ThumbsUp className={`w-5 h-5 ${call.user_has_liked ? 'fill-current' : ''}`} />
                      <span className="font-medium">{call.likes_count}</span>
                    </button>
                    <button
                      onClick={() => setExpandedCall(expandedCall === call.id ? null : call.id)}
                      className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="font-medium">{call.comments_count}</span>
                    </button>
                  </div>

                  {expandedCall === call.id && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="mb-6">
                        <div className="flex space-x-3">
                          <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Add a comment..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !submittingComment) {
                                handleSubmitComment(call.id);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleSubmitComment(call.id)}
                            disabled={submittingComment || !commentText.trim()}
                            className="lt-btn-primary"
                            style={{padding:'9px 16px',borderRadius:8}}
                          >
                            <Send className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {call.comments.length === 0 ? (
                          <p className="text-center text-gray-500 py-4">No comments yet. Be the first to comment!</p>
                        ) : (
                          call.comments.map((comment: any) => (
                            <div key={comment.id} className="flex space-x-3">
                              <div className="bg-gray-100 p-2 rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 text-gray-600" />
                              </div>
                              <div className="flex-1 bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-semibold text-sm text-gray-900">{comment.user.full_name}</span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(comment.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-gray-700 text-sm">{comment.comment}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
