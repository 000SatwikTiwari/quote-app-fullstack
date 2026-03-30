import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeft, UserPlus, UserMinus, Grid3X3 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/PostCard';

const UserProfile = () => {
  const { email: encodedEmail } = useParams();
  const email = decodeURIComponent(encodedEmail);
  const { user: me } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [followingEmails, setFollowingEmails] = useState(new Set());

  // If navigating to own email, redirect to /profile
  useEffect(() => {
    if (me?.email === email) {
      navigate('/profile', { replace: true });
    }
  }, [email, me, navigate]);

  useEffect(() => {
    if (email && me?.email !== email) {
      loadPage();
    }
  }, [email]);

  const loadPage = async () => {
    setLoading(true);
    try {
      // Get who current user follows to determine follow state
      const [feedRes, followingRes] = await Promise.all([
        api.get(`/feed?page=1&limit=50`),
        api.get('/my-following'),
      ]);

      const following = followingRes.data.following || [];
      const emails = new Set(following.map(f => f.email));
      setFollowingEmails(emails);
      setIsFollowing(emails.has(email));

      // Extract posts from feed that belong to this user
      const userPosts = (feedRes.data.posts || []).filter(p => p.email === email);

      // Get profile info from discover or from feed data
      if (userPosts.length > 0) {
        // Build a profile from feed data
        setProfile({
          full_name: userPosts[0].posted_by,
          email: email,
          followers_count: null,
          following_count: null,
        });
      }

      // Try to get more info from discover
      try {
        const discoverRes = await api.get(`/discover-users?search=&limit=100`);
        const found = (discoverRes.data.users || []).find(u => u.email === email);
        if (found) {
          setProfile({
            full_name: found.full_name,
            email: found.email,
            followers_count: found.followers_count,
            following_count: null,
          });
        }
      } catch (_) {}

      // If still no profile, build from feed posts
      if (userPosts.length > 0 && !profile) {
        setProfile({
          full_name: userPosts[0].posted_by,
          email,
          followers_count: null,
          following_count: null,
        });
      }

      setPosts(userPosts);
    } catch (err) {
      toast.error('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    if (profile) {
      setProfile(prev => ({
        ...prev,
        followers_count: prev.followers_count != null
          ? (wasFollowing ? prev.followers_count - 1 : prev.followers_count + 1)
          : null,
      }));
    }
    try {
      if (wasFollowing) {
        await api.post(`/unfollow?target_email=${encodeURIComponent(email)}`);
        toast.success('Unfollowed');
      } else {
        await api.post(`/follow?target_email=${encodeURIComponent(email)}`);
        toast.success('Following!');
      }
    } catch (err) {
      // Revert
      setIsFollowing(wasFollowing);
      if (profile) {
        setProfile(prev => ({
          ...prev,
          followers_count: prev.followers_count != null
            ? (wasFollowing ? prev.followers_count + 1 : prev.followers_count - 1)
            : null,
        }));
      }
      toast.error(err.message || 'Action failed');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-textSecondary text-sm">Loading profile…</p>
      </div>
    );
  }

  const displayName = profile?.full_name || email.split('@')[0];

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-md z-20 border-b border-border px-5 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-surfaceHover text-textSecondary hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">{displayName}</h1>
          <p className="text-xs text-textSecondary">{posts.length} quotes</p>
        </div>
      </div>

      {/* Banner */}
      <div className="h-36 bg-gradient-to-r from-primary/10 via-yellow-900/10 to-black" />

      {/* Avatar & Follow button */}
      <div className="px-5 pb-4">
        <div className="flex items-end justify-between -mt-14 mb-4">
          <div className="w-28 h-28 rounded-full border-4 border-black bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-5xl font-extrabold text-primary shadow-lg">
            {displayName.charAt(0).toUpperCase()}
          </div>

          <button
            onClick={handleFollow}
            disabled={followLoading}
            className={`flex items-center gap-2 font-semibold py-2 px-5 rounded-full text-sm transition-all disabled:opacity-60 ${
              isFollowing
                ? 'border border-border text-white hover:border-red-500 hover:text-red-400'
                : 'bg-primary hover:bg-primaryHover text-black'
            }`}
          >
            {followLoading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : isFollowing ? (
              <>
                <UserMinus size={15} />
                Following
              </>
            ) : (
              <>
                <UserPlus size={15} />
                Follow
              </>
            )}
          </button>
        </div>

        <h2 className="text-2xl font-bold text-white">{displayName}</h2>
        <p className="text-textSecondary text-sm">@{email.split('@')[0]}</p>

        {profile?.followers_count != null && (
          <div className="flex gap-5 mt-3 text-sm">
            <span>
              <span className="font-bold text-white">{profile.followers_count}</span>
              <span className="text-textSecondary ml-1">Followers</span>
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <div className="flex-1 flex gap-2 items-center justify-center py-4 font-bold text-white border-b-2 border-primary">
          <Grid3X3 size={16} />
          Quotes
        </div>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="py-20 text-center px-8">
          <Grid3X3 size={48} className="mx-auto mb-4 text-textSecondary opacity-40" />
          <h2 className="text-xl font-bold text-white mb-2">No quotes yet</h2>
          <p className="text-textSecondary text-sm">Follow them to see their future posts on your feed.</p>
        </div>
      ) : (
        posts.map(post => (
          <PostCard key={post.quote_id} post={post} showActions={true} />
        ))
      )}
    </div>
  );
};

export default UserProfile;
