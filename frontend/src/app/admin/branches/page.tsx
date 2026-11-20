'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  MapPin,
  Phone,
  Mail,
  Clock,
  UserCheck,
  Award,
  Search,
  ShieldCheck,
  UserPlus,
  KeyRound,
  Sliders,
  CheckSquare,
  Square,
  Eye,
  Lock,
  Unlock,
} from 'lucide-react';
import AdminHeader from '@/components/AdminHeader';
import AdminSidebar from '@/components/AdminSidebar';
import CustomSelect from '@/components/CustomSelect';
import {
  adminBranchApi,
  adminPatientApi,
  adminRoleApi,
  adminStaffApi,
  specialtyApi,
} from '@/lib/api';
import {
  AdminPatient,
  AdminUserAccount,
  HospitalBranch,
  HospitalBranchRequest,
  PERMISSION_MODULES,
  StaffMember,
} from '@/types/auth';
import { Specialty } from '@/types/doctor';
import { useAuth } from '@/context/AuthContext';
import { useAdminBranchFilter } from '@/lib/adminBranchFilter';

const DEFAULT_BRANCH_ADMIN_PERMS = [
  'MANAGE_APPOINTMENTS',
  'MANAGE_PATIENTS',
  'MANAGE_DOCTORS',
  'MANAGE_STAFF',
  'MANAGE_DEPARTMENTS',
  'VIEW_AUDIT_LOGS',
];

