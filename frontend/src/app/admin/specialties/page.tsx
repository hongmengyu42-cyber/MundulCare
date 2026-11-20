'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  Stethoscope,
  Heart,
  Brain,
  Baby,
  Smile,
  Eye,
  Activity,
  Building2,
  MapPin,
  UserCheck,
  Search,
  Lock,
} from 'lucide-react';
import AdminHeader from '@/components/AdminHeader';
import AdminSidebar from '@/components/AdminSidebar';
import CustomSelect from '@/components/CustomSelect';
import { adminBranchApi, specialtyApi } from '@/lib/api';
import { Specialty, SpecialtyRequest } from '@/types/doctor';
import { HospitalBranch } from '@/types/auth';
import { useAuth } from '@/context/AuthContext';
import { useAdminBranchFilter } from '@/lib/adminBranchFilter';

function getDepartmentIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('cardio') || lower.includes('heart')) return Heart;
  if (lower.includes('neuro') || lower.includes('brain')) return Brain;
  if (lower.includes('pediatric') || lower.includes('child') || lower.includes('baby')) return Baby;
  if (lower.includes('dental') || lower.includes('tooth')) return Smile;
  if (lower.includes('eye') || lower.includes('ophthalm')) return Eye;
  if (lower.includes('ortho') || lower.includes('bone')) return Activity;
  return Stethoscope;
}

