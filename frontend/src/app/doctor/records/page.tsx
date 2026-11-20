'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Search,
  History,
  Edit3,
  X,
  Loader2,
  AlertCircle,
  Activity,
  HeartPulse,
  Thermometer,
  Wind,
  Droplets,
  Pill,
} from 'lucide-react';
import { doctorPortalApi } from '@/lib/api';
import {
  AmendMedicalRecordRequest,
  CreateMedicalRecordRequest,
  DoctorPatientSummary,
  MedicalRecord,
} from '@/types/doctorPortal';
import { AppointmentResponse } from '@/types/appointment';

export default function DoctorMedicalRecordsPage() {
  const searchParams = useSearchParams();
  const initialPatientId = searchParams.get('patientUserId')
    ? Number(searchParams.get('patientUserId'))
    : undefined;
  const initialAppointmentId = searchParams.get('appointmentId')
    ? Number(searchParams.get('appointmentId'))
    : undefined;

  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [patients, setPatients] = useState<DoctorPatientSummary[]>([]);
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPatientId, setFilterPatientId] = useState<number | undefined>(initialPatientId);

  // Create Modal
  const [createOpen, setCreateOpen] = useState(Boolean(initialAppointmentId));
  const [createForm, setCreateForm] = useState<CreateMedicalRecordRequest>({
    patientUserId: initialPatientId || 0,
    appointmentId: initialAppointmentId || null,
    symptoms: '',
    bloodPressureSystolic: null,
    bloodPressureDiastolic: null,
    heartRate: null,
    temperatureC: null,
    respiratoryRate: null,
    oxygenSaturation: null,
    diagnosis: '',
    treatmentPlan: '',
    clinicalNotes: '',
    followUpRecommendation: '',
    followUpDate: '',
  });

  // Amend Modal
  const [amendingRecord, setAmendingRecord] = useState<MedicalRecord | null>(null);
  const [amendForm, setAmendForm] = useState<AmendMedicalRecordRequest>({
    symptoms: '',
    bloodPressureSystolic: null,
    bloodPressureDiastolic: null,
    heartRate: null,
    temperatureC: null,
    respiratoryRate: null,
    oxygenSaturation: null,
    diagnosis: '',
    treatmentPlan: '',
    clinicalNotes: '',
    followUpRecommendation: '',
    followUpDate: '',
    amendmentReason: '',
  });

  // Revision History Modal
  const [historyRecord, setHistoryRecord] = useState<MedicalRecord | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [recRes, ptRes, apptRes] = await Promise.all([
        doctorPortalApi.getMedicalRecords({
          patientUserId: filterPatientId,
          search: searchQuery.trim() || undefined,
        }),
        doctorPortalApi.getPatients(),
        doctorPortalApi.getAppointments(),
      ]);
      if (recRes.success && recRes.data) setRecords(recRes.data);
      if (ptRes.success && ptRes.data) setPatients(ptRes.data);
      if (apptRes.success && apptRes.data) setAppointments(apptRes.data);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to load clinical records.'
      );
    } finally {
      setLoading(false);
    }
  }, [filterPatientId, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleOpenCreate = () => {
    setFormError(null);
    const defaultPatient = filterPatientId || (patients[0]?.patientUserId ?? 0);
    setCreateForm({
      patientUserId: defaultPatient,
      appointmentId: initialAppointmentId || null,
      symptoms: '',
      bloodPressureSystolic: 120,
      bloodPressureDiastolic: 80,
      heartRate: 72,
      temperatureC: 36.8,
      respiratoryRate: 16,
      oxygenSaturation: 98,
      diagnosis: '',
      treatmentPlan: '',
      clinicalNotes: '',
      followUpRecommendation: '',
      followUpDate: '',
    });
    setCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.patientUserId) {
      setFormError('Please select an authorized patient.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await doctorPortalApi.createMedicalRecord({
        ...createForm,
        followUpDate: createForm.followUpDate || null,
      });
      if (res.success) {
        setCreateOpen(false);
        await loadData();
      }
    } catch (err: unknown) {
      setFormError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to create medical record.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAmend = (rec: MedicalRecord) => {
    setFormError(null);
    setAmendingRecord(rec);
    setAmendForm({
      symptoms: rec.symptoms || '',
      bloodPressureSystolic: rec.bloodPressureSystolic ?? null,
      bloodPressureDiastolic: rec.bloodPressureDiastolic ?? null,
      heartRate: rec.heartRate ?? null,
      temperatureC: rec.temperatureC ?? null,
      respiratoryRate: rec.respiratoryRate ?? null,
      oxygenSaturation: rec.oxygenSaturation ?? null,
      diagnosis: rec.diagnosis || '',
      treatmentPlan: rec.treatmentPlan || '',
      clinicalNotes: rec.clinicalNotes || '',
      followUpRecommendation: rec.followUpRecommendation || '',
      followUpDate: rec.followUpDate || '',
      amendmentReason: '',
    });
  };

  const handleAmendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amendingRecord) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await doctorPortalApi.amendMedicalRecord(amendingRecord.id, {
        ...amendForm,
        followUpDate: amendForm.followUpDate || null,
      });
      if (res.success) {
        setAmendingRecord(null);
        await loadData();
      }
    } catch (err: unknown) {
      setFormError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to amend medical record.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const patientAppointments = appointments.filter(
    (a) =>
      a.patientUserId === Number(createForm.patientUserId) &&
      (a.status === 'CONFIRMED' || a.status === 'COMPLETED' || a.status === 'PENDING')
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-[#aa5588]" />
            <span>Medical Records Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Create and manage clinical records, vitals, diagnoses, and treatment plans with full version history
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-[#aa5588] hover:bg-[#924472] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>New Clinical Record</span>
        </button>
      </div>

      {/* Filters */}
      <search className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-6">
            <label
              htmlFor="rec-search"
              className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1"
            >
              Search Diagnosis, Symptoms, or Patient
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="rec-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search diagnosis, symptoms, patient name, or PT code..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="sm:col-span-5">
            <label
              htmlFor="rec-patient"
              className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1"
            >
              Filter by Authorized Patient
            </label>
            <select
              id="rec-patient"
              value={filterPatientId || ''}
              onChange={(e) =>
                setFilterPatientId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-900"
            >
              <option value="">All My Authored Records</option>
              {patients.map((pt) => (
                <option key={pt.patientUserId} value={pt.patientUserId}>
                  {pt.name} ({pt.patientCode})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-1">
            <button
              type="button"
              onClick={() => {
                setFilterPatientId(undefined);
                setSearchQuery('');
              }}
              className="w-full py-2 px-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>
      </search>

      {/* Records List */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-7 h-7 text-[#aa5588] animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading clinical records...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-900">{error}</p>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
          <p className="text-sm font-bold text-slate-800">No clinical records found</p>
          <p className="text-xs text-slate-400 mt-1">
            Click &ldquo;New Clinical Record&rdquo; to document vitals, diagnosis, and treatment plan for a patient.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((rec) => (
            <div
              key={rec.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/doctor/patients/${rec.patientUserId}`}
                      className="text-base font-extrabold text-slate-900 hover:text-[#aa5588]"
                    >
                      {rec.patientName}
                    </Link>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {rec.patientCode}
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#fbf5f8] text-[#aa5588] border border-[#edd5e3]">
                      Record #{rec.id} • v{rec.version}
                    </span>
                    {rec.appointmentId && (
                      <span className="text-[11px] text-slate-500">
                        Appt #{rec.appointmentId} ({rec.appointmentDate})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Created {rec.createdAt} • Attending: {rec.doctorName} ({rec.doctorSpecialty})
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  {rec.revisions && rec.revisions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setHistoryRecord(rec)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5 text-[#aa5588]" />
                      <span>History ({rec.revisions.length})</span>
                    </button>
                  )}

                  <Link
                    href={`/doctor/prescriptions?patientUserId=${rec.patientUserId}&medicalRecordId=${rec.id}`}
                    className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold inline-flex items-center gap-1 hover:bg-emerald-100"
                  >
                    <Pill className="w-3.5 h-3.5" />
                    <span>Prescribe</span>
                  </Link>

                  {rec.isEditableByCurrentDoctor && (
                    <button
                      type="button"
                      onClick={() => handleOpenAmend(rec)}
                      className="px-3 py-1.5 rounded-xl border border-[#edd5e3] bg-[#fbf5f8] text-[#aa5588] hover:bg-[#f3e4ec] text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Amend</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Vitals Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold">Blood Pressure</p>
                    <p className="font-bold text-slate-900">
                      {rec.bloodPressureSystolic && rec.bloodPressureDiastolic
                        ? `${rec.bloodPressureSystolic}/${rec.bloodPressureDiastolic} mmHg`
                        : '—'}
                    </p>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                  <HeartPulse className="w-4 h-4 text-[#aa5588] shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold">Heart Rate</p>
                    <p className="font-bold text-slate-900">
                      {rec.heartRate ? `${rec.heartRate} bpm` : '—'}
                    </p>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold">Temperature</p>
                    <p className="font-bold text-slate-900">
                      {rec.temperatureC ? `${rec.temperatureC} °C` : '—'}
                    </p>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                  <Wind className="w-4 h-4 text-sky-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold">Resp. Rate</p>
                    <p className="font-bold text-slate-900">
                      {rec.respiratoryRate ? `${rec.respiratoryRate} /min` : '—'}
                    </p>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-[10px] text-slate-400 font-semibold">SpO2</p>
                    <p className="font-bold text-slate-900">
                      {rec.oxygenSaturation ? `${rec.oxygenSaturation}%` : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Clinical Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-2">
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider block">
                      Diagnosis
                    </span>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{rec.diagnosis}</p>
                  </div>
                  {rec.symptoms && (
                    <div>
                      <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider block">
                        Presenting Symptoms
                      </span>
                      <p className="text-slate-700 mt-0.5">{rec.symptoms}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {rec.treatmentPlan && (
                    <div>
                      <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider block">
                        Treatment Plan
                      </span>
                      <p className="text-slate-700 mt-0.5">{rec.treatmentPlan}</p>
                    </div>
                  )}
                  {rec.clinicalNotes && (
                    <div>
                      <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider block">
                        Doctor&apos;s Clinical Notes
                      </span>
                      <p className="text-slate-600 mt-0.5">{rec.clinicalNotes}</p>
                    </div>
                  )}
                  {(rec.followUpRecommendation || rec.followUpDate) && (
                    <div>
                      <span className="font-bold text-indigo-600 uppercase text-[10px] tracking-wider block">
                        Follow-Up Recommendation
                      </span>
                      <p className="text-indigo-900 font-medium mt-0.5">
                        {rec.followUpRecommendation}{' '}
                        {rec.followUpDate ? `(Target Date: ${rec.followUpDate})` : ''}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Clinical Record Modal */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setCreateOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-xl my-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-slate-900">Create Clinical Medical Record</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="cr-patient" className="block font-semibold text-slate-700 mb-1">
                    Authorized Patient *
                  </label>
                  <select
                    id="cr-patient"
                    required
                    value={createForm.patientUserId || ''}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        patientUserId: Number(e.target.value),
                        appointmentId: null,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900"
                  >
                    <option value="">Select patient...</option>
                    {patients.map((pt) => (
                      <option key={pt.patientUserId} value={pt.patientUserId}>
                        {pt.name} ({pt.patientCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="cr-appt" className="block font-semibold text-slate-700 mb-1">
                    Appointment Reference (optional)
                  </label>
                  <select
                    id="cr-appt"
                    value={createForm.appointmentId || ''}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        appointmentId: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900"
                  >
                    <option value="">General Consultation (No specific slot)</option>
                    {patientAppointments.map((a) => (
                      <option key={a.id} value={a.id}>
                        #{a.id} • {a.appointmentDate} ({a.startTime}) - {a.status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vital Signs */}
              <fieldset className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <legend className="text-[11px] font-bold uppercase tracking-wider text-[#aa5588] px-1">
                  Vital Signs
                </legend>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-1">
                  <div>
                    <label htmlFor="cr-bps" className="block font-semibold text-slate-600 mb-1">
                      BP Systolic (mmHg)
                    </label>
                    <input
                      id="cr-bps"
                      type="number"
                      value={createForm.bloodPressureSystolic ?? ''}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          bloodPressureSystolic: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="cr-bpd" className="block font-semibold text-slate-600 mb-1">
                      BP Diastolic (mmHg)
                    </label>
                    <input
                      id="cr-bpd"
                      type="number"
                      value={createForm.bloodPressureDiastolic ?? ''}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          bloodPressureDiastolic: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="cr-hr" className="block font-semibold text-slate-600 mb-1">
                      Heart Rate (bpm)
                    </label>
                    <input
                      id="cr-hr"
                      type="number"
                      value={createForm.heartRate ?? ''}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          heartRate: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="cr-temp" className="block font-semibold text-slate-600 mb-1">
                      Body Temp (°C)
                    </label>
                    <input
                      id="cr-temp"
                      type="number"
                      step="0.1"
                      value={createForm.temperatureC ?? ''}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          temperatureC: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="cr-rr" className="block font-semibold text-slate-600 mb-1">
                      Resp. Rate (/min)
                    </label>
                    <input
                      id="cr-rr"
                      type="number"
                      value={createForm.respiratoryRate ?? ''}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          respiratoryRate: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="cr-spo2" className="block font-semibold text-slate-600 mb-1">
                      Oxygen Sat. SpO2 (%)
                    </label>
                    <input
                      id="cr-spo2"
                      type="number"
                      value={createForm.oxygenSaturation ?? ''}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          oxygenSaturation: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                </div>
              </fieldset>

              <div>
                <label htmlFor="cr-symptoms" className="block font-semibold text-slate-700 mb-1">
                  Presenting Symptoms
                </label>
                <textarea
                  id="cr-symptoms"
                  rows={2}
                  value={createForm.symptoms || ''}
                  onChange={(e) => setCreateForm({ ...createForm, symptoms: e.target.value })}
                  placeholder="Describe patient's reported symptoms and duration..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label htmlFor="cr-diagnosis" className="block font-semibold text-slate-700 mb-1">
                  Clinical Diagnosis *
                </label>
                <input
                  id="cr-diagnosis"
                  type="text"
                  required
                  value={createForm.diagnosis}
                  onChange={(e) => setCreateForm({ ...createForm, diagnosis: e.target.value })}
                  placeholder="e.g. Acute Upper Respiratory Infection, Stage 1 Hypertension..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label htmlFor="cr-treatment" className="block font-semibold text-slate-700 mb-1">
                  Treatment Plan
                </label>
                <textarea
                  id="cr-treatment"
                  rows={2}
                  value={createForm.treatmentPlan || ''}
                  onChange={(e) => setCreateForm({ ...createForm, treatmentPlan: e.target.value })}
                  placeholder="Medications, procedures, lifestyle modifications..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label htmlFor="cr-notes" className="block font-semibold text-slate-700 mb-1">
                  Doctor&apos;s Clinical Notes
                </label>
                <textarea
                  id="cr-notes"
                  rows={2}
                  value={createForm.clinicalNotes || ''}
                  onChange={(e) => setCreateForm({ ...createForm, clinicalNotes: e.target.value })}
                  placeholder="Physical examination findings and differential notes..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="cr-followup" className="block font-semibold text-slate-700 mb-1">
                    Follow-Up Recommendations
                  </label>
                  <input
                    id="cr-followup"
                    type="text"
                    value={createForm.followUpRecommendation || ''}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, followUpRecommendation: e.target.value })
                    }
                    placeholder="e.g. Return in 2 weeks for BP re-check"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cr-followupdate"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Recommended Follow-Up Date
                  </label>
                  <input
                    id="cr-followupdate"
                    type="date"
                    value={createForm.followUpDate || ''}
                    onChange={(e) => setCreateForm({ ...createForm, followUpDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#aa5588] hover:bg-[#924472] text-white font-semibold cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving Record...' : 'Save Clinical Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Amend Record Modal (Preserves Revision History) */}
      {amendingRecord && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setAmendingRecord(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-xl my-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Amend Clinical Record #{amendingRecord.id} (Current v{amendingRecord.version})
                </h2>
                <p className="text-xs text-slate-500">
                  The previous version will be archived in the immutable audit revision log.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAmendingRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleAmendSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div>
                  <label htmlFor="am-bps" className="block font-semibold text-slate-600 mb-1">
                    BP Systolic
                  </label>
                  <input
                    id="am-bps"
                    type="number"
                    value={amendForm.bloodPressureSystolic ?? ''}
                    onChange={(e) =>
                      setAmendForm({
                        ...amendForm,
                        bloodPressureSystolic: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="am-bpd" className="block font-semibold text-slate-600 mb-1">
                    BP Diastolic
                  </label>
                  <input
                    id="am-bpd"
                    type="number"
                    value={amendForm.bloodPressureDiastolic ?? ''}
                    onChange={(e) =>
                      setAmendForm({
                        ...amendForm,
                        bloodPressureDiastolic: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="am-hr" className="block font-semibold text-slate-600 mb-1">
                    Heart Rate
                  </label>
                  <input
                    id="am-hr"
                    type="number"
                    value={amendForm.heartRate ?? ''}
                    onChange={(e) =>
                      setAmendForm({
                        ...amendForm,
                        heartRate: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="am-temp" className="block font-semibold text-slate-600 mb-1">
                    Temp (°C)
                  </label>
                  <input
                    id="am-temp"
                    type="number"
                    step="0.1"
                    value={amendForm.temperatureC ?? ''}
                    onChange={(e) =>
                      setAmendForm({
                        ...amendForm,
                        temperatureC: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="am-rr" className="block font-semibold text-slate-600 mb-1">
                    Resp. Rate
                  </label>
                  <input
                    id="am-rr"
                    type="number"
                    value={amendForm.respiratoryRate ?? ''}
                    onChange={(e) =>
                      setAmendForm({
                        ...amendForm,
                        respiratoryRate: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="am-spo2" className="block font-semibold text-slate-600 mb-1">
                    SpO2 (%)
                  </label>
                  <input
                    id="am-spo2"
                    type="number"
                    value={amendForm.oxygenSaturation ?? ''}
                    onChange={(e) =>
                      setAmendForm({
                        ...amendForm,
                        oxygenSaturation: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="am-diag" className="block font-semibold text-slate-700 mb-1">
                  Diagnosis *
                </label>
                <input
                  id="am-diag"
                  type="text"
                  required
                  value={amendForm.diagnosis}
                  onChange={(e) => setAmendForm({ ...amendForm, diagnosis: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label htmlFor="am-symp" className="block font-semibold text-slate-700 mb-1">
                  Symptoms
                </label>
                <textarea
                  id="am-symp"
                  rows={2}
                  value={amendForm.symptoms || ''}
                  onChange={(e) => setAmendForm({ ...amendForm, symptoms: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label htmlFor="am-plan" className="block font-semibold text-slate-700 mb-1">
                  Treatment Plan
                </label>
                <textarea
                  id="am-plan"
                  rows={2}
                  value={amendForm.treatmentPlan || ''}
                  onChange={(e) => setAmendForm({ ...amendForm, treatmentPlan: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label htmlFor="am-notes" className="block font-semibold text-slate-700 mb-1">
                  Clinical Notes
                </label>
                <textarea
                  id="am-notes"
                  rows={2}
                  value={amendForm.clinicalNotes || ''}
                  onChange={(e) => setAmendForm({ ...amendForm, clinicalNotes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div>
                <label htmlFor="am-reason" className="block font-bold text-[#aa5588] mb-1">
                  Reason for Amendment (Required for Clinical Audit Log) *
                </label>
                <input
                  id="am-reason"
                  type="text"
                  required
                  value={amendForm.amendmentReason}
                  onChange={(e) => setAmendForm({ ...amendForm, amendmentReason: e.target.value })}
                  placeholder="e.g. Updated diagnosis after lab results returned..."
                  className="w-full px-3 py-2 rounded-xl border border-[#edd5e3] bg-[#fbf5f8]/40"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAmendingRecord(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#aa5588] hover:bg-[#924472] text-white font-semibold cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving Amendment...' : 'Save Amended Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Revision History Modal */}
      {historyRecord && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setHistoryRecord(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 shadow-xl max-h-[85vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Clinical Record #{historyRecord.id} — Revision Audit History
                </h2>
                <p className="text-xs text-slate-500">Patient: {historyRecord.patientName}</p>
              </div>
              <button
                type="button"
                onClick={() => setHistoryRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {historyRecord.revisions.map((rev) => (
                <div
                  key={rev.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#aa5588]">Archived Version v{rev.version}</span>
                    <span className="text-slate-400">{rev.createdAt}</span>
                  </div>
                  <p className="text-slate-600">
                    <strong>Amended by:</strong> {rev.amendedByDoctorName}
                  </p>
                  <p className="text-amber-800 bg-amber-50 border border-amber-200/70 rounded-lg px-2.5 py-1">
                    <strong>Amendment Reason:</strong> {rev.amendmentReason}
                  </p>
                  <p className="text-slate-800 pt-1">
                    <strong>Previous Diagnosis:</strong> {rev.diagnosis}
                  </p>
                  {rev.treatmentPlan && (
                    <p className="text-slate-600">
                      <strong>Previous Plan:</strong> {rev.treatmentPlan}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