export default function AdminBranchesPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [branches, setBranches] = useState<HospitalBranch[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUserAccount[]>([]);
  const [branchFilter, setBranchFilter, scopeInfo] = useAdminBranchFilter();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create / Edit Branch Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<HospitalBranch | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const [form, setForm] = useState<HospitalBranchRequest>({
    code: '',
    name: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    operatingHours: 'Daily (07:30 - 19:30)',
    managerName: '',
    isMainCampus: false,
    isActive: true,
  });

  // Delete Branch Modal
  const [deleteTarget, setDeleteTarget] = useState<HospitalBranch | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Branch Admin Management Modal (for Global Admin to create/assign/edit Branch Admins)
  const [branchAdminModalBranch, setBranchAdminModalBranch] = useState<HospitalBranch | null>(null);
  const [branchAdminMode, setBranchAdminMode] = useState<'CREATE' | 'ASSIGN' | 'EDIT'>('CREATE');
  const [editingBranchAdmin, setEditingBranchAdmin] = useState<AdminUserAccount | null>(null);
  const [selectedExistingUserId, setSelectedExistingUserId] = useState<string>('');
  const [branchAdminSaving, setBranchAdminSaving] = useState(false);
  const [branchAdminError, setBranchAdminError] = useState<string | null>(null);

  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    phone: '+855 12 800 900',
    password: '',
    adminLevel: 'BRANCH_ADMIN',
    assignedBranch: '',
    isActive: true,
    perms: DEFAULT_BRANCH_ADMIN_PERMS,
  });

  const fetchData = async () => {
    try {
      setError(null);
      const [branchRes, specRes, staffRes, patRes, usersRes] = await Promise.all([
        adminBranchApi.getAll(),
        specialtyApi.getAll().catch(() => ({ success: false, data: [] as Specialty[] })),
        adminStaffApi.getAll().catch(() => ({ success: false, data: [] as StaffMember[] })),
        adminPatientApi.getAll().catch(() => ({ success: false, data: [] as AdminPatient[] })),
        adminRoleApi.getAllUsers().catch(() => ({ success: false, data: [] as AdminUserAccount[] })),
      ]);
      if (branchRes.success && branchRes.data) setBranches(branchRes.data);
      if (specRes.success && specRes.data) setSpecialties(specRes.data);
      if (staffRes.success && staffRes.data) setStaff(staffRes.data);
      if (patRes.success && patRes.data) setPatients(patRes.data);
      if (usersRes.success && usersRes.data) setAllUsers(usersRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load hospital branches');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== 'ADMIN') {
        router.push('/login?redirect=/admin/branches');
      } else if (scopeInfo.isBranchLocked || (user?.adminLevel && user?.adminLevel !== 'SUPER_ADMIN')) {
        router.replace('/admin');
      } else {
        fetchData();
      }
    }
  }, [isAuthenticated, user, authLoading, scopeInfo.isBranchLocked]);

  const openCreateModal = () => {
    setEditingBranch(null);
    setModalError(null);
    const nextIdx = String(branches.length + 1).padStart(2, '0');
    setForm({
      code: `MC-BR-${nextIdx}`,
      name: '',
      city: 'Phnom Penh',
      address: '',
      phone: '+855 23 999 400',
      email: 'branch@mundulcare.com',
      operatingHours: 'Daily (07:30 - 19:30)',
      managerName: '',
      isMainCampus: false,
      isActive: true,
    });
    setIsModalOpen(true);
  };


  const openEditModal = (b: HospitalBranch) => {
    setEditingBranch(b);
    setModalError(null);
    setForm({
      code: b.code,
      name: b.name,
      city: b.city,
      address: b.address,
      phone: b.phone || '',
      email: b.email || '',
      operatingHours: b.operatingHours || '',
      managerName: b.managerName || '',
      isMainCampus: b.isMainCampus ?? (b as any).mainCampus ?? false,
      isActive: b.isActive ?? (b as any).active ?? true,
    });
    setIsModalOpen(true);
  };


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setModalError(null);
    try {
      if (editingBranch) {
        await adminBranchApi.update(editingBranch.id, form);
      } else {
        await adminBranchApi.create(form);
      }
      setIsModalOpen(false);
      setModalError(null);
      fetchData();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to save hospital branch';
      setModalError(msg);
    } finally {
      setSaving(false);
    }
  };


  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminBranchApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to delete hospital branch';
      setError(msg);
    } finally {
      setDeleting(false);
    }
  };


  // Branch Admin Management Handlers (Global Admin)
  const openCreateBranchAdminModal = (branch: HospitalBranch) => {
    setBranchAdminModalBranch(branch);
    setBranchAdminMode('CREATE');
    setEditingBranchAdmin(null);
    setSelectedExistingUserId('');
    setBranchAdminError(null);
    const citySlug = branch.city.toLowerCase().replace(/[^a-z0-9]/g, '');
    setAdminForm({
      name: `${branch.city} Branch Admin`,
      email: `admin.${citySlug}@mundulcare.com`,
      phone: branch.phone || '+855 12 800 900',
      password: '',
      adminLevel: 'BRANCH_ADMIN',
      assignedBranch: branch.name,
      isActive: true,
      perms: DEFAULT_BRANCH_ADMIN_PERMS,
    });
  };


  const openEditBranchAdminModal = (branch: HospitalBranch, adm: AdminUserAccount) => {
    setBranchAdminModalBranch(branch);
    setBranchAdminMode('EDIT');
    setEditingBranchAdmin(adm);
    setBranchAdminError(null);
    const parsedPerms = adm.permissions
      ? adm.permissions
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : DEFAULT_BRANCH_ADMIN_PERMS;
    setAdminForm({
      name: adm.name,
      email: adm.email,
      phone: adm.phone || '',
      password: '',
      adminLevel: adm.adminLevel || 'BRANCH_ADMIN',
      assignedBranch: adm.assignedBranch || branch.name,
      isActive: adm.isActive ?? (adm as any).active ?? true,
      perms: parsedPerms,
    });
  };


  const toggleAdminPerm = (key: string) => {
    setAdminForm((prev) => ({
      ...prev,
      perms: prev.perms.includes(key)
        ? prev.perms.filter((k) => k !== key)
        : [...prev.perms, key],
    }));
  };


  const handleSaveBranchAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchAdminModalBranch) return;
    setBranchAdminSaving(true);
    setBranchAdminError(null);
    try {
      if (branchAdminMode === 'CREATE') {
        await adminRoleApi.createUser({
          name: adminForm.name,
          email: adminForm.email,
          phone: adminForm.phone,
          password: adminForm.password,
          role: 'ADMIN',
          adminLevel: 'BRANCH_ADMIN',
          assignedBranch: branchAdminModalBranch.name,
          permissions: adminForm.perms.join(','),
        });
      } else if (branchAdminMode === 'ASSIGN') {
        if (!selectedExistingUserId) {
          setBranchAdminError('Please select a user account to assign as Branch Administrator.');
          setBranchAdminSaving(false);
          return;
        }
        await adminRoleApi.updatePrivileges(Number(selectedExistingUserId), {
          role: 'ADMIN',
          adminLevel: 'BRANCH_ADMIN',
          assignedBranch: branchAdminModalBranch.name,
          permissions: adminForm.perms.join(','),
          isActive: true,
        });
      } else if (branchAdminMode === 'EDIT' && editingBranchAdmin) {
        await adminRoleApi.updatePrivileges(editingBranchAdmin.id, {
          name: adminForm.name,
          phone: adminForm.phone,
          password: adminForm.password.trim() ? adminForm.password.trim() : undefined,
          role: 'ADMIN',
          adminLevel: adminForm.adminLevel,
          assignedBranch:
            adminForm.adminLevel === 'SUPER_ADMIN'
              ? 'All Branches (Global)'
              : adminForm.assignedBranch,
          permissions: adminForm.perms.join(','),
          isActive: adminForm.isActive,
        });
      }
      setBranchAdminModalBranch(null);
      setBranchAdminError(null);
      fetchData();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to save Branch Administrator';
      setBranchAdminError(msg);
    } finally {
      setBranchAdminSaving(false);
    }
  };

  const handleToggleLockBranchAdmin = async (adm: AdminUserAccount) => {
    try {
      if (adm.isActive && !adm.isLocked) {
        if (!confirm(`Are you sure you want to lock the account for "${adm.name}" (${adm.email})? This user will be immediately blocked from signing in or accessing the MundulCare system.`)) {
          return;
        }
        await adminRoleApi.lockUser(adm.id);
      } else {
        await adminRoleApi.unlockUser(adm.id);
      }
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to update account status");
    }
  };

  const handleDeleteBranchAdmin = async (adm: AdminUserAccount) => {
    if (!confirm(`Are you sure you want to permanently delete or remove user account "${adm.name}" (${adm.email})? This will revoke all branch administrator access.`)) {
      return;
    }
    try {
      const res = await adminRoleApi.deleteUser(adm.id);
      await fetchData();
      if (branchAdminModalBranch && editingBranchAdmin?.id === adm.id) {
        setBranchAdminModalBranch(null);
      }
      if (res.message) {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to delete user account");
    }
  };

  const handleRemoveDirector = async (branch: HospitalBranch) => {
    if (!confirm(`Remove Branch Director "${branch.managerName}" from ${branch.name}?`)) {
      return;
    }
    try {
      await adminBranchApi.removeDirector(branch.id);
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Failed to remove branch director");
    }
  };


  const filtered = branches.filter((b) => {
    if (branchFilter !== 'ALL' && b.name !== branchFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.code.toLowerCase().includes(q) ||
      b.city.toLowerCase().includes(q) ||
      b.address.toLowerCase().includes(q) ||
      (b.managerName || '').toLowerCase().includes(q)
    );
  });

  const globalSuperAdmins = allUsers.filter(
    (u) =>
      u.role === 'ADMIN' &&
      (u.adminLevel === 'SUPER_ADMIN' || u.assignedBranch === 'All Branches (Global)')
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#090D16] flex items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#6D28D9] mb-2" />
      </div>
    );
  }

  if (scopeInfo.isBranchLocked || (user?.adminLevel && user?.adminLevel !== 'SUPER_ADMIN')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#090D16] flex flex-col selection:bg-[#6D28D9] selection:text-white">
      <AdminHeader />

      <div className="flex-1 flex min-h-0">
        <AdminSidebar />

        <main className="flex-1 min-w-0 p-6 sm:p-8 lg:p-10 overflow-y-auto max-w-7xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#f5f3ff] dark:bg-purple-950/50 text-[#6D28D9] dark:text-purple-300 border border-[#ddd6fe] dark:border-purple-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {scopeInfo.isBranchLocked ? 'Branch Admin View' : 'Global Super Admin Governance'}
                </span>
                <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                  {globalSuperAdmins.length} Global Super Admin{globalSuperAdmins.length === 1 ? '' : 's'} ·{' '}
                  {
                    allUsers.filter(
                      (u) =>
                        u.role === 'ADMIN' &&
                        u.assignedBranch &&
                        u.assignedBranch !== 'All Branches (Global)'
                    ).length
                  }{' '}
                  Assigned Branch Admins
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Hospital Branches & Branch Admins
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Manage MundulCare hospital campuses, assign dedicated Branch Administrators to run each branch&apos;s system, and configure branch operations.
              </p>
            </div>

            {!scopeInfo.isBranchLocked && (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white font-bold text-sm shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Hospital Branch</span>
              </button>
            )}
          </div>

          {/* Search & Branch Filter Bar */}
          <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shadow-2xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by branch name, branch code, city, address, or branch director..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
              />
            </div>

            {scopeInfo.isBranchLocked ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#f5f3ff] dark:bg-purple-950/50 border border-[#ddd6fe] dark:border-purple-800 text-xs font-bold text-[#6D28D9] dark:text-purple-300">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Scoped to: {scopeInfo.lockedBranch}</span>
              </div>
            ) : (
              <CustomSelect
                value={branchFilter}
                onChange={setBranchFilter}
                accentColor="#6D28D9"
                className="w-full sm:w-64"
                icon={<Building2 className="w-4 h-4 text-[#6D28D9] shrink-0" />}
                options={[
                  { value: 'ALL', label: `All Hospital Branches (${branches.length})` },
                  ...branches.map((b) => ({ value: b.name, label: `${b.city} (${b.code})` })),
                ]}
              />
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-sm text-red-700 dark:text-red-400 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Branches Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filtered.map((b) => {
              const deptCount = specialties.filter(
                (s) => (s.branchName || 'MundulCare Main Campus (Phnom Penh)') === b.name
              ).length;
              const staffCount = staff.filter((st) => st.branchName === b.name).length;
              const patCount = patients.filter(
                (pt) => (pt.assignedBranch || 'MundulCare Main Campus (Phnom Penh)') === b.name
              ).length;
              const branchAdmins = allUsers.filter(
                (u) => u.role === 'ADMIN' && u.assignedBranch === b.name
              );

              return (
                <div
                  key={b.id}
                  className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs hover:border-[#6D28D9]/40 dark:hover:border-purple-500/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#f5f3ff] dark:bg-purple-950/50 border border-[#ddd6fe] dark:border-purple-800 text-[#6D28D9] dark:text-purple-400 flex items-center justify-center shrink-0">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#f5f3ff] dark:bg-purple-950/50 text-[#6D28D9] dark:text-purple-300 border border-[#ddd6fe] dark:border-purple-800 font-tabular">
                              {b.code}
                            </span>
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{b.city}</span>
                            {b.isMainCampus && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                <Award className="w-3 h-3" /> Main Campus HQ
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-1">{b.name}</h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!scopeInfo.isBranchLocked && (
                          <button
                            type="button"
                            onClick={() => {
                              setBranchFilter(b.name);
                              router.push('/admin');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#6D28D9] dark:text-purple-300 bg-[#f5f3ff] dark:bg-purple-950/50 hover:bg-[#ede9fe] dark:hover:bg-purple-900/50 border border-[#ddd6fe] dark:border-purple-800 transition-colors cursor-pointer"
                            title="Filter entire Admin Portal to this branch"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Inspect System</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditModal(b)}
                          className="p-2 rounded-xl text-[#6D28D9] dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
                          title="Edit Branch"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!b.isMainCampus && !scopeInfo.isBranchLocked && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(b)}
                            className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete Branch"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400 mt-3">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-[#6D28D9] dark:text-purple-400 shrink-0 mt-0.5" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">{b.address}</span>
                      </div>
                      {b.operatingHours && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                          <span>{b.operatingHours}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-4">
                        {b.phone && (
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                            {b.phone}
                          </span>
                        )}
                        {b.email && (
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                            {b.email}
                          </span>
                        )}
                      </div>
                      {b.managerName && (
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>
                              Branch Director: <strong className="text-slate-900 dark:text-white">{b.managerName}</strong>
                            </span>
                          </div>
                          {!scopeInfo.isBranchLocked && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDirector(b)}
                              className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:underline cursor-pointer"
                              title="Remove Branch Director"
                            >
                              Remove Director
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Branch System Administrators Section */}
                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-[#6D28D9] dark:text-purple-400" />
                          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            Branch System Admins ({branchAdmins.length})
                          </span>
                        </div>
                        {!scopeInfo.isBranchLocked && (
                          <button
                            type="button"
                            onClick={() => openCreateBranchAdminModal(b)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#f5f3ff] dark:bg-purple-950/50 hover:bg-[#ede9fe] dark:hover:bg-purple-900/50 text-[#6D28D9] dark:text-purple-300 border border-[#ddd6fe] dark:border-purple-800 text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Assign / Create Admin</span>
                          </button>
                        )}
                      </div>

                      {branchAdmins.length === 0 ? (
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                          <span>No dedicated Branch Admin assigned yet.</span>
                          {!scopeInfo.isBranchLocked && (
                            <button
                              type="button"
                              onClick={() => openCreateBranchAdminModal(b)}
                              className="font-bold text-[#6D28D9] dark:text-purple-400 hover:underline cursor-pointer"
                            >
                              + Add Now
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {branchAdmins.map((adm) => {
                            const permCount = adm.permissions
                               ? adm.permissions.split(',').filter(Boolean).length
                              : 0;
                            return (
                              <div
                                key={adm.id}
                                className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-[#ddd6fe] dark:hover:border-purple-800 transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-full bg-[#f5f3ff] dark:bg-purple-950/50 border border-[#ddd6fe] dark:border-purple-800 text-[#6D28D9] dark:text-purple-300 font-extrabold text-xs flex items-center justify-center shrink-0">
                                    {adm.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                        {adm.name}
                                      </p>
                                      {adm.isLocked || !adm.isActive ? (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                          Locked / Inactive
                                        </span>
                                      ) : (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                          Active
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                      {adm.email} ·{' '}
                                      <span className="font-semibold text-[#6D28D9] dark:text-purple-400">
                                        {permCount} module{permCount === 1 ? '' : 's'}
                                      </span>
                                    </p>
                                  </div>
                                </div>

                                {!scopeInfo.isBranchLocked && (
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleLockBranchAdmin(adm)}
                                      className={`p-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                                        adm.isLocked || !adm.isActive
                                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                                          : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                                      }`}
                                      title={adm.isLocked || !adm.isActive ? 'Unlock Branch Admin' : 'Lock Branch Admin'}
                                    >
                                      {adm.isLocked || !adm.isActive ? (
                                        <Unlock className="w-3.5 h-3.5" />
                                      ) : (
                                        <Lock className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => openEditBranchAdminModal(b, adm)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-[#f5f3ff] dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-300 hover:text-[#6D28D9] dark:hover:text-purple-300 border border-slate-200 dark:border-slate-800 hover:border-[#ddd6fe] dark:hover:border-purple-800 text-[11px] font-bold transition-colors cursor-pointer"
                                      title="Manage Permissions & Scope"
                                    >
                                      <Sliders className="w-3.5 h-3.5" />
                                      <span>Manage</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteBranchAdmin(adm)}
                                      className="p-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900/50 transition-colors cursor-pointer"
                                      title="Permanently Delete or Remove User Account"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Operational Metrics Footer */}
                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-5 text-xs">
                      <div>
                        <span className="font-extrabold text-slate-900 dark:text-white font-tabular">{deptCount}</span>{' '}
                        <span className="text-slate-400 dark:text-slate-500">Depts</span>
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-900 dark:text-white font-tabular">{staffCount}</span>{' '}
                        <span className="text-slate-400 dark:text-slate-500">Staff</span>
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-900 dark:text-white font-tabular">{patCount}</span>{' '}
                        <span className="text-slate-400 dark:text-slate-500">Patients</span>
                      </div>
                    </div>

                    {b.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Operational
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* Create / Edit Branch Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full p-6 my-8 animate-in fade-in-50 zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingBranch ? 'Edit Hospital Branch' : 'Add New Hospital Branch'}
                </h3>
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); setModalError(null); }}
                  className="p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4 text-sm">
                {modalError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2 text-xs text-red-700 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                    <span className="font-medium">{modalError}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Branch Code *</label>
                    <input
                      type="text"
                      required
                      value={form.code}
                      onChange={(e) => setForm({ ...form, code: e.target.value })}
                      placeholder="MC-PNH-01"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Branch / Campus Name *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="MundulCare Siem Reap Branch"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">City / Province *</label>
                    <input
                      type="text"
                      required
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="Siem Reap"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Street Address *</label>
                    <input
                      type="text"
                      required
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      placeholder="#88 Charles de Gaulle Blvd"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={form.phone || ''}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+855 63 999 200"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Branch Email</label>
                    <input
                      type="email"
                      value={form.email || ''}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="siemreap@mundulcare.com"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Operating Hours</label>
                    <input
                      type="text"
                      value={form.operatingHours || ''}
                      onChange={(e) => setForm({ ...form, operatingHours: e.target.value })}
                      placeholder="Daily (07:30 - 19:30)"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Branch Director / Manager</label>
                    <input
                      type="text"
                      value={form.managerName || ''}
                      onChange={(e) => setForm({ ...form, managerName: e.target.value })}
                      placeholder="Dr. Sovannara Kim"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isActive ?? true}
                        onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                        className="w-4 h-4 accent-[#6D28D9] rounded"
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Operational</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isMainCampus ?? false}
                        onChange={(e) => setForm({ ...form, isMainCampus: e.target.checked })}
                        className="w-4 h-4 accent-[#6D28D9] rounded"
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Main HQ Campus</span>
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setIsModalOpen(false); setModalError(null); }}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white font-bold text-sm shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? 'Saving...' : editingBranch ? 'Save Changes' : 'Create Branch'}
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
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Hospital Branch?</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
                This will permanently remove <strong className="text-slate-900 dark:text-white">{deleteTarget.name}</strong> ({deleteTarget.code}).
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
                  {deleting ? 'Deleting...' : 'Delete Branch'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Branch Administrator Management Modal (Global Admin) */}
        {branchAdminModalBranch && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-2xl w-full p-4 sm:p-6 my-8 animate-in fade-in-50 zoom-in-95 min-w-0">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4 min-w-0">
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#f5f3ff] dark:bg-purple-950/50 text-[#6D28D9] dark:text-purple-300 border border-[#ddd6fe] dark:border-purple-800">
                    <Building2 className="w-3 h-3" /> {branchAdminModalBranch.code} · {branchAdminModalBranch.city}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1 truncate">
                    {branchAdminMode === 'EDIT'
                      ? `Manage Branch Administrator — ${editingBranchAdmin?.name}`
                      : `Branch Administrator for ${branchAdminModalBranch.name}`}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setBranchAdminModalBranch(null)}
                  className="p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {branchAdminMode !== 'EDIT' && (
                <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 mb-4">
                  <button
                    type="button"
                    onClick={() => setBranchAdminMode('CREATE')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      branchAdminMode === 'CREATE'
                        ? 'bg-white dark:bg-slate-800 text-[#6D28D9] dark:text-purple-300 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    + Create New Branch Admin Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setBranchAdminMode('ASSIGN')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      branchAdminMode === 'ASSIGN'
                        ? 'bg-white dark:bg-slate-800 text-[#6D28D9] dark:text-purple-300 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Assign Existing User / Admin
                  </button>
                </div>
              )}

              <form onSubmit={handleSaveBranchAdmin} className="space-y-4 text-sm min-w-0">
                {branchAdminError && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2 text-xs text-red-700 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                    <span className="font-medium">{branchAdminError}</span>
                  </div>
                )}
                {branchAdminMode === 'ASSIGN' ? (
                  <div className="min-w-0">
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Select User or Admin to Assign to {branchAdminModalBranch.name} *
                    </label>
                    <CustomSelect
                      value={selectedExistingUserId}
                      onChange={setSelectedExistingUserId}
                      accentColor="#6D28D9"
                      placeholder="Choose an account..."
                      className="w-full min-w-0"
                      options={allUsers
                        .filter((u) => u.assignedBranch !== branchAdminModalBranch.name)
                        .map((u) => ({
                          value: String(u.id),
                          label: `${u.name} (${u.email}) — [${u.role}${
                            u.adminLevel ? ` · ${u.adminLevel}` : ''
                          }]`,
                        }))}
                    />
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                      The selected user will be granted <strong>ADMIN (BRANCH_ADMIN)</strong> privileges scoped to{' '}
                      <strong>{branchAdminModalBranch.name}</strong>.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="min-w-0">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={adminForm.name}
                          onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                          placeholder="Siem Reap Branch Admin"
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
                        <input
                          type="email"
                          required
                          disabled={branchAdminMode === 'EDIT'}
                          value={adminForm.email}
                          onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                          placeholder="admin.srp@mundulcare.com"
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:text-slate-500 dark:disabled:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="min-w-0">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                        <input
                          type="text"
                          value={adminForm.phone}
                          onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                          placeholder="+855 63 999 201"
                          className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {branchAdminMode === 'EDIT'
                            ? 'Reset Password (optional)'
                            : 'Initial Login Password *'}
                        </label>
                        <div className="relative">
                          <KeyRound className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="password"
                            required={branchAdminMode === 'CREATE'}
                            minLength={6}
                            value={adminForm.password}
                            onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                            placeholder={
                              branchAdminMode === 'EDIT'
                                ? 'Leave blank to keep current password'
                                : 'Minimum 6 characters'
                            }
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                          />
                        </div>
                      </div>
                    </div>

                    {branchAdminMode === 'EDIT' && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                        <div className="min-w-0">
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Admin Tier</label>
                          <CustomSelect
                            value={adminForm.adminLevel}
                            onChange={(val) =>
                              setAdminForm({
                                ...adminForm,
                                adminLevel: val,
                                assignedBranch:
                                  val === 'SUPER_ADMIN'
                                    ? 'All Branches (Global)'
                                    : adminForm.assignedBranch,
                              })
                            }
                            accentColor="#6D28D9"
                            className="w-full min-w-0"
                            options={[
                              { value: 'BRANCH_ADMIN', label: 'Branch Admin (Scoped to Branch)' },
                              { value: 'CLINICAL_ADMIN', label: 'Clinical Admin' },
                              { value: 'OPERATIONS_ADMIN', label: 'Operations Admin' },
                              { value: 'SUPER_ADMIN', label: 'Super Admin (Global All Branches)' },
                            ]}
                          />
                        </div>
                        <div className="min-w-0">
                          <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned Hospital Branch</label>
                          <CustomSelect
                            value={adminForm.assignedBranch}
                            onChange={(val) => setAdminForm({ ...adminForm, assignedBranch: val })}
                            accentColor="#6D28D9"
                            className="w-full min-w-0"
                            options={[
                              { value: 'All Branches (Global)', label: 'All Branches (Global)' },
                              ...branches.map((br) => ({
                                value: br.name,
                                label: `${br.name} (${br.code})`,
                              })),
                            ]}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Branch System Module Permissions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-bold text-slate-700 dark:text-slate-300">
                      Branch System Module Permissions ({adminForm.perms.length}/{PERMISSION_MODULES.length})
                    </label>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() =>
                          setAdminForm({
                            ...adminForm,
                            perms: DEFAULT_BRANCH_ADMIN_PERMS,
                          })
                        }
                        className="text-[#6D28D9] dark:text-purple-400 font-semibold hover:underline cursor-pointer"
                      >
                        Standard Branch Admin Preset
                      </button>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <button
                        type="button"
                        onClick={() =>
                          setAdminForm({
                            ...adminForm,
                            perms: PERMISSION_MODULES.map((m) => m.key),
                          })
                        }
                        className="text-slate-500 dark:text-slate-400 font-semibold hover:underline cursor-pointer"
                      >
                        All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                    {PERMISSION_MODULES.map((m) => {
                      const checked = adminForm.perms.includes(m.key);
                      return (
                        <button
                          key={m.key}
                          type="button"
                          onClick={() => toggleAdminPerm(m.key)}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            checked
                              ? 'bg-[#f5f3ff]/70 dark:bg-purple-950/40 border-[#ddd6fe] dark:border-purple-800 text-slate-900 dark:text-white'
                              : 'bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          {checked ? (
                            <CheckSquare className="w-4 h-4 text-[#6D28D9] dark:text-purple-400 shrink-0 mt-0.5" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="text-xs font-bold leading-snug">{m.label}</div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
                              {m.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {branchAdminMode === 'EDIT' && editingBranchAdmin && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/90 dark:border-slate-800 space-y-2.5 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Account Access:</span>
                        {editingBranchAdmin.isLocked || !adminForm.isActive ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            Locked / Deactivated
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Active & Authorized
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!editingBranchAdmin) return;
                            await handleToggleLockBranchAdmin(editingBranchAdmin);
                            setAdminForm((prev) => ({
                              ...prev,
                              isActive: !prev.isActive,
                            }));
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            editingBranchAdmin.isLocked || !adminForm.isActive
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-amber-600 hover:bg-amber-700 text-white'
                          }`}
                        >
                          {editingBranchAdmin.isLocked || !adminForm.isActive
                            ? 'Unlock Account'
                            : 'Lock Account'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (editingBranchAdmin) {
                              handleDeleteBranchAdmin(editingBranchAdmin);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Account</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 min-w-0">
                  {branchAdminMode === 'EDIT' ? (
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none min-w-0">
                      <input
                        type="checkbox"
                        checked={adminForm.isActive}
                        onChange={(e) => setAdminForm({ ...adminForm, isActive: e.target.checked })}
                        className="w-4 h-4 accent-[#6D28D9] rounded shrink-0"
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                        Branch Admin Account Active (Allowed to Sign In)
                      </span>
                    </label>
                  ) : (
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      Scoped strictly to <strong className="text-slate-800 dark:text-slate-200">{branchAdminModalBranch.name}</strong>
                    </span>
                  )}

                  <div className="flex items-center justify-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setBranchAdminModalBranch(null)}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={branchAdminSaving}
                      className="px-4 py-2 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white font-bold text-sm shadow-xs disabled:opacity-50 cursor-pointer whitespace-nowrap"
                    >
                      {branchAdminSaving
                        ? 'Saving...'
                        : branchAdminMode === 'CREATE'
                        ? 'Create Branch Admin'
                        : branchAdminMode === 'ASSIGN'
                        ? 'Assign to Branch'
                        : 'Save Branch Admin'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
