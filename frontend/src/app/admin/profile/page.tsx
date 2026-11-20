'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Phone,
  Mail,
  ShieldCheck,
  Building2,
  Camera,
  Trash2,
  Eye,
  Crop,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
} from 'lucide-react';
import AdminHeader from '@/components/AdminHeader';
import AdminSidebar from '@/components/AdminSidebar';
import {
  ProfilePhotoEditorModal,
  ProfilePhotoViewerModal,
} from '@/components/ProfilePhotoModals';
import { userApi } from '@/lib/api';
import { PERMISSION_MODULES, UserProfile } from '@/types/auth';
import { useAuth } from '@/context/AuthContext';
import { getImageUrl } from '@/lib/imageUrl';
import { useAdminBranchFilter } from '@/lib/adminBranchFilter';

export default function AdminProfilePage() {
  const { user, isAuthenticated, isLoading: authLoading, updateUser } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, , scopeInfo] = useAdminBranchFilter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin =
    scopeInfo.isGlobalAdmin &&
    (!user?.adminLevel || user?.adminLevel === 'SUPER_ADMIN') &&
    (!profile?.adminLevel || profile?.adminLevel === 'SUPER_ADMIN') &&
    (!profile?.assignedBranch || profile?.assignedBranch === 'All Branches (Global)');

  // Personal Info Form
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoMessage, setInfoMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password Form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [pwdMessage, setPwdMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Photo Viewer & Editor Modals
  const [viewerOpen, setViewerOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSource, setEditorSource] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchProfile = async () => {
    try {
      const res = await userApi.getMyProfile();
      if (res.success && res.data) {
        setProfile(res.data);
        setName(res.data.name || '');
        setPhone(res.data.phone || '');
      }
    } catch (err) {
      console.error('Failed to load admin profile', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== 'ADMIN') {
        router.push('/login?redirect=/admin/profile');
      } else {
        fetchProfile();
      }
    }
  }, [isAuthenticated, user, authLoading]);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInfo(true);
    setInfoMessage(null);
    try {
      const res = await userApi.updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      if (res.success && res.data) {
        setProfile(res.data);
        updateUser({ name: res.data.name });
        setInfoMessage({ type: 'success', text: 'Administrative profile updated successfully.' });
      }
    } catch (err: any) {
      setInfoMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update profile.',
      });
    } finally {
      setSavingInfo(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMessage(null);
    if (newPassword !== confirmPassword) {
      setPwdMessage({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }
    setSavingPassword(true);
    try {
      await userApi.changePassword({
        currentPassword: currentPassword || undefined,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPwdMessage({ type: 'success', text: 'Password updated successfully.' });
    } catch (err: any) {
      setPwdMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to change password.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setEditorSource(objectUrl);
    setViewerOpen(false);
    setEditorOpen(true);
    e.target.value = '';
  };

  const handleSaveCroppedPhoto = async (croppedFile: File) => {
    setUploadingImage(true);
    try {
      const res = await userApi.uploadProfileImage(croppedFile);
      if (res.success && res.data) {
        const newUrl = res.data;
        setProfile((prev) => (prev ? { ...prev, profileImage: newUrl } : prev));
        updateUser({ profileImage: newUrl });
        setEditorOpen(false);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload profile photo');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      await userApi.deleteProfileImage();
      setProfile((prev) => (prev ? { ...prev, profileImage: undefined } : prev));
      updateUser({ profileImage: undefined });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove profile photo');
    }
  };

  const grantedKeys = profile?.permissions
    ? profile.permissions.split(',').map((s) => s.trim()).filter(Boolean)
    : PERMISSION_MODULES.map((m) => m.key);

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

        <main className="flex-1 min-w-0 p-6 sm:p-8 lg:p-10 overflow-y-auto max-w-6xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Admin Profile & Assigned Privileges
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Manage your administrator photo, personal contact info, security credentials, and inspect your assigned hospital branch & module privileges.
              </p>
            </div>

            {isSuperAdmin && (
              <Link
                href="/admin/roles"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f5f3ff] dark:bg-purple-950/50 hover:bg-[#ede9fe] dark:hover:bg-purple-900/50 text-[#6D28D9] dark:text-purple-300 border border-[#ddd6fe] dark:border-purple-800 font-bold text-sm transition-colors self-start sm:self-auto"
              >
                <KeyRound className="w-4 h-4" />
                <span>Manage All Admin Roles</span>
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Avatar Card + Privilege Scope Card */}
            <div className="space-y-6">
              {/* Avatar Card */}
              <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs flex flex-col items-center text-center">
                <div className="relative group">
                  <div
                    onClick={() => {
                      if (profile?.profileImage) setViewerOpen(true);
                      else fileInputRef.current?.click();
                    }}
                    className="w-28 h-28 rounded-full bg-[#f5f3ff] dark:bg-purple-950/50 border-2 border-[#ddd6fe] dark:border-purple-800 text-[#6D28D9] dark:text-purple-300 font-extrabold text-3xl flex items-center justify-center overflow-hidden shadow-sm cursor-pointer"
                  >
                    {profile?.profileImage ? (
                      <img
                        src={getImageUrl(profile.profileImage)}
                        alt={profile.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      (profile?.name || 'A').charAt(0).toUpperCase()
                    )}
                  </div>
                </div>

                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mt-4">{profile?.name}</h2>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{profile?.email}</p>

                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f5f3ff] dark:bg-purple-950/50 text-[#6D28D9] dark:text-purple-300 border border-[#ddd6fe] dark:border-purple-800 text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{profile?.adminLevel || 'SUPER_ADMIN'}</span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="w-full pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                  {profile?.profileImage && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setViewerOpen(true)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#ddd6fe] dark:border-purple-800 bg-[#f5f3ff]/60 dark:bg-purple-950/40 text-[#6D28D9] dark:text-purple-300 text-xs font-bold hover:bg-[#f5f3ff] dark:hover:bg-purple-900/50 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditorSource(getImageUrl(profile.profileImage!) || null);
                          setEditorOpen(true);
                        }}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#ddd6fe] dark:border-purple-800 bg-[#f5f3ff]/60 dark:bg-purple-950/40 text-[#6D28D9] dark:text-purple-300 text-xs font-bold hover:bg-[#f5f3ff] dark:hover:bg-purple-900/50 transition-colors cursor-pointer"
                      >
                        <Crop className="w-3.5 h-3.5" />
                        <span>Crop / Edit</span>
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>{profile?.profileImage ? 'Change Photo' : 'Upload Photo'}</span>
                  </button>

                  {profile?.profileImage && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Photo</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Administrative Branch & Privileges Card */}
              <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-[#f5f3ff] dark:bg-purple-950/50 border border-[#ddd6fe] dark:border-purple-800 text-[#6D28D9] dark:text-purple-300 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Branch & Operational Scope</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Assigned administrative jurisdiction</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs mb-4">
                  <div className="text-slate-400 dark:text-slate-500 font-semibold uppercase text-[10px]">Assigned Hospital Branch</div>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                    {profile?.assignedBranch || 'All Branches (Global)'}
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Granted Operational Modules ({grantedKeys.length})
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PERMISSION_MODULES.filter((m) => grantedKeys.includes(m.key)).map((m) => (
                    <span
                      key={m.key}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-[#f5f3ff] dark:bg-purple-950/50 text-[#6D28D9] dark:text-purple-300 border-[#ddd6fe] dark:border-purple-800"
                    >
                      {m.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Personal Details & Password Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Info Form */}
              <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                  Administrator Contact Information
                </h3>

                {infoMessage && (
                  <div
                    className={`mb-4 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                      infoMessage.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {infoMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{infoMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleSaveInfo} className="space-y-4 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Contact Phone Number</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+855 12 345 678"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Official Email Address</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        disabled
                        value={profile?.email || ''}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={savingInfo}
                      className="px-5 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white font-bold text-sm shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {savingInfo ? 'Saving...' : 'Save Personal Info'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Security & Password Card */}
              <div className="bg-white dark:bg-[#0B0F19] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-xs">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                  Security & Password Management
                </h3>

                {pwdMessage && (
                  <div
                    className={`mb-4 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
                      pwdMessage.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {pwdMessage.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    <span>{pwdMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleSavePassword} className="space-y-4 text-sm">
                  {profile?.authProvider === 'LOCAL' && (
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Current Password *</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          required
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Enter current password"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">New Password (Min 8 chars) *</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          required
                          minLength={8}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="New password"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Confirm New Password *</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          required
                          minLength={8}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#6D28D9]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={savingPassword}
                      className="px-5 py-2.5 rounded-xl bg-[#6D28D9] hover:bg-[#5b21b6] text-white font-bold text-sm shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      {savingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Profile Photo Viewer Modal */}
      <ProfilePhotoViewerModal
        isOpen={viewerOpen}
        imageUrl={profile?.profileImage ? getImageUrl(profile.profileImage) : undefined}
        userName={profile?.name}
        title="Admin Profile Picture"
        variant="purple"
        onClose={() => setViewerOpen(false)}
        onEditCurrent={() => {
          if (profile?.profileImage) {
            setViewerOpen(false);
            setEditorSource(getImageUrl(profile.profileImage) || null);
            setEditorOpen(true);
          }
        }}
        onSelectNewFile={() => fileInputRef.current?.click()}
      />

      {/* Profile Photo Crop & Edit Modal */}
      <ProfilePhotoEditorModal
        isOpen={editorOpen}
        imageSource={editorSource}
        saving={uploadingImage}
        title="Crop & Edit Admin Photo"
        variant="purple"
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveCroppedPhoto}
        onSelectAnotherFile={() => fileInputRef.current?.click()}
      />
    </div>
  );
}
