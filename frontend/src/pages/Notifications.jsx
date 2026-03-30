import React, { useState, useEffect } from 'react';
import { Heart, UserPlus, MessageCircle, Bell, RefreshCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';
import api from '../services/api';

const typeConfig = {
  like: {
    icon: Heart,
    iconClass: 'text-primary fill-primary',
    bgClass: 'bg-primary/10',
    label: 'like',
  },
  follow: {
    icon: UserPlus,
    iconClass: 'text-blue-400',
    bgClass: 'bg-blue-400/10',
    label: 'follow',
  },
  comment: {
    icon: MessageCircle,
    iconClass: 'text-green-400',
    bgClass: 'bg-green-400/10',
    label: 'comment',
  },
};

const NotifItem = ({ notif }) => {
  const cfg = typeConfig[notif.type] || {
    icon: Bell,
    iconClass: 'text-primary',
    bgClass: 'bg-primary/10',
    label: 'notification',
  };
  const Icon = cfg.icon;

  const timeStr = (() => {
    try {
      return formatDistanceToNow(new Date(notif.time), { addSuffix: true });
    } catch { return ''; }
  })();

  return (
    <div className={`flex gap-4 px-5 py-4 border-b border-border hover:bg-white/[0.02] transition-colors animate-fade-in ${!notif.is_read ? 'border-l-2 border-l-primary/50' : ''}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${cfg.bgClass}`}>
        <Icon size={18} className={cfg.iconClass} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] text-textPrimary leading-snug">{notif.message}</p>
        <p className="text-textSecondary text-xs mt-1">{timeStr}</p>
      </div>
      {!notif.is_read && (
        <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
      )}
    </div>
  );
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'like' | 'follow' | 'comment'

  const fetchNotifications = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const { data } = await api.get('/my-notifications');
      setNotifications(data.notifications || []);
    } catch (err) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const filtered = filter === 'all'
    ? notifications
    : notifications.filter(n => n.type === filter);

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'like', label: '❤️ Likes' },
    { key: 'follow', label: '👤 Follows' },
    { key: 'comment', label: '💬 Comments' },
  ];

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-md z-20 border-b border-border px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-primary text-black text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={() => fetchNotifications(true)}
          disabled={refreshing}
          className="p-2 rounded-full hover:bg-surfaceHover text-textSecondary hover:text-white transition-colors"
        >
          <RefreshCcw size={17} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-border px-2 gap-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`py-3 px-4 text-sm font-medium transition-colors rounded-t-lg ${
              filter === tab.key
                ? 'text-primary border-b-2 border-primary'
                : 'text-textSecondary hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-9 h-9 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-textSecondary text-sm">Loading notifications…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center px-8">
          <Bell size={48} className="mx-auto mb-4 text-textSecondary opacity-40" />
          <h2 className="text-xl font-bold text-white mb-2">
            {filter === 'all' ? "Nothing here yet" : `No ${filter}s`}
          </h2>
          <p className="text-textSecondary text-sm">
            {filter === 'all'
              ? "Likes, follows, and comments will appear here."
              : `You have no ${filter} notifications yet.`}
          </p>
        </div>
      ) : (
        filtered.map((notif, i) => (
          <NotifItem key={i} notif={notif} />
        ))
      )}
    </div>
  );
};

export default Notifications;
