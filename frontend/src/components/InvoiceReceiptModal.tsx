'use client';

import React from 'react';
import {
  X,
  Printer,
  CheckCircle2,
  ShieldCheck,
  Building2,
  User,
  Stethoscope,
  Calendar,
  Clock,
  Download,
} from 'lucide-react';
import { Invoice } from '@/types/payment';

interface InvoiceReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
}

export default function InvoiceReceiptModal({
  isOpen,
  onClose,
  invoice,
}: InvoiceReceiptModalProps) {
  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const currencySymbol = invoice.currency === 'KHR' ? '៛' : '$';
  const formattedTotal =
    invoice.currency === 'KHR'
      ? `${Number(invoice.totalAmount).toLocaleString()} KHR`
      : `$${Number(invoice.totalAmount).toFixed(2)} USD`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 print:border-none print:shadow-none print:my-0">
        {/* Top Action Bar (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm tracking-wide">Official Hospital Invoice & Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div className="p-8 sm:p-10 space-y-6 text-slate-800" id="printable-receipt">
          {/* Hospital Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start border-b border-slate-200 pb-6 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#aa5588] text-white flex items-center justify-center font-black text-lg shadow-sm">
                  +
                </div>
                <span className="text-xl font-black text-slate-900 tracking-tight">
                  MundulCare Health
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                {invoice.branchName || 'Main Campus (Phnom Penh)'}
                <br />
                Kingdom of Cambodia · Licensed Healthcare Provider
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{invoice.status}</span>
              </span>
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                Invoice Number
              </div>
              <div className="font-mono font-bold text-slate-900 text-sm">
                {invoice.invoiceNumber}
              </div>
            </div>
          </div>

          {/* Billing Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            {/* Patient Info */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">
                Billed To (Patient)
              </span>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <User className="w-4 h-4 text-[#aa5588]" />
                <span>{invoice.patientName}</span>
              </div>
              {invoice.patientEmail && (
                <div className="text-slate-600">{invoice.patientEmail}</div>
              )}
              {invoice.patientPhone && (
                <div className="text-slate-600 font-tabular">{invoice.patientPhone}</div>
              )}
            </div>

            {/* Consultation Details */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">
                Attending Physician & Campus
              </span>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-[#aa5588]" />
                <span>{invoice.doctorName || 'Specialist Physician'}</span>
              </div>
              <div className="text-slate-600">
                Department: {invoice.departmentName || 'General Medicine'}
              </div>
              <div className="text-slate-600 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{invoice.branchName || 'Main Campus'}</span>
              </div>
            </div>
          </div>

          {/* Invoice Item Table */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Service Description</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Rate</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">
                      Outpatient Clinical Consultation
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      Specialist examination, symptom triage, diagnosis & medical prescription review
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono">1</td>
                  <td className="py-3.5 px-4 text-right font-mono font-medium">
                    ${Number(invoice.subtotal).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                    ${Number(invoice.subtotal).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Financial Totals */}
          <div className="flex justify-end">
            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-mono font-medium">${Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Government Tax (0%)</span>
                <span className="font-mono font-medium">$0.00</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-bold text-slate-900">
                <span>Total Paid</span>
                <span className="font-mono text-[#aa5588] text-base">{formattedTotal}</span>
              </div>
            </div>
          </div>

          {/* Bank Verification Seal & Footer */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900 space-y-1">
              <div className="font-bold">
                Authentic NBC Bakong KHQR Payment
              </div>
              <p className="text-[11px] text-emerald-700">
                This transaction has been digitally verified through the National Bank of Cambodia (NBC) Bakong network.
                {invoice.paidAt && (
                  <span> Payment completed at {new Date(invoice.paidAt).toLocaleString()}.</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
