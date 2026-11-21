import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  ExternalLink, 
  Trophy, 
  AlertTriangle, 
  Zap, 
  Gavel, 
  Filter 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const NotificationsSection = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.notifications);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    return true;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'auction_won':
        return <Trophy className="w-5 h-5 text-amber-400" />;
      case 'outbid':
      case 'bid_rejected':
        return <AlertTriangle className="w-5 h-5 text-rose-400" />;
      case 'auction_extended':
        return <Zap className="w-5 h-5 text-yellow-400" />;
      case 'bid_accepted':
      case 'new_highest_bid':
        return <Gavel className="w-5 h-5 text-emerald-400" />;
      default:
        return <Bell className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-400" />
              Notifications Center
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Live updates on your active bids, counter-offers, anti-sniping extensions, and won lots.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setFilter(filter === 'unread' ? 'all' : 'unread')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
              }`}
            >
              {filter === 'unread' ? 'Show All' : 'Show Unread Only'}
            </button>
            <button
              onClick={handleMarkAllRead}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-blue-400 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark All Read
            </button>
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading notifications...</div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <Bell className="w-8 h-8 mx-auto opacity-30" />
            <p className="text-xs">No notifications found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
            {filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.is_read) handleMarkAsRead(n.id);
                  if (n.link) navigate(n.link);
                }}
                className={`p-4 hover:bg-slate-800/30 transition-colors flex items-start justify-between gap-4 cursor-pointer ${
                  !n.is_read ? 'bg-blue-950/20' : ''
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                    {getIcon(n.type)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-xs font-bold ${!n.is_read ? 'text-white' : 'text-slate-300'}`}>
                        {n.title}
                      </p>
                      {!n.is_read && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          NEW
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {new Date(n.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {n.link && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(n.link);
                      }}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-blue-400 text-xs flex items-center gap-1 border border-slate-800"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => handleDelete(n.id, e)}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 text-xs border border-slate-800 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsSection;
