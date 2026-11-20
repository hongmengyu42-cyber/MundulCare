'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarCheck,
  UserCheck,
  Users,
  BriefcaseMedical,
  Layers,
  Building2,
  Clock,
  Plus,
  ArrowRight,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import AdminHeader from '@/components/AdminHeader';
import AdminSidebar from '@/components/AdminSidebar';
import CustomSelect from '@/components/CustomSelect';
import Pagination from '@/components/Pagination';
import {
  adminBranchApi,
  adminPatientApi,
  adminRoleApi,
  adminStaffApi,
  appointmentApi,
  doctorApi,
  specialtyApi,
} from '@/lib/api';
import { AppointmentResponse } from '@/types/appointment';
import { Doctor, Specialty } from '@/types/doctor';
import { AdminPatient, AdminUserAccount, HospitalBranch, StaffMember } from '@/types/auth';
import { useAuth } from '@/context/AuthContext';
import {
  DEFAULT_MAIN_BRANCH,
  resolveAppointmentBranch,
  resolveDoctorBranch,
  useAdminBranchFilter,
} from '@/lib/adminBranchFilter';

export default function AdminDashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [branches, setBranches] = useState<HospitalBranch[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUserAccount[]>([]);
  const [selectedBranchFilter, setSelectedBranchFilter, scopeInfo] = useAdminBranchFilter();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== 'ADMIN') {
        router.push('/login?redirect=/admin');
      } else {
        fetchDashboardData();
      }
    }
  }, [isAuthenticated, user, authLoading]);

  useEffect(() => {
    setPage(1);
  }, [selectedBranchFilter]);

  const fetchDashboardData = async () => {
    try {
      const [aptRes, docRes, specRes, patRes, staffRes, branchRes, usersRes] = await Promise.all([
        appointmentApi.getAll().catch(() => ({ success: false, data: [] as AppointmentResponse[] })),
        doctorApi.getAllForAdmin().catch(() => ({ success: false, data: [] as Doctor[] })),
        specialtyApi.getAll().catch(() => ({ success: false, data: [] as Specialty[] })),
        adminPatientApi.getAll().catch(() => ({ success: false, data: [] as AdminPatient[] })),
        adminStaffApi.getAll().catch(() => ({ success: false, data: [] as StaffMember[] })),
        adminBranchApi.getAll().catch(() => ({ success: false, data: [] as HospitalBranch[] })),
        adminRoleApi.getAllUsers().catch(() => ({ success: false, data: [] as AdminUserAccount[] })),
      ]);

      if (aptRes.success && aptRes.data) setAppointments(aptRes.data);
      if (docRes.success && docRes.data) setDoctors(docRes.data);
      if (specRes.success && specRes.data) setSpecialties(specRes.data);
      if (patRes.success && patRes.data) setPatients(patRes.data);
      if (staffRes.success && staffRes.data) setStaff(staffRes.data);
      if (branchRes.success && branchRes.data) setBranches(branchRes.data);
      if (usersRes.success && usersRes.data) setAllUsers(usersRes.data);
    } catch (err) {
      console.error('Failed to load admin metrics', err);
    } finally {
      setLoading(false);
    }
  };

  // Every metric on the Dashboard filters strictly by the selected Hospital Branch
  const filteredDoctors =
    selectedBranchFilter === 'ALL'
      ? doctors
      : doctors.filter((d) => resolveDoctorBranch(d) === selectedBranchFilter);

  const filteredAppointments =
    selectedBranchFilter === 'ALL'
      ? appointments
      : appointments.filter((a) => resolveAppointmentBranch(a, doctors) === selectedBranchFilter);

  const filteredPatients =
    selectedBranchFilter === 'ALL'
      ? patients
      : patients.filter((p) => (p.assignedBranch || DEFAULT_MAIN_BRANCH) === selectedBranchFilter);

  const filteredStaff =
    selectedBranchFilter === 'ALL'
      ? staff
      : staff.filter((s) => (s.branchName || DEFAULT_MAIN_BRANCH) === selectedBranchFilter);

  const filteredSpecialties =
    selectedBranchFilter === 'ALL'
      ? specialties
      : specialties.filter(
          (sp) => (sp.branchName || DEFAULT_MAIN_BRANCH) === selectedBranchFilter
        );

  const filteredBranches =
    selectedBranchFilter === 'ALL'
      ? branches
      : branches.filter((b) => b.name === selectedBranchFilter);

  const pendingCount = filteredAppointments.filter((a) => a.status === 'PENDING').length;
  const activeBranches = filteredBranches.filter((b) => b.isActive);

  const getStatusBadge = (status: string) => {
    const label = status === 'REJECTED' ? 'Declined' : status.charAt(0) + status.slice(1).toLowerCase();
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
        {label}
      </span>
    );
  };

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
          {/* Welcome Header & Single-Line Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Hospital Operations Dashboard
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {scopeInfo.isBranchLocked ? (
                  <>
                    Branch Admin Portal for <strong className="text-[#6D28D9] dark:text-purple-400">{scopeInfo.lockedBranch}</strong> — managing this branch&apos;s appointments, doctors, staff, departments, and patients.
                  </>
                ) : selectedBranchFilter === 'ALL' ? (
                  <>
                    Welcome back, <strong className="text-slate-800 dark:text-slate-200">{user?.name}</strong>. Showing global operations across all {branches.length} hospital branches.
                  </>
                ) : (
                  <>
                    Filtered to <strong className="text-[#6D28D9] dark:text-purple-400">{selectedBranchFilter}</strong> — showing only this branch&apos;s appointments, doctors, staff, departments, and patients.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {scopeInfo.isBranchLocked ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#f5f3ff] dark:bg-purple-950/40 border border-[#ddd6fe] dark:border-purple-800/60 text-xs font-bold text-[#6D28D9] dark:text-purple-300">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>Branch Admin: {scopeInfo.lockedBranch}</span>
                </div>
              ) : (
                <CustomSelect
                  value={selectedBranchFilter}
                  onChange={setSelectedBranchFilter}
                  accentColor="#6D28D9"
                  className="w-60"
                  icon={<Building2 className="w-4 h-4 text-[#6D28D9] dark:text-purple-400 shrink-0" />}
                  options={[
                    { value: 'ALL', label: `All Hospital Branches (${branches.length})` },
                    ...branches.map((b) => ({
                      value: b.name,
                      label: `${b.city} (${b.code})`,
                    })),
                  ]}
                />
              )}

              <Link
                href="/admin/doctors"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white font-bold text-sm shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Register Doctor</span>
              </Link>
            </div>
          </div>

          {/* 6 Executive Metric KPI Cards (100% Scoped to Selected Branch) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            <Link
              href="/admin/appointments"
              className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-[#6D28D9]/40 dark:hover:border-purple-500/40 p-5 shadow-xs flex items-center justify-between transition-all group"
            >
              <div>
                <span className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {selectedBranchFilter === 'ALL' ? 'Total Appointments' : 'Branch Appointments'}
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 block font-tabular">
                  {filteredAppointments.length}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">
                  {pendingCount} pending confirmation
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                <CalendarCheck className="w-6 h-6" />
              </div>
            </Link>

            <Link
              href="/admin/patients"
              className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-[#6D28D9]/40 dark:hover:border-purple-500/40 p-5 shadow-xs flex items-center justify-between transition-all group"
            >
              <div>
                <span className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {selectedBranchFilter === 'ALL' ? 'Registered Patients' : 'Branch Patients'}
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 block font-tabular">
                  {filteredPatients.length}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">
                  {filteredPatients.filter((p) => p.isActive).length} active patient records
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 dark:bg-sky-500/15 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
            </Link>

            <Link
              href="/admin/doctors"
              className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-[#6D28D9]/40 dark:hover:border-purple-500/40 p-5 shadow-xs flex items-center justify-between transition-all group"
            >
              <div>
                <span className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {selectedBranchFilter === 'ALL' ? 'Doctors & Specialists' : 'Branch Doctors'}
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 block font-tabular">
                  {filteredDoctors.length}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">
                  {filteredDoctors.filter((d) => d.isActive).length} active on clinical roster
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <UserCheck className="w-6 h-6" />
              </div>
            </Link>

            <Link
              href="/admin/staff"
              className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-[#6D28D9]/40 dark:hover:border-purple-500/40 p-5 shadow-xs flex items-center justify-between transition-all group"
            >
              <div>
                <span className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {selectedBranchFilter === 'ALL' ? 'Hospital Staff' : 'Branch Staff'}
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 block font-tabular">
                  {filteredStaff.length}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">
                  Nurses, pharmacists, lab & front-desk
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
                <BriefcaseMedical className="w-6 h-6" />
              </div>
            </Link>

            <Link
              href="/admin/specialties"
              className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-[#6D28D9]/40 dark:hover:border-purple-500/40 p-5 shadow-xs flex items-center justify-between transition-all group"
            >
              <div>
                <span className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {selectedBranchFilter === 'ALL' ? 'Medical Departments' : 'Branch Departments'}
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 block font-tabular">
                  {filteredSpecialties.length}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block">
                  Outpatient & specialized clinical units
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 dark:bg-purple-500/15 flex items-center justify-center text-[#6D28D9] dark:text-purple-400 group-hover:scale-105 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
            </Link>

            {scopeInfo.isBranchLocked || !scopeInfo.isGlobalAdmin ? (
              <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Assigned Campus
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 block font-tabular">
                    1 / 1
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block truncate max-w-[180px]">
                    {filteredBranches[0]?.city || selectedBranchFilter}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Building2 className="w-6 h-6" />
                </div>
              </div>
            ) : (
              <Link
                href="/admin/branches"
                className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-[#6D28D9]/40 dark:hover:border-purple-500/40 p-5 shadow-xs flex items-center justify-between transition-all group"
              >
                <div>
                  <span className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {selectedBranchFilter === 'ALL' ? 'Branches & Locations' : 'Selected Campus'}
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 block font-tabular">
                    {activeBranches.length} / {filteredBranches.length}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block truncate max-w-[180px]">
                    {selectedBranchFilter === 'ALL'
                      ? 'Active hospital campuses & clinics'
                      : filteredBranches[0]?.city || selectedBranchFilter}
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/15 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                  <Building2 className="w-6 h-6" />
                </div>
              </Link>
            )}
          </div>

          {/* Pending Action Banner */}
          {pendingCount > 0 && (
            <div className="bg-white dark:bg-[#0B0F19] border border-amber-200/90 dark:border-amber-500/30 rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-2xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {pendingCount} Patient Appointment Requests Awaiting Review
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Confirm or reschedule consultations so doctors and patients receive notifications promptly.
                  </p>
                </div>
              </div>

              <Link
                href="/admin/appointments"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
              >
                <span>Review Bookings</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Hospital Branches & Locations Operational Breakdown */}
          {filteredBranches.length > 0 && (
            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5 mb-8">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedBranchFilter === 'ALL'
                      ? 'Hospital Branches & Regional Network'
                      : `Branch Overview: ${selectedBranchFilter}`}
                  </h2>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {selectedBranchFilter === 'ALL'
                      ? 'Distribution of departments, doctors, clinical staff, and patients across hospital locations'
                      : 'Showing operational metrics exclusively for the selected hospital branch'}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  {selectedBranchFilter !== 'ALL' && !scopeInfo.isBranchLocked && (
                    <button
                      type="button"
                      onClick={() => setSelectedBranchFilter('ALL')}
                      className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-[#6D28D9] dark:hover:text-purple-400 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Show All Branches</span>
                    </button>
                  )}
                  {!scopeInfo.isBranchLocked && scopeInfo.isGlobalAdmin && (
                    <Link
                      href="/admin/branches"
                      className="text-xs font-bold text-[#6D28D9] dark:text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <span>Manage Branches & Branch Admins</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>

              <div
                className={`grid grid-cols-1 ${
                  filteredBranches.length === 1 ? 'md:grid-cols-1' : 'md:grid-cols-3'
                } gap-4`}
              >
                {filteredBranches.map((branch) => {
                  const deptCount = specialties.filter(
                    (s) => (s.branchName || DEFAULT_MAIN_BRANCH) === branch.name
                  ).length;
                  const docCount = doctors.filter((d) => resolveDoctorBranch(d) === branch.name).length;
                  const staffCount = staff.filter(
                    (st) => (st.branchName || DEFAULT_MAIN_BRANCH) === branch.name
                  ).length;
                  const patCount = patients.filter(
                    (pt) => (pt.assignedBranch || DEFAULT_MAIN_BRANCH) === branch.name
                  ).length;
                  const branchAdmins = allUsers.filter(
                    (u) => u.role === 'ADMIN' && u.assignedBranch === branch.name
                  );

                  return (
                    <div
                      key={branch.id}
                      onClick={() => {
                        if (!scopeInfo.isBranchLocked) {
                          setSelectedBranchFilter(
                            selectedBranchFilter === branch.name ? 'ALL' : branch.name
                          );
                        }
                      }}
                      className={`rounded-xl border p-4 transition-all ${
                        scopeInfo.isBranchLocked ? 'cursor-default' : 'cursor-pointer'
                      } ${
                        selectedBranchFilter === branch.name
                          ? 'border-[#6D28D9] dark:border-purple-500 bg-[#f5f3ff]/40 dark:bg-purple-950/30 shadow-xs'
                          : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/50 hover:border-[#6D28D9]/40 dark:hover:border-purple-500/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#f5f3ff] dark:bg-purple-950/50 text-[#6D28D9] dark:text-purple-300 border border-[#ddd6fe] dark:border-purple-800/60">
                            {branch.code}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1.5">{branch.name}</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{branch.address}</p>
                        </div>
                        {branch.isMainCampus && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shrink-0">
                            HQ Campus
                          </span>
                        )}
                      </div>

                      {/* Assigned Branch Admin Pill */}
                      <div className="mt-3 pt-2.5 border-t border-slate-200/50 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium truncate">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#6D28D9] dark:text-purple-400 shrink-0" />
                          <span className="truncate">
                            Branch Admin:{' '}
                            <strong className="text-slate-800 dark:text-slate-200">
                              {branchAdmins.length > 0
                                ? branchAdmins.map((a) => a.name).join(', ')
                                : 'Unassigned'}
                            </strong>
                          </span>
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800 text-center">
                        <div>
                          <div className="text-sm font-extrabold text-slate-900 dark:text-white font-tabular">{deptCount}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">Depts</div>
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-slate-900 dark:text-white font-tabular">{docCount}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">Doctors</div>
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-slate-900 dark:text-white font-tabular">{staffCount}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">Staff</div>
                        </div>
                        <div>
                          <div className="text-sm font-extrabold text-slate-900 dark:text-white font-tabular">{patCount}</div>
                          <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">Patients</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Appointments Registry Card */}
          <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedBranchFilter === 'ALL'
                    ? 'Recent Appointments'
                    : `Recent Appointments — ${selectedBranchFilter}`}
                </h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {selectedBranchFilter === 'ALL'
                    ? 'Latest consultation requests and bookings across all departments'
                    : `Showing ${filteredAppointments.length} booking(s) for ${selectedBranchFilter}`}
                </p>
              </div>

              <Link
                href="/admin/appointments"
                className="text-xs font-bold text-[#6D28D9] dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div
              role="region"
              aria-label="Recent appointments table"
              tabIndex={0}
              className="overflow-x-auto focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20"
            >
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Patient</th>
                    <th className="px-5 py-3.5">Doctor & Branch</th>
                    <th className="px-5 py-3.5">Date & Window</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-slate-700 dark:text-slate-300">
                  {filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-slate-400 dark:text-slate-500">
                        No appointments found for {selectedBranchFilter}.
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((apt) => (
                      <tr key={apt.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                          <div>{apt.patientName}</div>
                          <div className="text-xs text-slate-400 dark:text-slate-500 font-normal">{apt.patientEmail}</div>
                        </td>
                        <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          <div>{apt.doctorName}</div>
                          <div className="text-xs text-slate-400 dark:text-slate-500 font-normal">
                            {resolveAppointmentBranch(apt, doctors)}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 font-tabular text-sm whitespace-nowrap">
                          <div className="font-bold text-slate-800 dark:text-slate-200">
                            <span>{apt.appointmentDate}</span>
                          </div>
                          <div className="text-xs text-slate-400 dark:text-slate-500 font-normal mt-0.5">
                            {apt.startTime} - {apt.endTime}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">{getStatusBadge(apt.status)}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-slate-600 dark:text-slate-300 font-tabular text-sm whitespace-nowrap">
                          ${apt.consultationFee?.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={page}
              totalPages={Math.max(1, Math.ceil(filteredAppointments.length / PAGE_SIZE))}
              onPageChange={setPage}
              accentColor="#6D28D9"
            />
          </div>
        </main>
      </div>
    </div>
  );
}
