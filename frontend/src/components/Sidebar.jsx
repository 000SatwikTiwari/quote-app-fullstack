import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, Bell, User, LogOut, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Sidebar = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifCount();
    const interval = setInterval(fetchNotifCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifCount = async () => {
    try {
      const { data } = await api.get('/my-notifications');
      const unread = (data.notifications || []).filter(n => !n.is_read).length;
      setUnreadCount(unread);
    } catch (_) {}
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const links = [
    { name: 'Home', path: '/', icon: Home, exact: true },
    { name: 'Discover', path: '/discover', icon: Search },
    { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <div className="fixed top-0 left-0 flex flex-col h-screen border-r border-border p-3 w-[80px] sm:w-[250px] lg:w-[275px] bg-black z-30">
      {/* Logo */}
      <div
        className="flex items-center gap-3 p-3 mb-4 cursor-pointer group"
        onClick={() => navigate('/')}
      >
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <Zap size={22} className="text-black fill-black" />
        </div>
        <span className="hidden sm:block text-xl font-extrabold tracking-tight text-white">
          Quote<span className="text-primary">APP</span>
        </span>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 space-y-1">
        {links.map(({ name, path, icon: Icon, badge, exact }) => (
          <NavLink
            key={name}
            to={path}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-4 p-3 rounded-full transition-all duration-150 group relative ${
                isActive
                  ? 'font-bold text-white'
                  : 'text-textSecondary hover:bg-surfaceHover hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative shrink-0">
                  <Icon
                    size={26}
                    className={isActive ? 'text-primary' : 'group-hover:text-primary transition-colors'}
                  />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-primary text-black text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className="hidden sm:block text-lg">{name}</span>
                {isActive && (
                  <div className="hidden sm:block absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="mt-auto flex flex-col gap-2">
        {user && (
          <div className="flex items-center gap-3 p-3 rounded-full hover:bg-surfaceHover transition-colors cursor-pointer" onClick={() => navigate('/profile')}>
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
              <span className="text-primary font-bold text-lg">
                {user.full_name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="hidden sm:block overflow-hidden">
              <p className="font-semibold text-white text-sm truncate">{user.full_name}</p>
              <p className="text-textSecondary text-xs truncate">@{user.email?.split('@')[0]}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center justify-center sm:justify-start gap-4 p-3 rounded-full text-textSecondary hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut size={22} />
          <span className="hidden sm:block text-base">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
