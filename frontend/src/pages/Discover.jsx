import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Search, UserPlus, UserMinus, Users, Loader2 } from 'lucide-react';
import api from '../services/api';

const Discover = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [followingEmails, setFollowingEmails] = useState(new Set());
  const [actionLoading, setActionLoading] = useState(new Set());

  // Load who we already follow on mount
  const loadFollowing = useCallback(async () => {
    try {
      const { data } = await api.get('/my-following');
      const emails = new Set((data.following || []).map(f => f.email));
      setFollowingEmails(emails);
    } catch (_) {}
  }, []);

  const fetchUsers = useCallback(async (query = '') => {
    setLoading(true);
    try {
      const { data } = await api.get(`/discover-users?search=${encodeURIComponent(query)}&limit=30`);
      setUsers(data.users || []);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFollowing();
    fetchUsers();
  }, [loadFollowing, fetchUsers]);

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(search), 400);
    return () => clearTimeout(t);
  }, [search, fetchUsers]);

  const toggleFollow = async (email, currentlyFollowing) => {
    if (actionLoading.has(email)) return;
    setActionLoading(prev => new Set(prev).add(email));

    // Optimistic
    setFollowingEmails(prev => {
      const next = new Set(prev);
      if (currentlyFollowing) next.delete(email);
      else next.add(email);
      return next;
    });

    try {
      if (currentlyFollowing) {
        await api.post(`/unfollow?target_email=${encodeURIComponent(email)}`);
        toast.success('Unfollowed');
      } else {
        await api.post(`/follow?target_email=${encodeURIComponent(email)}`);
        toast.success('Following! 🎉');
      }
    } catch (err) {
      // Revert
      setFollowingEmails(prev => {
        const next = new Set(prev);
        if (currentlyFollowing) next.add(email);
        else next.delete(email);
        return next;
      });
      toast.error(err.message || 'Action failed');
    } finally {
      setActionLoading(prev => {
        const next = new Set(prev);
        next.delete(email);
        return next;
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Sticky Search Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-md z-20 border-b border-border px-5 py-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search size={17} className="text-textSecondary" />
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users by name…"
            className="w-full bg-surface border border-border rounded-full pl-11 pr-4 py-2.5 text-white placeholder-textSecondary outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all text-sm"
          />
        </div>
      </div>

      {/* Section title */}
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <Users size={18} className="text-primary" />
        <h1 className="text-lg font-bold text-white">Discover People</h1>
      </div>

      <div>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-9 h-9 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-textSecondary text-sm">Finding people for you…</p>
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center px-8">
            <Users size={48} className="mx-auto mb-4 text-textSecondary opacity-40" />
            <h2 className="text-xl font-bold text-white mb-2">No users found</h2>
            <p className="text-textSecondary text-sm">Try a different search term.</p>
          </div>
        ) : (
          users.map(u => {
            const isFollowing = followingEmails.has(u.email);
            const isLoading = actionLoading.has(u.email);
            return (
              <div
                key={u.email}
                className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] border-b border-border transition-colors"
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary text-lg shrink-0">
                  {u.full_name?.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 overflow-hidden">
                  <p className="font-bold text-white text-[15px] truncate">{u.full_name}</p>
                  <p className="text-textSecondary text-sm truncate">@{u.email?.split('@')[0]}</p>
                  {u.followers_count != null && (
                    <p className="text-textSecondary text-xs mt-0.5">
                      {u.followers_count.toLocaleString()} followers
                    </p>
                  )}
                </div>

                {/* Follow button */}
                <button
                  onClick={() => toggleFollow(u.email, isFollowing)}
                  disabled={isLoading}
                  className={`flex items-center gap-1.5 font-semibold py-1.5 px-4 rounded-full text-sm transition-all disabled:opacity-60 shrink-0 ${
                    isFollowing
                      ? 'border border-border text-white hover:border-red-500 hover:text-red-400'
                      : 'bg-white text-black hover:bg-gray-200'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : isFollowing ? (
                    <>
                      <UserMinus size={14} />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} />
                      Follow
                    </>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Discover;
