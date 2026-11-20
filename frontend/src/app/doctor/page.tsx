'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  CalendarCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  FileText,
  Pill,
  Loader2,
  ArrowRight,
  Stethoscope,
  Check,
  X,
  RefreshCw,
} from 'lucide-react';
import { doctorPortalApi } from '@/lib/api';
import { DoctorDashboardData } from '@/types/doctorPortal';
import { AppointmentResponse } from '@/types/appointment';

export default function DoctorDashboardPage() {
  const [data, setData] = useState<DoctorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await doctorPortalApi.getDashboard();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.message || 'Unable to load dashboard.');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to load doctor dashboard.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDashboard();
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleQuickConfirm = async (appt: AppointmentResponse) => {
    setActionLoadingId(appt.id);
    try {
      const res = await doctorPortalApi.confirmAppointment(appt.id);
      if (res.success) {
        await loadDashboard();
      }
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to confirm appointment.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleQuickComplete = async (appt: AppointmentResponse) => {
    setActionLoadingId(appt.id);
    try {
      const res = await doctorPortalApi.completeAppointment(appt.id);
      if (res.success) {
        await loadDashboard();
      }
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to mark appointment completed.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PENDING':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'COMPLETED':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'CANCELLED':
      case 'REJECTED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#aa5588] animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading your clinical workspace...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-lg mx-auto mt-10">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900">Dashboard Unavailable</h2>
        <p className="text-xs text-slate-500 mt-1">{error}</p>
        <button
          type="button"
          onClick={loadDashboard}
          className="mt-4 px-4 py-2 rounded-xl bg-[#aa5588] text-white text-xs font-semibold hover:bg-[#924472] cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const { doctorProfile } = data;
  const maxTrend = Math.max(1, ...data.weeklyTrend.map((d) => d.total));

  const kpiCards = [
    {
      label: 'Total Appointments',
      value: data.totalAppointments,
      sub: `${data.totalMedicalRecordsAuthored} records authored`,
      icon: Calendar,
      tone: 'bg-[#fbf5f8] text-[#aa5588] border-[#edd5e3]',
      href: '/doctor/appointments',
    },
    {
      label: "Today's Appointments",
      value: data.todayAppointmentsCount,
      sub: 'Active consultations today',
      icon: Clock,
      tone: 'bg-sky-50 text-sky-700 border-sky-200',
      href: '/doctor/appointments',
    },
    {
      label: 'Upcoming Confirmed',
      value: data.upcomingAppointmentsCount,
      sub: 'Scheduled ahead',
      icon: CalendarCheck,
      tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      href: '/doctor/appointments?status=CONFIRMED',
    },
    {
      label: 'Completed Visits',
      value: data.completedAppointmentsCount,
      sub: `${data.totalPrescriptionsIssued} prescriptions issued`,
      icon: CheckCircle2,
      tone: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      href: '/doctor/appointments?status=COMPLETED',
    },
    {
      label: 'Pending Requests',
      value: data.pendingRequestsCount,
      sub: 'Awaiting your confirmation',
      icon: AlertCircle,
      tone: 'bg-amber-50 text-amber-700 border-amber-200',
      href: '/doctor/appointments?status=PENDING',
    },
    {
      label: 'Assigned Patients',
      value: data.totalAssignedPatients,
      sub: 'Authorized under your care',
      icon: Users,
      tone: 'bg-purple-50 text-purple-700 border-purple-200',
      href: '/doctor/patients',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#fbf5f8] border border-[#edd5e3] flex items-center justify-center text-[#aa5588] shrink-0">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Welcome, {doctorProfile.name}
              </h1>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#fbf5f8] text-[#aa5588] border border-[#edd5e3]">
                {doctorProfile.specialties?.map((s) => s.name).join(', ') || 'General Medicine'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              License <span className="font-semibold text-slate-700">{doctorProfile.licenseNumber}</span>
              {doctorProfile.address ? ` • ${doctorProfile.address}` : ''}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={loadDashboard}
            className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <Link
            href="/doctor/records"
            className="px-3.5 py-2 rounded-xl border border-[#edd5e3] bg-[#fbf5f8] text-xs font-semibold text-[#aa5588] hover:bg-[#f5eaf0] inline-flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>New Clinical Record</span>
          </Link>
          <Link
            href="/doctor/prescriptions"
            className="px-3.5 py-2 rounded-xl bg-[#aa5588] hover:bg-[#924472] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Pill className="w-3.5 h-3.5" />
            <span>Issue Prescription</span>
          </Link>
        </div>
      </div>

      {/* 6 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:border-[#aa5588]/40 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {card.label}
                  </p>
                  <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1.5">
                    {card.value}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${card.tone}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Middle Row: Today's Schedule + Pending Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Appointment Schedule */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Today&apos;s Appointment Schedule</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Chronological view of your consultations for today
              </p>
            </div>
            <Link
              href="/doctor/appointments"
              className="text-xs font-semibold text-[#aa5588] hover:text-[#924472] inline-flex items-center gap-1"
            >
              <span>All Appointments</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-5 flex-1">
            {data.todaySchedule.length === 0 ? (
              <div className="py-10 text-center">
                <Clock className="w-9 h-9 text-slate-300 mx-auto mb-2.5" />
                <p className="text-sm font-semibold text-slate-700">No appointments scheduled for today</p>
                <p className="text-xs text-slate-400 mt-1">
                  Check your upcoming schedule or pending requests.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.todaySchedule.map((appt) => (
                  <div
                    key={appt.id}
                    className="p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-center shrink-0 min-w-[76px]">
                        <p className="text-xs font-extrabold text-[#aa5588]">{appt.startTime}</p>
                        <p className="text-[10px] text-slate-400">to {appt.endTime}</p>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/doctor/patients/${appt.patientUserId}`}
                            className="text-sm font-bold text-slate-900 hover:text-[#aa5588]"
                          >
                            {appt.patientName}
                          </Link>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                              appt.status
                            )}`}
                          >
                            {appt.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                          <span className="font-semibold text-slate-500">Reason:</span> {appt.reason}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {appt.status === 'PENDING' && (
                        <button
                          type="button"
                          disabled={actionLoadingId === appt.id}
                          onClick={() => handleQuickConfirm(appt)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Confirm</span>
                        </button>
                      )}
                      {appt.status === 'CONFIRMED' && (
                        <button
                          type="button"
                          disabled={actionLoadingId === appt.id}
                          onClick={() => handleQuickComplete(appt)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Complete</span>
                        </button>
                      )}
                      <Link
                        href={`/doctor/records?patientUserId=${appt.patientUserId}&appointmentId=${appt.id}`}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
                      >
                        Record
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Pending Appointment Requests */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Pending Requests</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Patient bookings awaiting confirmation
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {data.pendingRequestsCount} pending
            </span>
          </div>

          <div className="p-5 flex-1">
            {data.pendingRequests.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="w-9 h-9 text-emerald-400 mx-auto mb-2.5" />
                <p className="text-sm font-semibold text-slate-700">No pending requests</p>
                <p className="text-xs text-slate-400 mt-1">
                  All patient booking requests have been reviewed.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.pendingRequests.slice(0, 5).map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 rounded-xl border border-amber-200/70 bg-amber-50/30 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{req.patientName}</p>
                        <p className="text-xs text-slate-500">
                          {req.appointmentDate} • {req.startTime} - {req.endTime}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        #{req.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">{req.reason}</p>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Link
                        href={`/doctor/appointments?status=PENDING`}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        <span>Review / Reject</span>
                      </Link>
                      <button
                        type="button"
                        disabled={actionLoadingId === req.id}
                        onClick={() => handleQuickConfirm(req)}
                        className="px-3 py-1.5 rounded-lg bg-[#aa5588] hover:bg-[#924472] text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Bottom Row: Appointment Statistics (7-Day Activity & Status Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 7-Day Activity Chart */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">7-Day Consultation Activity</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Recent and upcoming daily appointment volume
              </p>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 sm:gap-3 items-end h-44 pt-6 pb-2 px-2 bg-slate-50/60 rounded-xl border border-slate-100">
            {data.weeklyTrend.map((pt) => {
              const heightPct = Math.max(10, Math.round((pt.total / maxTrend) * 100));
              const isToday = pt.label === 'Today';
              return (
                <div key={pt.date} className="flex flex-col items-center h-full justify-end">
                  <span className="text-[11px] font-bold text-slate-700 mb-1">{pt.total}</span>
                  <div className="w-full max-w-[36px] bg-slate-200/70 rounded-t-lg h-24 flex items-end overflow-hidden">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-lg transition-all ${
                        isToday ? 'bg-[#aa5588]' : 'bg-[#aa5588]/60'
                      }`}
                      title={`${pt.date}: ${pt.total} total (${pt.completed} completed, ${pt.confirmed} confirmed)`}
                    />
                  </div>
                  <span
                    className={`text-[11px] mt-2 ${
                      isToday ? 'font-extrabold text-[#aa5588]' : 'font-medium text-slate-500'
                    }`}
                  >
                    {pt.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Status Distribution */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
          <h2 className="text-base font-bold text-slate-900">Appointment Status Breakdown</h2>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">
            Overall distribution across your assigned consultations
          </p>

          <div className="space-y-3">
            {[
              { key: 'CONFIRMED', label: 'Confirmed', color: 'bg-emerald-500' },
              { key: 'COMPLETED', label: 'Completed', color: 'bg-indigo-500' },
              { key: 'PENDING', label: 'Pending Review', color: 'bg-amber-500' },
              { key: 'CANCELLED', label: 'Cancelled', color: 'bg-rose-400' },
              { key: 'REJECTED', label: 'Rejected', color: 'bg-slate-400' },
            ].map((item) => {
              const count = data.statusBreakdown[item.key] || 0;
              const pct =
                data.totalAppointments > 0
                  ? Math.round((count / data.totalAppointments) * 100)
                  : 0;
              return (
                <div key={item.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{item.label}</span>
                    <span className="font-bold text-slate-900">
                      {count} <span className="text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
