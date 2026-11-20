'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  FileText,
  Pill,
  AlertTriangle,
  HeartPulse,
  Calendar,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { doctorPortalApi } from '@/lib/api';
import { DoctorPatientSummary } from '@/types/doctorPortal';
import { getImageUrl } from '@/lib/imageUrl';

export default function DoctorPatientsPage() {
  const [patients, setPatients] = useState<DoctorPatientSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await doctorPortalApi.getPatients(search.trim() || undefined);
      if (res.success && res.data) {
        setPatients(res.data);
      } else {
        setError(res.message || 'Unable to load authorized patients.');
      }
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to fetch patients.'
      );
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchPatients, 200);
    return () => clearTimeout(timer);
  }, [fetchPatients]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#aa5588]" />
            <span>My Authorized Patients</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Access clinical profiles, allergies, medical history, vitals, and prescriptions for patients assigned to your care
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <search className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs">
        <label
          htmlFor="patient-search"
          className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5"
        >
          Search by Patient Name, Patient ID (e.g. PT-00001), Email, or Phone
        </label>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="patient-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient name or ID (e.g. PT-00001 or #1)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#aa5588]/20 focus:border-[#aa5588]"
          />
        </div>
      </search>

      {/* Patient Cards Grid */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-7 h-7 text-[#aa5588] animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading authorized patients...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-900">{error}</p>
        </div>
      ) : patients.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
          <p className="text-sm font-bold text-slate-800">No authorized patients found</p>
          <p className="text-xs text-slate-400 mt-1">
            Patients appear here automatically once they book an appointment with you.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((pt) => (
            <div
              key={pt.patientUserId}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:border-[#aa5588]/40 hover:shadow-md transition-all flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#fbf5f8] border border-[#edd5e3] text-[#aa5588] font-bold text-sm flex items-center justify-center overflow-hidden shrink-0">
                      {pt.profileImage ? (
                        <img
                          src={getImageUrl(pt.profileImage)}
                          alt={pt.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        pt.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/doctor/patients/${pt.patientUserId}`}
                          className="text-sm font-bold text-slate-900 hover:text-[#aa5588]"
                        >
                          {pt.name}
                        </Link>
                      </div>
                      <p className="text-[11px] text-slate-400">{pt.email}</p>
                      {pt.phone && <p className="text-[11px] text-slate-500">{pt.phone}</p>}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                    {pt.patientCode}
                  </span>
                </div>

                {/* Quick Clinical Badges */}
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {pt.bloodType && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                      Blood: {pt.bloodType}
                    </span>
                  )}
                  {pt.gender && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                      {pt.gender}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-md bg-[#fbf5f8] text-[#aa5588] font-semibold border border-[#edd5e3]">
                    {pt.totalVisitsWithMe} visit(s)
                  </span>
                </div>

                {/* Allergies / Conditions Summary */}
                <div className="space-y-1.5 text-xs pt-1">
                  {pt.allergies ? (
                    <div className="flex items-start gap-1.5 text-amber-800 bg-amber-50/70 border border-amber-200/70 rounded-xl px-2.5 py-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">
                        <strong>Allergies:</strong> {pt.allergies}
                      </span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400">No known allergies recorded</p>
                  )}

                  {pt.latestDiagnosis && (
                    <div className="flex items-start gap-1.5 text-slate-700 bg-slate-50 rounded-xl px-2.5 py-1.5">
                      <HeartPulse className="w-3.5 h-3.5 text-[#aa5588] shrink-0 mt-0.5" />
                      <span className="line-clamp-1">
                        <strong>Latest Dx:</strong> {pt.latestDiagnosis}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Last visit: {pt.lastVisitDate || '—'}
                  </span>
                  {pt.nextAppointmentDate && (
                    <span className="text-emerald-700 font-semibold">
                      Next: {pt.nextAppointmentDate}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Link
                    href={`/doctor/records?patientUserId=${pt.patientUserId}`}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#aa5588]" />
                    <span>Record</span>
                  </Link>
                  <Link
                    href={`/doctor/prescriptions?patientUserId=${pt.patientUserId}`}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1"
                  >
                    <Pill className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Rx</span>
                  </Link>
                </div>

                <Link
                  href={`/doctor/patients/${pt.patientUserId}`}
                  className="px-3 py-1.5 rounded-xl bg-[#aa5588] hover:bg-[#924472] text-white text-xs font-semibold inline-flex items-center gap-1"
                >
                  <span>Patient Chart</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
