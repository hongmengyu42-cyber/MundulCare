'use client';

import React, { useEffect, useState, use, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Award,
  MapPin,
  Mail,
  Phone,
  Clock,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar as CalendarIcon,
  Zap,
  Check,
  Building2,
  Lock,
  Sparkles,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import PaymentCheckoutModal from '@/components/PaymentCheckoutModal';
import { doctorApi, appointmentApi } from '@/lib/api';
import { Doctor } from '@/types/doctor';
import { BookAppointmentRequest, PaymentMethod } from '@/types/appointment';
import { useAuth } from '@/context/AuthContext';
import { getDoctorAvatarUrl } from '@/lib/doctorAvatar';

// Standard daytime 30-min slots starting strictly at 09:00
const STANDARD_TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00',
];

// Evening / Emergency slots
const EMERGENCY_TIME_SLOTS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '17:30', '18:00', '18:30', '19:00', '19:30', '20:00',
  '20:30', '21:00', '21:30', '22:00', '22:30', '23:00',
];

const add30Minutes = (time: string): string => {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + 30;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
};

function DoctorDetailContent({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isBookingPending = searchParams.get('booking') === 'pending';
  const { isAuthenticated } = useAuth();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking Form State
  const [appointmentDate, setAppointmentDate] = useState('');
  const [slotType, setSlotType] = useState<'standard' | 'emergency' | 'custom'>('standard');
  const [selectedSlot, setSelectedSlot] = useState<string>('09:00');
  const [customTime, setCustomTime] = useState<string>('18:00');
  const [reason, setReason] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [confirmedBookingDetails, setConfirmedBookingDetails] = useState<{
    paymentMethod?: string;
    paymentStatus?: string;
    paidAmount?: number;
    transactionId?: string;
  } | null>(null);

  useEffect(() => {
    // Set default tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setAppointmentDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  // Restore draft booking from localStorage (seamless guest flow)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`mundulcare_draft_booking_${id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Valid if under 48 hours old
        if (Date.now() - (parsed.savedAt || 0) < 48 * 60 * 60 * 1000) {
          if (parsed.appointmentDate) setAppointmentDate(parsed.appointmentDate);
          if (parsed.slotType) setSlotType(parsed.slotType);
          if (parsed.selectedSlot) setSelectedSlot(parsed.selectedSlot);
          if (parsed.customTime) setCustomTime(parsed.customTime);
          if (parsed.reason) setReason(parsed.reason);
          if (parsed.patientPhone) setPatientPhone(parsed.patientPhone);
          setDraftRestored(true);
        }
      }
    } catch (err) {
      console.error('Failed to restore booking draft', err);
    }
  }, [id]);

  const handleClearDraft = () => {
    try {
      localStorage.removeItem(`mundulcare_draft_booking_${id}`);
      localStorage.removeItem('mundulcare_last_draft_doctor_id');
      localStorage.removeItem('mundulcare_last_draft_doctor_name');
    } catch {}
    setDraftRestored(false);
    setReason('');
    setPatientPhone('');
  };

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const res = await doctorApi.getById(Number(id));
        if (res.success && res.data) {
          setDoctor(res.data);
        } else {
          setError('Doctor profile not found');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error loading physician profile');
      } finally {
        setLoading(false);
      }
    };
    fetchDoctor();
  }, [id]);

  const activeSlot = slotType === 'custom' ? customTime : selectedSlot;
  const [pendingAppointmentId, setPendingAppointmentId] = useState<number | null>(null);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError('Please provide a reason or symptoms for your consultation so the physician can review.');
      return;
    }

    // Guest Exploration: If not logged in, seamlessly preserve draft and redirect to login/register
    if (!isAuthenticated) {
      const draft = {
        doctorId: Number(id),
        appointmentDate,
        slotType,
        selectedSlot,
        customTime,
        reason: reason.trim(),
        patientPhone: patientPhone.trim(),
        savedAt: Date.now(),
      };
      try {
        localStorage.setItem(`mundulcare_draft_booking_${id}`, JSON.stringify(draft));
        localStorage.setItem('mundulcare_last_draft_doctor_id', String(id));
        if (doctor?.name) {
          localStorage.setItem('mundulcare_last_draft_doctor_name', doctor.name);
        }
      } catch (err) {
        console.error('Failed to save booking draft to localStorage', err);
      }
      router.push(`/login?redirect=${encodeURIComponent(`/doctors/${id}?booking=pending`)}`);
      return;
    }

    if (!doctor) return;

    setError(null);
    setSubmitting(true);

    const startTime = activeSlot;
    const endTime = add30Minutes(activeSlot);

    const payload: BookAppointmentRequest = {
      doctorId: doctor.id,
      appointmentDate,
      startTime,
      endTime,
      reason: reason.trim(),
      patientPhone: patientPhone.trim() || undefined,
      paymentMethod: 'KHQR',
      paymentStatus: 'PENDING',
      paidAmount: doctor.consultationFee,
    };

    try {
      const response = await appointmentApi.book(payload);
      if (response.success && response.data) {
        setPendingAppointmentId(response.data.id);
        setShowPaymentModal(true);
      } else {
        setError(response.message || 'Booking submission failed');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit appointment.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmBookingWithPayment = async (paymentDetails: {
    paymentMethod: PaymentMethod;
    paymentStatus: string;
    paidAmount: number;
    paymentTransactionId: string;
  }) => {
    setShowPaymentModal(false);
    setConfirmedBookingDetails({
      paymentMethod: paymentDetails.paymentMethod,
      paymentStatus: paymentDetails.paymentStatus,
      paidAmount: paymentDetails.paidAmount,
      transactionId: paymentDetails.paymentTransactionId,
    });
    setBookingSuccess(true);
    handleClearDraft();
  };

  // Quick preset dates
  const setQuickDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setAppointmentDate(d.toISOString().split('T')[0]);
  };

  const readableDate = appointmentDate
    ? new Date(appointmentDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-[#aa5588] selection:text-white">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#aa5588] mb-2" />
        </div>
      </div>
    );
  }

  if (error && !doctor) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-[#aa5588] selection:text-white">
        <Navbar />
        <div className="max-w-2xl mx-auto py-16 px-4 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Physician Profile Unavailable</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <Link
            href="/doctors"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#aa5588] text-white font-semibold text-sm hover:bg-[#924472] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Doctor Directory</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!doctor) return null;

  const avatarUrl = getDoctorAvatarUrl(doctor.name, doctor.id, doctor.profileImage);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-[#aa5588] selection:text-white">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Back Link */}
        <Link
          href="/doctors"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#aa5588] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Doctor Directory</span>
        </Link>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Doctor Details (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                  <img
                    src={avatarUrl}
                    alt={doctor.name}
                    className="w-full h-full object-cover object-top"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {doctor.specialties?.map((s) => (
                      <span
                        key={s.id}
                        className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fbf5f8] text-[#aa5588] border border-[#edd5e3]"
                      >
                        {s.name}
                      </span>
                    ))}
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Licensed Practitioner
                    </span>
                  </div>

                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                    {doctor.name}
                  </h1>

                  <p className="text-xs text-slate-500 mt-1 font-mono">
                    License: {doctor.licenseNumber || 'MD-KH-2024'}
                  </p>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold text-[#aa5588] font-tabular">
                      ${doctor.consultationFee.toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-400">/ 30-min Consultation</span>
                  </div>
                </div>
              </div>

              {/* Stats & Hospital Campus Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 mt-5 border-t border-slate-100 text-sm">
                <div className="space-y-3">
                  <div>
                    <span className="flex items-center gap-2 text-slate-500 font-medium text-xs">
                      <Award className="w-4 h-4 text-amber-500 shrink-0" />
                      Clinical Experience
                    </span>
                    <div className="font-bold text-slate-800 text-sm mt-0.5 font-tabular pl-6">
                      {doctor.experienceYears} Years
                    </div>
                  </div>

                  <div>
                    <span className="flex items-center gap-2 text-slate-500 font-medium text-xs">
                      <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                      Doctor&apos;s Contact
                    </span>
                    <div className="font-semibold text-slate-700 text-sm mt-0.5 break-all pl-6">
                      {doctor.email}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="flex items-center gap-2 text-slate-500 font-medium text-xs">
                      <Building2 className="w-4 h-4 text-[#aa5588] shrink-0" />
                      Hospital Campus
                    </span>
                    <div className="font-bold text-slate-800 text-sm mt-0.5 pl-6">
                      {doctor.branchName || 'MundulCare Main Campus (Phnom Penh)'}
                    </div>
                  </div>

                  <div>
                    <span className="flex items-center gap-2 text-slate-500 font-medium text-xs">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      Clinic Room
                    </span>
                    <div className="font-bold text-slate-800 text-sm mt-0.5 pl-6">
                      {doctor.address || 'Consultation Suite, Building A'}
                    </div>
                  </div>

                  {doctor.phone && (
                    <div>
                      <span className="flex items-center gap-2 text-slate-500 font-medium text-xs">
                        <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                        Phone Extension
                      </span>
                      <div className="font-semibold text-slate-700 text-sm mt-0.5 font-tabular pl-6">
                        {doctor.phone}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Biography & Qualifications */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 mb-2">
                  Physician Overview & Clinical Background
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {doctor.bio || 'General medical practitioner dedicated to evidence-based healthcare delivery.'}
                </p>
              </div>

              {doctor.qualifications && (
                <div className="pt-4 border-t border-slate-100">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Medical Degrees & Accreditations
                  </h3>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed">
                    {doctor.qualifications}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Booking Card (5 cols) */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-xs sticky top-24">
              <div className="border-b border-slate-100 pb-4 mb-5">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fbf5f8] border border-[#edd5e3] text-[#aa5588] text-xs font-semibold mb-2">
                  <Clock className="w-3.5 h-3.5 text-[#aa5588]" />
                  <span>30-Minute Consultation</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Schedule an Appointment
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select your preferred consultation date, available time slot, and payment method.
                </p>
              </div>

              {bookingSuccess ? (
                <div className="py-6 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Appointment Confirmed!
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Your consultation with <strong>{doctor.name}</strong> for <strong>{readableDate}</strong> at{' '}
                    <strong>{activeSlot}</strong> has been booked.
                  </p>

                  {confirmedBookingDetails && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Payment Method:</span>
                        <span className="font-bold text-slate-900">
                          {confirmedBookingDetails.paymentMethod || 'Pay at Clinic'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Payment Status:</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          confirmedBookingDetails.paymentStatus === 'PAID'
                            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                            : 'text-amber-700 bg-amber-50 border border-amber-200'
                        }`}>
                          {confirmedBookingDetails.paymentStatus === 'PAID' ? 'PAID & CONFIRMED' : 'PAY ON ARRIVAL'}
                        </span>
                      </div>
                      {confirmedBookingDetails.transactionId && (
                        <div className="flex justify-between items-center font-mono text-[11px]">
                          <span className="text-slate-500">Transaction ID:</span>
                          <span className="text-slate-700">{confirmedBookingDetails.transactionId}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Consultation Fee:</span>
                        <span className="font-black text-[#aa5588]">${confirmedBookingDetails.paidAmount?.toFixed(2)} USD</span>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex flex-col gap-2">
                    <Link
                      href="/my-appointments"
                      className="w-full py-2.5 rounded-xl bg-[#aa5588] hover:bg-[#924472] text-white font-semibold text-sm transition-colors block text-center"
                    >
                      View My Appointments & Queue
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setBookingSuccess(false);
                        setReason('');
                      }}
                      className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      Book another consultation
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {draftRestored && (
                    <div className="mb-4 p-3 rounded-xl bg-[#fbf5f8] border border-[#edd5e3] text-xs text-[#aa5588] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#aa5588] shrink-0" />
                        <span className="leading-snug">
                          Restored your draft consultation for <strong className="text-slate-900">{readableDate}</strong> at <strong className="text-slate-900">{activeSlot}</strong>.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearDraft}
                        className="text-[11px] font-semibold underline text-slate-500 hover:text-slate-800 ml-2 shrink-0 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  )}

                  {isAuthenticated && isBookingPending && draftRestored && (
                    <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Welcome back!</strong> Your consultation slot has been preserved. Review your information below and click confirm to complete your booking.
                      </span>
                    </div>
                  )}

                  <form onSubmit={handleBookingSubmit} className="space-y-4 text-sm">
                  {/* Styled Consultation Date Calendar Picker */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5 text-xs">
                      Consultation Date *
                    </label>

                    {/* Quick Date Presets */}
                    <div className="flex items-center gap-1.5 mb-2">
                      <button
                        type="button"
                        onClick={() => setQuickDate(0)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#fbf5f8] hover:text-[#aa5588] text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickDate(1)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#fbf5f8] hover:text-[#aa5588] text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Tomorrow
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickDate(2)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#fbf5f8] hover:text-[#aa5588] text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        In 2 Days
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickDate(3)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#fbf5f8] hover:text-[#aa5588] text-slate-600 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        In 3 Days
                      </button>
                    </div>

                    {/* Styled Calendar Input */}
                    <div className="relative">
                      <CalendarIcon className="w-4 h-4 text-[#aa5588] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="date"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        value={appointmentDate}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm font-semibold bg-white focus:outline-hidden focus:ring-2 focus:ring-[#aa5588]/20 focus:border-[#aa5588] transition-all cursor-pointer shadow-2xs"
                      />
                    </div>
                    {readableDate && (
                      <span className="block text-xs font-medium text-slate-500 mt-1">
                        Scheduled for: <strong className="text-slate-800">{readableDate}</strong>
                      </span>
                    )}
                  </div>

                  {/* Slot Selection Tabs */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5 text-xs">
                      Consultation Start Time *
                    </label>

                    <div className="flex rounded-xl bg-slate-100 p-1 mb-2.5 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setSlotType('standard')}
                        className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
                          slotType === 'standard' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Daytime Slots
                      </button>
                      <button
                        type="button"
                        onClick={() => setSlotType('emergency')}
                        className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
                          slotType === 'emergency' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Evening / Urgent
                      </button>
                      <button
                        type="button"
                        onClick={() => setSlotType('custom')}
                        className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
                          slotType === 'custom' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Custom Time
                      </button>
                    </div>

                    {slotType === 'standard' && (
                      <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                        {STANDARD_TIME_SLOTS.map((slot) => {
                          const isSelected = selectedSlot === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              className={`py-1.5 px-2 rounded-lg text-xs font-semibold font-tabular transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-[#aa5588] text-white shadow-2xs'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-[#fbf5f8] hover:text-[#aa5588]'
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {slotType === 'emergency' && (
                      <div className="space-y-2">
                        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                          <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            Off-hours & emergency slots are reviewed directly by the hospital on-call administrator.
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                          {EMERGENCY_TIME_SLOTS.map((slot) => {
                            const isSelected = selectedSlot === slot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => setSelectedSlot(slot)}
                                className={`py-1.5 px-2 rounded-lg text-xs font-semibold font-tabular transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-amber-600 text-white shadow-2xs'
                                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-amber-50 hover:text-amber-800'
                                }`}
                              >
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {slotType === 'custom' && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <label className="block text-xs font-medium text-slate-600">
                          Enter Specific Consultation Start Time:
                        </label>
                        <input
                          type="time"
                          value={customTime}
                          onChange={(e) => setCustomTime(e.target.value)}
                          className="w-full p-2 rounded-lg border border-slate-200 bg-white font-tabular font-bold text-slate-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#aa5588]/20 focus:border-[#aa5588]"
                        />
                      </div>
                    )}

                    <span className="block text-xs text-slate-400 mt-1.5">
                      Consultation window: <strong className="text-slate-800 font-tabular">{activeSlot} - {add30Minutes(activeSlot)}</strong>
                    </span>
                  </div>

                  {/* Contact Phone */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5 text-xs">
                      Patient Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        placeholder="+855 12 345 678"
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#aa5588]/20 focus:border-[#aa5588]"
                      />
                    </div>
                  </div>

                  {/* Reason for Visit */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5 text-xs">
                      Reason for Consultation / Symptoms *
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Briefly describe your symptoms or medical concern..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#aa5588]/20 focus:border-[#aa5588] resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 rounded-xl bg-[#aa5588] hover:bg-[#924472] text-white font-bold text-sm shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing Booking...</span>
                      </>
                    ) : !isAuthenticated ? (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Book Consultation (Sign In to Confirm)</span>
                      </>
                    ) : isBookingPending ? (
                      <span>Confirm & Proceed to Payment (${doctor.consultationFee.toFixed(2)} USD)</span>
                    ) : (
                      `Continue to Payment (${doctor.consultationFee.toFixed(2)} USD)`
                    )}
                  </button>

                  {!isAuthenticated ? (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-500 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                        <Sparkles className="w-3.5 h-3.5 text-[#aa5588]" />
                        <span>Explore freely as our guest</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-500">
                        No sign-in is required to explore doctors and schedules. When you click Book, your chosen date, time slot, and medical notes are safely preserved.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center leading-relaxed">
                      Choose between Cambodian Bakong KHQR, Credit Card, or Pay at Clinic on the next step.
                    </p>
                  )}
                </form>
              </div>
            )}
            </div>
          </div>
        </div>
      </main>

      {/* Payment Checkout Modal */}
      {doctor && (
        <PaymentCheckoutModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          appointmentId={pendingAppointmentId || undefined}
          doctorName={doctor.name}
          specialtyName={doctor.specialties?.map((s) => s.name).join(', ')}
          branchName={doctor.branchName}
          appointmentDate={appointmentDate}
          startTime={activeSlot}
          consultationFee={doctor.consultationFee}
          onConfirmPayment={handleConfirmBookingWithPayment}
          isSubmitting={submitting}
        />
      )}
    </div>
  );
}

export default function DoctorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-[#aa5588] selection:text-white">
          <Navbar />
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#aa5588] mb-2" />
          </div>
        </div>
      }
    >
      <DoctorDetailContent id={resolvedParams.id} />
    </Suspense>
  );
}
