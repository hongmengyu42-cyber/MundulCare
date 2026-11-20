'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  Download,
  Loader2,
  AlertCircle,
  Search,
  Filter,
  X,
  User,
  Phone,
  Mail,
  RotateCcw,
  Building2,
  Lock,
  Tv,
  Ticket,
  FileText,
} from 'lucide-react';
import AdminHeader from '@/components/AdminHeader';
import AdminSidebar from '@/components/AdminSidebar';
import CustomSelect from '@/components/CustomSelect';
import Pagination from '@/components/Pagination';
import PrescriptionSlipModal from '@/components/PrescriptionSlipModal';
import { adminBranchApi, appointmentApi, doctorApi } from '@/lib/api';
import { AppointmentResponse } from '@/types/appointment';
import { Doctor } from '@/types/doctor';
import { HospitalBranch } from '@/types/auth';
import { useAuth } from '@/context/AuthContext';
import { resolveAppointmentBranch, useAdminBranchFilter } from '@/lib/adminBranchFilter';

export default function AdminAppointmentsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [branches, setBranches] = useState<HospitalBranch[]>([]);
  const [branchFilter, setBranchFilter, scopeInfo] = useAdminBranchFilter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  // Rejection modal
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponse | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [prescriptionAppt, setPrescriptionAppt] = useState<AppointmentResponse | null>(null);

  // Check auth
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== 'ADMIN') {
        router.push('/login?redirect=/admin/appointments');
      } else {
        fetchAppointments();
      }
    }
  }, [isAuthenticated, user, authLoading]);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedAppointment) {
        setSelectedAppointment(null);
        setRejectReason('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAppointment]);

  const fetchAppointments = async () => {
    try {
      const [res, docRes, branchRes] = await Promise.all([
        appointmentApi.getAll(),
        doctorApi.getAllForAdmin().catch(() => ({ success: false, data: [] as Doctor[] })),
        adminBranchApi.getAll().catch(() => ({ success: false, data: [] as HospitalBranch[] })),
      ]);
      if (res.success && res.data) {
        setAppointments(res.data);
      }
      if (docRes.success && docRes.data) {
        setDoctors(docRes.data);
      }
      if (branchRes.success && branchRes.data) {
        setBranches(branchRes.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (
    id: number,
    status: 'CONFIRMED' | 'REJECTED' | 'COMPLETED',
    rejectionReason?: string
  ) => {
    setSubmittingAction(true);
    try {
      const res = await appointmentApi.updateStatus(id, { status, rejectionReason });
      if (res.success) {
        setSelectedAppointment(null);
        setRejectReason('');
        fetchAppointments();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update appointment status');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCheckIn = async (id: number) => {
    setSubmittingAction(true);
    try {
      const res = await appointmentApi.checkIn(id);
      if (res.success) {
        await fetchAppointments();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to check in patient');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      await appointmentApi.exportCsv();
    } catch (err) {
      alert('Failed to export CSV. Please check system permissions.');
    }
  };

  // Uniform grey pill badges - color is reserved for interactive elements
  const getStatusBadge = (status: string) => {
    const labels: Record<string, string> = {
      CONFIRMED: 'Confirmed',
      COMPLETED: 'Completed',
      REJECTED: 'Declined',
      CANCELLED: 'Cancelled',
      PENDING: 'Pending Review',
    };
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
        {labels[status] || status}
      </span>
    );
  };

  // Filter by branch first, then search, status, specific date, and month
  const branchScopedAppointments =
    branchFilter === 'ALL'
      ? appointments
      : appointments.filter((apt) => resolveAppointmentBranch(apt, doctors) === branchFilter);

  const filteredAppointments = branchScopedAppointments.filter((apt) => {
    const matchesStatus = statusFilter === 'ALL' || apt.status === statusFilter;
    const matchesSearch =
      apt.doctorName.toLowerCase().includes(search.toLowerCase()) ||
      apt.patientName.toLowerCase().includes(search.toLowerCase()) ||
      apt.patientEmail.toLowerCase().includes(search.toLowerCase()) ||
      (apt.patientPhone && apt.patientPhone.includes(search)) ||
      (apt.reason && apt.reason.toLowerCase().includes(search.toLowerCase()));

    const matchesDate = !selectedDate || apt.appointmentDate === selectedDate;
    const matchesMonth = !selectedMonth || apt.appointmentDate.startsWith(selectedMonth);

    return matchesStatus && matchesSearch && matchesDate && matchesMonth;
  });

  const countByStatus = (st: string) => {
    if (st === 'ALL') return branchScopedAppointments.length;
    return branchScopedAppointments.filter((a) => a.status === st).length;
  };

  // Reset to page 1 whenever the filtered result set changes
  useEffect(() => {
    setPage(1);
  }, [search, branchFilter, statusFilter, selectedDate, selectedMonth]);

  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / PAGE_SIZE));
  const paginatedAppointments = filteredAppointments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#090D16] flex items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#6D28D9] mb-2" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#090D16] flex flex-col selection:bg-[#6D28D9] selection:text-white">
      <AdminHeader />

      <div className="flex-1 flex min-h-0">
        <AdminSidebar />

        <main className="flex-1 min-w-0 p-6 sm:p-8 lg:p-10 overflow-y-auto max-w-7xl">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Consultation Appointments
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Review patient bookings, confirm time slots, and export appointment registries.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {scopeInfo.isBranchLocked ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#f5f3ff] dark:bg-purple-950/40 border border-[#ddd6fe] dark:border-purple-800/60 text-xs font-bold text-[#6D28D9] dark:text-purple-300">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>{scopeInfo.lockedBranch}</span>
              </div>
            ) : (
              <CustomSelect
                value={branchFilter}
                onChange={setBranchFilter}
                accentColor="#6D28D9"
                className="w-56"
                icon={<Building2 className="w-4 h-4 text-[#6D28D9] dark:text-purple-400 shrink-0" />}
                options={[
                  { value: 'ALL', label: `All Branches (${branches.length})` },
                  ...branches.map((b) => ({ value: b.name, label: `${b.city} (${b.code})` })),
                ]}
              />
            )}

            <a
              href="/queue"
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-all shadow-xs whitespace-nowrap cursor-pointer"
            >
              <Tv className="w-4 h-4 text-[#dd99bb]" />
              <span>Live Queue Screen</span>
            </a>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs whitespace-nowrap cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#6D28D9] dark:text-purple-400" />
              <span>Export CSV Report</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-sm text-red-700 dark:text-red-300 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter Controls: Search + Date Pickers + Status Tabs */}
        <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 mb-6 shadow-xs space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search patient, doctor, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-9 h-11 rounded-xl border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] transition-all"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date Filter */}
            <div className="md:col-span-3">
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3.5 h-11 rounded-xl border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] cursor-pointer"
                />
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                    title="Clear date"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Reset Filter Button */}
            {(selectedDate || selectedMonth || search || statusFilter !== 'ALL') && (
              <div className="md:col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate('');
                    setSelectedMonth('');
                    setSearch('');
                    setStatusFilter('ALL');
                  }}
                  title="Reset all filters"
                  className="h-11 w-11 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center justify-center cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Segmented Status Tabs with Counts */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {[
              { label: 'All', value: 'ALL' },
              { label: 'Pending', value: 'PENDING' },
              { label: 'Confirmed', value: 'CONFIRMED' },
              { label: 'Completed', value: 'COMPLETED' },
              { label: 'Declined', value: 'REJECTED' },
              { label: 'Cancelled', value: 'CANCELLED' },
            ].map((tab) => {
              const isActive = statusFilter === tab.value;
              const count = countByStatus(tab.value);
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap cursor-pointer flex items-center gap-2 focus:outline-none ${
                    isActive
                      ? 'bg-[#6D28D9] text-white shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-xs font-bold font-tabular ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Appointments Data Table */}
        <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden">
          {filteredAppointments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-900/95 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-4">Patient</th>
                    <th className="px-5 py-4">Doctor</th>
                    <th className="px-5 py-4">Date & Time</th>
                    <th className="px-5 py-4">Reason</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-slate-700 dark:text-slate-300">
                  {paginatedAppointments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Patient Details */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{apt.patientName}</div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          <span>{apt.patientEmail}</span>
                        </div>
                        {apt.patientPhone && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-tabular mt-0.5 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span>{apt.patientPhone}</span>
                          </div>
                        )}
                      </td>

                      {/* Doctor Details */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{apt.doctorName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-bold font-tabular mt-0.5">
                          Fee: ${apt.consultationFee?.toFixed(2)}
                        </div>
                      </td>

                      {/* Date & Time Window */}
                      <td className="px-5 py-4">
                        <div className="text-slate-800 dark:text-slate-200 font-tabular font-bold text-sm">
                          <span>{apt.appointmentDate}</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-tabular mt-0.5">
                          <span>{apt.startTime} - {apt.endTime}</span>
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="px-5 py-4 max-w-xs">
                        <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {apt.reason || 'General medical consultation'}
                        </p>
                        {apt.rejectionReason && (
                          <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200/80 dark:border-rose-900/60">
                            Decline reason: {apt.rejectionReason}
                          </p>
                        )}
                      </td>

                      {/* Status & Queue Pill */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <div>{getStatusBadge(apt.status)}</div>
                          {apt.queueNumber && (
                            <div>
                              <span className="font-mono text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                <Ticket className="w-3 h-3" />
                                <span>{apt.queueNumber} ({apt.queueStatus || 'WAITING'})</span>
                              </span>
                            </div>
                          )}
                          <div>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                              apt.paymentStatus === 'PAID'
                                ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800'
                                : 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800'
                            }`}>
                              {apt.paymentStatus === 'PAID' ? `${apt.paymentMethod || 'KHQR'} Paid` : 'Pay at Clinic'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {apt.status === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(apt.id, 'CONFIRMED')}
                              disabled={submittingAction}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Confirm</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedAppointment(apt)}
                              disabled={submittingAction}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 text-xs font-bold transition-colors cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Decline</span>
                            </button>
                          </div>
                        ) : apt.status === 'CONFIRMED' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            {!apt.queueNumber && (
                              <button
                                type="button"
                                onClick={() => handleCheckIn(apt.id)}
                                disabled={submittingAction}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                                title="Check in arriving patient and issue queue ticket"
                              >
                                <Ticket className="w-3.5 h-3.5" />
                                <span>Check-In</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(apt.id, 'COMPLETED')}
                              disabled={submittingAction}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                            >
                              Complete
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {(apt.status === 'COMPLETED' || apt.diagnosis) && (
                              <button
                                type="button"
                                onClick={() => setPrescriptionAppt(apt)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold transition-colors cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Rx Slip</span>
                              </button>
                            )}
                            {apt.status !== 'COMPLETED' && !apt.diagnosis && (
                              <span className="text-xs text-slate-400 dark:text-slate-500 italic">No action required</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-16 text-center text-slate-400 dark:text-slate-500">
              <Filter className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No appointments found</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Try resetting the date, month, or status filter.</p>
            </div>
          )}
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} accentColor="#6D28D9" />
        </div>

        {/* Reject Modal with Backdrop Click Dismissal & ESC Key */}
        {selectedAppointment && (
          <div
            onClick={() => {
              setSelectedAppointment(null);
              setRejectReason('');
            }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0B0F19] rounded-2xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in-50 zoom-in-95 duration-150"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Decline Appointment
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Patient: {selectedAppointment.patientName}
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                Please provide a clinical or scheduling reason so the patient is informed promptly.
              </p>

              <textarea
                rows={3}
                required
                placeholder="e.g. Doctor is called for emergency surgery; please reschedule for another slot."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] mb-5 resize-none text-slate-900 dark:text-white bg-white dark:bg-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAppointment(null);
                    setRejectReason('');
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel (Esc)
                </button>
                <button
                  type="button"
                  disabled={submittingAction || !rejectReason.trim()}
                  onClick={() => handleUpdateStatus(selectedAppointment.id, 'REJECTED', rejectReason)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {submittingAction ? 'Processing...' : 'Confirm Decline'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Digital Prescription Slip Modal */}
        <PrescriptionSlipModal
          isOpen={!!prescriptionAppt}
          onClose={() => setPrescriptionAppt(null)}
          appointment={prescriptionAppt}
        />
      </main>
      </div>
    </div>
  );
}
