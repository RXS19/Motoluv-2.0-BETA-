import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { notificationApi } from '../services/api';

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (isNaN(diffMs) || diffMs < 0) return 'Ahora';
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} d`;
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
};

// Global shared state for all NotificationBell instances
let sharedNotifications = [];
let isStoreInitialized = false;
let storeLoading = false;
let currentUserId = null;
let realtimeChannel = null;
const storeListeners = new Set();

const emitStoreChange = () => {
  storeListeners.forEach((listener) => {
    try {
      listener([...sharedNotifications]);
    } catch (e) {
      console.warn('Error notifying NotificationBell listener:', e);
    }
  });
};

const setSharedNotifications = (updater) => {
  if (typeof updater === 'function') {
    sharedNotifications = updater(sharedNotifications);
  } else {
    sharedNotifications = Array.isArray(updater) ? updater : [];
  }
  emitStoreChange();
};

const setupRealtimeSubscription = (userId) => {
  if (!isSupabaseConfigured || !supabase || !userId) return;
  if (realtimeChannel) {
    try {
      supabase.removeChannel(realtimeChannel);
    } catch {
      // ignore
    }
  }

  realtimeChannel = supabase
    .channel(`public:notifications:recipient:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.eventType === 'INSERT') {
          const newRecord = payload.new;
          if (!newRecord.read_at) {
            setSharedNotifications((prev) => {
              if (prev.some((p) => String(p.id) === String(newRecord.id))) return prev;
              return [
                {
                  id: String(newRecord.id),
                  recipient_id: String(newRecord.recipient_id),
                  type: newRecord.type,
                  title: newRecord.title || 'Notificación',
                  body: newRecord.body || '',
                  moto_id: newRecord.moto_id,
                  apartado_id: newRecord.apartado_id,
                  offer_id: newRecord.offer_id,
                  created_at: newRecord.created_at,
                  read_at: newRecord.read_at,
                },
                ...prev,
              ];
            });
          }
        } else if (payload.eventType === 'UPDATE') {
          const updatedRecord = payload.new;
          if (updatedRecord.read_at) {
            setSharedNotifications((prev) =>
              prev.filter((p) => String(p.id) !== String(updatedRecord.id))
            );
          }
        } else if (payload.eventType === 'DELETE') {
          const deletedRecord = payload.old;
          setSharedNotifications((prev) =>
            prev.filter((p) => String(p.id) !== String(deletedRecord.id))
          );
        }
      }
    )
    .subscribe();
};

const syncStore = async (userId) => {
  if (currentUserId !== userId) {
    currentUserId = userId;
    sharedNotifications = [];
    isStoreInitialized = false;
    setupRealtimeSubscription(userId);
  }

  if (isStoreInitialized || storeLoading) return;
  storeLoading = true;
  try {
    const notifs = await notificationApi.getUnread();
    sharedNotifications = Array.isArray(notifs) ? notifs : [];
    isStoreInitialized = true;
    emitStoreChange();
  } catch (err) {
    console.warn('Error fetching notifications:', err);
  } finally {
    storeLoading = false;
  }
};

export const NotificationBell = ({ buttonClassName, iconSize = 17, dropdownClassName }) => {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(sharedNotifications);
  const notifRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Shared store subscription & sync
  useEffect(() => {
    const handleUpdate = (updatedList) => {
      setNotifications(updatedList);
    };
    storeListeners.add(handleUpdate);
    setNotifications([...sharedNotifications]);

    syncStore(user?.id);

    return () => {
      storeListeners.delete(handleUpdate);
    };
  }, [user?.id]);

  const handleNotificationClick = async (notif) => {
    // 1. Optimistically update shared store immediately for ALL bells
    setSharedNotifications((prev) => prev.filter((n) => String(n.id) !== String(notif.id)));
    // 2. Persist read_at in Supabase
    try {
      await notificationApi.markAsRead(notif.id);
    } catch (err) {
      console.warn('Error marking notification as attended:', err);
    }
  };

  const unreadCount = notifications.length;

  return (
    <div className="relative" ref={notifRef}>
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className={
          buttonClassName ||
          'relative p-2 rounded-full border border-white/10 hover:border-red-brand/50 text-zinc-300 hover:text-white transition-colors cursor-pointer'
        }
        title="Notificaciones"
        type="button"
      >
        <Bell size={iconSize} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-brand text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-[#0a0a0c]">
            {unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <div className={dropdownClassName || "absolute -right-12 sm:right-0 mt-2 w-[calc(100vw-2.5rem)] sm:w-88 max-w-sm bg-[#121216] border border-white/10 rounded-xl shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150 text-left"}>
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <h4 className="text-white text-xs font-bold uppercase tracking-wider">Notificaciones</h4>
            <span className="text-[10px] text-zinc-400">
              {unreadCount > 0 ? `${unreadCount} nuevas` : 'Al día'}
            </span>
          </div>
          <div className="py-2 space-y-2 max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-zinc-500 text-xs">
                No tienes notificaciones pendientes
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNotificationClick(n);
                    }
                  }}
                  className="p-2.5 rounded-lg text-xs transition-colors bg-red-brand/5 border border-red-brand/20 hover:bg-red-brand/10 hover:border-red-brand/40 cursor-pointer block text-left outline-none"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-white text-[11px] leading-tight">{n.title}</span>
                    <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                      {formatTimeAgo(n.created_at)}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-snug">{n.body}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