export default function AdminSpecialtiesPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [branches, setBranches] = useState<HospitalBranch[]>([]);
  const [branchFilter, setBranchFilter, scopeInfo] = useAdminBranchFilter();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [branchName, setBranchName] = useState('MundulCare Main Campus (Phnom Penh)');
  const [floorLocation, setFloorLocation] = useState('');
  const [headOfDepartment, setHeadOfDepartment] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [specRes, branchRes] = await Promise.all([
        specialtyApi.getAll(),
        adminBranchApi.getAll().catch(() => ({ success: false, data: [] as HospitalBranch[] })),
      ]);
      if (specRes.success && specRes.data) setSpecialties(specRes.data);
      if (branchRes.success && branchRes.data) setBranches(branchRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== 'ADMIN') {
        router.push('/login?redirect=/admin/specialties');
      } else {
        fetchData();
      }
    }
  }, [isAuthenticated, user, authLoading]);

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setBranchName(
      scopeInfo.isBranchLocked && scopeInfo.lockedBranch
        ? scopeInfo.lockedBranch
        : branches[0]?.name || 'MundulCare Main Campus (Phnom Penh)'
    );
    setFloorLocation('Building A · 1st Floor, Outpatient Wing');
    setHeadOfDepartment('');
    setIsModalOpen(true);
  };

  const openEditModal = (spec: Specialty) => {
    setEditingId(spec.id);
    setName(spec.name);
    setDescription(spec.description || '');
    setBranchName(spec.branchName || 'MundulCare Main Campus (Phnom Penh)');
    setFloorLocation(spec.floorLocation || 'Building A · 1st Floor, Outpatient Wing');
    setHeadOfDepartment(spec.headOfDepartment || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: SpecialtyRequest = {
      name: name.trim(),
      description: description.trim() || undefined,
      branchName: branchName.trim() || 'MundulCare Main Campus (Phnom Penh)',
      floorLocation: floorLocation.trim() || 'Building A · 1st Floor',
      headOfDepartment: headOfDepartment.trim() || undefined,
    };

    try {
      if (editingId) {
        await specialtyApi.update(editingId, payload);
      } else {
        await specialtyApi.create(payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDeleteSpecialty = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await specialtyApi.delete(deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete department');
    } finally {
      setDeleting(false);
    }
  };

  const filteredSpecialties = specialties.filter((s) => {
    const sBranch = s.branchName || 'MundulCare Main Campus (Phnom Penh)';
    if (branchFilter !== 'ALL' && sBranch !== branchFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.headOfDepartment || '').toLowerCase().includes(q) ||
        (s.floorLocation || '').toLowerCase().includes(q)
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
                Department & Specialty Management
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Configure hospital departments, campus branch assignments, wing/floor locations, department heads, and AI triage scope.
              </p>
            </div>

            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white font-bold text-sm shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Department</span>
            </button>
          </div>

          {/* Search & Branch Filter Bar */}
          <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shadow-2xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search department name, head doctor, floor wing, or clinical scope..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
              />
            </div>

            {scopeInfo.isBranchLocked ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#f5f3ff] dark:bg-purple-950/40 border border-[#ddd6fe] dark:border-purple-800 text-xs font-bold text-[#6D28D9] dark:text-purple-300">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>{scopeInfo.lockedBranch}</span>
              </div>
            ) : (
              <CustomSelect
                value={branchFilter}
                onChange={setBranchFilter}
                accentColor="#6D28D9"
                className="w-full sm:w-60"
                icon={<Building2 className="w-4 h-4 text-[#6D28D9] shrink-0" />}
                options={[
                  { value: 'ALL', label: 'All Hospital Branches' },
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

          {/* Departments Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSpecialties.map((spec) => {
              const Icon = getDepartmentIcon(spec.name);
              return (
                <div
                  key={spec.id}
                  className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-xs hover:border-[#6D28D9]/40 dark:hover:border-purple-500/40 transition-colors flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 dark:bg-purple-950/50 border border-purple-200/60 dark:border-purple-800/60 flex items-center justify-center text-[#6D28D9] dark:text-purple-400 group-hover:scale-105 transition-transform">
                        <Icon className="w-6 h-6" />
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(spec)}
                          className="p-2 rounded-xl text-[#6D28D9] dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer focus:outline-none"
                          title="Edit Department"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget({ id: spec.id, name: spec.name })}
                          className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer focus:outline-none"
                          title="Delete Department"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">{spec.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                      {spec.description || 'No description provided.'}
                    </p>

                    {/* Branch, Floor & Head Metadata */}
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-[#6D28D9] dark:text-purple-400 shrink-0" />
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {spec.branchName || 'MundulCare Main Campus (Phnom Penh)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        <span className="truncate">{spec.floorLocation || 'Building A · 1st Floor'}</span>
                      </div>
                      {spec.headOfDepartment && (
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="truncate">
                            Head: <strong className="text-slate-800 dark:text-slate-100">{spec.headOfDepartment}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                    <span className="font-tabular font-medium">Dept ID: #{spec.id}</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Active Unit
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* Create / Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full p-6 animate-in fade-in-50 zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingId ? 'Edit Hospital Department' : 'Add New Hospital Department'}
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
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-sm">Department Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ophthalmology"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-sm">Hospital Branch / Campus *</label>
                    {scopeInfo.isBranchLocked ? (
                      <div className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold text-sm flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-[#6D28D9]" />
                        <span>{branchName || scopeInfo.lockedBranch}</span>
                      </div>
                    ) : (
                      <select
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                      >
                        {branches.length > 0 ? (
                          branches.map((b) => (
                            <option key={b.id} value={b.name} className="dark:bg-slate-900 dark:text-white">
                              {b.name}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="MundulCare Main Campus (Phnom Penh)" className="dark:bg-slate-900 dark:text-white">
                              MundulCare Main Campus (Phnom Penh)
                            </option>
                            <option value="MundulCare Siem Reap Branch" className="dark:bg-slate-900 dark:text-white">MundulCare Siem Reap Branch</option>
                            <option value="MundulCare Battambang Medical Center" className="dark:bg-slate-900 dark:text-white">
                              MundulCare Battambang Medical Center
                            </option>
                          </>
                        )}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-sm">Building / Floor / Wing *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Building A · 3rd Floor"
                      value={floorLocation}
                      onChange={(e) => setFloorLocation(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-sm">Head of Department (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Sovannara Kim"
                    value={headOfDepartment}
                    onChange={(e) => setHeadOfDepartment(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 text-sm">Clinical Scope & Description *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe what conditions and medical areas this specialty addresses (used by AI symptom matcher)..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20 focus:border-[#6D28D9] resize-none"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
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
                    {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Department'}
                  </button>
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
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Department?</h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
                This will permanently delete <strong className="text-slate-900 dark:text-white">{deleteTarget.name}</strong> and remove it from any assigned physicians.
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
                  onClick={confirmDeleteSpecialty}
                  disabled={deleting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {deleting ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
