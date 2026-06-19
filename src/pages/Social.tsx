import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Heart, MessageCircle, Share2, Send, MoreHorizontal, Bookmark, Image as ImageIcon, Video, X, Trash2 } from 'lucide-react';

interface Post {
  id: string;
  user_id: string;
  content: string;
  media_url?: string;
  media_type?: string;
  visibility: string;
  created_at: string;
  user: {
    full_name: string;
    email: string;
  };
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  is_saved: boolean;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user: {
    full_name: string;
  };
}

export function Social() {
  const { profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [activeComments, setActiveComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [newComment, setNewComment] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadPosts();
  }, [profile]);

  const loadPosts = async () => {
    try {
      setLoading(true);

      const { data: postsData, error: postsError } = await supabase
        .from('social_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      const postsWithCounts = await Promise.all((postsData || []).map(async (post) => {
        const [userData, likesCount, commentsCount, isLiked, isSaved] = await Promise.all([
          supabase.from('user_profiles').select('full_name, email').eq('id', post.user_id).maybeSingle(),
          supabase.from('social_likes').select('id', { count: 'exact', head: true }).eq('post_id', post.id),
          supabase.from('social_comments').select('id', { count: 'exact', head: true }).eq('post_id', post.id),
          supabase.from('social_likes').select('id').eq('post_id', post.id).eq('user_id', profile?.id || '').maybeSingle(),
          supabase.from('saved_items').select('id').eq('item_type', 'post').eq('item_id', post.id).eq('user_id', profile?.id || '').maybeSingle(),
        ]);

        return {
          ...post,
          user: userData.data || { full_name: 'Unknown User', email: '' },
          likes_count: likesCount.count || 0,
          comments_count: commentsCount.count || 0,
          is_liked: !!isLiked.data,
          is_saved: !!isSaved.data,
        };
      }));

      setPosts(postsWithCounts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setMediaFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
  };

  const uploadMedia = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile?.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('social-media')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('social-media')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading media:', error);
      throw error;
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() && !mediaFile) {
      alert('Please add some content or media to your post');
      return;
    }

    if (!profile?.id) {
      alert('You must be logged in to create a post');
      return;
    }

    try {
      setUploading(true);
      let mediaUrl = null;
      let mediaType = null;

      if (mediaFile) {
        mediaUrl = await uploadMedia(mediaFile);
        mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
      }

      const postData = {
        user_id: profile.id,
        content: newPost || '',
        media_url: mediaUrl,
        media_type: mediaType,
        visibility: 'public',
      };

      console.log('Creating post with data:', postData);

      const { data, error } = await supabase.from('social_posts').insert(postData).select();

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('Post created successfully:', data);

      setNewPost('');
      handleRemoveMedia();
      loadPosts();
    } catch (error: any) {
      console.error('Error creating post:', error);
      alert(`Failed to create post: ${error.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await supabase.from('social_likes').delete().eq('post_id', postId).eq('user_id', profile?.id);
      } else {
        await supabase.from('social_likes').insert({ post_id: postId, user_id: profile?.id });
      }
      loadPosts();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleSave = async (postId: string, isSaved: boolean) => {
    try {
      if (isSaved) {
        await supabase.from('saved_items').delete().eq('item_type', 'post').eq('item_id', postId).eq('user_id', profile?.id);
      } else {
        await supabase.from('saved_items').insert({ item_type: 'post', item_id: postId, user_id: profile?.id });
      }
      loadPosts();
    } catch (error) {
      console.error('Error toggling save:', error);
    }
  };

  const loadComments = async (postId: string) => {
    try {
      const { data, error } = await supabase
        .from('social_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const commentsWithUsers = await Promise.all((data || []).map(async (comment) => {
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', comment.user_id)
          .maybeSingle();

        return {
          ...comment,
          user: userData || { full_name: 'Unknown User' },
        };
      }));

      setComments(prev => ({ ...prev, [postId]: commentsWithUsers }));
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleComment = async (postId: string) => {
    if (!newComment.trim()) return;

    try {
      const { error } = await supabase.from('social_comments').insert({
        post_id: postId,
        user_id: profile?.id,
        content: newComment,
      });

      if (error) throw error;

      setNewComment('');
      loadComments(postId);
      loadPosts();
    } catch (error) {
      console.error('Error creating comment:', error);
    }
  };

  const toggleComments = (postId: string) => {
    if (activeComments === postId) {
      setActiveComments(null);
    } else {
      setActiveComments(postId);
      if (!comments[postId]) {
        loadComments(postId);
      }
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase.from('social_posts').delete().eq('id', postId);
      if (error) throw error;
      loadPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  };

  const isAdmin = ['super_admin', 'admin'].includes(profile?.role || '');

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="lt-card p-6">
          <div style={{marginBottom:24}}><p style={{fontSize:11,fontWeight:700,color:'#808080',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:4}}>COMMUNITY</p><h1 style={{fontSize:22,fontWeight:700,letterSpacing:'-0.03em',color:'#171717',marginBottom:4}}>Social Feed</h1></div>

          <div className="flex gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />

              {mediaPreview && (
                <div className="mt-3 relative">
                  <button
                    onClick={handleRemoveMedia}
                    className="absolute top-2 right-2 p-1 bg-gray-900 bg-opacity-70 rounded-full text-white hover:bg-opacity-90 transition-all z-10"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  {mediaFile?.type.startsWith('video/') ? (
                    <video src={mediaPreview} controls className="w-full rounded-lg max-h-96" />
                  ) : (
                    <img src={mediaPreview} alt="Preview" className="w-full rounded-lg max-h-96 object-cover" />
                  )}
                </div>
              )}

              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                    <ImageIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleMediaSelect}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                  <label className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                    <Video className="w-5 h-5" />
                    <span className="text-sm font-medium">Video</span>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleMediaSelect}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                </div>
                <button
                  onClick={handleCreatePost}
                  disabled={(!newPost.trim() && !mediaFile) || uploading}
                  className="lt-btn-primary"
                  style={{padding:'9px 16px',borderRadius:8}}
                >
                  {uploading ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="lt-spinner" />
            <p className="mt-4 text-gray-600">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="lt-card p-12 text-center">
            <p className="text-gray-600">No posts yet. Be the first to share something!</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="lt-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {post.user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{post.user?.full_name || 'Unknown User'}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(post.created_at).toLocaleDateString()} at {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete post (Admin)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {post.content && (
                <p className="text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>
              )}

              {post.media_url && (
                <div className="mb-4 rounded-lg overflow-hidden bg-gray-100">
                  {post.media_type === 'image' && (
                    <img src={post.media_url} alt="Post media" className="w-full" />
                  )}
                  {post.media_type === 'video' && (
                    <video src={post.media_url} controls className="w-full" />
                  )}
                </div>
              )}

              <div className="flex items-center gap-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => handleLike(post.id, post.is_liked)}
                  className={`flex items-center gap-2 ${post.is_liked ? 'text-red-600' : 'text-gray-600 hover:text-red-600'} transition-colors`}
                >
                  <Heart className={`w-5 h-5 ${post.is_liked ? 'fill-current' : ''}`} />
                  <span className="text-sm font-medium">{post.likes_count}</span>
                </button>

                <button
                  onClick={() => toggleComments(post.id)}
                  className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm font-medium">{post.comments_count}</span>
                </button>

                <button className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors">
                  <Share2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Share</span>
                </button>

                <button
                  onClick={() => handleSave(post.id, post.is_saved)}
                  className={`flex items-center gap-2 ml-auto ${post.is_saved ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'} transition-colors`}
                >
                  <Bookmark className={`w-5 h-5 ${post.is_saved ? 'fill-current' : ''}`} />
                </button>
              </div>

              {activeComments === post.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                  {comments[post.id]?.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        {comment.user?.full_name?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 bg-gray-50 rounded-lg p-3">
                        <p className="font-semibold text-sm text-gray-900">{comment.user?.full_name || 'Unknown User'}</p>
                        <p className="text-gray-800 text-sm mt-1">{comment.content}</p>
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-3 mt-4">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {profile?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleComment(post.id);
                          }
                        }}
                      />
                      <button
                        onClick={() => handleComment(post.id)}
                        disabled={!newComment.trim()}
                        className="lt-btn-primary"
                        style={{padding:'9px 16px',borderRadius:8}}
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}
