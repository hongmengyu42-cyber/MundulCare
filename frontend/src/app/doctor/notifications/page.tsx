'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  CalendarCheck,
  FileText,
  Pill,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { notificationApi } from '@/lib/api';
import { NotificationItem, NotificationType } from '@/types/doctorPortal';

export default function DoctorNotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationApi.getAll(unreadOnly);
      if (res.success && res.data) {
        setNotifications(res.data);
      }
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadNotifications();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    await notificationApi.markAllAsRead();
    await loadNotifications();
  };

  const handleSelect = async (n: NotificationItem) => {
    if (!n.isRead) {
      await notificationApi.markAsRead(n.id);
    }
    if (n.link) {
      router.push(n.link);
    } else {
      await loadNotifications();
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

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-[#aa5588]" />
            <span>Notifications</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time alerts for new appointment requests, cancellations, reschedules, and patient updates
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${
              unreadOnly
                ? 'bg-[#fbf5f8] border-[#edd5e3] text-[#aa5588]'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            {unreadOnly ? 'Showing Unread Only' : 'Show Unread Only'}
          </button>

          <button
            type="button"
            onClick={handleMarkAllRead}
            className="px-3.5 py-2 rounded-xl bg-[#aa5588] hover:bg-[#924472] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All Read</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-7 h-7 text-[#aa5588] animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
            <p className="text-sm font-bold text-slate-800">No notifications</p>
            <p className="text-xs text-slate-400 mt-1">
              You are all caught up with your clinical notifications.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleSelect(n)}
                className={`w-full text-left p-4 sm:p-5 flex items-start gap-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                  !n.isRead ? 'bg-[#fbf5f8]/50' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-sm ${
                        !n.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'
                      }`}
                    >
                      {n.title}
                    </p>
                    <span className="text-[11px] text-slate-400 inline-flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {n.createdAt}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
