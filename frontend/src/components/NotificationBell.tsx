'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  CalendarCheck,
  FileText,
  Pill,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { notificationApi } from '@/lib/api';
import { NotificationItem, NotificationType } from '@/types/doctorPortal';
import { useAuth } from '@/context/AuthContext';

interface NotificationBellProps {
  viewAllHref?: string;
}

export default function NotificationBell({ viewAllHref }: NotificationBellProps) {
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationApi.getUnreadCount();
      if (res.success && res.data) {
        setUnreadCount(res.data.unreadCount);
      }
    } catch {
      // silent background check
    }
  }, [isAuthenticated]);

  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const res = await notificationApi.getAll(false);
      if (res.success && res.data) {
        setNotifications(res.data.slice(0, 8));
        setUnreadCount(res.data.filter((n) => !n.isRead).length);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const initial = setTimeout(() => {
      void fetchUnreadCount();
    }, 0);
    const timer = setInterval(() => {
      void fetchUnreadCount();
    }, 30000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [isAuthenticated, fetchUnreadCount]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      fetchNotifications();
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      try {
        await notificationApi.markAsRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // ignore
      }
    }
    setOpen(false);
    if (item.link) {
      const target =
        item.link === '/appointments' && user?.role === 'PATIENT'
          ? '/my-appointments'
          : item.link;
      router.push(target);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'APPOINTMENT_REQUESTED':
      case 'APPOINTMENT_CONFIRMED':
      case 'APPOINTMENT_COMPLETED':
      case 'APPOINTMENT_RESCHEDULED':
        return <CalendarCheck className="w-4 h-4 text-[#aa5588]" />;
      case 'APPOINTMENT_REJECTED':
      case 'APPOINTMENT_CANCELLED':
        return <AlertCircle className="w-4 h-4 text-rose-500" />;
      case 'MEDICAL_RECORD_UPDATED':
        return <FileText className="w-4 h-4 text-indigo-600" />;
      case 'PRESCRIPTION_ISSUED':
        return <Pill className="w-4 h-4 text-emerald-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Open notifications"
        aria-expanded={open}
        className="relative p-2 rounded-full text-slate-600 hover:text-[#aa5588] hover:bg-[#fbf5f8] border border-transparent hover:border-[#edd5e3] transition-all cursor-pointer"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#aa5588] text-white text-[10px] font-bold flex items-center justify-center shadow-2xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200/90 shadow-xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fbf5f8] text-[#aa5588] border border-[#edd5e3]">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-[#aa5588] hover:text-[#924472] inline-flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <Bell className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">All caught up</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  You have no notifications right now.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleItemClick(item)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                    !item.isRead ? 'bg-[#fbf5f8]/50' : ''
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-xs truncate ${
                          !item.isRead
                            ? 'font-bold text-slate-900'
                            : 'font-semibold text-slate-700'
                        }`}
                      >
                        {item.title}
                      </p>
                      {!item.isRead && (
                        <span className="w-2 h-2 rounded-full bg-[#aa5588] shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                      {item.message}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{item.createdAt}</span>
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          {viewAllHref && (
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 text-center">
              <Link
                href={viewAllHref}
                onClick={() => setOpen(false)}
                className="text-xs font-semibold text-[#aa5588] hover:text-[#924472]"
              >
                View all notifications &rarr;
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
