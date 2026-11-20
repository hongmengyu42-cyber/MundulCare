'use client';

import React from 'react';
import {
  X,
  Printer,
  FileText,
  Calendar,
  Clock,
  User,
  Stethoscope,
  Pill,
  ShieldCheck,
  Building2,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { AppointmentResponse, PrescribedMedicationItem } from '@/types/appointment';

interface PrescriptionSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: AppointmentResponse | null;
}

export default function PrescriptionSlipModal({
  isOpen,
  onClose,
  appointment,
}: PrescriptionSlipModalProps) {
  if (!isOpen || !appointment) return null;

  // Parse prescribed medications if stored as JSON
  let medications: PrescribedMedicationItem[] = [];
  if (appointment.prescribedMedications) {
    try {
      medications = JSON.parse(appointment.prescribedMedications);
    } catch {
      // Fallback: treat as plain multiline text
      medications = [
        {
          name: appointment.prescribedMedications,
          dosage: 'As instructed',
          frequency: 'Daily',
          duration: 'As prescribed',
        },
      ];
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const rxNumber = `RX-${new Date(appointment.appointmentDate).getFullYear()}-${String(appointment.id).padStart(5, '0')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      {/* Modal Container */}
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 print:m-0 print:border-none print:shadow-none print:w-full print:max-w-none">
        {/* Screen-only Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#dd99bb]" />
            <span className="font-bold text-sm tracking-wide">Digital Prescription & Consultation Slip</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#aa5588] hover:bg-[#924472] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Prescription Body */}
        <div className="p-8 sm:p-10 text-slate-800 space-y-6 print:p-6 print:text-black">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b-2 border-slate-900/10 gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#aa5588] text-white flex items-center justify-center font-black text-xl shadow-md">
                +
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>MundulCare</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#fbf5f8] text-[#aa5588] border border-[#edd5e3]">
                    Health System
                  </span>
                </h1>
                <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{appointment.branchName || 'MundulCare Main Campus (Phnom Penh)'}</span>
                </p>
              </div>
            </div>

            <div className="text-right sm:text-right w-full sm:w-auto">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prescription No.</div>
              <div className="text-base font-black font-mono text-[#aa5588]">{rxNumber}</div>
              <div className="text-xs text-slate-500 mt-0.5">
                Issued: {appointment.completedAt ? new Date(appointment.completedAt).toLocaleDateString() : appointment.appointmentDate}
              </div>
            </div>
          </div>

          {/* Patient & Doctor Meta Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-xs">
            {/* Patient Info */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <User className="w-3 h-3 text-[#aa5588]" />
                <span>Patient Information</span>
              </div>
              <div className="font-extrabold text-sm text-slate-900">{appointment.patientName}</div>
              <div className="text-slate-600">Email: {appointment.patientEmail}</div>
              {appointment.patientPhone && <div className="text-slate-600">Phone: {appointment.patientPhone}</div>}
              {appointment.queueNumber && (
                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md mt-1">
                  Queue Ticket: {appointment.queueNumber}
                </div>
              )}
            </div>

            {/* Doctor Info */}
            <div className="space-y-1.5 sm:border-l sm:border-slate-200 sm:pl-4">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Stethoscope className="w-3 h-3 text-[#aa5588]" />
                <span>Attending Physician</span>
              </div>
              <div className="font-extrabold text-sm text-slate-900">{appointment.doctorName}</div>
              <div className="text-slate-600 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{appointment.roomNumber || appointment.doctorAddress || 'Outpatient Consultation Room'}</span>
              </div>
              <div className="text-slate-500 flex items-center gap-1 font-tabular">
                <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                <span>Visit Date: {appointment.appointmentDate} ({appointment.startTime} - {appointment.endTime})</span>
              </div>
            </div>
          </div>

          {/* Clinical Diagnosis Section */}
          <div className="space-y-2">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Clinical Diagnosis</span>
            </h2>
            <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200/60 text-slate-900 font-semibold text-sm">
              {appointment.diagnosis || 'General Outpatient Medical Consultation'}
            </div>
          </div>

          {/* Doctor Clinical Notes */}
          {appointment.clinicalNotes && (
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Physician Advice & Clinical Notes
              </h2>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {appointment.clinicalNotes}
              </div>
            </div>
          )}

          {/* Prescribed Medications */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5 text-[#aa5588]" />
              <span>Rx Prescribed Medications</span>
            </h2>

            {medications.length > 0 ? (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/90 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Medication & Strength</th>
                      <th className="py-2.5 px-3">Dosage / Frequency</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {medications.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">{item.name}</td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {item.dosage} · {item.frequency}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{item.duration}</td>
                        <td className="py-2.5 px-3 text-slate-500 italic">
                          {item.instructions || 'Take as directed'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400">
                No prescription medications recorded for this consultation session.
              </div>
            )}
          </div>

          {/* Footer & Signature Stamp */}
          <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
            <div className="text-[11px] text-slate-500 space-y-1 max-w-sm">
              <div className="font-semibold text-slate-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#aa5588]" />
                <span>Official Digital Clinical Record</span>
              </div>
              <p>
                This digital prescription note was certified and validated by MundulCare Health System.
                Present this slip or QR code at the MundulCare Pharmacy for dispensing.
              </p>
            </div>

            <div className="flex flex-col items-center sm:items-end text-center sm:text-right">
              <div className="w-36 h-12 border-b-2 border-slate-400 flex items-end justify-center pb-1 text-slate-400 italic text-xs">
                {appointment.doctorName}
              </div>
              <div className="text-xs font-bold text-slate-900 mt-1">{appointment.doctorName}</div>
              <div className="text-[11px] text-slate-500">Licensed Physician & Surgeon</div>
              <div className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded mt-1">
                DIGITALLY CERTIFIED
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
