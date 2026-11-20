'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  UserCircle,
  ShieldCheck,
  Award,
  Camera,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { doctorPortalApi } from '@/lib/api';
import { Doctor, Gender } from '@/types/doctor';
import { UpdateDoctorOwnProfileRequest } from '@/types/doctorPortal';
import { getImageUrl } from '@/lib/imageUrl';
import { useAuth } from '@/context/AuthContext';
import {
  ProfilePhotoViewerModal,
  ProfilePhotoEditorModal,
} from '@/components/ProfilePhotoModals';

export default function DoctorProfilePage() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [form, setForm] = useState<UpdateDoctorOwnProfileRequest>({
    phone: '',
    gender: undefined,
    bio: '',
    qualifications: '',
    address: '',
  });

  // Photo modals
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorSource, setEditorSource] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await doctorPortalApi.getOwnProfile();
      if (res.success && res.data) {
        setProfile(res.data);
        setForm({
          phone: res.data.phone || '',
          gender: res.data.gender || undefined,
          bio: res.data.bio || '',
          qualifications: res.data.qualifications || '',
          address: res.data.address || '',
        });
      } else {
        setError(res.message || 'Unable to load doctor profile.');
      }
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to load doctor profile.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadProfile();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await doctorPortalApi.updateOwnProfile(form);
      if (res.success && res.data) {
        setProfile(res.data);
        setSuccessMsg('Your profile has been updated.');
      }
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not save profile changes.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEditorSource(reader.result as string);
      setViewerOpen(false);
      setEditorOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveCroppedPhoto = async (croppedFile: File) => {
    setUploadingPhoto(true);
    try {
      const res = await doctorPortalApi.uploadOwnProfileImage(croppedFile);
      if (res.success && res.data) {
        updateUser({ profileImage: res.data });
        setEditorOpen(false);
        setSuccessMsg('Profile photo updated.');
        await loadProfile();
      }
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to upload profile photo.'
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async () => {
    setUploadingPhoto(true);
    try {
      await doctorPortalApi.deleteOwnProfileImage();
      updateUser({ profileImage: undefined });
      setSuccessMsg('Profile photo removed.');
      await loadProfile();
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="w-7 h-7 text-[#aa5588] animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500">Loading your physician profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <UserCircle className="w-6 h-6 text-[#aa5588]" />
          <span>My Physician Profile</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          View your hospital-verified credentials and update your personal clinical information
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Avatar + Read-Only Hospital Credentials */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs flex flex-col items-center text-center">
            <div className="relative group">
              <button
                type="button"
                onClick={() =>
                  profile.profileImage
                    ? setViewerOpen(true)
                    : fileInputRef.current?.click()
                }
                className="w-28 h-28 rounded-full bg-[#fbf5f8] border-2 border-[#edd5e3] text-[#aa5588] font-extrabold text-3xl flex items-center justify-center overflow-hidden shadow-md cursor-pointer"
              >
                {profile.profileImage ? (
                  <img
                    src={getImageUrl(profile.profileImage)}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  profile.name.charAt(0).toUpperCase()
                )}
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[#aa5588] text-white flex items-center justify-center shadow-md hover:bg-[#924472] cursor-pointer"
                title="Change photo"
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <h2 className="text-lg font-extrabold text-slate-900 mt-4">{profile.name}</h2>
            <p className="text-xs text-slate-500">{profile.email}</p>

            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {profile.specialties.map((s) => (
                <span
                  key={s.id}
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#fbf5f8] text-[#aa5588] border border-[#edd5e3]"
                >
                  {s.name}
                </span>
              ))}
            </div>

            {profile.profileImage && (
              <div className="flex items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setViewerOpen(true)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  View / Crop Photo
                </button>
                <button
                  type="button"
                  disabled={uploadingPhoto}
                  onClick={handleDeletePhoto}
                  className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            )}
          </div>

          {/* Read-Only Hospital-Controlled Credentials */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3 text-xs">
            <div className="flex items-center gap-2 text-slate-800 font-bold uppercase tracking-wider text-[11px]">
              <ShieldCheck className="w-4 h-4 text-[#aa5588]" />
              <span>Administrator-Verified Credentials (Read-Only)</span>
            </div>

            <div className="divide-y divide-slate-100">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Medical License Number</span>
                <span className="font-bold text-slate-900">{profile.licenseNumber}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Department / Specialization</span>
                <span className="font-bold text-slate-900">
                  {profile.specialties.map((s) => s.name).join(', ')}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Clinical Experience</span>
                <span className="font-bold text-slate-900">{profile.experienceYears} Years</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Consultation Fee</span>
                <span className="font-bold text-slate-900">
                  ${profile.consultationFee.toFixed(2)} USD
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Account Status</span>
                <span
                  className={`font-bold ${
                    profile.isActive ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {profile.isActive ? 'Active & Accepting Patients' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Editable Personal & Clinical Information */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4 text-xs"
        >
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-[#aa5588]" />
              <span>Editable Personal &amp; Clinical Details</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Update your phone, gender, qualifications, biography, and clinic room location
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="prof-phone" className="block font-semibold text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                id="prof-phone"
                type="tel"
                value={form.phone || ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+855 12 345 678"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900"
              />
            </div>

            <div>
              <label htmlFor="prof-gender" className="block font-semibold text-slate-700 mb-1">
                Gender
              </label>
              <select
                id="prof-gender"
                value={form.gender || ''}
                onChange={(e) =>
                  setForm({ ...form, gender: (e.target.value as Gender) || undefined })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900"
              >
                <option value="">Select gender...</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="prof-address" className="block font-semibold text-slate-700 mb-1">
              Consultation Room / Clinic Address
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="prof-address"
                type="text"
                value={form.address || ''}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="e.g. Room 301, Cardiology Wing, Building A"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label htmlFor="prof-qual" className="block font-semibold text-slate-700 mb-1">
              Academic Qualifications &amp; Board Certifications
            </label>
            <textarea
              id="prof-qual"
              rows={2}
              value={form.qualifications || ''}
              onChange={(e) => setForm({ ...form, qualifications: e.target.value })}
              placeholder="e.g. MD, Fellowship in Interventional Cardiology..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900"
            />
          </div>

          <div>
            <label htmlFor="prof-bio" className="block font-semibold text-slate-700 mb-1">
              Professional Biography &amp; Clinical Focus
            </label>
            <textarea
              id="prof-bio"
              rows={4}
              value={form.bio || ''}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="Describe your clinical background and areas of expertise..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900"
            />
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[#aa5588] hover:bg-[#924472] text-white font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      <ProfilePhotoViewerModal
        isOpen={viewerOpen}
        imageUrl={profile.profileImage ? getImageUrl(profile.profileImage) : undefined}
        userName={profile.name}
        title="Doctor Profile Photo"
        variant="plum"
        onClose={() => setViewerOpen(false)}
        onEditCurrent={() => {
          if (profile.profileImage) {
            setEditorSource(getImageUrl(profile.profileImage) ?? null);
            setViewerOpen(false);
            setEditorOpen(true);
          }
        }}
        onSelectNewFile={() => fileInputRef.current?.click()}
      />

      <ProfilePhotoEditorModal
        isOpen={editorOpen}
        imageSource={editorSource}
        saving={uploadingPhoto}
        title="Edit Doctor Profile Photo"
        variant="plum"
        onClose={() => setEditorOpen(false)}
        onSave={handleSaveCroppedPhoto}
        onSelectAnotherFile={() => fileInputRef.current?.click()}
      />
    </div>
  );
}
