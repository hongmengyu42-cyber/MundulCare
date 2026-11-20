'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BellRing,
  Send,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Building2,
  DollarSign,
  Activity,
  History,
  Info,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import AdminHeader from '@/components/AdminHeader';
import AdminSidebar from '@/components/AdminSidebar';
import { adminNotificationApi } from '@/lib/api';
import { NotificationSetting, NotificationDeliveryLog } from '@/types/payment';
import { useAuth } from '@/context/AuthContext';

export default function AdminNotificationsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'SETTINGS' | 'LOGS' | 'SETUP'>('SETTINGS');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const [settings, setSettings] = useState<NotificationSetting>({
    telegramBotToken: '',
    telegramFinanceChatId: '',
    telegramOperationsChatId: '',
    telegramAdminChatId: '',
    telegramEnabled: false,
    notifyOnPayment: true,
    notifyOnCheckIn: true,
    notifyOnAppointmentBooked: true,
    notifyOnAppointmentCancelled: true,
  });

  const [logs, setLogs] = useState<NotificationDeliveryLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== 'ADMIN') {
        router.push('/login?redirect=/admin/notifications');
      } else {
        fetchSettings();
        fetchLogs();
      }
    }
  }, [isAuthenticated, user, authLoading]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await adminNotificationApi.getSettings();
      if (res.success && res.data) {
        setSettings(res.data);
      }
    } catch (err) {
      console.error('Failed to load notification settings', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await adminNotificationApi.getDeliveryLogs();
      if (res.success && res.data) {
        setLogs(res.data);
      }
    } catch (err) {
      console.error('Failed to load delivery logs', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setTestSuccess(null);
    setTestError(null);
    try {
      const res = await adminNotificationApi.updateSettings(settings);
      if (res.success && res.data) {
        setSettings(res.data);
        alert('Notification settings saved successfully!');
      } else {
        alert(res.message || 'Failed to update settings');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error saving notification settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    setTesting(true);
    setTestSuccess(null);
    setTestError(null);
    try {
      const res = await adminNotificationApi.testTelegram({
        botToken: settings.telegramBotToken,
        chatId: settings.telegramFinanceChatId || settings.telegramAdminChatId,
      });
      if (res.success) {
        setTestSuccess(res.message || 'Test message delivered successfully to Telegram!');
        fetchLogs();
      } else {
        setTestError(res.message || 'Failed to dispatch test message. Verify credentials.');
      }
    } catch (err: any) {
      setTestError(err.response?.data?.message || 'Error connecting to Telegram Bot API');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#090D16] overflow-hidden font-sans">
      <AdminSidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <AdminHeader />

        <main className="p-6 sm:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Header Card */}
          <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-purple-950/50 text-indigo-600 dark:text-purple-400">
                  <BellRing className="w-5 h-5" />
                </span>
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Automated Hospital Alerts
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Centralized Notification Center
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                Configure hospital in-app broadcasts and automated Telegram alerts for verified NBC Bakong payments, patient check-ins, and department routing.
              </p>
            </div>

            {/* Quick Status Pill */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                  settings.telegramEnabled
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    settings.telegramEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
                />
                <span>{settings.telegramEnabled ? 'Telegram Active' : 'Telegram Disabled'}</span>
              </span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Finance Channel
              </span>
              <div className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-1 truncate">
                {settings.telegramFinanceChatId || 'Not Configured'}
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 block">
                Bakong Verified Payments
              </span>
            </div>

            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Reception Operations
              </span>
              <div className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-1 truncate">
                {settings.telegramOperationsChatId || 'Not Configured'}
              </div>
              <span className="text-[10px] text-indigo-600 dark:text-purple-400 font-semibold mt-0.5 block">
                Patient Lounge Check-Ins
              </span>
            </div>

            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Admin Channel
              </span>
              <div className="font-bold text-slate-800 dark:text-slate-200 text-sm mt-1 truncate">
                {settings.telegramAdminChatId || 'Not Configured'}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5 block">
                Emergency & System Alerts
              </span>
            </div>

            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Delivery Logs
              </span>
              <div className="font-mono font-bold text-slate-900 dark:text-white text-lg mt-0.5">
                {logs.length} Logged
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block">Audit Trail Active</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
            <button
              onClick={() => setActiveTab('SETTINGS')}
              className={`pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 ${
                activeTab === 'SETTINGS'
                  ? 'border-[#aa5588] dark:border-purple-400 text-[#aa5588] dark:text-purple-400'
                  : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Bot & Event Settings</span>
            </button>

            <button
              onClick={() => setActiveTab('LOGS')}
              className={`pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 ${
                activeTab === 'LOGS'
                  ? 'border-[#aa5588] dark:border-purple-400 text-[#aa5588] dark:text-purple-400'
                  : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Delivery Audit Trail ({logs.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('SETUP')}
              className={`pb-3 text-sm font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 ${
                activeTab === 'SETUP'
                  ? 'border-[#aa5588] dark:border-purple-400 text-[#aa5588] dark:text-purple-400'
                  : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Telegram Setup Guide</span>
            </button>
          </div>

          {/* TAB 1: SETTINGS */}
          {activeTab === 'SETTINGS' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Main Settings Form */}
              <div className="lg:col-span-8 bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs">
                <form onSubmit={handleSaveSettings} className="space-y-6">
                  {/* Master Switch */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                    <div>
                      <span className="font-bold text-slate-900 dark:text-white text-sm block">
                        Enable Telegram Notifications
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        When enabled, MundulCare will send real-time alerts to the designated channels.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.telegramEnabled}
                        onChange={(e) =>
                          setSettings({ ...settings, telegramEnabled: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#aa5588]"></div>
                    </label>
                  </div>

                  {/* Telegram Bot Token */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Telegram Bot Token
                    </label>
                    <div className="relative">
                      <input
                        type={showToken ? 'text' : 'password'}
                        value={settings.telegramBotToken || ''}
                        onChange={(e) =>
                          setSettings({ ...settings, telegramBotToken: e.target.value })
                        }
                        placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:outline-hidden focus:border-[#aa5588]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                      >
                        {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                      Issued by @BotFather on Telegram. Kept secure and encrypted.
                    </p>
                  </div>

                  {/* Channel Chat IDs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Finance Channel Chat ID
                      </label>
                      <input
                        type="text"
                        value={settings.telegramFinanceChatId || ''}
                        onChange={(e) =>
                          setSettings({ ...settings, telegramFinanceChatId: e.target.value })
                        }
                        placeholder="e.g. -1001234567890"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:outline-hidden focus:border-[#aa5588]"
                      />
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                        Receives genuine NBC Bakong payment receipts.
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Operations / Reception Chat ID
                      </label>
                      <input
                        type="text"
                        value={settings.telegramOperationsChatId || ''}
                        onChange={(e) =>
                          setSettings({ ...settings, telegramOperationsChatId: e.target.value })
                        }
                        placeholder="e.g. -1009876543210"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:outline-hidden focus:border-[#aa5588]"
                      />
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                        Receives check-in and queue lounge notifications.
                      </span>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Hospital Admin Chat ID (Optional)
                      </label>
                      <input
                        type="text"
                        value={settings.telegramAdminChatId || ''}
                        onChange={(e) =>
                          setSettings({ ...settings, telegramAdminChatId: e.target.value })
                        }
                        placeholder="e.g. -1001122334455"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono focus:outline-hidden focus:border-[#aa5588]"
                      />
                    </div>
                  </div>

                  {/* Event Subscription Toggles */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                      Automated Trigger Events
                    </label>

                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifyOnPayment}
                          onChange={(e) =>
                            setSettings({ ...settings, notifyOnPayment: e.target.checked })
                          }
                          className="w-4 h-4 rounded-md text-[#aa5588] focus:ring-[#aa5588]"
                        />
                        <div>
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                            NBC Bakong Verified Payment Alerts
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            Dispatches verified transaction summary directly to Finance Telegram.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifyOnCheckIn}
                          onChange={(e) =>
                            setSettings({ ...settings, notifyOnCheckIn: e.target.checked })
                          }
                          className="w-4 h-4 rounded-md text-[#aa5588] focus:ring-[#aa5588]"
                        />
                        <div>
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                            Patient Reception Check-In
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            Alerts Front-Desk Operations when patient arrives and receives a queue ticket.
                          </span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifyOnAppointmentBooked}
                          onChange={(e) =>
                            setSettings({ ...settings, notifyOnAppointmentBooked: e.target.checked })
                          }
                          className="w-4 h-4 rounded-md text-[#aa5588] focus:ring-[#aa5588]"
                        />
                        <div>
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                            Appointment Reservation Created
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            Sends in-app and chat alerts upon patient appointment booking.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-6 py-2.5 rounded-xl bg-[#aa5588] hover:bg-[#924472] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving Settings...</span>
                        </>
                      ) : (
                        <span>Save Notification Settings</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Test & Connectivity Sidebar */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs space-y-4">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-[#aa5588]" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Telegram Bot Health Check</h3>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Send an instantaneous test alert to verify that the bot token and channel chat ID can communicate without connectivity barriers.
                  </p>

                  {testSuccess && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{testSuccess}</span>
                    </div>
                  )}

                  {testError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <span>{testError}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleTestTelegram}
                    disabled={testing}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-purple-600 hover:bg-black dark:hover:bg-purple-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Dispatching Test...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Test Telegram Message</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Privacy & Security Note */}
                <div className="p-5 rounded-3xl bg-[#fbf5f8] dark:bg-purple-950/20 border border-[#edd5e3] dark:border-purple-900/40 space-y-2 text-xs">
                  <div className="font-bold text-[#aa5588] dark:text-purple-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Medical Privacy (HIPAA / NBC)</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    Telegram alerts are strictly sanitized: patient full names are masked (e.g. <code>Sokha P.</code>), phone numbers are redacted, and clinical diagnoses or medication regimens are <strong>never</strong> transmitted over Telegram.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIT LOGS */}
          {activeTab === 'LOGS' && (
            <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Notification Delivery Log</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Real-time audit trail of all in-app, Telegram, and system alerts dispatched.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fetchLogs}
                  disabled={logsLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${logsLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/95 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Channel</th>
                      <th className="py-3 px-4">Event Type</th>
                      <th className="py-3 px-4">Recipient / Chat</th>
                      <th className="py-3 px-4">Title & Preview</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-slate-400 dark:text-slate-500">
                          No delivery logs recorded yet.
                        </td>
                      </tr>
                    ) : (
                      logs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {log.createdAt || 'N/A'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                log.channel === 'TELEGRAM'
                                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                  : 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              }`}
                            >
                              {log.channel}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {log.eventType}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                            {log.recipientTarget || 'N/A'}
                          </td>
                          <td className="py-3 px-4 max-w-xs">
                            <div className="font-bold text-slate-900 dark:text-white truncate">{log.title}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {log.messagePreview?.replace(/<[^>]*>?/gm, '')}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                log.status === 'SENT'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : log.status === 'SKIPPED'
                                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: TELEGRAM SETUP GUIDE */}
          {activeTab === 'SETUP' && (
            <div className="bg-white dark:bg-[#0B0F19] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">
                    How to Set Up Your MundulCare Telegram Bot
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Follow these 4 simple steps to connect your hospital Telegram channels.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <span className="font-bold text-xs text-[#aa5588] dark:text-purple-400 uppercase tracking-wider">
                    Step 1: Create Bot with @BotFather
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Open Telegram and message <strong>@BotFather</strong>. Type <code>/newbot</code>, choose a name (e.g. <em>MundulCare Alert Bot</em>) and a username ending in <code>bot</code>.
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Copy the HTTP API access token into the <strong>Telegram Bot Token</strong> field in Tab 1.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <span className="font-bold text-xs text-[#aa5588] dark:text-purple-400 uppercase tracking-wider">
                    Step 2: Create Department Channels
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Create private Telegram groups or channels for your departments:
                  </p>
                  <ul className="text-xs text-slate-600 dark:text-slate-300 list-disc list-inside space-y-1">
                    <li><strong>MundulCare Finance</strong> (for payment verifications)</li>
                    <li><strong>MundulCare Reception</strong> (for queue check-ins)</li>
                  </ul>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Add your new bot to each channel as an <strong>Administrator</strong> with post message rights.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <span className="font-bold text-xs text-[#aa5588] dark:text-purple-400 uppercase tracking-wider">
                    Step 3: Find the Channel Chat ID
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Forward any message from your channel to <strong>@userinfobot</strong> or <strong>@getidsbot</strong> to obtain the negative number (e.g. <code>-1001234567890</code>).
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Paste this ID into the respective Finance or Operations field.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
                  <span className="font-bold text-xs text-[#aa5588] dark:text-purple-400 uppercase tracking-wider">
                    Step 4: Test & Verify
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Click <strong>Send Test Telegram Message</strong> in Tab 1. You should instantly see a test notification appear in your Telegram channel!
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    From that moment on, whenever a patient completes a Bakong payment, your Finance channel will be notified within milliseconds.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
