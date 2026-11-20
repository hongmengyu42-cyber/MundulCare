'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  XCircle,
  Loader2,
  AlertCircle,
  Stethoscope,
  ArrowRight,
  FileText,
  CreditCard,
  BellRing,
  Ticket,
  Receipt,
  QrCode,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import PrescriptionSlipModal from '@/components/PrescriptionSlipModal';
import InvoiceReceiptModal from '@/components/InvoiceReceiptModal';
import PaymentCheckoutModal from '@/components/PaymentCheckoutModal';
import { appointmentApi, invoiceApi } from '@/lib/api';
import { AppointmentResponse, PaymentMethod } from '@/types/appointment';
import { Invoice } from '@/types/payment';
import { useAuth } from '@/context/AuthContext';
import { getDoctorAvatarUrl } from '@/lib/doctorAvatar';

export default function MyAppointmentsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedPrescriptionApt, setSelectedPrescriptionApt] = useState<AppointmentResponse | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [payingAppointment, setPayingAppointment] = useState<AppointmentResponse | null>(null);

  const handleViewInvoice = async (appointmentId: number) => {
    setLoadingInvoice(true);
    try {
      const res = await invoiceApi.getByAppointmentId(appointmentId);
      if (res.success && res.data) {
        setSelectedInvoice(res.data);
      } else {
        alert(res.message || 'Invoice not found for this consultation');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to load official hospital invoice');
    } finally {
      setLoadingInvoice(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/my-appointments');
    } else if (isAuthenticated) {
      fetchMyAppointments();
    }
  }, [isAuthenticated, authLoading]);

  const fetchMyAppointments = async () => {
    try {
      const res = await appointmentApi.getMyAppointments();
      if (res.success && res.data) {
        setAppointments(res.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load your consultations.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async (id: number) => {
    if (!confirm('Are you sure you wish to cancel this scheduled consultation?')) return;
    setCancellingId(id);
    try {
      const res = await appointmentApi.cancel(id);
      if (res.success) {
        fetchMyAppointments();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel appointment');
    } finally {
      setCancellingId(null);
    }
  };

  // Status colors: Green (Confirmed/Completed), Yellow/Orange (Pending), Red (Cancelled/Rejected)
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
            Confirmed
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
            Completed
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300">
            Declined
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300">
            Pending Review
          </span>
        );
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'ACTIVE') return apt.status === 'PENDING' || apt.status === 'CONFIRMED';
    if (filterStatus === 'CANCELLED') return apt.status === 'CANCELLED' || apt.status === 'REJECTED';
    return apt.status === filterStatus;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#aa5588] mb-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col selection:bg-[#aa5588] selection:text-white">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fbf5f8] border border-[#edd5e3] text-[#aa5588] text-xs font-semibold mb-2">
              <Calendar className="w-3.5 h-3.5 text-[#aa5588]" />
              <span>Patient Consultations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              My Scheduled Appointments
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Review upcoming consultation schedules, hospital room assignments, and visit statuses.
            </p>
          </div>

          <Link
            href="/doctors"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#aa5588] hover:bg-[#924472] text-white font-semibold text-xs shadow-xs transition-colors self-start sm:self-auto"
          >
            <span>Book New Visit</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-6 overflow-x-auto">
          {[
            { label: 'All Consultations', value: 'ALL' },
            { label: 'Pending Review', value: 'PENDING' },
            { label: 'Confirmed', value: 'CONFIRMED' },
            { label: 'Completed', value: 'COMPLETED' },
            { label: 'Cancelled / Declined', value: 'CANCELLED' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilterStatus(tab.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                filterStatus === tab.value
                  ? 'bg-[#aa5588] text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:bg-[#fbf5f8] hover:text-[#aa5588] border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-xs sm:text-sm text-red-700">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Appointments List */}
        {filteredAppointments.length > 0 ? (
          <div className="space-y-4">
            {filteredAppointments.map((apt) => {
              const avatarUrl = getDoctorAvatarUrl(apt.doctorName, undefined, null);

              return (
                <div
                  key={apt.id}
                  className={`bg-white rounded-2xl border p-5 sm:p-6 shadow-xs transition-colors ${
                    apt.queueStatus === 'CALLING'
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'border-slate-200/90 hover:border-[#aa5588]/40'
                  }`}
                >
                  {/* Calling Alert Banner */}
                  {apt.queueStatus === 'CALLING' && (
                    <div className="p-3.5 mb-4 rounded-xl bg-emerald-600 text-white flex items-center justify-between shadow-md animate-pulse">
                      <div className="flex items-center gap-2.5">
                        <BellRing className="w-5 h-5 shrink-0" />
                        <div>
                          <span className="font-black text-sm block">NOW CALLING: Ticket {apt.queueNumber}</span>
                          <span className="text-xs text-emerald-100">
                            Dr. {apt.doctorName} is ready for you in <strong>{apt.roomNumber || 'Consultation Room'}</strong>. Please proceed now!
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-white/20 font-mono font-black text-xs">
                        {apt.queueNumber}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
                        <img
                          src={avatarUrl}
                          alt={apt.doctorName}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                          {apt.doctorName}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-semibold text-[#aa5588] font-tabular">
                            Fee: ${apt.consultationFee?.toFixed(2)}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-500">
                            {apt.branchName || 'MundulCare Main Campus'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                      {/* Queue Ticket Pill */}
                      {apt.queueNumber && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                          <Ticket className="w-3.5 h-3.5" />
                          <span>{apt.queueNumber} ({apt.queueStatus || 'WAITING'})</span>
                        </span>
                      )}

                      {/* Payment Status Pill */}
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        apt.paymentStatus === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {apt.paymentStatus === 'PAID'
                          ? `${apt.paymentMethod || 'KHQR'} Paid`
                          : 'Pay on Arrival'}
                      </span>

                      {/* Payment Action: Receipt or Pay Now */}
                      {apt.paymentStatus === 'PAID' ? (
                        <button
                          type="button"
                          onClick={() => handleViewInvoice(apt.id)}
                          disabled={loadingInvoice}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                          title="View Official Receipt"
                        >
                          <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Receipt</span>
                        </button>
                      ) : (
                        apt.status !== 'CANCELLED' &&
                        apt.status !== 'REJECTED' && (
                          <button
                            type="button"
                            onClick={() => setPayingAppointment(apt)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-2xs transition-colors cursor-pointer"
                            title="Pay with Genuine Bakong KHQR"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Pay KHQR</span>
                          </button>
                        )
                      )}

                      {getStatusBadge(apt.status)}

                      {apt.status === 'PENDING' && (
                        <button
                          onClick={() => handleCancelAppointment(apt.id)}
                          disabled={cancellingId === apt.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Cancel Consultation"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Consultation Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#aa5588] shrink-0" />
                      <div>
                        <span className="text-slate-400 block text-[10px]">Date</span>
                        <strong className="text-slate-800 font-tabular text-sm">{apt.appointmentDate}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#aa5588] shrink-0" />
                      <div>
                        <span className="text-slate-400 block text-[10px]">Time Window</span>
                        <strong className="text-slate-800 font-tabular text-sm">
                          {apt.startTime} - {apt.endTime}
                        </strong>
                      </div>
                    </div>

                    {apt.roomNumber && (
                      <div className="flex items-center gap-2">
                        <Stethoscope className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="text-slate-400 block text-[10px]">Assigned Room</span>
                          <strong className="text-slate-800 text-xs">{apt.roomNumber}</strong>
                        </div>
                      </div>
                    )}

                    {apt.reason && (
                      <div className="sm:col-span-3 pt-1 text-slate-600">
                        <span className="text-slate-400 text-[10px] block">Reported Symptoms:</span>
                        <p className="text-sm text-slate-800 mt-0.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          {apt.reason}
                        </p>
                      </div>
                    )}

                    {/* Post-Consultation Prescription Actions */}
                    {(apt.status === 'COMPLETED' || apt.diagnosis) && (
                      <div className="sm:col-span-3 pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/80">
                        <div>
                          <span className="font-bold text-slate-900 text-xs block">
                            Consultation Completed & Clinical Prescription Ready
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {apt.diagnosis ? `Diagnosis: ${apt.diagnosis}` : 'Doctor completed consultation notes.'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedPrescriptionApt(apt)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#aa5588] hover:bg-[#924472] text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer shrink-0"
                        >
                          <FileText className="w-4 h-4" />
                          <span>View Digital Prescription</span>
                        </button>
                      </div>
                    )}

                    {apt.rejectionReason && (
                      <div className="sm:col-span-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                        <strong>Reason for Decline: </strong>
                        {apt.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200/90 p-8">
            <div className="w-12 h-12 rounded-full bg-[#fbf5f8] text-[#aa5588] flex items-center justify-center mx-auto mb-3">
              <Stethoscope className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No appointments found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              You do not have any appointments under this status filter.
            </p>
            <Link
              href="/doctors"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#aa5588] text-white font-semibold text-xs shadow-xs"
            >
              <span>Schedule a Specialist Visit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </main>

      {/* Printable Digital Prescription Slip Modal */}
      <PrescriptionSlipModal
        isOpen={!!selectedPrescriptionApt}
        onClose={() => setSelectedPrescriptionApt(null)}
        appointment={selectedPrescriptionApt}
      />

      {/* Official Hospital Consultation Invoice Modal */}
      <InvoiceReceiptModal
        isOpen={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
        invoice={selectedInvoice}
      />

      {/* Real NBC Bakong KHQR Payment Checkout Modal */}
      {payingAppointment && (
        <PaymentCheckoutModal
          isOpen={!!payingAppointment}
          onClose={() => setPayingAppointment(null)}
          appointmentId={payingAppointment.id}
          doctorName={payingAppointment.doctorName}
          branchName={payingAppointment.branchName}
          appointmentDate={payingAppointment.appointmentDate}
          startTime={payingAppointment.startTime}
          consultationFee={payingAppointment.paidAmount || 25}
          onConfirmPayment={() => {
            setPayingAppointment(null);
            fetchMyAppointments();
          }}
        />
      )}
    </div>
  );
}
