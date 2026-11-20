'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Plus,
  Search,
  Edit2,
  Unlock,
  Loader2,
  AlertCircle,
  X,
  Building2,
  Check,
  KeyRound,
  Lock,
  Trash2,
} from 'lucide-react';
import AdminHeader from '@/components/AdminHeader';
import AdminSidebar from '@/components/AdminSidebar';
import CustomSelect from '@/components/CustomSelect';
import Pagination from '@/components/Pagination';
import { adminBranchApi, adminRoleApi } from '@/lib/api';
import {
  AdminUserAccount,
  CreateAdminUserRequest,
  HospitalBranch,
  PERMISSION_MODULES,
  Role,
  UpdateUserPrivilegesRequest,
} from '@/types/auth';
import { useAuth } from '@/context/AuthContext';
import { getImageUrl } from '@/lib/imageUrl';
import { useAdminBranchFilter } from '@/lib/adminBranchFilter';

const ADMIN_TIERS = [
  {
    value: 'SUPER_ADMIN',
    label: 'Super Admin (Executive)',
    defaultPerms: PERMISSION_MODULES.map((m) => m.key),
  },
  {
    value: 'BRANCH_ADMIN',
    label: 'Branch Administrator',
    defaultPerms: [
      'MANAGE_APPOINTMENTS',
      'MANAGE_PATIENTS',
      'MANAGE_DOCTORS',
      'MANAGE_STAFF',
      'MANAGE_DEPARTMENTS',
      'VIEW_AUDIT_LOGS',
    ],
  },
  {
    value: 'CLINICAL_ADMIN',
    label: 'Clinical Director Admin',
    defaultPerms: [
      'MANAGE_APPOINTMENTS',
      'MANAGE_PATIENTS',
      'MANAGE_DOCTORS',
      'MANAGE_STAFF',
      'MANAGE_DEPARTMENTS',
    ],
  },
  {
    value: 'OPERATIONS_ADMIN',
    label: 'Operations & Front-Desk Admin',
    defaultPerms: ['MANAGE_APPOINTMENTS', 'MANAGE_PATIENTS', 'MANAGE_STAFF'],
  },
];

