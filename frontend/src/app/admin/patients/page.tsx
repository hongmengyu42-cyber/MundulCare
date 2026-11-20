'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  Building2,
  HeartPulse,
  Phone,
  CalendarCheck,
  ShieldAlert,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import AdminHeader from '@/components/AdminHeader';
import AdminSidebar from '@/components/AdminSidebar';
import CustomSelect from '@/components/CustomSelect';
import Pagination from '@/components/Pagination';
import { adminBranchApi, adminPatientApi } from '@/lib/api';
import { AdminPatient, AdminPatientRequest, HospitalBranch } from '@/types/auth';
import { useAuth } from '@/context/AuthContext';
import { getImageUrl } from '@/lib/imageUrl';
import { DEFAULT_MAIN_BRANCH, useAdminBranchFilter } from '@/lib/adminBranchFilter';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function AdminPatientsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [branches, setBranches] = useState<HospitalBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter, scopeInfo] = useAdminBranchFilter();
  const [bloodFilter, setBloodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<AdminPatient | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<AdminPatientRequest>({
    name: '',
    email: '',
    phone: '',
    password: '',
    isActive: true,
    assignedBranch: 'MundulCare Main Campus (Phnom Penh)',
    gender: null,
    dateOfBirth: null,
    bloodType: '',
    allergies: '',
    chronicConditions: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });

  // Delete / Deactivate Confirmation
  const [deleteTarget, setDeleteTarget] = useState<AdminPatient | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setError(null);
      const [patRes, branchRes] = await Promise.all([
        adminPatientApi.getAll(),
        adminBranchApi.getAll().catch(() => ({ success: false, data: [] as HospitalBranch[] })),
      ]);
      if (patRes.success && patRes.data) setPatients(patRes.data);
      if (branchRes.success && branchRes.data) setBranches(branchRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load patient records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== 'ADMIN') {
        router.push('/login?redirect=/admin/patients');
      } else {
        fetchData();
      }
    }
  }, [isAuthenticated, user, authLoading]);

  const openCreateModal = () => {
    setEditingPatient(null);
    setForm({
      name: '',
      email: '',
      phone: '',
      password: '',
      isActive: true,
      assignedBranch:
        scopeInfo.isBranchLocked && scopeInfo.lockedBranch
          ? scopeInfo.lockedBranch
          : branches[0]?.name || 'MundulCare Main Campus (Phnom Penh)',
      gender: null,
      dateOfBirth: null,
      bloodType: '',
      allergies: '',
      chronicConditions: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p: AdminPatient) => {
    setEditingPatient(p);
    setForm({
      name: p.name,
      email: p.email,
      phone: p.phone || '',
      password: '',
      isActive: p.isActive,
      assignedBranch: p.assignedBranch || 'MundulCare Main Campus (Phnom Penh)',
      gender: p.gender || null,
      dateOfBirth: p.dateOfBirth || null,
      bloodType: p.bloodType || '',
      allergies: p.allergies || '',
      chronicConditions: p.chronicConditions || '',
      emergencyContactName: p.emergencyContactName || '',
      emergencyContactPhone: p.emergencyContactPhone || '',
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: AdminPatientRequest = {
        ...form,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone?.trim() || undefined,
        password: form.password?.trim() || undefined,
        gender: form.gender || null,
        dateOfBirth: form.dateOfBirth || null,
        bloodType: form.bloodType || undefined,
        allergies: form.allergies?.trim() || undefined,
        chronicConditions: form.chronicConditions?.trim() || undefined,
        emergencyContactName: form.emergencyContactName?.trim() || undefined,
        emergencyContactPhone: form.emergencyContactPhone?.trim() || undefined,
      };

      if (editingPatient) {
        await adminPatientApi.update(editingPatient.id, payload);
      } else {
        await adminPatientApi.create(payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save patient record');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminPatientApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove patient');
    } finally {
      setDeleting(false);
    }
  };

  const branchScopedPatients =
    branchFilter === 'ALL'
      ? patients
      : patients.filter((p) => (p.assignedBranch || DEFAULT_MAIN_BRANCH) === branchFilter);

  const filtered = branchScopedPatients.filter((p) => {
    if (bloodFilter !== 'ALL' && (p.bloodType || '') !== bloodFilter) {
      return false;
    }
    if (statusFilter === 'ACTIVE' && !p.isActive) return false;
    if (statusFilter === 'INACTIVE' && p.isActive) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q) ||
        (p.allergies || '').toLowerCase().includes(q) ||
        (p.chronicConditions || '').toLowerCase().includes(q)
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
                Patient Registry & Clinical Profiles
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Manage patient accounts, primary hospital branches, blood types, allergies, emergency contacts, and booking history.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white font-bold text-sm shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register Patient</span>
            </button>
          </div>

          {/* KPI Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {branchFilter === 'ALL' ? 'Total Patients' : 'Branch Patients'}
                </span>
                <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5 font-tabular">
                  {branchScopedPatients.length}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#6D28D9] dark:text-purple-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Active Accounts</span>
                <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 font-tabular">
                  {branchScopedPatients.filter((p) => p.isActive).length}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">With Allergy Alerts</span>
                <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-0.5 font-tabular">
                  {branchScopedPatients.filter((p) => p.allergies && p.allergies.trim().length > 0).length}
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <HeartPulse className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Search & Filters */}
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
                placeholder="Search by patient name, email, phone, or medical condition..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {scopeInfo.isBranchLocked ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#f5f3ff] dark:bg-purple-950/40 border border-[#ddd6fe] dark:border-purple-800/60 text-xs font-bold text-[#6D28D9] dark:text-purple-300">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>{scopeInfo.lockedBranch}</span>
                </div>
              ) : (
                <CustomSelect
                  value={branchFilter}
                  onChange={(val) => {
                    setBranchFilter(val);
                    setPage(1);
                  }}
                  accentColor="#6D28D9"
                  className="w-52"
                  icon={<Building2 className="w-4 h-4 text-[#6D28D9] dark:text-purple-400 shrink-0" />}
                  options={[
                    { value: 'ALL', label: 'All Branches' },
                    ...branches.map((b) => ({ value: b.name, label: `${b.city} (${b.code})` })),
                  ]}
                />
              )}

              <CustomSelect
                value={bloodFilter}
                onChange={(val) => {
                  setBloodFilter(val);
                  setPage(1);
                }}
                accentColor="#6D28D9"
                className="w-40"
                options={[
                  { value: 'ALL', label: 'All Blood Types' },
                  ...BLOOD_TYPES.map((bt) => ({ value: bt, label: `Blood ${bt}` })),
                ]}
              />

              <CustomSelect
                value={statusFilter}
                onChange={(val) => {
                  setStatusFilter(val);
                  setPage(1);
                }}
                accentColor="#6D28D9"
                className="w-38"
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'ACTIVE', label: 'Active Only' },
                  { value: 'INACTIVE', label: 'Inactive Only' },
                ]}
              />
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-sm text-red-700 dark:text-red-300 flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Patients Table */}
          <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
            <div
              role="region"
              aria-label="Registered patients table"
              tabIndex={0}
              className="overflow-x-auto focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20"
            >
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Patient</th>
                    <th className="px-5 py-3.5">Primary Branch</th>
                    <th className="px-5 py-3.5">Clinical Info</th>
                    <th className="px-5 py-3.5">Emergency Contact</th>
                    <th className="px-5 py-3.5">Visits</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70 text-slate-700 dark:text-slate-300">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-slate-400 dark:text-slate-500">
                        No patients match your current filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#f5f3ff] dark:bg-purple-950/50 border border-[#ddd6fe] dark:border-purple-800 text-[#6D28D9] dark:text-purple-300 font-bold text-xs flex items-center justify-center overflow-hidden shrink-0">
                              {p.profileImage ? (
                                <img
                                  src={getImageUrl(p.profileImage)}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                p.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                              <div className="text-xs text-slate-400 dark:text-slate-500">{p.email}</div>
                              {p.phone && (
                                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3" /> {p.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                            <Building2 className="w-3.5 h-3.5 text-[#6D28D9] dark:text-purple-400" />
                            <span>{p.assignedBranch || 'MundulCare Main Campus (Phnom Penh)'}</span>
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {p.bloodType ? (
                              <span className="px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 text-xs font-bold">
                                Blood: {p.bloodType}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400 dark:text-slate-500">No blood type</span>
                            )}
                            {p.gender && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">
                                {p.gender}
                              </span>
                            )}
                          </div>
                          {p.allergies && (
                            <div className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-1 max-w-xs truncate" title={p.allergies}>
                              Allergies: {p.allergies}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap text-xs">
                          {p.emergencyContactName ? (
                            <div>
                              <div className="font-semibold text-slate-800 dark:text-slate-200">{p.emergencyContactName}</div>
                              <div className="text-slate-400 dark:text-slate-500">{p.emergencyContactPhone || '—'}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">Not set</span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-800 dark:text-slate-200 font-tabular">
                            <CalendarCheck className="w-3.5 h-3.5 text-[#6D28D9] dark:text-purple-400" />
                            {p.appointmentCount}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {p.isActive ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                              Inactive
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(p)}
                              className="p-2 rounded-xl text-[#6D28D9] dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors cursor-pointer"
                              title="Edit Patient & Medical Profile"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(p)}
                              className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Deactivate or Remove Patient"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
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

        {/* Create / Edit Patient Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-2xl w-full p-6 my-8 animate-in fade-in-50 zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingPatient ? 'Edit Patient & Clinical Record' : 'Register New Patient'}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Update personal contact info, primary hospital branch, and medical profile
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4 text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Sokha Vann"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      disabled={!!editingPatient}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="patient@example.com"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white bg-white dark:bg-slate-900 disabled:bg-slate-100 dark:disabled:bg-slate-800/60 disabled:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={form.phone || ''}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="+855 12 345 678"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Primary Hospital Branch</label>
                    {scopeInfo.isBranchLocked ? (
                      <div className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold text-sm flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-[#6D28D9] dark:text-purple-400" />
                        <span>{form.assignedBranch || scopeInfo.lockedBranch}</span>
                      </div>
                    ) : (
                      <select
                        value={form.assignedBranch || 'MundulCare Main Campus (Phnom Penh)'}
                        onChange={(e) => setForm({ ...form, assignedBranch: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:border-[#6D28D9]"
                      >
                        {branches.length > 0 ? (
                          branches.map((b) => (
                            <option key={b.id} value={b.name} className="dark:bg-slate-900">
                              {b.name}
                            </option>
                          ))
                        ) : (
                          <option value="MundulCare Main Campus (Phnom Penh)" className="dark:bg-slate-900">
                            MundulCare Main Campus (Phnom Penh)
                          </option>
                        )}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {editingPatient ? 'Reset Password (Optional)' : 'Initial Password'}
                    </label>
                    <input
                      type="password"
                      value={form.password || ''}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder={editingPatient ? 'Leave blank to keep' : 'Default: Patient@123'}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-[#6D28D9] dark:text-purple-400 mb-3">
                    Clinical & Emergency Profile
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Gender</label>
                      <select
                        value={form.gender || ''}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            gender: (e.target.value as 'MALE' | 'FEMALE' | 'OTHER') || null,
                          })
                        }
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:border-[#6D28D9]"
                      >
                        <option value="" className="dark:bg-slate-900">Not specified</option>
                        <option value="MALE" className="dark:bg-slate-900">Male</option>
                        <option value="FEMALE" className="dark:bg-slate-900">Female</option>
                        <option value="OTHER" className="dark:bg-slate-900">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={form.dateOfBirth || ''}
                        onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value || null })}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:border-[#6D28D9]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Blood Type</label>
                      <select
                        value={form.bloodType || ''}
                        onChange={(e) => setForm({ ...form, bloodType: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:border-[#6D28D9]"
                      >
                        <option value="" className="dark:bg-slate-900">Unknown</option>
                        {BLOOD_TYPES.map((bt) => (
                          <option key={bt} value={bt} className="dark:bg-slate-900">
                            {bt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Known Allergies</label>
                    <input
                      type="text"
                      value={form.allergies || ''}
                      onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                      placeholder="e.g. Penicillin, Peanuts, NSAIDs"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Chronic Conditions</label>
                    <input
                      type="text"
                      value={form.chronicConditions || ''}
                      onChange={(e) => setForm({ ...form, chronicConditions: e.target.value })}
                      placeholder="e.g. Hypertension, Type 2 Diabetes"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Emergency Contact Name</label>
                    <input
                      type="text"
                      value={form.emergencyContactName || ''}
                      onChange={(e) => setForm({ ...form, emergencyContactName: e.target.value })}
                      placeholder="e.g. Chanthy Vann (Spouse)"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Emergency Contact Phone</label>
                    <input
                      type="text"
                      value={form.emergencyContactPhone || ''}
                      onChange={(e) => setForm({ ...form, emergencyContactPhone: e.target.value })}
                      placeholder="+855 12 999 888"
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus:outline-none focus:border-[#6D28D9]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive ?? true}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      className="w-4 h-4 accent-[#6D28D9] rounded"
                    />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Patient Account Active</span>
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
                      {saving ? 'Saving...' : editingPatient ? 'Save Changes' : 'Register Patient'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete / Deactivate Confirmation Modal */}
        {deleteTarget && (
          <div
            onClick={() => setDeleteTarget(null)}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-sm w-full p-6 animate-in fade-in-50 zoom-in-95"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Remove Patient Record?</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
                {deleteTarget.appointmentCount > 0 ? (
                  <>
                    <strong className="text-slate-900 dark:text-white">{deleteTarget.name}</strong> has{' '}
                    <strong>{deleteTarget.appointmentCount}</strong> existing appointment(s) and will be safely{' '}
                    <strong>deactivated</strong> to preserve clinical audit history.
                  </>
                ) : (
                  <>
                    This will permanently delete <strong className="text-slate-900 dark:text-white">{deleteTarget.name}</strong> from the patient registry.
                  </>
                )}
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
                  {deleting ? 'Processing...' : deleteTarget.appointmentCount > 0 ? 'Deactivate Patient' : 'Delete Patient'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
