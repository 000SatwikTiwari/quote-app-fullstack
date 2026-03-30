import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Zap, ImagePlus, Loader2 } from 'lucide-react';
import api from '../services/api';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';

const Feed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newQuote, setNewQuote] = useState('');
  const [posting, setPosting] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchFeed = useCallback(async (resetPage = true) => {
    if (resetPage) {
      setLoading(true);
      setPage(1);
    }
    try {
      const p = resetPage ? 1 : page;
      const { data } = await api.get(`/feed?page=${p}&limit=15`);
      const fetched = data.posts || [];
      if (resetPage) {
        setPosts(fetched);
      } else {
        setPosts(prev => [...prev, ...fetched]);
      }
      setHasMore(fetched.length === 15);
      if (!resetPage) setPage(p + 1);
    } catch (err) {
      toast.error(err.message || 'Failed to load feed');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [page]);

  useEffect(() => {
    fetchFeed(true);
  }, []);

  const handlePost = async (e) => {
    e.preventDefault();
    const trimmed = newQuote.trim();
    if (!trimmed) return;
    if (trimmed.length > 500) { toast.error('Quote is too long (max 500 chars)'); return; }
    setPosting(true);
    try {
      await api.post(`/create-quote?content=${encodeURIComponent(trimmed)}`);
      setNewQuote('');
      toast.success('Quote posted! ✨');
      await fetchFeed(true);
    } catch (err) {
      toast.error(err.message || 'Failed to post quote');
    } finally {
      setPosting(false);
    }
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    try {
      const { data } = await api.get(`/feed?page=${nextPage}&limit=15`);
      const fetched = data.posts || [];
      setPosts(prev => [...prev, ...fetched]);
      setHasMore(fetched.length === 15);
    } catch (err) {
      toast.error('Failed to load more posts');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleReactionUpdate = () => fetchFeed(true);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-md z-20 border-b border-border px-5 py-4">
        <h1 className="text-xl font-bold text-white">Home</h1>
      </div>

      {/* Create Post Box */}
      <div className="border-b border-border px-5 py-4">
        <div className="flex gap-3">
          <div className="shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-base">
            {user?.full_name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <textarea
              value={newQuote}
              onChange={e => setNewQuote(e.target.value)}
              placeholder="What's on your mind? Share a quote…"
              className="w-full bg-transparent text-white text-[17px] placeholder-textSecondary outline-none resize-none leading-relaxed"
              rows={newQuote ? 3 : 2}
              maxLength={500}
            />
            <div className="flex items-center justify-between mt-2 pt-3 border-t border-border">
              <div className="flex items-center gap-3 text-primary">
                <button className="hover:bg-primary/10 p-1.5 rounded-full transition-colors">
                  <Zap size={18} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                {newQuote.length > 0 && (
                  <span className={`text-xs font-medium ${newQuote.length > 450 ? 'text-red-400' : 'text-textSecondary'}`}>
                    {newQuote.length}/500
                  </span>
                )}
                <button
                  onClick={handlePost}
                  disabled={posting || !newQuote.trim()}
                  className="bg-primary hover:bg-primaryHover text-black font-bold py-1.5 px-5 rounded-full disabled:opacity-40 transition-all text-sm flex items-center gap-2"
                >
                  {posting ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-textSecondary text-sm">Loading your feed…</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center px-8">
            <Zap size={48} className="text-primary mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-bold text-white mb-2">Your feed is empty</h2>
            <p className="text-textSecondary text-sm">Follow users or post your first quote to get started.</p>
          </div>
        ) : (
          <>
            {posts.map(post => (
              <PostCard key={post.quote_id} post={post} onReactionUpdate={handleReactionUpdate} />
            ))}
            {hasMore && (
              <div className="py-6 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="text-primary hover:underline text-sm flex items-center gap-2 mx-auto"
                >
                  {loadingMore ? <Loader2 size={16} className="animate-spin" /> : null}
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Feed;
