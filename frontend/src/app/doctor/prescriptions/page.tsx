'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Pill,
  Plus,
  Trash2,
  Search,
  Printer,
  Ban,
  X,
  Loader2,
  AlertCircle,
  Stethoscope,
} from 'lucide-react';
import { doctorPortalApi } from '@/lib/api';
import {
  CreatePrescriptionRequest,
  DoctorPatientSummary,
  Prescription,
  PrescriptionItem,
} from '@/types/doctorPortal';

const EMPTY_ITEM: PrescriptionItem = {
  medicationName: '',
  dosage: '',
  frequency: '',
  duration: '',
  quantity: '',
  instructions: '',
};

export default function DoctorPrescriptionsPage() {
  const searchParams = useSearchParams();
  const initialPatientId = searchParams.get('patientUserId')
    ? Number(searchParams.get('patientUserId'))
    : undefined;
  const initialAppointmentId = searchParams.get('appointmentId')
    ? Number(searchParams.get('appointmentId'))
    : undefined;
  const initialRecordId = searchParams.get('medicalRecordId')
    ? Number(searchParams.get('medicalRecordId'))
    : undefined;

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<DoctorPatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPatientId, setFilterPatientId] = useState<number | undefined>(initialPatientId);

  // Create Prescription Modal
  const [createOpen, setCreateOpen] = useState(
    Boolean(initialAppointmentId || initialRecordId)
  );
  const [createForm, setCreateForm] = useState<CreatePrescriptionRequest>({
    patientUserId: initialPatientId || 0,
    appointmentId: initialAppointmentId || null,
    medicalRecordId: initialRecordId || null,
    diagnosisSummary: '',
    notes: '',
    items: [{ ...EMPTY_ITEM }],
  });

  // Printable Slip Modal
  const [printRx, setPrintRx] = useState<Prescription | null>(null);

  // Cancel Modal
  const [cancellingRx, setCancellingRx] = useState<Prescription | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rxRes, ptRes] = await Promise.all([
        doctorPortalApi.getPrescriptions({
          patientUserId: filterPatientId,
          search: searchQuery.trim() || undefined,
        }),
        doctorPortalApi.getPatients(),
      ]);
      if (rxRes.success && rxRes.data) setPrescriptions(rxRes.data);
      if (ptRes.success && ptRes.data) setPatients(ptRes.data);
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to load prescriptions.'
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
    setCreateForm({
      patientUserId: filterPatientId || (patients[0]?.patientUserId ?? 0),
      appointmentId: initialAppointmentId || null,
      medicalRecordId: initialRecordId || null,
      diagnosisSummary: '',
      notes: '',
      items: [{ ...EMPTY_ITEM }],
    });
    setCreateOpen(true);
  };

  const handleItemChange = (
    index: number,
    field: keyof PrescriptionItem,
    value: string
  ) => {
    setCreateForm((prev) => {
      const next = [...prev.items];
      next[index] = { ...next[index], [field]: value };
      return { ...prev, items: next };
    });
  };

  const handleAddMedicationRow = () => {
    setCreateForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...EMPTY_ITEM }],
    }));
  };

  const handleRemoveMedicationRow = (index: number) => {
    if (createForm.items.length <= 1) return;
    setCreateForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
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
      const res = await doctorPortalApi.createPrescription(createForm);
      if (res.success) {
        setCreateOpen(false);
        await loadData();
      }
    } catch (err: unknown) {
      setFormError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to issue prescription.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingRx) return;
    setSubmitting(true);
    try {
      const res = await doctorPortalApi.cancelPrescription(
        cancellingRx.id,
        cancelReason.trim()
      );
      if (res.success) {
        setCancellingRx(null);
        setCancelReason('');
        await loadData();
      }
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to cancel prescription.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Pill className="w-6 h-6 text-[#aa5588]" />
            <span>Prescription Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Issue multi-medication prescriptions, specify dosage and usage instructions, and print/export Rx slips
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-[#aa5588] hover:bg-[#924472] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>New Prescription</span>
        </button>
      </div>

      {/* Filters */}
      <search className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs print:hidden">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-6">
            <label
              htmlFor="rx-search"
              className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1"
            >
              Search Prescription, Medication, or Patient
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="rx-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Medication name, RX number, diagnosis, or patient name..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="sm:col-span-5">
            <label
              htmlFor="rx-patient"
              className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1"
            >
              Filter by Authorized Patient
            </label>
            <select
              id="rx-patient"
              value={filterPatientId || ''}
              onChange={(e) =>
                setFilterPatientId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-900"
            >
              <option value="">All My Issued Prescriptions</option>
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

      {/* Prescriptions List */}
      <div className="space-y-4 print:hidden">
        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-7 h-7 text-[#aa5588] animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading prescriptions...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-900">{error}</p>
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Pill className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
            <p className="text-sm font-bold text-slate-800">No prescriptions found</p>
            <p className="text-xs text-slate-400 mt-1">
              Click &ldquo;New Prescription&rdquo; to issue medications for an authorized patient.
            </p>
          </div>
        ) : (
          prescriptions.map((rx) => (
            <div
              key={rx.id}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-[#aa5588]">
                      {rx.prescriptionNumber}
                    </span>
                    <Link
                      href={`/doctor/patients/${rx.patientUserId}`}
                      className="text-sm font-bold text-slate-900 hover:text-[#aa5588]"
                    >
                      • {rx.patientName} ({rx.patientCode})
                    </Link>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        rx.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {rx.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Issued {rx.createdAt} by {rx.doctorName} (License {rx.doctorLicenseNumber})
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => setPrintRx(rx)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#aa5588]" />
                    <span>Print / Export</span>
                  </button>

                  {rx.status === 'ACTIVE' && rx.isAuthorCurrentDoctor && (
                    <button
                      type="button"
                      onClick={() => {
                        setCancellingRx(rx);
                        setCancelReason('');
                      }}
                      className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Cancel Rx</span>
                    </button>
                  )}
                </div>
              </div>

              {rx.diagnosisSummary && (
                <p className="text-xs text-slate-700">
                  <strong>Diagnosis / Indication:</strong> {rx.diagnosisSummary}
                </p>
              )}

              {/* Medications Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Medication Name</th>
                      <th className="py-2.5 px-3">Dosage</th>
                      <th className="py-2.5 px-3">Frequency</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Quantity</th>
                      <th className="py-2.5 px-3">Usage Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rx.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {item.medicationName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{item.dosage}</td>
                        <td className="py-2.5 px-3 text-slate-700">{item.frequency}</td>
                        <td className="py-2.5 px-3 text-slate-700">{item.duration}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {item.instructions || 'As directed'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {rx.notes && (
                <p className="text-xs text-slate-600">
                  <strong>Additional Pharmacist / Patient Notes:</strong> {rx.notes}
                </p>
              )}
              {rx.cancelReason && (
                <p className="text-xs text-rose-600 font-medium">
                  <strong>Cancelled Reason:</strong> {rx.cancelReason}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create Multi-Medication Prescription Modal */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:hidden"
          onClick={() => setCreateOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full p-6 shadow-xl my-8 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-slate-900">Issue New Prescription</h2>
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
                  <label htmlFor="rx-cr-pt" className="block font-semibold text-slate-700 mb-1">
                    Authorized Patient *
                  </label>
                  <select
                    id="rx-cr-pt"
                    required
                    value={createForm.patientUserId || ''}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, patientUserId: Number(e.target.value) })
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
                  <label htmlFor="rx-cr-diag" className="block font-semibold text-slate-700 mb-1">
                    Diagnosis / Indication Summary
                  </label>
                  <input
                    id="rx-cr-diag"
                    type="text"
                    value={createForm.diagnosisSummary || ''}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, diagnosisSummary: e.target.value })
                    }
                    placeholder="e.g. Acute Bacterial Sinusitis"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              {/* Medication Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Medications ({createForm.items.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddMedicationRow}
                    className="px-3 py-1.5 rounded-xl bg-[#fbf5f8] text-[#aa5588] border border-[#edd5e3] font-semibold inline-flex items-center gap-1 hover:bg-[#f3e4ec] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Medication</span>
                  </button>
                </div>

                {createForm.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#aa5588]">Medication #{idx + 1}</span>
                      {createForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicationRow(idx)}
                          className="text-rose-600 hover:text-rose-700 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Medication Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={item.medicationName}
                          onChange={(e) =>
                            handleItemChange(idx, 'medicationName', e.target.value)
                          }
                          placeholder="e.g. Amoxicillin"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Dosage *
                        </label>
                        <input
                          type="text"
                          required
                          value={item.dosage}
                          onChange={(e) => handleItemChange(idx, 'dosage', e.target.value)}
                          placeholder="e.g. 500mg"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Frequency *
                        </label>
                        <input
                          type="text"
                          required
                          value={item.frequency}
                          onChange={(e) => handleItemChange(idx, 'frequency', e.target.value)}
                          placeholder="e.g. Twice daily (every 12h)"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Duration *
                        </label>
                        <input
                          type="text"
                          required
                          value={item.duration}
                          onChange={(e) => handleItemChange(idx, 'duration', e.target.value)}
                          placeholder="e.g. 7 days"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Quantity *
                        </label>
                        <input
                          type="text"
                          required
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          placeholder="e.g. 14 capsules"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-600 mb-1">
                          Usage Instructions
                        </label>
                        <input
                          type="text"
                          value={item.instructions || ''}
                          onChange={(e) => handleItemChange(idx, 'instructions', e.target.value)}
                          placeholder="e.g. Take after meals with water"
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label htmlFor="rx-cr-notes" className="block font-semibold text-slate-700 mb-1">
                  Additional Clinical / Pharmacy Notes
                </label>
                <textarea
                  id="rx-cr-notes"
                  rows={2}
                  value={createForm.notes || ''}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="Special precautions, refill instructions, or dietary advice..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
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
                  {submitting ? 'Issuing...' : 'Issue Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Prescription Modal */}
      {cancellingRx && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 print:hidden"
          onClick={() => setCancellingRx(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-slate-900 mb-2">
              Cancel Prescription {cancellingRx.prescriptionNumber}
            </h2>
            <form onSubmit={handleCancelSubmit} className="space-y-4 text-xs">
              <div>
                <label htmlFor="rx-cancel-reason" className="block font-semibold text-slate-700 mb-1">
                  Reason for Cancellation *
                </label>
                <textarea
                  id="rx-cancel-reason"
                  rows={3}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Specify clinical reason for cancelling this prescription..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancellingRx(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer"
                >
                  Confirm Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable / Exportable Prescription Slip Modal */}
      {printRx && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:static print:bg-white print:p-0"
          onClick={() => setPrintRx(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-8 shadow-2xl space-y-6 print:shadow-none print:border-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Hospital Header */}
            <div className="flex items-start justify-between border-b-2 border-[#aa5588] pb-4">
              <div>
                <div className="flex items-center gap-2 text-[#aa5588] font-extrabold text-xl">
                  <Stethoscope className="w-6 h-6" />
                  <span>MundulCare Hospital</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Official Medical Prescription • {printRx.doctorSpecialty}
                </p>
              </div>
              <div className="text-right text-xs">
                <p className="font-extrabold text-slate-900 text-sm">
                  {printRx.prescriptionNumber}
                </p>
                <p className="text-slate-500">Date: {printRx.createdAt}</p>
                <p className="font-semibold text-emerald-700">{printRx.status}</p>
              </div>
            </div>

            {/* Doctor & Patient Info */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Prescribing Physician</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{printRx.doctorName}</p>
                <p className="text-slate-600">License: {printRx.doctorLicenseNumber}</p>
                {printRx.doctorAddress && <p className="text-slate-500">{printRx.doctorAddress}</p>}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Patient Information</p>
                <p className="font-bold text-slate-900 text-sm mt-0.5">
                  {printRx.patientName} ({printRx.patientCode})
                </p>
                <p className="text-slate-600">{printRx.patientEmail}</p>
                {printRx.patientPhone && <p className="text-slate-500">{printRx.patientPhone}</p>}
              </div>
            </div>

            {printRx.diagnosisSummary && (
              <div className="text-xs">
                <span className="font-bold text-slate-500 uppercase text-[10px]">
                  Diagnosis / Indication:
                </span>
                <p className="font-bold text-slate-900 mt-0.5">{printRx.diagnosisSummary}</p>
              </div>
            )}

            {/* Medications Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600">
                    <th className="py-2.5 px-3">Rx Medication</th>
                    <th className="py-2.5 px-3">Dosage</th>
                    <th className="py-2.5 px-3">Frequency</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3">Qty</th>
                    <th className="py-2.5 px-3">Instructions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {printRx.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {item.medicationName}
                      </td>
                      <td className="py-2.5 px-3">{item.dosage}</td>
                      <td className="py-2.5 px-3">{item.frequency}</td>
                      <td className="py-2.5 px-3">{item.duration}</td>
                      <td className="py-2.5 px-3 font-semibold">{item.quantity}</td>
                      <td className="py-2.5 px-3">{item.instructions || 'As directed'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {printRx.notes && (
              <div className="text-xs p-3 rounded-xl bg-slate-50 border border-slate-200">
                <strong>Instructions / Notes:</strong> {printRx.notes}
              </div>
            )}

            <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Authenticated Digital Prescription — MundulCare HMS</span>
              <span className="font-semibold text-slate-800">
                Signed: {printRx.doctorName} ({printRx.doctorLicenseNumber})
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 print:hidden">
              <button
                type="button"
                onClick={() => setPrintRx(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-[#aa5588] hover:bg-[#924472] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / Save as PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