export default function AdminRolesPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'ACCOUNTS' | 'MATRIX'>('ACCOUNTS');
  const [accounts, setAccounts] = useState<AdminUserAccount[]>([]);
  const [branches, setBranches] = useState<HospitalBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<
    'ALL' | Role | 'BRANCH_ADMIN' | 'SUPER_ADMIN'
  >('ALL');
  const [branchFilter, setBranchFilter, scopeInfo] = useAdminBranchFilter();
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Edit Privileges Modal
  const [editingAccount, setEditingAccount] = useState<AdminUserAccount | null>(null);
  const [editForm, setEditForm] = useState<UpdateUserPrivilegesRequest>({
    name: '',
    phone: '',
    password: '',
    role: 'ADMIN',
    adminLevel: 'SUPER_ADMIN',
    assignedBranch: 'All Branches (Global)',
    permissions: '',
    isActive: true,
  });
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Create Admin / User Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateAdminUserRequest>({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'ADMIN',
    adminLevel: 'BRANCH_ADMIN',
    assignedBranch: 'MundulCare Main Campus (Phnom Penh)',
    permissions: '',
  });
  const [createPerms, setCreatePerms] = useState<string[]>(ADMIN_TIERS[1].defaultPerms);

  // Delete User Modal
  const [deleteTarget, setDeleteTarget] = useState<AdminUserAccount | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setError(null);
      const [accRes, branchRes] = await Promise.all([
        adminRoleApi.getAllUsers(),
        adminBranchApi.getAll().catch(() => ({ success: false, data: [] as HospitalBranch[] })),
      ]);
      if (accRes.success && accRes.data) setAccounts(accRes.data);
      if (branchRes.success && branchRes.data) setBranches(branchRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load system accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== 'ADMIN') {
        router.push('/login?redirect=/admin/roles');
      } else if (scopeInfo.isBranchLocked || (user?.adminLevel && user?.adminLevel !== 'SUPER_ADMIN')) {
        router.replace('/admin');
      } else {
        fetchData();
      }
    }
  }, [isAuthenticated, user, authLoading, scopeInfo.isBranchLocked]);

  const openEditPrivileges = (acc: AdminUserAccount) => {
    setEditingAccount(acc);
    const perms = acc.permissions
      ? acc.permissions
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : PERMISSION_MODULES.map((m) => m.key);
    setSelectedPerms(perms);
    setEditForm({
      name: acc.name,
      phone: acc.phone || '',
      password: '',
      role: acc.role,
      adminLevel: acc.adminLevel || 'SUPER_ADMIN',
      assignedBranch: acc.assignedBranch || 'All Branches (Global)',
      permissions: perms.join(','),
      isActive: acc.isActive,
    });
  };

  const toggleEditPerm = (key: string) => {
    setSelectedPerms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleCreatePerm = (key: string) => {
    setCreatePerms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSavePrivileges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    setSaving(true);
    try {
      await adminRoleApi.updatePrivileges(editingAccount.id, {
        ...editForm,
        password: editForm.password?.trim() ? editForm.password.trim() : undefined,
        permissions: selectedPerms.join(','),
      });
      setEditingAccount(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update privileges');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminRoleApi.createUser({
        ...createForm,
        permissions: createPerms.join(','),
      });
      setIsCreateOpen(false);
      setCreateForm({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'ADMIN',
        adminLevel: 'BRANCH_ADMIN',
        assignedBranch: branches[0]?.name || 'MundulCare Main Campus (Phnom Penh)',
        permissions: '',
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create user account');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlock = async (acc: AdminUserAccount) => {
    try {
      await adminRoleApi.unlockUser(acc.id);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to unlock account');
    }
  };

  const handleLock = async (acc: AdminUserAccount) => {
    if (confirm(`Are you sure you want to lock the account for "${acc.name}" (${acc.email})? This user will be blocked from logging into MundulCare.`)) {
      try {
        await adminRoleApi.lockUser(acc.id);
        fetchData();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to lock account');
      }
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await adminRoleApi.deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
      if (res.message) {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete user account');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = accounts.filter((acc) => {
    if (roleFilter === 'BRANCH_ADMIN') {
      if (
        acc.role !== 'ADMIN' ||
        (acc.adminLevel !== 'BRANCH_ADMIN' &&
          (!acc.assignedBranch || acc.assignedBranch === 'All Branches (Global)'))
      ) {
        return false;
      }
    } else if (roleFilter === 'SUPER_ADMIN') {
      if (
        acc.role !== 'ADMIN' ||
        (acc.adminLevel !== 'SUPER_ADMIN' && acc.assignedBranch !== 'All Branches (Global)')
      ) {
        return false;
      }
    } else if (roleFilter !== 'ALL' && acc.role !== roleFilter) {
      return false;
    }
    if (branchFilter !== 'ALL' && acc.assignedBranch !== branchFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        acc.name.toLowerCase().includes(q) ||
        acc.email.toLowerCase().includes(q) ||
        (acc.adminLevel || '').toLowerCase().includes(q) ||
        (acc.assignedBranch || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

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
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Role, Branch & Permission Management
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Assign administrative tiers, scope administrators to specific hospital branches, and configure granular module permissions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white font-bold text-sm shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Admin / User</span>
            </button>
          </div>

          {/* Accessible Tabs (per modern-web-guidance: border indicator via ::after, not color alone) */}
          <div
            role="tablist"
            aria-label="Role and permission sections"
            className="flex border-b border-slate-200 dark:border-slate-800 mb-6 gap-2"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'ACCOUNTS'}
              onClick={() => setActiveTab('ACCOUNTS')}
              className={`relative px-4 py-2.5 text-sm font-bold transition-colors cursor-pointer ${
                activeTab === 'ACCOUNTS'
                  ? 'text-[#6D28D9] dark:text-purple-400 after:content-[""] after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-[#6D28D9] dark:after:bg-purple-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              System Accounts & Privileges ({accounts.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'MATRIX'}
              onClick={() => setActiveTab('MATRIX')}
              className={`relative px-4 py-2.5 text-sm font-bold transition-colors cursor-pointer ${
                activeTab === 'MATRIX'
                  ? 'text-[#6D28D9] dark:text-purple-400 after:content-[""] after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-[#6D28D9] dark:after:bg-purple-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Administrative Role & Permission Matrix
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-sm text-red-700 dark:text-red-400 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'ACCOUNTS' ? (
            <>
              {/* Search & Role/Branch Filter Bar */}
              <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 mb-6 flex flex-col lg:flex-row items-stretch lg:items-center gap-3 shadow-2xs">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search user name, email, admin tier, or assigned branch..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <CustomSelect
                    value={roleFilter}
                    onChange={(val) => {
                      setRoleFilter(val as 'ALL' | Role | 'BRANCH_ADMIN' | 'SUPER_ADMIN');
                      setPage(1);
                    }}
                    accentColor="#6D28D9"
                    className="w-60"
                    options={[
                      { value: 'ALL', label: `All Roles (${accounts.length})` },
                      {
                        value: 'ADMIN',
                        label: `All Administrators (${accounts.filter((a) => a.role === 'ADMIN').length})`,
                      },
                      {
                        value: 'BRANCH_ADMIN',
                        label: `Branch Admins (${
                          accounts.filter(
                            (a) =>
                              a.role === 'ADMIN' &&
                              (a.adminLevel === 'BRANCH_ADMIN' ||
                                (a.assignedBranch && a.assignedBranch !== 'All Branches (Global)'))
                          ).length
                        })`,
                      },
                      {
                        value: 'SUPER_ADMIN',
                        label: `Global Super Admins (${
                          accounts.filter(
                            (a) =>
                              a.role === 'ADMIN' &&
                              (a.adminLevel === 'SUPER_ADMIN' ||
                                a.assignedBranch === 'All Branches (Global)')
                          ).length
                        })`,
                      },
                      {
                        value: 'DOCTOR',
                        label: `Doctors (${accounts.filter((a) => a.role === 'DOCTOR').length})`,
                      },
                      {
                        value: 'PATIENT',
                        label: `Patients (${accounts.filter((a) => a.role === 'PATIENT').length})`,
                      },
                    ]}
                  />

                  <CustomSelect
                    value={branchFilter}
                    onChange={(val) => {
                      setBranchFilter(val);
                      setPage(1);
                    }}
                    accentColor="#6D28D9"
                    className="w-56"
                    icon={<Building2 className="w-4 h-4 text-[#6D28D9] shrink-0" />}
                    options={[
                      { value: 'ALL', label: 'All Branch Scopes' },
                      { value: 'All Branches (Global)', label: 'All Branches (Global)' },
                      ...branches.map((b) => ({ value: b.name, label: `${b.city} (${b.code})` })),
                    ]}
                  />
                </div>
              </div>

              {/* Accounts Table */}
              <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                <div
                  role="region"
                  aria-label="System accounts and privileges table"
                  tabIndex={0}
                  className="overflow-x-auto focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20"
                >
                  <table className="w-full text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-5 py-3.5">Account</th>
                        <th className="px-5 py-3.5">System Role & Tier</th>
                        <th className="px-5 py-3.5">Assigned Branch Scope</th>
                        <th className="px-5 py-3.5">Granted Privileges</th>
                        <th className="px-5 py-3.5">Security</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-slate-700 dark:text-slate-300">
                      {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((acc) => {
                        const permCount = acc.permissions
                          ? acc.permissions.split(',').filter(Boolean).length
                          : 0;

                        return (
                          <tr key={acc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#f5f3ff] dark:bg-purple-950/50 border border-[#ddd6fe] dark:border-purple-800 text-[#6D28D9] dark:text-purple-300 font-bold text-xs flex items-center justify-center overflow-hidden shrink-0">
                                  {acc.profileImage ? (
                                    <img
                                      src={getImageUrl(acc.profileImage)}
                                      alt={acc.name}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    acc.name.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-white">{acc.name}</div>
                                  <div className="text-xs text-slate-400 dark:text-slate-500">{acc.email}</div>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <div className="flex flex-col items-start gap-1">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                    acc.role === 'ADMIN'
                                      ? 'bg-[#f5f3ff] dark:bg-purple-950/50 text-[#6D28D9] dark:text-purple-300 border-[#ddd6fe] dark:border-purple-800'
                                      : acc.role === 'DOCTOR'
                                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                  }`}
                                >
                                  {acc.role}
                                </span>
                                {acc.role === 'ADMIN' && acc.adminLevel && (
                                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                    Tier: {acc.adminLevel}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                <Building2 className="w-3.5 h-3.5 text-[#6D28D9] dark:text-purple-400" />
                                <span>{acc.assignedBranch}</span>
                              </span>
                            </td>

                            <td className="px-5 py-3.5">
                              {acc.role === 'ADMIN' ? (
                                <div className="flex flex-wrap items-center gap-1 max-w-xs">
                                  <span className="px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/50 text-[#6D28D9] dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold">
                                    {permCount} / {PERMISSION_MODULES.length} Modules
                                  </span>
                                </div>
                              ) : acc.role === 'DOCTOR' ? (
                                <span className="text-xs text-slate-500 dark:text-slate-400">Doctor Portal Access</span>
                              ) : (
                                <span className="text-xs text-slate-400 dark:text-slate-500">Patient Booking Access</span>
                              )}
                            </td>

                            <td className="px-5 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {acc.isLocked ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                    <Lock className="w-3 h-3" /> Locked
                                  </span>
                                ) : acc.isActive ? (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                    Disabled
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="px-5 py-3.5 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                {(acc.isLocked || !acc.isVerified) ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUnlock(acc)}
                                    className="p-2 rounded-xl text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                                    title="Unlock & Verify Account"
                                  >
                                    <Unlock className="w-4 h-4" />
                                  </button>
                                ) : acc.id !== user?.userId ? (
                                  <button
                                    type="button"
                                    onClick={() => handleLock(acc)}
                                    className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                                    title="Lock Account (Prevent Sign In)"
                                  >
                                    <Lock className="w-4 h-4" />
                                  </button>
                                ) : null}

                                <button
                                  type="button"
                                  onClick={() => openEditPrivileges(acc)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f5f3ff] dark:bg-purple-950/50 hover:bg-[#ede9fe] dark:hover:bg-purple-900/50 text-[#6D28D9] dark:text-purple-300 border border-[#ddd6fe] dark:border-purple-800 font-bold text-xs transition-colors cursor-pointer"
                                  title="Edit Role, Privileges & Branch Scope"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                  <span>Privileges</span>
                                </button>

                                {acc.id !== user?.userId && (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget(acc)}
                                    className="p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-rose-400 hover:bg-red-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                    title="Delete or Remove User Account"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
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
            </>
          ) : (
            /* Tab 2: Role & Permission Matrix */
            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-slate-800">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Hospital Administrative Privilege & Branch Governance Matrix
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Standard default privilege presets across administrative tiers and system roles. Individual admins can also be customized per module.
                </p>
              </div>

              <div
                role="region"
                aria-label="Role and permission matrix table"
                tabIndex={0}
                className="overflow-x-auto focus:outline-none"
              >
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/95 dark:bg-slate-900/95 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5">Hospital Module / Capability</th>
                      <th className="px-4 py-3.5 text-center">Super Admin</th>
                      <th className="px-4 py-3.5 text-center">Branch Admin</th>
                      <th className="px-4 py-3.5 text-center">Clinical Admin</th>
                      <th className="px-4 py-3.5 text-center">Operations Admin</th>
                      <th className="px-4 py-3.5 text-center">Doctor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-slate-700 dark:text-slate-300">
                    {PERMISSION_MODULES.map((mod) => (
                      <tr key={mod.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-900 dark:text-white">{mod.label}</div>
                          <div className="text-xs text-slate-400 dark:text-slate-500">{mod.desc}</div>
                        </td>
                        {ADMIN_TIERS.map((tier) => {
                          const has = tier.defaultPerms.includes(mod.key);
                          return (
                            <td key={tier.value} className="px-4 py-3.5 text-center">
                              {has ? (
                                <span className="inline-flex w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 items-center justify-center">
                                  <Check className="w-4 h-4" />
                                </span>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600">—</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3.5 text-center">
                          {['MANAGE_APPOINTMENTS', 'MANAGE_PATIENTS'].includes(mod.key) ? (
                            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                              Own Roster
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>

        {/* Edit Account Privileges Modal */}
        {editingAccount && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-2xl w-full p-6 my-8 animate-in fade-in-50 zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Configure Role, Branch Scope & Privileges
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {editingAccount.name} ({editingAccount.email})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePrivileges} className="space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="+855 12 800 900"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Reset Password (Optional)</label>
                    <input
                      type="password"
                      minLength={6}
                      value={editForm.password || ''}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      placeholder="Leave blank to keep current"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">System Role *</label>
                    <select
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D28D9]"
                    >
                      <option value="ADMIN" className="dark:bg-slate-900 dark:text-white">ADMIN (Hospital Portal)</option>
                      <option value="DOCTOR" className="dark:bg-slate-900 dark:text-white">DOCTOR (Clinical Portal)</option>
                      <option value="PATIENT" className="dark:bg-slate-900 dark:text-white">PATIENT (Public Portal)</option>
                    </select>
                  </div>

                  {editForm.role === 'ADMIN' && (
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Administrative Tier</label>
                      <select
                        value={editForm.adminLevel || 'SUPER_ADMIN'}
                        onChange={(e) => {
                          const tierVal = e.target.value;
                          const preset = ADMIN_TIERS.find((t) => t.value === tierVal);
                          setEditForm({
                            ...editForm,
                            adminLevel: tierVal,
                            assignedBranch:
                              tierVal === 'SUPER_ADMIN'
                                ? 'All Branches (Global)'
                                : editForm.assignedBranch === 'All Branches (Global)'
                                ? branches[0]?.name || 'MundulCare Main Campus (Phnom Penh)'
                                : editForm.assignedBranch,
                          });
                          if (preset) setSelectedPerms(preset.defaultPerms);
                        }}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D28D9]"
                      >
                        {ADMIN_TIERS.map((t) => (
                          <option key={t.value} value={t.value} className="dark:bg-slate-900 dark:text-white">
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned Branch Scope</label>
                    <select
                      value={editForm.assignedBranch || 'All Branches (Global)'}
                      onChange={(e) => setEditForm({ ...editForm, assignedBranch: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D28D9]"
                    >
                      <option value="All Branches (Global)" className="dark:bg-slate-900 dark:text-white">All Branches (Global)</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.name} className="dark:bg-slate-900 dark:text-white">
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {editForm.role === 'ADMIN' && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#6D28D9] dark:text-purple-400">
                        Granular Administrative Module Permissions
                      </span>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setSelectedPerms(PERMISSION_MODULES.map((m) => m.key))}
                          className="text-[#6D28D9] dark:text-purple-400 font-bold hover:underline cursor-pointer"
                        >
                          Grant All
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedPerms([])}
                          className="text-slate-500 dark:text-slate-400 font-semibold hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto p-1">
                      {PERMISSION_MODULES.map((mod) => {
                        const checked = selectedPerms.includes(mod.key);
                        return (
                          <label
                            key={mod.key}
                            className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                              checked
                                ? 'bg-[#f5f3ff]/60 dark:bg-purple-950/40 border-[#ddd6fe] dark:border-purple-800'
                                : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleEditPerm(mod.key)}
                              className="w-4 h-4 accent-[#6D28D9] rounded mt-0.5"
                            />
                            <div>
                              <div className="text-xs font-bold text-slate-900 dark:text-white">{mod.label}</div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{mod.desc}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.isActive ?? true}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                      className="w-4 h-4 accent-[#6D28D9] rounded"
                    />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Account Enabled</span>
                  </label>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingAccount(null)}
                      className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white font-bold text-sm shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? 'Saving...' : 'Save Privileges'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create New Admin / User Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-2xl w-full p-6 my-8 animate-in fade-in-50 zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Provision New Administrator or System Account
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      placeholder="e.g. Vannak Chea"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      placeholder="admin.srp@mundulcare.com"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Initial Password *</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      placeholder="Minimum 8 characters"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={createForm.phone || ''}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      placeholder="+855 12 800 900"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Role *</label>
                    <select
                      value={createForm.role}
                      onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as Role })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D28D9]"
                    >
                      <option value="ADMIN" className="dark:bg-slate-900 dark:text-white">ADMIN</option>
                      <option value="DOCTOR" className="dark:bg-slate-900 dark:text-white">DOCTOR</option>
                      <option value="PATIENT" className="dark:bg-slate-900 dark:text-white">PATIENT</option>
                    </select>
                  </div>

                  {createForm.role === 'ADMIN' && (
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Admin Tier</label>
                      <select
                        value={createForm.adminLevel || 'BRANCH_ADMIN'}
                        onChange={(e) => {
                          const tierVal = e.target.value;
                          const preset = ADMIN_TIERS.find((t) => t.value === tierVal);
                          setCreateForm({ ...createForm, adminLevel: tierVal });
                          if (preset) setCreatePerms(preset.defaultPerms);
                        }}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D28D9]"
                      >
                        {ADMIN_TIERS.map((t) => (
                          <option key={t.value} value={t.value} className="dark:bg-slate-900 dark:text-white">
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Assigned Branch</label>
                    <select
                      value={createForm.assignedBranch || 'All Branches (Global)'}
                      onChange={(e) => setCreateForm({ ...createForm, assignedBranch: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-[#6D28D9]"
                    >
                      <option value="All Branches (Global)" className="dark:bg-slate-900 dark:text-white">All Branches (Global)</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.name} className="dark:bg-slate-900 dark:text-white">
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {createForm.role === 'ADMIN' && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-[#6D28D9] dark:text-purple-400 mb-2">
                      Assigned Module Permissions
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto">
                      {PERMISSION_MODULES.map((mod) => {
                        const checked = createPerms.includes(mod.key);
                        return (
                          <label
                            key={mod.key}
                            className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-semibold ${
                              checked
                                ? 'bg-[#f5f3ff]/60 dark:bg-purple-950/40 border-[#ddd6fe] dark:border-purple-800 text-[#6D28D9] dark:text-purple-300'
                                : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCreatePerm(mod.key)}
                              className="w-4 h-4 accent-[#6D28D9] rounded"
                            />
                            <span>{mod.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsCreateOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white font-bold text-sm shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Delete / Remove Account Confirmation Modal */}
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
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-rose-950/40 flex items-center justify-center text-red-600 dark:text-rose-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete User Account</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Global Admin Governance</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-400 mb-5">
                Are you sure you want to delete the account for{' '}
                <strong className="text-slate-900 dark:text-white">{deleteTarget.name}</strong> ({deleteTarget.email})?
                {deleteTarget.role === 'ADMIN' && (
                  <span className="block mt-2 text-xs text-red-600 dark:text-rose-400 font-semibold">
                    Warning: This will revoke all administrative privileges for this {deleteTarget.adminLevel || 'ADMIN'} account.
                  </span>
                )}
              </p>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-sm cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Confirm Delete</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
