'use client';

import React, { useState } from 'react';
import {
  X,
  Stethoscope,
  Pill,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  FileText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { AppointmentResponse, PrescribedMedicationItem } from '@/types/appointment';
import { doctorPortalApi } from '@/lib/api';

interface DoctorConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: AppointmentResponse | null;
  onSuccess: () => void;
}

const COMMON_MEDICATIONS: PrescribedMedicationItem[] = [
  { name: 'Paracetamol 500mg', dosage: '1 tablet', frequency: '3 times daily after meals', duration: '5 days', instructions: 'For fever or mild pain' },
  { name: 'Amoxicillin 500mg', dosage: '1 capsule', frequency: '3 times daily', duration: '7 days', instructions: 'Complete full course' },
  { name: 'Cetirizine 10mg', dosage: '1 tablet', frequency: 'Once daily at bedtime', duration: '7 days', instructions: 'May cause drowsiness' },
  { name: 'Omeprazole 20mg', dosage: '1 capsule', frequency: 'Once daily before breakfast', duration: '14 days', instructions: 'Take 30 mins before food' },
  { name: 'Ibuprofen 400mg', dosage: '1 tablet', frequency: 'Twice daily with meals', duration: '5 days', instructions: 'Do not take on empty stomach' },
];

export default function DoctorConsultationModal({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}: DoctorConsultationModalProps) {
  if (!isOpen || !appointment) return null;

  const [diagnosis, setDiagnosis] = useState(appointment.diagnosis || '');
  const [clinicalNotes, setClinicalNotes] = useState(appointment.clinicalNotes || '');
  const [medications, setMedications] = useState<PrescribedMedicationItem[]>(() => {
    if (appointment.prescribedMedications) {
      try {
        return JSON.parse(appointment.prescribedMedications);
      } catch {
        return [];
      }
    }
    return [
      { name: 'Paracetamol 500mg', dosage: '1 tablet', frequency: '3 times daily after meals', duration: '5 days', instructions: 'Take when fever or pain occurs' },
    ];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddMedication = () => {
    setMedications([
      ...medications,
      { name: '', dosage: '1 tablet', frequency: 'Twice daily', duration: '5 days', instructions: 'Take after meals' },
    ]);
  };

  const handleQuickAdd = (med: PrescribedMedicationItem) => {
    setMedications([...medications, { ...med }]);
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleMedChange = (index: number, field: keyof PrescribedMedicationItem, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnosis.trim()) {
      setError('Please provide a clinical diagnosis summary.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await doctorPortalApi.completeConsultation(appointment.id, {
        diagnosis: diagnosis.trim(),
        clinicalNotes: clinicalNotes.trim(),
        prescribedMedications: JSON.stringify(medications.filter((m) => m.name.trim())),
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.message || 'Failed to complete consultation');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete consultation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-[#dd99bb]" />
            <span className="font-bold text-sm tracking-wide">Complete Consultation & Issue Prescription</span>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* Patient Banner */}
          <div className="p-4 rounded-2xl bg-[#fbf5f8] border border-[#edd5e3] flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#aa5588]">Patient Consultation</span>
              <h3 className="font-bold text-slate-900 text-base">{appointment.patientName}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Visit Date: {appointment.appointmentDate} · {appointment.startTime} - {appointment.endTime}
              </p>
            </div>
            {appointment.queueNumber && (
              <span className="px-3 py-1.5 rounded-xl bg-white border border-[#edd5e3] font-mono font-black text-sm text-[#aa5588] shadow-2xs">
                Ticket: {appointment.queueNumber}
              </span>
            )}
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Diagnosis */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Clinical Diagnosis <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Acute Pharyngitis & Seasonal Influenza"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:border-[#aa5588]"
            />
          </div>

          {/* Clinical Advice / Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Doctor Advice & Consultation Notes
            </label>
            <textarea
              rows={3}
              placeholder="Advice on rest, hydration, diet, tests to monitor, and follow-up guidance..."
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm focus:outline-hidden focus:border-[#aa5588] resize-none"
            />
          </div>

          {/* Prescribed Medications */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-[#aa5588]" />
                <span>Prescribed Medications</span>
              </label>
              <button
                type="button"
                onClick={handleAddMedication}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#fbf5f8] hover:bg-[#edd5e3] text-[#aa5588] font-bold text-xs cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Medicine</span>
              </button>
            </div>

            {/* Quick Suggestions */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#aa5588]" />
                <span>Quick Add:</span>
              </span>
              {COMMON_MEDICATIONS.map((med, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleQuickAdd(med)}
                  className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-medium transition-colors cursor-pointer"
                >
                  + {med.name}
                </button>
              ))}
            </div>

            {/* Medications Table / List */}
            <div className="space-y-2.5">
              {medications.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs"
                >
                  <div className="w-full sm:w-1/3">
                    <input
                      type="text"
                      placeholder="Medication name"
                      value={item.name}
                      onChange={(e) => handleMedChange(idx, 'name', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-900 focus:outline-hidden focus:border-[#aa5588]"
                    />
                  </div>

                  <div className="w-full sm:w-1/4">
                    <input
                      type="text"
                      placeholder="Dosage & Frequency"
                      value={item.frequency}
                      onChange={(e) => handleMedChange(idx, 'frequency', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-[#aa5588]"
                    />
                  </div>

                  <div className="w-full sm:w-1/5">
                    <input
                      type="text"
                      placeholder="Duration"
                      value={item.duration}
                      onChange={(e) => handleMedChange(idx, 'duration', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:border-[#aa5588]"
                    />
                  </div>

                  <div className="w-full sm:flex-1">
                    <input
                      type="text"
                      placeholder="Instructions"
                      value={item.instructions || ''}
                      onChange={(e) => handleMedChange(idx, 'instructions', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 focus:outline-hidden focus:border-[#aa5588]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveMedication(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer self-end sm:self-center"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-[#aa5588] hover:bg-[#924472] text-white font-bold text-xs shadow-xs hover:shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Issuing Prescription...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Consultation & Issue Digital Slip</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
