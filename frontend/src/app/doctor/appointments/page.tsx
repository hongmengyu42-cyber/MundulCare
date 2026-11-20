'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  CalendarCheck,
  Search,
  Filter,
  Check,
  X,
  CheckCircle2,
  CalendarClock,
  FileText,
  Pill,
  Eye,
  Loader2,
  AlertCircle,
  Ban,
  User,
  BellRing,
  Play,
  Tv,
} from 'lucide-react';
import DoctorConsultationModal from '@/components/DoctorConsultationModal';
import PrescriptionSlipModal from '@/components/PrescriptionSlipModal';
import { doctorPortalApi } from '@/lib/api';
import { AppointmentResponse, AppointmentStatus } from '@/types/appointment';

export default function DoctorAppointmentsPage() {
  const searchParams = useSearchParams();
  const initialStatus = (searchParams.get('status') as AppointmentStatus) || '';

  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Active modals
  const [selectedAppt, setSelectedAppt] = useState<AppointmentResponse | null>(null);
  const [consultationModalAppt, setConsultationModalAppt] = useState<AppointmentResponse | null>(null);
  const [prescriptionSlipAppt, setPrescriptionSlipAppt] = useState<AppointmentResponse | null>(null);
  const [actionModal, setActionModal] = useState<{
    type: 'REJECT' | 'CANCEL' | 'RESCHEDULE';
    appt: AppointmentResponse;
  } | null>(null);

  const [reasonInput, setReasonInput] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStart, setRescheduleStart] = useState('09:00');
  const [rescheduleEnd, setRescheduleEnd] = useState('09:30');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await doctorPortalApi.getAppointments({
        date: dateFilter || undefined,
        status: (statusFilter as AppointmentStatus) || undefined,
        search: searchQuery.trim() || undefined,
      });
      if (res.success && res.data) {
        setAppointments(res.data);
      } else {
        setError(res.message || 'Failed to load appointments.');
      }
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to load appointments.'
      );
    } finally {
      setLoading(false);
    }
  }, [dateFilter, statusFilter, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchAppointments();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchAppointments]);

  const handleConfirm = async (appt: AppointmentResponse) => {
    setSubmitting(true);
    try {
      const res = await doctorPortalApi.confirmAppointment(appt.id);
      if (res.success) {
        await fetchAppointments();
      }
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not confirm appointment.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (appt: AppointmentResponse) => {
    setSubmitting(true);
    try {
      const res = await doctorPortalApi.completeAppointment(appt.id);
      if (res.success) {
        await fetchAppointments();
      }
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not complete appointment.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCallQueue = async (appt: AppointmentResponse) => {
    setSubmitting(true);
    try {
      const res = await doctorPortalApi.callQueue(appt.id);
      if (res.success) {
        await fetchAppointments();
      }
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not call patient into room.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartConsultation = async (appt: AppointmentResponse) => {
    setSubmitting(true);
    try {
      const res = await doctorPortalApi.startConsultation(appt.id);
      if (res.success) {
        await fetchAppointments();
      }
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not start consultation.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openActionModal = (
    type: 'REJECT' | 'CANCEL' | 'RESCHEDULE',
    appt: AppointmentResponse
  ) => {
    setModalError(null);
    setReasonInput('');
    setRescheduleDate(appt.appointmentDate);
    setRescheduleStart(appt.startTime);
    setRescheduleEnd(appt.endTime);
    setActionModal({ type, appt });
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal) return;
    setModalError(null);
    setSubmitting(true);

    try {
      if (actionModal.type === 'REJECT') {
        await doctorPortalApi.rejectAppointment(actionModal.appt.id, {
          reason: reasonInput.trim(),
        });
      } else if (actionModal.type === 'CANCEL') {
        await doctorPortalApi.cancelAppointment(actionModal.appt.id, {
          reason: reasonInput.trim(),
        });
      } else if (actionModal.type === 'RESCHEDULE') {
        await doctorPortalApi.rescheduleAppointment(actionModal.appt.id, {
          appointmentDate: rescheduleDate,
          startTime: rescheduleStart,
          endTime: rescheduleEnd,
          reason: reasonInput.trim() || undefined,
        });
      }
      setActionModal(null);
      await fetchAppointments();
    } catch (err: unknown) {
      setModalError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Operation failed. Please verify your inputs.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusStyle = (status: AppointmentStatus) => {
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarCheck className="w-6 h-6 text-[#aa5588]" />
            <span>My Appointments</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review, confirm, call patients, and issue digital prescriptions
          </p>
        </div>

        <Link
          href="/queue"
          target="_blank"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-colors self-start sm:self-auto"
        >
          <Tv className="w-4 h-4 text-[#dd99bb]" />
          <span>Live Waiting Room Screen</span>
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <search className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-5">
            <label
              htmlFor="appt-search"
              className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1"
            >
              Search Patient or Visit
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="appt-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Patient name, email, phone, #ID, or symptoms..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#aa5588]/20 focus:border-[#aa5588]"
              />
            </div>
          </div>

          <div className="sm:col-span-3">
            <label
              htmlFor="appt-status"
              className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1"
            >
              Status
            </label>
            <div className="relative">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                id="appt-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#aa5588]/20 focus:border-[#aa5588]"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <div className="sm:col-span-3">
            <label
              htmlFor="appt-date"
              className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1"
            >
              Appointment Date
            </label>
            <input
              id="appt-date"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#aa5588]/20 focus:border-[#aa5588]"
            />
          </div>

          <div className="sm:col-span-1">
            <button
              type="button"
              onClick={() => {
                setStatusFilter('');
                setDateFilter('');
                setSearchQuery('');
              }}
              className="w-full py-2 px-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      </search>

      {/* Appointments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-7 h-7 text-[#aa5588] animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading your appointments...</p>
          </div>
        ) : error ? (
          <div className="py-12 px-4 text-center">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-900">{error}</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
            <p className="text-sm font-bold text-slate-800">No matching appointments found</p>
            <p className="text-xs text-slate-400 mt-1">
              Try clearing your date or status filters to see all consultations.
            </p>
          </div>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-label="Assigned Appointments"
            className="overflow-x-auto"
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Patient</th>
                  <th className="py-3.5 px-4">Date &amp; Time</th>
                  <th className="py-3.5 px-4">Symptoms / Reason</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#fbf5f8] border border-[#edd5e3] text-[#aa5588] font-bold text-xs flex items-center justify-center shrink-0">
                          {appt.patientName ? appt.patientName.charAt(0).toUpperCase() : 'P'}
                        </div>
                        <div>
                          <Link
                            href={`/doctor/patients/${appt.patientUserId}`}
                            className="font-bold text-slate-900 hover:text-[#aa5588] block"
                          >
                            {appt.patientName}
                          </Link>
                          <span className="text-[11px] text-slate-400">
                            {appt.patientPhone || appt.patientEmail}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <p className="font-bold text-slate-900">{appt.appointmentDate}</p>
                      <p className="text-[11px] text-[#aa5588] font-semibold">
                        {appt.startTime} - {appt.endTime}
                      </p>
                      {appt.rescheduledFromDate && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Moved from {appt.rescheduledFromDate} ({appt.rescheduledFromStart})
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="text-slate-700 line-clamp-2">{appt.reason}</p>
                      {appt.rejectionReason && (
                        <p className="text-[11px] text-rose-600 mt-1">
                          Rejected: {appt.rejectionReason}
                        </p>
                      )}
                      {appt.cancellationReason && (
                        <p className="text-[11px] text-rose-600 mt-1">
                          Cancelled: {appt.cancellationReason}
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusStyle(
                            appt.status
                          )}`}
                        >
                          {appt.status}
                        </span>
                        {appt.queueNumber && (
                          <div>
                            <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md inline-block">
                              {appt.queueNumber} · {appt.queueStatus || 'WAITING'}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedAppt(appt)}
                          title="View Details"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {appt.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              disabled={submitting}
                              onClick={() => handleConfirm(appt)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Confirm</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openActionModal('REJECT', appt)}
                              className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {appt.status === 'CONFIRMED' && (
                          <>
                            {appt.queueStatus === 'WAITING' && (
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => handleCallQueue(appt)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                title="Call patient ticket into room"
                              >
                                <BellRing className="w-3.5 h-3.5" />
                                <span>Call Next</span>
                              </button>
                            )}

                            {appt.queueStatus === 'CALLING' && (
                              <button
                                type="button"
                                disabled={submitting}
                                onClick={() => handleStartConsultation(appt)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                title="Start Consultation Session"
                              >
                                <Play className="w-3.5 h-3.5" />
                                <span>Start Consult</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setConsultationModalAppt(appt)}
                              className="px-2.5 py-1.5 rounded-lg bg-[#aa5588] hover:bg-[#924472] text-white font-bold inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="Complete consultation & prescribe medications"
                            >
                              <Pill className="w-3.5 h-3.5" />
                              <span>Prescribe & Complete</span>
                            </button>
                          </>
                        )}

                        {(appt.status === 'COMPLETED' || appt.diagnosis) && (
                          <button
                            type="button"
                            onClick={() => setPrescriptionSlipAppt(appt)}
                            className="px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 font-bold inline-flex items-center gap-1 cursor-pointer"
                            title="View / Print Digital Prescription Slip"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Rx</span>
                          </button>
                        )}

                        {(appt.status === 'PENDING' || appt.status === 'CONFIRMED') && (
                          <>
                            <button
                              type="button"
                              onClick={() => openActionModal('RESCHEDULE', appt)}
                              title="Reschedule"
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer"
                            >
                              <CalendarClock className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openActionModal('CANCEL', appt)}
                              title="Cancel Appointment"
                              className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {(appt.status === 'CONFIRMED' || appt.status === 'COMPLETED') && (
                          <>
                            <Link
                              href={`/doctor/records?patientUserId=${appt.patientUserId}&appointmentId=${appt.id}`}
                              title="Clinical Record"
                              className="p-1.5 rounded-lg border border-[#edd5e3] bg-[#fbf5f8] text-[#aa5588] hover:bg-[#f3e4ec]"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </Link>
                            <Link
                              href={`/doctor/prescriptions?patientUserId=${appt.patientUserId}&appointmentId=${appt.id}`}
                              title="Issue Prescription"
                              className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            >
                              <Pill className="w-3.5 h-3.5" />
                            </Link>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Appointment Details Modal */}
      {selectedAppt && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedAppt(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#aa5588]">
                  Appointment #{selectedAppt.id}
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                  {selectedAppt.patientName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppt(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-slate-400 font-semibold">Date</p>
                <p className="text-slate-900 font-bold mt-0.5">{selectedAppt.appointmentDate}</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-slate-400 font-semibold">Time Slot</p>
                <p className="text-slate-900 font-bold mt-0.5">
                  {selectedAppt.startTime} - {selectedAppt.endTime}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-slate-400 font-semibold">Patient Email</p>
                <p className="text-slate-900 font-medium mt-0.5 truncate">
                  {selectedAppt.patientEmail}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50">
                <p className="text-slate-400 font-semibold">Patient Phone</p>
                <p className="text-slate-900 font-medium mt-0.5">
                  {selectedAppt.patientPhone || 'Not provided'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 text-xs space-y-1">
              <p className="text-slate-400 font-semibold">Reason / Presenting Symptoms</p>
              <p className="text-slate-800 leading-relaxed">{selectedAppt.reason}</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <Link
                href={`/doctor/patients/${selectedAppt.patientUserId}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#aa5588] hover:underline"
              >
                <User className="w-3.5 h-3.5" />
                <span>Open Full Patient Chart</span>
              </Link>
              <button
                type="button"
                onClick={() => setSelectedAppt(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject / Cancel / Reschedule Action Modal */}
      {actionModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActionModal(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900">
                {actionModal.type === 'REJECT' && 'Reject Appointment Request'}
                {actionModal.type === 'CANCEL' && 'Cancel Appointment'}
                {actionModal.type === 'RESCHEDULE' && 'Reschedule Appointment'}
              </h2>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Patient: <span className="font-bold text-slate-800">{actionModal.appt.patientName}</span> (
              {actionModal.appt.appointmentDate} at {actionModal.appt.startTime})
            </p>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {modalError}
              </div>
            )}

            <form onSubmit={handleActionSubmit} className="space-y-4">
              {actionModal.type === 'RESCHEDULE' && (
                <>
                  <div>
                    <label
                      htmlFor="resched-date"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      New Date *
                    </label>
                    <input
                      id="resched-date"
                      type="date"
                      required
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="resched-start"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Start Time *
                      </label>
                      <input
                        id="resched-start"
                        type="time"
                        required
                        value={rescheduleStart}
                        onChange={(e) => setRescheduleStart(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="resched-end"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        End Time *
                      </label>
                      <input
                        id="resched-end"
                        type="time"
                        required
                        value={rescheduleEnd}
                        onChange={(e) => setRescheduleEnd(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label
                  htmlFor="action-reason"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  {actionModal.type === 'RESCHEDULE' ? 'Note to Patient (optional)' : 'Reason *'}
                </label>
                <textarea
                  id="action-reason"
                  rows={3}
                  required={actionModal.type !== 'RESCHEDULE'}
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="Provide a clear clinical or scheduling reason for the patient..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#aa5588]/20 focus:border-[#aa5588]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActionModal(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 rounded-xl text-white text-xs font-semibold cursor-pointer disabled:opacity-50 ${
                    actionModal.type === 'RESCHEDULE'
                      ? 'bg-[#aa5588] hover:bg-[#924472]'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submitting ? 'Saving...' : 'Confirm Action'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctor Consultation & Prescription Modal */}
      <DoctorConsultationModal
        isOpen={!!consultationModalAppt}
        onClose={() => setConsultationModalAppt(null)}
        appointment={consultationModalAppt}
        onSuccess={fetchAppointments}
      />

      {/* Digital Prescription Slip Modal */}
      <PrescriptionSlipModal
        isOpen={!!prescriptionSlipAppt}
        onClose={() => setPrescriptionSlipAppt(null)}
        appointment={prescriptionSlipAppt}
      />
    </div>
  );
}
