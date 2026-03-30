import React, { useState } from 'react';
import { Heart, MessageCircle, MoreHorizontal, Trash2, Pencil, X, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Avatar helper
const Avatar = ({ name, size = 'md' }) => {
  const sizes = { sm: 'w-8 h-8 text-sm', md: 'w-11 h-11 text-base', lg: 'w-14 h-14 text-xl' };
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center shrink-0 font-bold text-primary`}>
      {name?.charAt(0).toUpperCase() || '?'}
    </div>
  );
};

// Comment Modal
const CommentModal = ({ post, onClose }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState(post.comments || []);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingComments, setFetchingComments] = useState(false);

  const fetchComments = async () => {
    setFetchingComments(true);
    try {
      // Comments come from feed/my-posts. We'll re-fetch from my-posts if own post
      // Since backend has no GET /comments/:id, we just submit and append locally
    } catch (_) {} finally {
      setFetchingComments(false);
    }
  };

  const submitComment = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      await api.post(`/comment?quote_id=${post.quote_id}&comment=${encodeURIComponent(text.trim())}`);
      const newComment = {
        name: user.full_name,
        comment: text.trim(),
        created_at: new Date().toISOString(),
      };
      setComments(prev => [...prev, newComment]);
      setText('');
      toast.success('Comment added!');
    } catch (err) {
      toast.error(err.message || 'Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitComment();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg flex flex-col max-h-[85vh] animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-white">Comments</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surfaceHover text-textSecondary hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Original post */}
        <div className="p-4 border-b border-border">
          <div className="flex gap-3">
            <Avatar name={post.posted_by} size="sm" />
            <div>
              <p className="font-semibold text-sm text-white">{post.posted_by}</p>
              <p className="text-textSecondary text-sm mt-0.5 leading-relaxed">{post.content}</p>
            </div>
          </div>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {comments.length === 0 ? (
            <div className="text-center text-textSecondary py-8">
              <MessageCircle size={40} className="mx-auto mb-3 opacity-30" />
              <p>No comments yet. Be the first!</p>
            </div>
          ) : (
            comments.map((c, i) => (
              <div key={i} className="flex gap-3 animate-fade-in">
                <Avatar name={c.name} size="sm" />
                <div className="bg-surfaceHover rounded-xl px-3 py-2 flex-1">
                  <p className="font-semibold text-sm text-primary">{c.name}</p>
                  <p className="text-sm text-textPrimary mt-0.5">{c.comment}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border flex gap-3 items-end">
          <Avatar name={user?.full_name} size="sm" />
          <div className="flex-1 flex items-center bg-surfaceHover rounded-xl border border-border focus-within:border-primary/50 transition-colors px-3">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Write a comment…"
              className="flex-1 bg-transparent py-3 text-sm text-white placeholder-textSecondary outline-none"
              disabled={loading}
            />
            <button
              onClick={submitComment}
              disabled={loading || !text.trim()}
              className="ml-2 p-1.5 rounded-full bg-primary text-black disabled:opacity-30 hover:bg-primaryHover transition-colors"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Edit Modal
const EditModal = ({ post, onClose, onSaved }) => {
  const [content, setContent] = useState(post.content);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!content.trim() || content.trim() === post.content) { onClose(); return; }
    setLoading(true);
    try {
      await api.put('/edit-quote', { quote_id: post.quote_id, new_content: content.trim() });
      toast.success('Quote updated!');
      onSaved(post.quote_id, content.trim());
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to update quote');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold text-white">Edit Quote</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surfaceHover text-textSecondary hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={4}
            maxLength={500}
            className="w-full bg-surfaceHover border border-border rounded-xl p-3 text-white placeholder-textSecondary outline-none focus:border-primary/50 resize-none text-sm transition-colors"
          />
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs text-textSecondary">{content.length}/500</span>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 rounded-full border border-border text-sm text-white hover:bg-surfaceHover transition-colors">Cancel</button>
              <button onClick={submit} disabled={loading || !content.trim()} className="px-4 py-2 rounded-full bg-primary text-black font-bold text-sm hover:bg-primaryHover disabled:opacity-50 transition-colors">
                {loading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main PostCard
const PostCard = ({ post: initialPost, onReactionUpdate, showActions = true }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [post, setPost] = useState(initialPost);
  const [isLiked, setIsLiked] = useState(initialPost.is_liked || false);
  const [likesCount, setLikesCount] = useState(initialPost.likes_count || 0);
  const [commentsCount, setCommentsCount] = useState(initialPost.comments_count || initialPost.comments?.length || 0);
  const [likeLoading, setLikeLoading] = useState(false);

  const [showComments, setShowComments] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const isOwner = user?.email === post.email;

  const handleLike = async () => {
    if (likeLoading) return;
    // Optimistic update
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);
    setLikeLoading(true);
    try {
      await api.post('/like', { quote_id: post.quote_id, action: 'like' });
    } catch (err) {
      // Revert
      setIsLiked(wasLiked);
      setLikesCount(prev => wasLiked ? prev + 1 : prev - 1);
      toast.error(err.message || 'Failed to like');
    } finally {
      setLikeLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this quote?')) return;
    setShowMenu(false);
    try {
      await api.delete('/delete-quote', { data: { quote_id: post.quote_id } });
      setDeleted(true);
      toast.success('Quote deleted');
      if (onReactionUpdate) onReactionUpdate();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const handleSaved = (id, newContent) => {
    setPost(prev => ({ ...prev, content: newContent }));
    if (onReactionUpdate) onReactionUpdate();
  };

  const handleUserClick = () => {
    if (isOwner) navigate('/profile');
    else navigate(`/user/${encodeURIComponent(post.email)}`);
  };

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
    } catch { return ''; }
  })();

  if (deleted) return null;

  return (
    <>
      <article className="border-b border-border px-4 py-4 hover:bg-white/[0.02] transition-colors duration-150 animate-fade-in group">
        <div className="flex gap-3">
          {/* Avatar */}
          <button onClick={handleUserClick} className="shrink-0 hover:scale-105 transition-transform">
            <Avatar name={post.posted_by} />
          </button>

          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <button
                  onClick={handleUserClick}
                  className="font-bold text-white hover:underline truncate text-[15px]"
                >
                  {post.posted_by}
                </button>
                <span className="text-textSecondary text-sm truncate">
                  @{post.email?.split('@')[0]}
                </span>
                <span className="text-textSecondary text-sm">·</span>
                <span className="text-textSecondary text-sm whitespace-nowrap">{timeAgo}</span>
              </div>
              {/* Options menu (owner only) */}
              {isOwner && showActions && (
                <div className="relative shrink-0">
                  <button
                    onClick={() => setShowMenu(prev => !prev)}
                    className="p-1.5 rounded-full text-textSecondary hover:text-white hover:bg-surfaceHover transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                      <div className="absolute right-0 top-8 bg-surface border border-border rounded-xl shadow-xl z-20 overflow-hidden min-w-[140px] animate-fade-in">
                        <button
                          onClick={() => { setShowMenu(false); setShowEdit(true); }}
                          className="flex items-center gap-2 w-full px-4 py-3 text-sm text-white hover:bg-surfaceHover transition-colors"
                        >
                          <Pencil size={15} className="text-primary" />
                          Edit Quote
                        </button>
                        <button
                          onClick={handleDelete}
                          className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={15} />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Content */}
            <p className="mt-2 text-[15px] text-textPrimary leading-relaxed whitespace-pre-wrap break-words">
              {post.content}
            </p>

            {/* Actions */}
            {showActions && (
              <div className="flex items-center gap-6 mt-3">
                {/* Like */}
                <button
                  onClick={handleLike}
                  disabled={likeLoading}
                  className={`flex items-center gap-1.5 group/like transition-colors ${
                    isLiked ? 'text-primary' : 'text-textSecondary hover:text-primary'
                  }`}
                >
                  <div className={`p-2 rounded-full transition-colors ${
                    isLiked ? 'bg-primary/10' : 'group-hover/like:bg-primary/10'
                  }`}>
                    <Heart
                      size={18}
                      className={`transition-all duration-200 ${isLiked ? 'fill-primary scale-110' : ''} ${likeLoading ? 'opacity-50' : ''}`}
                    />
                  </div>
                  <span className="text-sm font-medium tabular-nums">{likesCount}</span>
                </button>

                {/* Comment */}
                <button
                  onClick={() => setShowComments(true)}
                  className="flex items-center gap-1.5 text-textSecondary hover:text-primary group/cmt transition-colors"
                >
                  <div className="p-2 rounded-full group-hover/cmt:bg-primary/10 transition-colors">
                    <MessageCircle size={18} />
                  </div>
                  <span className="text-sm font-medium tabular-nums">{commentsCount}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </article>

      {showComments && (
        <CommentModal
          post={{ ...post, comments: post.comments || [] }}
          onClose={() => setShowComments(false)}
        />
      )}
      {showEdit && (
        <EditModal
          post={post}
          onClose={() => setShowEdit(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
};

export default PostCard;
