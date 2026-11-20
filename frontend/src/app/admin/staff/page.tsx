'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BriefcaseMedical,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  Building2,
  Clock,
  CheckCircle2,
  Layers,
  Lock,
  RotateCcw,
} from 'lucide-react';
import AdminHeader from '@/components/AdminHeader';
import AdminSidebar from '@/components/AdminSidebar';
import CustomSelect from '@/components/CustomSelect';
import Pagination from '@/components/Pagination';
import { adminBranchApi, adminStaffApi, specialtyApi } from '@/lib/api';
import { HospitalBranch, StaffMember, StaffRequest } from '@/types/auth';
import { Specialty } from '@/types/doctor';
import { useAuth } from '@/context/AuthContext';
import { DEFAULT_MAIN_BRANCH, useAdminBranchFilter } from '@/lib/adminBranchFilter';

const STAFF_ROLES = [
  { value: 'HEAD_NURSE', label: 'Head Nurse' },
  { value: 'REGISTERED_NURSE', label: 'Registered Nurse' },
  { value: 'PHARMACIST', label: 'Clinical Pharmacist' },
  { value: 'LAB_TECHNICIAN', label: 'Lab & Imaging Technician' },
  { value: 'RECEPTIONIST', label: 'Front-Desk Receptionist' },
  { value: 'CARE_COORDINATOR', label: 'Ward / Care Coordinator' },
  { value: 'CASHIER', label: 'Billing & Cashier Officer' },
];

const SHIFTS = [
  { value: 'MORNING', label: 'Morning Shift (07:00 – 15:30)' },
  { value: 'AFTERNOON', label: 'Afternoon Shift (13:30 – 21:00)' },
  { value: 'NIGHT', label: 'Night Shift (21:00 – 07:00)' },
  { value: 'FULL_DAY', label: 'Full Day (08:00 – 17:00)' },
];

