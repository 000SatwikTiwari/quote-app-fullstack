import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { Pencil, Check, X, Grid3X3, Loader2 } from 'lucide-react';
import api from '../services/api';
import PostCard from '../components/PostCard';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [followingList, setFollowingList] = useState([]);
  const [followersList, setFollowersList] = useState([]);
  const [listModal, setListModal] = useState(null); // 'followers' | 'following' | null
  const [loadingList, setLoadingList] = useState(false);

  const fetchMyPosts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/my-posts');
      const formatted = (data.my_posts || []).map(p => ({
        ...p,
        posted_by: user?.full_name || '',
        email: user?.email || '',
        comments_count: p.comments?.length || 0,
        created_at: p.created_at || new Date().toISOString(),
      })).reverse();
      setPosts(formatted);
    } catch (err) {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchMyPosts();
  }, [user, fetchMyPosts]);

  const openList = async (type) => {
    setListModal(type);
    setLoadingList(true);
    try {
      if (type === 'followers') {
        const { data } = await api.get('/my-followers');
        setFollowersList(data.followers || []);
      } else {
        const { data } = await api.get('/my-following');
        setFollowingList(data.following || []);
      }
    } catch (err) {
      toast.error(`Failed to load ${type}`);
    } finally {
      setLoadingList(false);
    }
  };

  const startEdit = () => {
    setNewName(user?.full_name || '');
    setEditingName(true);
  };

  const cancelEdit = () => {
    setEditingName(false);
    setNewName('');
  };

  const saveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed) { toast.error('Name cannot be empty'); return; }
    if (trimmed === user?.full_name) { cancelEdit(); return; }
    setSavingName(true);
    try {
      await api.post(`/edit_profile?name=${encodeURIComponent(trimmed)}`);
      await refreshUser();
      toast.success('Name updated!');
      setEditingName(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const currentList = listModal === 'followers' ? followersList : followingList;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-md z-20 border-b border-border px-5 py-4 flex items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">{user?.full_name}</h1>
          <p className="text-xs text-textSecondary">{posts.length} quotes</p>
        </div>
      </div>

      {/* Banner */}
      <div className="h-36 bg-gradient-to-r from-primary/20 via-yellow-900/20 to-black relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      </div>

      {/* Avatar & Buttons row */}
      <div className="px-5 pb-4">
        <div className="flex items-end justify-between -mt-14 mb-4">
          <div className="w-28 h-28 rounded-full border-4 border-black bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-5xl font-extrabold text-primary shadow-lg">
            {user?.full_name?.charAt(0).toUpperCase()}
          </div>

          {/* Edit profile button */}
          {!editingName ? (
            <button
              onClick={startEdit}
              className="flex items-center gap-2 border border-border text-white font-semibold py-2 px-4 rounded-full hover:bg-surfaceHover transition-colors text-sm"
            >
              <Pencil size={15} />
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={cancelEdit} className="p-2 rounded-full border border-border text-textSecondary hover:bg-surfaceHover transition-colors">
                <X size={18} />
              </button>
              <button
                onClick={saveName}
                disabled={savingName}
                className="flex items-center gap-1.5 bg-primary hover:bg-primaryHover text-black font-bold py-2 px-4 rounded-full text-sm transition-colors disabled:opacity-60"
              >
                {savingName ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save
              </button>
            </div>
          )}
        </div>

        {/* Name area */}
        {editingName ? (
          <div className="mb-3">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') cancelEdit(); }}
              autoFocus
              className="text-2xl font-bold bg-surfaceHover border border-primary/40 rounded-xl px-3 py-1 text-white outline-none w-full max-w-xs"
              maxLength={60}
              placeholder="Your name"
            />
            <p className="text-xs text-textSecondary mt-1">Press Enter to save</p>
          </div>
        ) : (
          <div className="mb-3">
            <h2 className="text-2xl font-bold text-white">{user?.full_name}</h2>
            <p className="text-textSecondary text-sm">@{user?.email?.split('@')[0]}</p>
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-5 text-sm">
          <button
            onClick={() => openList('following')}
            className="hover:underline text-left"
          >
            <span className="font-bold text-white">{user?.following_count || 0}</span>
            <span className="text-textSecondary ml-1">Following</span>
          </button>
          <button
            onClick={() => openList('followers')}
            className="hover:underline text-left"
          >
            <span className="font-bold text-white">{user?.followers_count || 0}</span>
            <span className="text-textSecondary ml-1">Followers</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <div className="flex-1 flex gap-2 items-center justify-center py-4 font-bold text-white border-b-2 border-primary relative">
          <Grid3X3 size={16} />
          Quotes
        </div>
      </div>

      {/* Posts */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="py-20 text-center px-8">
          <Grid3X3 size={48} className="mx-auto mb-4 text-textSecondary opacity-40" />
          <h2 className="text-xl font-bold text-white mb-2">No quotes yet</h2>
          <p className="text-textSecondary text-sm">Your posted quotes will appear here.</p>
        </div>
      ) : (
        posts.map(post => (
          <PostCard key={post.quote_id} post={post} onReactionUpdate={fetchMyPosts} />
        ))
      )}

      {/* Followers/Following Modal */}
      {listModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-sm flex flex-col max-h-[75vh] animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold text-white capitalize">{listModal}</h2>
              <button onClick={() => setListModal(null)} className="p-2 rounded-full hover:bg-surfaceHover text-textSecondary transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-3">
              {loadingList ? (
                <div className="flex justify-center py-10">
                  <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : currentList.length === 0 ? (
                <p className="text-center text-textSecondary py-10">No {listModal} yet.</p>
              ) : (
                currentList.map((u, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surfaceHover transition-colors">
                    <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center font-bold text-primary shrink-0">
                      {u.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-semibold text-sm text-white truncate">{u.full_name}</p>
                      <p className="text-textSecondary text-xs truncate">@{u.email?.split('@')[0]}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
