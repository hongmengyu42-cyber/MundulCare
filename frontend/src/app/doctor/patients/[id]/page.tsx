'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  User,
  HeartPulse,
  AlertTriangle,
  FileText,
  Pill,
  CalendarCheck,
  Edit3,
  Save,
  Loader2,
  AlertCircle,
  Activity,
  Thermometer,
  Wind,
  Droplets,
} from 'lucide-react';
import { doctorPortalApi } from '@/lib/api';
import { DoctorPatientDetail, PatientMedicalProfileRequest } from '@/types/doctorPortal';
import { Gender } from '@/types/doctor';
import { getImageUrl } from '@/lib/imageUrl';

export default function DoctorPatientDetailPage() {
  const params = useParams();
  const patientUserId = Number(params.id);

  const [detail, setDetail] = useState<DoctorPatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<PatientMedicalProfileRequest>({
    gender: undefined,
    dateOfBirth: '',
    bloodType: '',
    allergies: '',
    chronicConditions: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });

  const loadPatient = useCallback(async () => {
    if (!patientUserId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await doctorPortalApi.getPatientDetail(patientUserId);
      if (res.success && res.data) {
        setDetail(res.data);
        const mp = res.data.medicalProfile;
        setProfileForm({
          gender: mp?.gender || undefined,
          dateOfBirth: mp?.dateOfBirth || '',
          bloodType: mp?.bloodType || '',
          allergies: mp?.allergies || '',
          chronicConditions: mp?.chronicConditions || '',
          emergencyContactName: mp?.emergencyContactName || '',
          emergencyContactPhone: mp?.emergencyContactPhone || '',
        });
      } else {
        setError(res.message || 'Could not load patient chart.');
      }
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Access denied or patient not found.'
      );
    } finally {
      setLoading(false);
    }
  }, [patientUserId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPatient();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadPatient]);

  const handleSaveMedicalProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await doctorPortalApi.updatePatientMedicalProfile(patientUserId, {
        ...profileForm,
        dateOfBirth: profileForm.dateOfBirth || undefined,
      });
      if (res.success) {
        setEditingProfile(false);
        await loadPatient();
      }
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to update patient medical profile.'
      );
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 text-[#aa5588] animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500">Loading patient clinical chart...</p>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center max-w-lg mx-auto mt-10">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-900">Patient Chart Unavailable</h2>
        <p className="text-xs text-slate-500 mt-1">{error}</p>
        <Link
          href="/doctor/patients"
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#aa5588] text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to My Patients</span>
        </Link>
      </div>
    );
  }

  const { medicalProfile } = detail;
  const latestVitalsRecord = detail.medicalRecords.find(
    (r) =>
      r.bloodPressureSystolic ||
      r.heartRate ||
      r.temperatureC ||
      r.respiratoryRate ||
      r.oxygenSaturation
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb + Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/doctor/patients"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#aa5588]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to My Patients</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href={`/doctor/records?patientUserId=${detail.patientUserId}`}
            className="px-3.5 py-2 rounded-xl border border-[#edd5e3] bg-[#fbf5f8] text-[#aa5588] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-[#f3e4ec]"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Add Clinical Record</span>
          </Link>
          <Link
            href={`/doctor/prescriptions?patientUserId=${detail.patientUserId}`}
            className="px-3.5 py-2 rounded-xl bg-[#aa5588] hover:bg-[#924472] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs"
          >
            <Pill className="w-3.5 h-3.5" />
            <span>New Prescription</span>
          </Link>
        </div>
      </div>

      {/* Patient Profile Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#fbf5f8] border border-[#edd5e3] text-[#aa5588] font-extrabold text-xl flex items-center justify-center overflow-hidden shrink-0">
            {detail.profileImage ? (
              <img
                src={getImageUrl(detail.profileImage)}
                alt={detail.name}
                className="w-full h-full object-cover"
              />
            ) : (
              detail.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">{detail.name}</h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {detail.patientCode}
              </span>
              {medicalProfile?.bloodType && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  Blood Type: {medicalProfile.bloodType}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {detail.email} {detail.phone ? `• ${detail.phone}` : ''}
              {medicalProfile?.gender ? ` • ${medicalProfile.gender}` : ''}
              {medicalProfile?.dateOfBirth ? ` • DOB: ${medicalProfile.dateOfBirth}` : ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setEditingProfile(!editingProfile)}
          className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 self-start md:self-center cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5 text-[#aa5588]" />
          <span>{editingProfile ? 'Cancel Editing' : 'Update Allergies & Conditions'}</span>
        </button>
      </div>

      {/* Allergies, Existing Conditions & Medical Profile Editor */}
      {editingProfile ? (
        <form
          onSubmit={handleSaveMedicalProfile}
          className="bg-white rounded-2xl border border-[#edd5e3] p-6 shadow-2xs space-y-4"
        >
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <User className="w-4 h-4 text-[#aa5588]" />
            <span>Edit Patient Clinical Profile</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="mp-gender" className="block text-xs font-semibold text-slate-700 mb-1">
                Gender
              </label>
              <select
                id="mp-gender"
                value={profileForm.gender || ''}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    gender: (e.target.value as Gender) || undefined,
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-900"
              >
                <option value="">Not specified</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="mp-dob" className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Birth
              </label>
              <input
                id="mp-dob"
                type="date"
                value={profileForm.dateOfBirth || ''}
                onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900"
              />
            </div>

            <div>
              <label htmlFor="mp-blood" className="block text-xs font-semibold text-slate-700 mb-1">
                Blood Type
              </label>
              <select
                id="mp-blood"
                value={profileForm.bloodType || ''}
                onChange={(e) => setProfileForm({ ...profileForm, bloodType: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-900"
              >
                <option value="">Unknown</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="mp-allergies"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Known Allergies (Medications, Food, Latex, etc.)
              </label>
              <textarea
                id="mp-allergies"
                rows={3}
                value={profileForm.allergies || ''}
                onChange={(e) => setProfileForm({ ...profileForm, allergies: e.target.value })}
                placeholder="e.g. Penicillin (hives), Peanuts, Sulfa drugs..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="mp-conditions"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Existing / Chronic Conditions
              </label>
              <textarea
                id="mp-conditions"
                rows={3}
                value={profileForm.chronicConditions || ''}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, chronicConditions: e.target.value })
                }
                placeholder="e.g. Hypertension, Type 2 Diabetes, Asthma..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="mp-em-name"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Emergency Contact Name
              </label>
              <input
                id="mp-em-name"
                type="text"
                value={profileForm.emergencyContactName || ''}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, emergencyContactName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900"
              />
            </div>

            <div>
              <label
                htmlFor="mp-em-phone"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Emergency Contact Phone
              </label>
              <input
                id="mp-em-phone"
                type="tel"
                value={profileForm.emergencyContactPhone || ''}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, emergencyContactPhone: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingProfile(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingProfile}
              className="px-4 py-2 rounded-xl bg-[#aa5588] hover:bg-[#924472] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{savingProfile ? 'Saving...' : 'Save Medical Profile'}</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-amber-50/60 rounded-2xl border border-amber-200/80 p-5">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Allergies</span>
            </div>
            <p className="text-xs text-slate-800 leading-relaxed">
              {medicalProfile?.allergies || 'No known allergies documented.'}
            </p>
          </div>

          <div className="bg-indigo-50/50 rounded-2xl border border-indigo-200/80 p-5">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs uppercase tracking-wider mb-2">
              <HeartPulse className="w-4 h-4 text-indigo-600" />
              <span>Existing Conditions</span>
            </div>
            <p className="text-xs text-slate-800 leading-relaxed">
              {medicalProfile?.chronicConditions || 'No chronic conditions documented.'}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 p-5">
            <div className="flex items-center gap-2 text-slate-700 font-bold text-xs uppercase tracking-wider mb-2">
              <User className="w-4 h-4 text-[#aa5588]" />
              <span>Emergency Contact</span>
            </div>
            <p className="text-xs text-slate-800 font-semibold">
              {medicalProfile?.emergencyContactName || 'Not provided'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {medicalProfile?.emergencyContactPhone || ''}
            </p>
          </div>
        </div>
      )}

      {/* Latest Recorded Vital Signs */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Latest Vital Signs</h2>
            <p className="text-xs text-slate-500">
              {latestVitalsRecord
                ? `Recorded on ${latestVitalsRecord.createdAt} by ${latestVitalsRecord.doctorName}`
                : 'No vitals recorded yet'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Activity className="w-3.5 h-3.5 text-rose-500" />
              <span>Blood Pressure</span>
            </div>
            <p className="text-lg font-extrabold text-slate-900 mt-1">
              {latestVitalsRecord?.bloodPressureSystolic &&
              latestVitalsRecord?.bloodPressureDiastolic
                ? `${latestVitalsRecord.bloodPressureSystolic}/${latestVitalsRecord.bloodPressureDiastolic}`
                : '—'}{' '}
              <span className="text-[10px] font-normal text-slate-400">mmHg</span>
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <HeartPulse className="w-3.5 h-3.5 text-[#aa5588]" />
              <span>Heart Rate</span>
            </div>
            <p className="text-lg font-extrabold text-slate-900 mt-1">
              {latestVitalsRecord?.heartRate ?? '—'}{' '}
              <span className="text-[10px] font-normal text-slate-400">bpm</span>
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Thermometer className="w-3.5 h-3.5 text-amber-500" />
              <span>Temperature</span>
            </div>
            <p className="text-lg font-extrabold text-slate-900 mt-1">
              {latestVitalsRecord?.temperatureC ?? '—'}{' '}
              <span className="text-[10px] font-normal text-slate-400">°C</span>
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Wind className="w-3.5 h-3.5 text-sky-500" />
              <span>Respiratory Rate</span>
            </div>
            <p className="text-lg font-extrabold text-slate-900 mt-1">
              {latestVitalsRecord?.respiratoryRate ?? '—'}{' '}
              <span className="text-[10px] font-normal text-slate-400">/min</span>
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Droplets className="w-3.5 h-3.5 text-emerald-500" />
              <span>SpO2</span>
            </div>
            <p className="text-lg font-extrabold text-slate-900 mt-1">
              {latestVitalsRecord?.oxygenSaturation ?? '—'}{' '}
              <span className="text-[10px] font-normal text-slate-400">%</span>
            </p>
          </div>
        </div>
      </section>

      {/* Clinical Records & Previous Diagnoses + Previous Prescriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Previous Diagnoses & Medical Records */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#aa5588]" />
                <span>Medical History &amp; Previous Diagnoses</span>
              </h2>
              <p className="text-xs text-slate-500">
                Chronological clinical records ({detail.medicalRecords.length})
              </p>
            </div>
            <Link
              href={`/doctor/records?patientUserId=${detail.patientUserId}`}
              className="text-xs font-semibold text-[#aa5588] hover:underline"
            >
              + Add Record
            </Link>
          </div>

          {detail.medicalRecords.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No clinical records have been created for this patient yet.
            </div>
          ) : (
            <div className="space-y-3">
              {detail.medicalRecords.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 space-y-2 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{rec.diagnosis}</span>
                      <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fbf5f8] text-[#aa5588] border border-[#edd5e3]">
                        v{rec.version}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">{rec.createdAt}</span>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Attending: <strong>{rec.doctorName}</strong> ({rec.doctorSpecialty})
                  </p>

                  {rec.symptoms && (
                    <p className="text-slate-700">
                      <strong>Symptoms:</strong> {rec.symptoms}
                    </p>
                  )}
                  {rec.treatmentPlan && (
                    <p className="text-slate-700">
                      <strong>Treatment Plan:</strong> {rec.treatmentPlan}
                    </p>
                  )}
                  {rec.clinicalNotes && (
                    <p className="text-slate-600">
                      <strong>Notes:</strong> {rec.clinicalNotes}
                    </p>
                  )}
                  {rec.followUpRecommendation && (
                    <p className="text-indigo-700">
                      <strong>Follow-up:</strong> {rec.followUpRecommendation}{' '}
                      {rec.followUpDate ? `(${rec.followUpDate})` : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Previous Prescriptions + Visit History */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Pill className="w-4 h-4 text-emerald-600" />
                  <span>Previous Prescriptions</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Medication history ({detail.prescriptions.length})
                </p>
              </div>
              <Link
                href={`/doctor/prescriptions?patientUserId=${detail.patientUserId}`}
                className="text-xs font-semibold text-[#aa5588] hover:underline"
              >
                + Issue Rx
              </Link>
            </div>

            {detail.prescriptions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No prescriptions issued for this patient yet.
              </div>
            ) : (
              <div className="space-y-3">
                {detail.prescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/40 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{rx.prescriptionNumber}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rx.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {rx.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      By {rx.doctorName} • {rx.createdAt}
                    </p>
                    <ul className="space-y-1 pt-1 border-t border-slate-200/60">
                      {rx.items.map((item, idx) => (
                        <li key={idx} className="text-slate-700">
                          • <strong>{item.medicationName}</strong> {item.dosage} — {item.frequency}{' '}
                          ({item.duration}, Qty: {item.quantity})
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-[#aa5588]" />
              <span>Appointments With You ({detail.appointments.length})</span>
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {detail.appointments.map((a) => (
                <div
                  key={a.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-900">
                      {a.appointmentDate} ({a.startTime} - {a.endTime})
                    </p>
                    <p className="text-slate-500 line-clamp-1">{a.reason}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
