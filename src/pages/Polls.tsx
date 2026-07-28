import { useState, useEffect } from 'react';
import { AppModal } from '../components/AppModal';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { BarChart3, Plus, Check, Trash2, Bookmark } from 'lucide-react';
import { applyOrgScope, orgIdForInsert } from '../utils/orgScope';
import { fetchSavedItemIds, toggleSavedItem } from '../utils/savedItems';

interface Poll {
  id: string;
  title: string;
  description?: string;
  end_date?: string;
  allow_multiple: boolean;
  anonymous: boolean;
  created_at: string;
  created_by: string;
  creator: {
    full_name: string;
  };
  options: PollOption[];
  user_votes: string[];
  is_saved?: boolean;
}

interface PollOption {
  id: string;
  option_text: string;
  order_index: number;
  votes_count: number;
}

export function Polls() {
  const { profile } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [savingPollId, setSavingPollId] = useState<string | null>(null);
  const [newPoll, setNewPoll] = useState({
    title: '',
    description: '',
    options: ['', ''],
    allow_multiple: false,
    anonymous: false,
  });

  useEffect(() => {
    loadPolls();
  }, [profile]);

  const loadPolls = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('polls')
        .select('*')
        .order('created_at', { ascending: false });

      query = applyOrgScope(query, profile);

      const { data: pollsData, error: pollsError } = await query;

      if (pollsError) throw pollsError;

      const pollIds = (pollsData || []).map((poll) => poll.id);
      const savedIds = profile?.id
        ? await fetchSavedItemIds(profile.id, 'poll', pollIds)
        : new Set<string>();

      const pollsWithOptions = await Promise.all((pollsData || []).map(async (poll) => {
        const [creatorData, optionsData, votesData] = await Promise.all([
          supabase.from('user_profiles').select('full_name').eq('id', poll.created_by).maybeSingle(),
          supabase.from('poll_options').select('*').eq('poll_id', poll.id).order('order_index'),
          supabase.from('poll_votes').select('option_id').eq('poll_id', poll.id).eq('user_id', profile?.id || ''),
        ]);

        const optionsWithCounts = await Promise.all((optionsData.data || []).map(async (option) => {
          const { count } = await supabase
            .from('poll_votes')
            .select('id', { count: 'exact', head: true })
            .eq('option_id', option.id);

          return {
            ...option,
            votes_count: count || 0,
          };
        }));

        return {
          ...poll,
          creator: creatorData.data || { full_name: 'Unknown' },
          options: optionsWithCounts,
          user_votes: votesData.data?.map(v => v.option_id) || [],
          is_saved: savedIds.has(poll.id),
        };
      }));

      setPolls(pollsWithOptions);
    } catch (error) {
      console.error('Error loading polls:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePoll = async () => {
    if (!newPoll.title.trim() || newPoll.options.filter(o => o.trim()).length < 2) {
      alert('Please provide a title and at least 2 options');
      return;
    }

    try {
      const { data: pollData, error: pollError } = await supabase
        .from('polls')
        .insert({
          title: newPoll.title,
          description: newPoll.description,
          allow_multiple: newPoll.allow_multiple,
          anonymous: newPoll.anonymous,
          created_by: profile?.id,
          organization_id: orgIdForInsert(profile),
        })
        .select()
        .single();

      if (pollError) throw pollError;

      const options = newPoll.options
        .filter(o => o.trim())
        .map((option, index) => ({
          poll_id: pollData.id,
          option_text: option,
          order_index: index,
        }));

      const { error: optionsError } = await supabase.from('poll_options').insert(options);

      if (optionsError) throw optionsError;

      setShowCreateModal(false);
      setNewPoll({ title: '', description: '', options: ['', ''], allow_multiple: false, anonymous: false });
      loadPolls();
    } catch (error) {
      console.error('Error creating poll:', error);
      alert('Failed to create poll');
    }
  };

  const handleVote = async (pollId: string, optionId: string, allowMultiple: boolean, currentVotes: string[]) => {
    try {
      if (!allowMultiple && currentVotes.length > 0) {
        await supabase.from('poll_votes').delete().eq('poll_id', pollId).eq('user_id', profile?.id);
      }

      if (currentVotes.includes(optionId)) {
        await supabase.from('poll_votes').delete().eq('option_id', optionId).eq('user_id', profile?.id);
      } else {
        await supabase.from('poll_votes').insert({
          poll_id: pollId,
          option_id: optionId,
          user_id: profile?.id,
        });
      }

      loadPolls();
    } catch (error) {
      console.error('Error voting:', error);
    }
  };

  const getTotalVotes = (options: PollOption[]) => {
    return options.reduce((sum, option) => sum + option.votes_count, 0);
  };

  const getPercentage = (votes: number, total: number) => {
    return total > 0 ? Math.round((votes / total) * 100) : 0;
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!confirm('Are you sure you want to delete this poll? All votes will be removed.')) return;

    try {
      const { error } = await supabase.from('polls').delete().eq('id', pollId);
      if (error) throw error;
      loadPolls();
    } catch (error) {
      console.error('Error deleting poll:', error);
      alert('Failed to delete poll');
    }
  };

  const handleSavePoll = async (pollId: string, isSaved: boolean) => {
    if (!profile?.id) {
      alert('You must be logged in to save polls');
      return;
    }

    setPolls((prev) => prev.map((poll) => (
      poll.id === pollId ? { ...poll, is_saved: !isSaved } : poll
    )));
    setSavingPollId(pollId);

    try {
      await toggleSavedItem(profile.id, 'poll', pollId, isSaved);
    } catch (error: any) {
      console.error('Error saving poll:', error);
      setPolls((prev) => prev.map((poll) => (
        poll.id === pollId ? { ...poll, is_saved: isSaved } : poll
      )));
      alert(error?.message || 'Could not save this poll');
    } finally {
      setSavingPollId(null);
    }
  };

  const isAdmin = ['super_admin', 'admin'].includes(profile?.role || '');

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Polls</h1>
            <p className="text-gray-600 mt-1">Vote on polls and see what others think</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="lt-btn-primary"
            style={{padding:'9px 16px',borderRadius:8}}
          >
            <Plus className="w-5 h-5" />
            Create Poll
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="lt-spinner" />
            <p className="mt-4 text-gray-600">Loading polls...</p>
          </div>
        ) : polls.length === 0 ? (
          <div className="lt-card p-12 text-center">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No polls yet</h3>
            <p className="text-gray-600 mb-4">Be the first to create a poll and gather opinions</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="lt-btn-primary"
              style={{padding:'9px 16px',borderRadius:8}}
            >
              <Plus className="w-5 h-5" />
              Create First Poll
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {polls.map((poll) => {
              const totalVotes = getTotalVotes(poll.options);
              const hasVoted = poll.user_votes.length > 0;

              return (
                <div key={poll.id} className="lt-card p-6">
                  <div className="flex items-start justify-between mb-4 gap-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{poll.title}</h3>
                      {poll.description && (
                        <p className="text-gray-600 mb-3">{poll.description}</p>
                      )}
                      <p className="text-sm text-gray-500">
                        Created by {poll.creator?.full_name || 'Unknown'} • {new Date(poll.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleSavePoll(poll.id, !!poll.is_saved)}
                        disabled={savingPollId === poll.id}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          poll.is_saved
                            ? 'bg-[#171717] text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        aria-label={poll.is_saved ? 'Remove from saved' : 'Save poll'}
                      >
                        <Bookmark className={`w-4 h-4 ${poll.is_saved ? 'fill-current' : ''}`} />
                        {poll.is_saved ? 'Saved' : 'Save'}
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeletePoll(poll.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete poll (Admin)"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {poll.options.map((option) => {
                      const percentage = getPercentage(option.votes_count, totalVotes);
                      const isVoted = poll.user_votes.includes(option.id);

                      return (
                        <button
                          key={option.id}
                          onClick={() => handleVote(poll.id, option.id, poll.allow_multiple, poll.user_votes)}
                          className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                            isVoted
                              ? 'border-blue-600 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              {isVoted && <Check className="w-5 h-5 text-blue-600" />}
                              <span className="font-medium text-gray-900">{option.option_text}</span>
                            </div>
                            <span className="text-sm font-semibold text-gray-700">
                              {percentage}% ({option.votes_count})
                            </span>
                          </div>
                          {hasVoted && (
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-600">
                    <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
                    {poll.allow_multiple && <span className="text-blue-600">Multiple choice allowed</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <AppModal open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth={720} maxHeight="min(92vh, 860px)">
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 'min(92vh, 860px)' }}>
            <div style={{ padding: '22px 24px 18px', borderBottom: '1px solid #ebebeb', flexShrink: 0 }}>
              <h3 className="text-2xl font-semibold">Create New Poll</h3>
            </div>

            <div style={{ padding: 24, overflowY: 'auto', flex: 1, minHeight: 0 }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Poll Question *
                  </label>
                  <input
                    type="text"
                    value={newPoll.title}
                    onChange={(e) => setNewPoll({ ...newPoll, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="What would you like to ask?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={newPoll.description}
                    onChange={(e) => setNewPoll({ ...newPoll, description: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add more context..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Options *
                  </label>
                  {newPoll.options.map((option, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const updated = [...newPoll.options];
                          updated[index] = e.target.value;
                          setNewPoll({ ...newPoll, options: updated });
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={`Option ${index + 1}`}
                      />
                      {newPoll.options.length > 2 && (
                        <button
                          onClick={() => {
                            const updated = newPoll.options.filter((_, i) => i !== index);
                            setNewPoll({ ...newPoll, options: updated });
                          }}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setNewPoll({ ...newPoll, options: [...newPoll.options, ''] })}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    + Add Option
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newPoll.allow_multiple}
                      onChange={(e) => setNewPoll({ ...newPoll, allow_multiple: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Allow multiple selections</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newPoll.anonymous}
                      onChange={(e) => setNewPoll({ ...newPoll, anonymous: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Anonymous voting</span>
                  </label>
                </div>
              </div>
            </div>

            <div style={{ padding: '18px 24px 24px', borderTop: '1px solid #ebebeb', display: 'flex', gap: 12, background: '#fafafa', flexShrink: 0 }}>
              <button
                onClick={() => setShowCreateModal(false)}
                className="lt-btn-secondary flex-1"
                style={{ padding: '10px 16px', borderRadius: 10 }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePoll}
                className="lt-btn-primary flex-1"
                style={{ padding: '10px 16px', borderRadius: 10 }}
              >
                Create Poll
              </button>
            </div>
          </div>
        </AppModal>
      </div>
    </Layout>
  );
}