export default function AdminStaffPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [branches, setBranches] = useState<HospitalBranch[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [branchFilter, setBranchFilter, scopeInfo] = useAdminBranchFilter();
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<StaffRequest>({
    employeeId: '',
    name: '',
    email: '',
    phone: '',
    gender: 'FEMALE',
    staffRole: 'REGISTERED_NURSE',
    departmentName: 'General Medicine',
    branchName: 'MundulCare Main Campus (Phnom Penh)',
    shift: 'MORNING',
    joiningDate: new Date().toISOString().split('T')[0],
    isActive: true,
    notes: '',
  });

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setError(null);
      const [staffRes, branchRes, specRes] = await Promise.all([
        adminStaffApi.getAll(),
        adminBranchApi.getAll().catch(() => ({ success: false, data: [] as HospitalBranch[] })),
        specialtyApi.getAll().catch(() => ({ success: false, data: [] as Specialty[] })),
      ]);
      if (staffRes.success && staffRes.data) setStaffList(staffRes.data);
      if (branchRes.success && branchRes.data) setBranches(branchRes.data);
      if (specRes.success && specRes.data) setSpecialties(specRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load hospital staff');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== 'ADMIN') {
        router.push('/login?redirect=/admin/staff');
      } else {
        fetchData();
      }
    }
  }, [isAuthenticated, user, authLoading]);

  const openCreateModal = () => {
    setEditingStaff(null);
    const nextNum = String(staffList.length + 1).padStart(3, '0');
    setForm({
      employeeId: `STF-2026-${nextNum}`,
      name: '',
      email: '',
      phone: '',
      gender: 'FEMALE',
      staffRole: 'REGISTERED_NURSE',
      departmentName: specialties[0]?.name || 'General Medicine',
      branchName:
        scopeInfo.isBranchLocked && scopeInfo.lockedBranch
          ? scopeInfo.lockedBranch
          : branches[0]?.name || 'MundulCare Main Campus (Phnom Penh)',
      shift: 'MORNING',
      joiningDate: new Date().toISOString().split('T')[0],
      isActive: true,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (st: StaffMember) => {
    setEditingStaff(st);
    setForm({
      employeeId: st.employeeId,
      name: st.name,
      email: st.email,
      phone: st.phone || '',
      gender: st.gender || 'FEMALE',
      staffRole: st.staffRole,
      departmentName: st.departmentName || 'General Medicine',
      branchName: st.branchName || 'MundulCare Main Campus (Phnom Penh)',
      shift: st.shift || 'MORNING',
      joiningDate: st.joiningDate || null,
      isActive: isStaffActive(st),
      notes: st.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingStaff) {
        await adminStaffApi.update(editingStaff.id, form);
      } else {
        await adminStaffApi.create(form);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save staff member');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminStaffApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete staff member');
    } finally {
      setDeleting(false);
    }
  };

  // Helper to reliably check active status across both isActive and active backend properties
  const isStaffActive = (st: StaffMember): boolean => {
    if (st.isActive !== undefined && st.isActive !== null) return Boolean(st.isActive);
    if (st.active !== undefined && st.active !== null) return Boolean(st.active);
    return true;
  };

  const formatRoleLabel = (role: string) =>
    STAFF_ROLES.find((r) => r.value === role)?.label || role.replace(/_/g, ' ');

  const formatShiftInfo = (shift?: string) => {
    switch (shift) {
      case 'MORNING':
        return { name: 'Morning', time: '07:00 – 15:30' };
      case 'AFTERNOON':
        return { name: 'Afternoon', time: '13:30 – 21:00' };
      case 'NIGHT':
        return { name: 'Night', time: '21:00 – 07:00' };
      case 'FULL_DAY':
      default:
        return { name: 'Full Day', time: '08:00 – 17:00' };
    }
  };

  const formatBranchShort = (branchName?: string) => {
    if (!branchName) return 'Main Campus';
    if (branchName.includes('Siem Reap')) return 'Siem Reap Branch';
    if (branchName.includes('Battambang')) return 'Battambang Center';
    if (branchName.includes('Phnom Penh') || branchName.includes('Main')) return 'Main Campus (Phnom Penh)';
    return branchName;
  };

  const branchScopedStaff =
    branchFilter === 'ALL'
      ? staffList
      : staffList.filter((st) => (st.branchName || DEFAULT_MAIN_BRANCH) === branchFilter);

  const filtered = branchScopedStaff.filter((st) => {
    if (roleFilter !== 'ALL' && st.staffRole !== roleFilter) return false;
    if (shiftFilter !== 'ALL' && st.shift !== shiftFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        st.name.toLowerCase().includes(q) ||
        st.employeeId.toLowerCase().includes(q) ||
        st.email.toLowerCase().includes(q) ||
        (st.departmentName || '').toLowerCase().includes(q) ||
        (st.branchName || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const hasActiveFilters =
    Boolean(search.trim()) ||
    roleFilter !== 'ALL' ||
    (branchFilter !== 'ALL' && !scopeInfo.isBranchLocked) ||
    shiftFilter !== 'ALL';

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

        <main className="flex-1 min-w-0 p-5 sm:p-7 lg:p-8 overflow-y-auto max-w-7xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Hospital Staff & Nursing Roster
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Manage nurses, clinical pharmacists, lab technicians, receptionists, and care coordinators.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white font-bold text-sm shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {branchFilter === 'ALL' ? 'Total Staff Roster' : 'Branch Staff Roster'}
                </span>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5 font-tabular">
                  {branchScopedStaff.length}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#6D28D9] dark:text-purple-400 flex items-center justify-center">
                <BriefcaseMedical className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Nursing Team</span>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 font-tabular">
                  {branchScopedStaff.filter((s) => s.staffRole.includes('NURSE')).length}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">On Active Duty</span>
                <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5 font-tabular">
                  {branchScopedStaff.filter(isStaffActive).length}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search & Filter Form: Clean, Balanced & Not Overstretched */}
          <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 mb-6 shadow-2xs space-y-3">
            {/* Search Input Row */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by employee ID, staff name, email, department, or branch..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns Row: Clean 3-Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Staff Role
                </label>
                <CustomSelect
                  value={roleFilter}
                  onChange={(val) => {
                    setRoleFilter(val);
                    setPage(1);
                  }}
                  accentColor="#6D28D9"
                  options={[
                    { value: 'ALL', label: 'All Staff Roles' },
                    ...STAFF_ROLES.map((r) => ({ value: r.value, label: r.label })),
                  ]}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Branch Location
                </label>
                {scopeInfo.isBranchLocked ? (
                  <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#f5f3ff] dark:bg-purple-950/40 border border-[#ddd6fe] dark:border-purple-800/60 text-xs font-bold text-[#6D28D9] dark:text-purple-300 h-[42px]">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{scopeInfo.lockedBranch}</span>
                  </div>
                ) : (
                  <CustomSelect
                    value={branchFilter}
                    onChange={(val) => {
                      setBranchFilter(val);
                      setPage(1);
                    }}
                    accentColor="#6D28D9"
                    icon={<Building2 className="w-4 h-4 text-[#6D28D9] dark:text-purple-400 shrink-0" />}
                    options={[
                      { value: 'ALL', label: 'All Hospital Branches' },
                      ...branches.map((b) => ({ value: b.name, label: `${b.city} (${b.code})` })),
                    ]}
                  />
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Shift Schedule
                </label>
                <CustomSelect
                  value={shiftFilter}
                  onChange={(val) => {
                    setShiftFilter(val);
                    setPage(1);
                  }}
                  accentColor="#6D28D9"
                  options={[
                    { value: 'ALL', label: 'All Shifts' },
                    ...SHIFTS.map((s) => ({ value: s.value, label: s.label })),
                  ]}
                />
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  Showing <strong>{filtered.length}</strong> of <strong>{branchScopedStaff.length}</strong> staff members
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setRoleFilter('ALL');
                    if (!scopeInfo.isBranchLocked) setBranchFilter('ALL');
                    setShiftFilter('ALL');
                    setPage(1);
                  }}
                  className="inline-flex items-center gap-1 font-bold text-[#6D28D9] dark:text-purple-400 hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filters</span>
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-sm text-red-700 dark:text-red-300 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Staff Table: Compact, Fully Visible & Never Clipped */}
          <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div
              role="region"
              aria-label="Hospital staff table"
              tabIndex={0}
              className="overflow-x-auto focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20"
            >
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="sticky left-0 bg-slate-50 dark:bg-slate-900 z-20 px-4 py-3.5 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] min-w-[210px]">
                      Staff Member
                    </th>
                    <th className="px-4 py-3.5 min-w-[170px]">Role & Department</th>
                    <th className="px-4 py-3.5 min-w-[170px]">Branch Location</th>
                    <th className="px-4 py-3.5 min-w-[150px]">Shift Schedule</th>
                    <th className="px-4 py-3.5 min-w-[110px]">Status</th>
                    <th className="px-4 py-3.5 text-right min-w-[90px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-slate-700 dark:text-slate-300">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500">
                        No hospital staff members match your current filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((st) => {
                      const active = isStaffActive(st);
                      const shiftInfo = formatShiftInfo(st.shift);

                      return (
                        <tr key={st.id} className="group hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          {/* Staff Member (Sticky Left so Avatar & Name are NEVER Cut Off) */}
                          <td className="sticky left-0 bg-white dark:bg-[#0B0F19] group-hover:bg-slate-50/70 dark:group-hover:bg-slate-800/40 z-10 px-4 py-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[#f5f3ff] dark:bg-purple-950/50 border border-[#ddd6fe] dark:border-purple-800 text-[#6D28D9] dark:text-purple-300 font-bold text-xs flex items-center justify-center shrink-0">
                                {st.name ? st.name.charAt(0).toUpperCase() : 'S'}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 dark:text-white text-sm truncate max-w-[130px]" title={st.name}>
                                    {st.name}
                                  </span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-tabular shrink-0">
                                    {st.employeeId}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[170px]" title={st.email}>
                                  {st.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role & Department */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-[#f5f3ff] dark:bg-purple-950/50 text-[#6D28D9] dark:text-purple-300 border border-[#ddd6fe] dark:border-purple-800">
                              {formatRoleLabel(st.staffRole)}
                            </span>
                            {st.departmentName && (
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1 truncate max-w-[160px]">
                                <Layers className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                                <span className="truncate">{st.departmentName}</span>
                              </div>
                            )}
                          </td>

                          {/* Branch Location */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[170px]" title={st.branchName}>
                              <Building2 className="w-3.5 h-3.5 text-[#6D28D9] dark:text-purple-400 shrink-0" />
                              <span className="truncate">{formatBranchShort(st.branchName)}</span>
                            </div>
                          </td>

                          {/* Shift Schedule */}
                          <td className="px-4 py-3 whitespace-nowrap text-xs">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">{shiftInfo.name}</div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-tabular">{shiftInfo.time}</div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3 whitespace-nowrap">
                            {active ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                On Duty
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                Off Roster
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(st)}
                                className="p-1.5 rounded-lg text-[#6D28D9] dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
                                title="Edit Staff Member"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(st)}
                                className="p-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="Remove Staff Member"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={page}
              totalPages={Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))}
              onPageChange={setPage}
              accentColor="#6D28D9"
            />
          </div>
        </main>

        {/* Create / Edit Staff Modal Form */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-xl w-full p-6 my-8 animate-in fade-in-50 zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingStaff ? 'Edit Hospital Staff Member' : 'Add Hospital Staff Member'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Employee ID *</label>
                    <input
                      type="text"
                      required
                      value={form.employeeId}
                      onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                      placeholder="STF-2026-007"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Sophea Meas"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="staff@mundulcare.com"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
                    <input
                      type="text"
                      value={form.phone || ''}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+855 12 400 500"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Staff Role *</label>
                    <CustomSelect
                      value={form.staffRole}
                      onChange={(val) => setForm({ ...form, staffRole: val })}
                      accentColor="#6D28D9"
                      options={STAFF_ROLES}
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned Department</label>
                    <CustomSelect
                      value={form.departmentName || 'General Medicine'}
                      onChange={(val) => setForm({ ...form, departmentName: val })}
                      accentColor="#6D28D9"
                      options={
                        specialties.length > 0
                          ? specialties.map((s) => ({ value: s.name, label: s.name }))
                          : [{ value: 'General Medicine', label: 'General Medicine' }]
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Hospital Branch *</label>
                    {scopeInfo.isBranchLocked ? (
                      <div className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold text-sm flex items-center gap-2 h-[42px]">
                        <Lock className="w-3.5 h-3.5 text-[#6D28D9]" />
                        <span className="truncate">{form.branchName || scopeInfo.lockedBranch}</span>
                      </div>
                    ) : (
                      <CustomSelect
                        value={form.branchName || 'MundulCare Main Campus (Phnom Penh)'}
                        onChange={(val) => setForm({ ...form, branchName: val })}
                        accentColor="#6D28D9"
                        options={
                          branches.length > 0
                            ? branches.map((b) => ({ value: b.name, label: b.name }))
                            : [{ value: 'MundulCare Main Campus (Phnom Penh)', label: 'MundulCare Main Campus (Phnom Penh)' }]
                        }
                      />
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Shift Schedule *</label>
                    <CustomSelect
                      value={form.shift || 'MORNING'}
                      onChange={(val) => setForm({ ...form, shift: val })}
                      accentColor="#6D28D9"
                      options={SHIFTS}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Gender</label>
                    <CustomSelect
                      value={form.gender || 'FEMALE'}
                      onChange={(val) => setForm({ ...form, gender: val as 'MALE' | 'FEMALE' | 'OTHER' })}
                      accentColor="#6D28D9"
                      options={[
                        { value: 'FEMALE', label: 'Female' },
                        { value: 'MALE', label: 'Male' },
                        { value: 'OTHER', label: 'Other' },
                      ]}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Joining Date</label>
                    <input
                      type="date"
                      value={form.joiningDate || ''}
                      onChange={(e) => setForm({ ...form, joiningDate: e.target.value || null })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Operational Notes / Responsibilities</label>
                  <textarea
                    rows={2}
                    value={form.notes || ''}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="e.g. Triage charge nurse for Outpatient Wing..."
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9] resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive ?? true}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      className="w-4 h-4 accent-[#6D28D9] rounded"
                    />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Active on Hospital Roster</span>
                  </label>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white font-bold text-sm shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? 'Saving...' : editingStaff ? 'Save Changes' : 'Add Staff'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div
            onClick={() => setDeleteTarget(null)}
            className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm w-full p-6 animate-in fade-in-50 zoom-in-95"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Remove Staff Member?</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
                This will remove <strong className="text-slate-900 dark:text-white">{deleteTarget.name}</strong> ({deleteTarget.employeeId}) from the hospital staff roster.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {deleting ? 'Removing...' : 'Remove Staff'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
