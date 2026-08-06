import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { applyOrgScope, orgIdForInsert } from '../utils/orgScope';
import {
  Heart, MessageCircle, Share2, Send, MoreHorizontal, Bookmark,
  Image as ImageIcon, Video, X, Trash2, Pencil,
} from 'lucide-react';
import { scrollToHashTarget } from '../utils/deepLinkScroll';

function SocialAvatar({ name, size = 'md' }: { name?: string; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 32 : 42;
  const initial = (name?.trim()?.charAt(0) || 'U').toUpperCase();

  return (
    <div
      className="social-avatar"
      style={{
        width: dim,
        height: dim,
        fontSize: size === 'sm' ? 12 : 14,
        flexShrink: 0,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        letterSpacing: '-0.03em',
        background: 'linear-gradient(145deg, #171717 0%, #3f3f46 100%)',
        color: '#fff',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
      }}
      aria-hidden
    >
      {initial}
    </div>
  );
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function PostMedia({ url, type }: { url: string; type?: string }) {
  const [ready, setReady] = useState(false);
  const isVideo = type === 'video';
  const imgRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setReady(false);
    if (isVideo) {
      const video = videoRef.current;
      if (video && video.readyState >= 2) setReady(true);
    } else {
      const img = imgRef.current;
      if (img?.complete && img.naturalWidth > 0) setReady(true);
    }
  }, [url, isVideo]);

  return (
    <div className={`social-media-frame${ready ? ' is-ready' : ''}`}>
      {!ready && <div className="social-media-skeleton" aria-hidden />}
      {isVideo ? (
        <video
          ref={videoRef}
          src={url}
          controls
          className="social-media-el"
          onLoadedData={() => setReady(true)}
        />
      ) : (
        <img
          ref={imgRef}
          src={url}
          alt=""
          className="social-media-el"
          loading="lazy"
          onLoad={() => setReady(true)}
        />
      )}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="social-feed-stack" aria-busy="true" aria-label="Loading posts">
      {[0, 1, 2].map((i) => (
        <div key={i} className="social-post-card social-skeleton-card" style={{ animationDelay: `${i * 80}ms` }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="social-skel-circle" />
            <div className="flex-1 space-y-2">
              <div className="social-skel-line" style={{ width: '38%' }} />
              <div className="social-skel-line" style={{ width: '22%', height: 8 }} />
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <div className="social-skel-line" style={{ width: '92%' }} />
            <div className="social-skel-line" style={{ width: '74%' }} />
          </div>
          <div className="social-skel-media" />
        </div>
      ))}
    </div>
  );
}

interface Post {
  id: string;
  user_id: string;
  content: string;
  media_url?: string;
  media_type?: string;
  visibility: string;
  created_at: string;
  updated_at?: string;
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
  const location = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [activeComments, setActiveComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [newComment, setNewComment] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editMediaFile, setEditMediaFile] = useState<File | null>(null);
  const [editMediaPreview, setEditMediaPreview] = useState<string | null>(null);
  const [removeExistingMedia, setRemoveExistingMedia] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [likingPosts, setLikingPosts] = useState<Record<string, boolean>>({});
  const [likeAnimPostId, setLikeAnimPostId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadPosts();
  }, [profile]);

  useEffect(() => {
    scrollToHashTarget('post', loading);
  }, [loading, posts, location.hash]);

  useEffect(() => {
    if (!menuOpenId) return;
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [menuOpenId]);

  const loadPosts = async () => {
    try {
      setLoading(true);

      let query = supabase.from('social_posts').select('*').order('created_at', { ascending: false });
      query = applyOrgScope(query, profile);
      const { data: postsData, error: postsError } = await query;
      if (postsError) throw postsError;

      const rows = postsData || [];
      if (!rows.length) {
        setPosts([]);
        return;
      }

      const postIds = rows.map((p) => p.id);
      const userIds = [...new Set(rows.map((p) => p.user_id).filter(Boolean))];

      const [profilesRes, likesRes, commentsRes, myLikesRes, savedRes] = await Promise.all([
        userIds.length
          ? supabase.from('user_profiles').select('id, full_name, email').in('id', userIds)
          : Promise.resolve({ data: [] as { id: string; full_name: string; email: string }[] }),
        supabase.from('social_likes').select('post_id').in('post_id', postIds),
        supabase.from('social_comments').select('post_id').in('post_id', postIds),
        profile?.id
          ? supabase.from('social_likes').select('post_id').in('post_id', postIds).eq('user_id', profile.id)
          : Promise.resolve({ data: [] as { post_id: string }[] }),
        profile?.id
          ? supabase.from('saved_items').select('item_id').eq('item_type', 'post').in('item_id', postIds).eq('user_id', profile.id)
          : Promise.resolve({ data: [] as { item_id: string }[] }),
      ]);

      const profileById = new Map(
        (profilesRes.data || []).map((u) => [u.id, { full_name: u.full_name || 'Unknown User', email: u.email || '' }]),
      );
      const likeCount = new Map<string, number>();
      (likesRes.data || []).forEach((row: { post_id: string }) => {
        likeCount.set(row.post_id, (likeCount.get(row.post_id) || 0) + 1);
      });
      const commentCount = new Map<string, number>();
      (commentsRes.data || []).forEach((row: { post_id: string }) => {
        commentCount.set(row.post_id, (commentCount.get(row.post_id) || 0) + 1);
      });
      const likedSet = new Set((myLikesRes.data || []).map((r: { post_id: string }) => r.post_id));
      const savedSet = new Set((savedRes.data || []).map((r: { item_id: string }) => r.item_id));

      setPosts(rows.map((post) => ({
        ...post,
        user: profileById.get(post.user_id) || { full_name: 'Unknown User', email: '' },
        likes_count: likeCount.get(post.id) || 0,
        comments_count: commentCount.get(post.id) || 0,
        is_liked: likedSet.has(post.id),
        is_saved: savedSet.has(post.id),
      })));
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
        organization_id: orgIdForInsert(profile),
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
    if (!profile?.id || likingPosts[postId]) return;

    setPosts((prev) => prev.map((p) => {
      if (p.id !== postId) return p;
      return {
        ...p,
        is_liked: !isLiked,
        likes_count: isLiked ? Math.max(0, p.likes_count - 1) : p.likes_count + 1,
      };
    }));

    if (!isLiked) {
      setLikeAnimPostId(postId);
      window.setTimeout(() => {
        setLikeAnimPostId((current) => (current === postId ? null : current));
      }, 350);
    }

    setLikingPosts((prev) => ({ ...prev, [postId]: true }));

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('social_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('social_likes')
          .insert({ post_id: postId, user_id: profile.id });
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      setPosts((prev) => prev.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          is_liked: isLiked,
          likes_count: isLiked ? p.likes_count + 1 : Math.max(0, p.likes_count - 1),
        };
      }));
    } finally {
      setLikingPosts((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleSave = async (postId: string, isSaved: boolean) => {
    if (!profile?.id) {
      alert('You must be logged in to save posts');
      return;
    }
    // Optimistic UI so the bookmark feels instant
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, is_saved: !isSaved } : p)));
    try {
      if (isSaved) {
        const { error } = await supabase
          .from('saved_items')
          .delete()
          .eq('item_type', 'post')
          .eq('item_id', postId)
          .eq('user_id', profile.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('saved_items')
          .insert({ item_type: 'post', item_id: postId, user_id: profile.id });
        if (error) throw error;
      }
    } catch (error: any) {
      console.error('Error toggling save:', error);
      setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, is_saved: isSaved } : p)));
      alert(error?.message || 'Could not save this post');
    }
  };

  const loadComments = async (postId: string) => {
    setLoadingComments((prev) => ({ ...prev, [postId]: true }));
    try {
      const { data, error } = await supabase
        .from('social_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      const rows = data || [];
      const userIds = [...new Set(rows.map((c) => c.user_id).filter(Boolean))];
      const { data: profiles } = userIds.length
        ? await supabase.from('user_profiles').select('id, full_name').in('id', userIds)
        : { data: [] as { id: string; full_name: string }[] };
      const byId = new Map((profiles || []).map((u) => [u.id, u.full_name || 'Unknown User']));

      setComments((prev) => ({
        ...prev,
        [postId]: rows.map((comment) => ({
          ...comment,
          user: { full_name: byId.get(comment.user_id) || 'Unknown User' },
        })),
      }));
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments((prev) => ({ ...prev, [postId]: false }));
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
    setMenuOpenId(null);
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const { error } = await supabase.from('social_posts').delete().eq('id', postId);
      if (error) throw error;
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  };

  const openEditPost = (post: Post) => {
    setMenuOpenId(null);
    setEditingPost(post);
    setEditContent(post.content || '');
    setEditMediaFile(null);
    setEditMediaPreview(null);
    setRemoveExistingMedia(false);
  };

  const closeEditPost = () => {
    setEditingPost(null);
    setEditContent('');
    setEditMediaFile(null);
    setEditMediaPreview(null);
    setRemoveExistingMedia(false);
  };

  const handleEditMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }
    setEditMediaFile(file);
    setRemoveExistingMedia(false);
    const reader = new FileReader();
    reader.onloadend = () => setEditMediaPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpdatePost = async () => {
    if (!editingPost || !profile?.id) return;
    if (!editContent.trim() && !editMediaFile && (!editingPost.media_url || removeExistingMedia)) {
      alert('Post must have text or media');
      return;
    }

    try {
      setSavingEdit(true);
      let mediaUrl = removeExistingMedia ? null : (editingPost.media_url || null);
      let mediaType = removeExistingMedia ? null : (editingPost.media_type || null);

      if (editMediaFile) {
        mediaUrl = await uploadMedia(editMediaFile);
        mediaType = editMediaFile.type.startsWith('video/') ? 'video' : 'image';
      }

      const { error } = await supabase
        .from('social_posts')
        .update({
          content: editContent.trim(),
          media_url: mediaUrl,
          media_type: mediaType,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingPost.id)
        .eq('user_id', profile.id);

      if (error) throw error;

      setPosts((prev) =>
        prev.map((p) =>
          p.id === editingPost.id
            ? {
                ...p,
                content: editContent.trim(),
                media_url: mediaUrl || undefined,
                media_type: mediaType || undefined,
                updated_at: new Date().toISOString(),
              }
            : p,
        ),
      );
      closeEditPost();
    } catch (error: any) {
      console.error('Error updating post:', error);
      alert(error?.message || 'Failed to update post');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleShare = async (postId: string) => {
    const url = `${window.location.origin}/social#post-${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      alert('Post link copied');
    } catch {
      alert(url);
    }
  };

  const canManagePost = (post: Post) =>
    !!profile?.id && (post.user_id === profile.id || ['super_admin', 'admin'].includes(profile.role || ''));

  const canEditPost = (post: Post) => !!profile?.id && post.user_id === profile.id;

  return (
    <Layout>
      <div className="social-page">
        <div className="social-page-inner">
          <header className="social-page-header social-enter" style={{ animationDelay: '0ms' }}>
            <p className="social-kicker">Community</p>
            <h1 className="social-title">Social</h1>
            <p className="social-subtitle">Share wins, questions, and updates with your org.</p>
          </header>

          <div className="social-composer social-enter" style={{ animationDelay: '60ms' }}>
            <div className="flex gap-3">
              <SocialAvatar name={profile?.full_name} />
              <div className="flex-1 min-w-0">
                <textarea
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Share something with the team…"
                  className="social-composer-input"
                  rows={3}
                />

                {mediaPreview && (
                  <div className="mt-3 relative rounded-xl overflow-hidden border border-black/[0.06]">
                    <button
                      type="button"
                      onClick={handleRemoveMedia}
                      className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-[#171717]/90 text-white hover:bg-[#171717]"
                      aria-label="Remove media"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {mediaFile?.type.startsWith('video/') ? (
                      <video src={mediaPreview} controls className="w-full max-h-80 bg-black" />
                    ) : (
                      <img src={mediaPreview} alt="Preview" className="w-full max-h-80 object-contain bg-[#f4f4f4]" />
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
                  <div className="flex gap-1">
                    <label className="social-attach-btn">
                      <ImageIcon className="w-4 h-4" />
                      <span>Photo</span>
                      <input type="file" accept="image/*" onChange={handleMediaSelect} className="hidden" disabled={uploading} />
                    </label>
                    <label className="social-attach-btn">
                      <Video className="w-4 h-4" />
                      <span>Video</span>
                      <input type="file" accept="video/*" onChange={handleMediaSelect} className="hidden" disabled={uploading} />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreatePost}
                    disabled={(!newPost.trim() && !mediaFile) || uploading}
                    className="lt-btn-primary"
                    style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600 }}
                  >
                    {uploading ? 'Posting…' : 'Post'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <FeedSkeleton />
          ) : posts.length === 0 ? (
            <div className="social-empty social-enter">
              <div className="social-empty-mark">✦</div>
              <h2>No posts yet</h2>
              <p>Be the first to share a win, tip, or update with your team.</p>
            </div>
          ) : (
            <div className="social-feed-stack">
              {posts.map((post, index) => (
                <article
                  key={post.id}
                  id={`post-${post.id}`}
                  className="social-post-card social-enter"
                  style={{ animationDelay: `${Math.min(index, 8) * 55 + 40}ms` }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <SocialAvatar name={post.user?.full_name} />
                      <div className="min-w-0">
                        <p className="social-author">{post.user?.full_name || 'Unknown User'}</p>
                        <p className="social-meta">
                          {relativeTime(post.created_at)}
                          {post.updated_at && post.updated_at !== post.created_at ? ' · Edited' : ''}
                        </p>
                      </div>
                    </div>
                    {canManagePost(post) && (
                      <div className="relative" ref={menuOpenId === post.id ? menuRef : undefined}>
                        <button
                          type="button"
                          onClick={() => setMenuOpenId((id) => (id === post.id ? null : post.id))}
                          className="social-icon-btn"
                          aria-label="Post options"
                          aria-expanded={menuOpenId === post.id}
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                        {menuOpenId === post.id && (
                          <div className="social-menu">
                            {canEditPost(post) && (
                              <button type="button" onClick={() => openEditPost(post)} className="social-menu-item">
                                <Pencil className="w-4 h-4" /> Edit
                              </button>
                            )}
                            <button type="button" onClick={() => handleDeletePost(post.id)} className="social-menu-item social-menu-danger">
                              <Trash2 className="w-4 h-4" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {post.content && (
                    <p className="social-body">{post.content}</p>
                  )}

                  {post.media_url && (
                    <div className="mb-3.5">
                      <PostMedia url={post.media_url} type={post.media_type} />
                    </div>
                  )}

                  <div className="social-actions">
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleLike(post.id, post.is_liked)}
                        disabled={!!likingPosts[post.id]}
                        className={`social-action-btn ${post.is_liked ? 'is-liked' : ''}`}
                        aria-label={post.is_liked ? 'Unlike post' : 'Like post'}
                      >
                        <Heart
                          className={`w-[18px] h-[18px] ${post.is_liked ? 'fill-current' : ''} ${likeAnimPostId === post.id ? 'social-like-pop' : ''}`}
                        />
                        <span className="tabular-nums">{post.likes_count}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleComments(post.id)}
                        className={`social-action-btn ${activeComments === post.id ? 'is-active' : ''}`}
                      >
                        <MessageCircle className="w-[18px] h-[18px]" />
                        <span className="tabular-nums">{post.comments_count}</span>
                      </button>

                      <button type="button" onClick={() => handleShare(post.id)} className="social-action-btn">
                        <Share2 className="w-[18px] h-[18px]" />
                        <span>Share</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSave(post.id, post.is_saved)}
                      className={`social-save-btn ${post.is_saved ? 'is-saved' : ''}`}
                      aria-label={post.is_saved ? 'Remove from saved' : 'Save post'}
                    >
                      <Bookmark className={`w-4 h-4 ${post.is_saved ? 'fill-current' : ''}`} />
                      {post.is_saved ? 'Saved' : 'Save'}
                    </button>
                  </div>

                  {activeComments === post.id && (
                    <div className="social-comments">
                      {loadingComments[post.id] && !comments[post.id] ? (
                        <>
                          {[0, 1].map((i) => (
                            <div key={i} className="flex gap-2.5" style={{ opacity: 0.7 }}>
                              <div className="social-skel-circle" style={{ width: 32, height: 32, borderRadius: 10 }} />
                              <div className="social-comment-bubble flex-1 space-y-2">
                                <div className="social-skel-line" style={{ width: '28%', height: 8 }} />
                                <div className="social-skel-line" style={{ width: '70%', height: 10 }} />
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        comments[post.id]?.map((comment, cIdx) => (
                          <div
                            key={comment.id}
                            className="flex gap-2.5 social-comment-enter"
                            style={{ animationDelay: `${Math.min(cIdx, 6) * 40}ms` }}
                          >
                            <SocialAvatar name={comment.user?.full_name} size="sm" />
                            <div className="social-comment-bubble">
                              <p className="social-comment-author">{comment.user?.full_name || 'Unknown User'}</p>
                              <p className="social-comment-text">{comment.content}</p>
                            </div>
                          </div>
                        ))
                      )}

                      <div className="flex gap-2.5 mt-1">
                        <SocialAvatar name={profile?.full_name} size="sm" />
                        <div className="flex-1 flex gap-2 min-w-0">
                          <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write a comment…"
                            className="social-comment-input"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleComment(post.id);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleComment(post.id)}
                            disabled={!newComment.trim()}
                            className="lt-btn-primary"
                            style={{ padding: '8px 12px', borderRadius: 10 }}
                            aria-label="Send comment"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {editingPost && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeEditPost}
        >
          <div
            className="lt-card w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-bold text-gray-900">Edit post</h2>
              <button type="button" onClick={closeEditPost} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="What's on your mind?"
              />

              {(editMediaPreview || (editingPost.media_url && !removeExistingMedia)) && (
                <div className="relative overflow-hidden rounded-lg bg-gray-100">
                  {editMediaPreview ? (
                    editMediaFile?.type.startsWith('video/') ? (
                      <video src={editMediaPreview} controls className="max-h-56 w-full" />
                    ) : (
                      <img src={editMediaPreview} alt="New media" className="max-h-56 w-full object-contain bg-[#f4f4f4]" />
                    )
                  ) : editingPost.media_type === 'video' ? (
                    <video src={editingPost.media_url} controls className="max-h-56 w-full" />
                  ) : (
                    <img src={editingPost.media_url} alt="Current media" className="max-h-56 w-full object-contain bg-[#f4f4f4]" />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEditMediaFile(null);
                      setEditMediaPreview(null);
                      setRemoveExistingMedia(true);
                    }}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <label className="lt-btn-secondary inline-flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
                  <ImageIcon className="w-4 h-4" /> Replace image
                  <input type="file" accept="image/*" className="hidden" onChange={handleEditMediaSelect} />
                </label>
                <label className="lt-btn-secondary inline-flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
                  <Video className="w-4 h-4" /> Replace video
                  <input type="file" accept="video/*" className="hidden" onChange={handleEditMediaSelect} />
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button type="button" onClick={closeEditPost} className="lt-btn-secondary px-4 py-2 text-sm">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleUpdatePost()}
                disabled={savingEdit}
                className="lt-btn-primary px-4 py-2 text-sm"
              >
                {savingEdit ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
