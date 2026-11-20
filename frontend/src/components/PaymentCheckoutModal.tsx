'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  CreditCard,
  Building,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowRight,
  Clock,
  Copy,
  ExternalLink,
  RefreshCw,
  QrCode,
} from 'lucide-react';
import { PaymentMethod } from '@/types/appointment';
import { paymentApi } from '@/lib/api';
import { InitiatePaymentResponse } from '@/types/payment';

interface PaymentCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId?: number;
  doctorName: string;
  specialtyName?: string;
  branchName?: string;
  appointmentDate: string;
  startTime: string;
  consultationFee: number;
  onConfirmPayment: (paymentDetails: {
    paymentMethod: PaymentMethod;
    paymentStatus: string;
    paidAmount: number;
    paymentTransactionId: string;
  }) => void;
  isSubmitting?: boolean;
}

export default function PaymentCheckoutModal({
  isOpen,
  onClose,
  appointmentId,
  doctorName,
  specialtyName,
  branchName,
  appointmentDate,
  startTime,
  consultationFee,
  onConfirmPayment,
  isSubmitting = false,
}: PaymentCheckoutModalProps) {
  if (!isOpen) return null;

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('KHQR');
  const [loadingQr, setLoadingQr] = useState(false);
  const [qrData, setQrData] = useState<InitiatePaymentResponse | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [verifySuccess, setVerifySuccess] = useState(false);

  const [secondsRemaining, setSecondsRemaining] = useState(600); // 10 minutes
  const [copied, setCopied] = useState(false);

  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardError, setCardError] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fee = consultationFee || 25;

  // Fetch or initialize KHQR when modal opens with appointmentId
  useEffect(() => {
    let active = true;

    if (isOpen && selectedMethod === 'KHQR' && appointmentId) {
      setLoadingQr(true);
      setQrError(null);
      setVerifyMessage(null);
      setVerifySuccess(false);

      paymentApi
        .initiate({
          appointmentId,
          paymentMethod: 'KHQR',
          currency: 'USD',
        })
        .then((res) => {
          if (!active) return;
          if (res.success && res.data) {
            setQrData(res.data);
            if (res.data.expiresAt) {
              const diffMs = new Date(res.data.expiresAt).getTime() - Date.now();
              const diffSec = Math.max(0, Math.floor(diffMs / 1000));
              setSecondsRemaining(diffSec > 0 ? diffSec : 600);
            }
          } else {
            setQrError(res.message || 'Failed to generate genuine KHQR code');
          }
        })
        .catch((err) => {
          if (!active) return;
          setQrError(err.response?.data?.message || 'Error generating Bakong QR code');
        })
        .finally(() => {
          if (active) setLoadingQr(false);
        });
    }

    return () => {
      active = false;
    };
  }, [isOpen, selectedMethod, appointmentId]);

  // Countdown timer for 10-minute KHQR validity
  useEffect(() => {
    if (!isOpen || selectedMethod !== 'KHQR' || !qrData || verifySuccess) return;

    countdownIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isOpen, selectedMethod, qrData, verifySuccess]);

  // Automatic Background Polling for real transaction completion
  useEffect(() => {
    if (!isOpen || selectedMethod !== 'KHQR' || !qrData?.transactionId || verifySuccess) {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      return;
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await paymentApi.getStatus(qrData.transactionId);
        if (res.success && res.data?.status === 'SUCCESS') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setVerifySuccess(true);
          setVerifyMessage('Payment verified via NBC Bakong network!');
          setTimeout(() => {
            onConfirmPayment({
              paymentMethod: 'KHQR',
              paymentStatus: 'PAID',
              paidAmount: res.data?.amount || fee,
              paymentTransactionId: res.data?.transactionId || qrData.transactionId,
            });
          }, 1500);
        } else if (res.data?.status === 'EXPIRED') {
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          setQrError('Payment window has expired. Please regenerate a new QR code.');
        }
      } catch (err) {
        // Silent poll error
      }
    }, 3500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, selectedMethod, qrData, verifySuccess]);

  const handleManualVerify = async () => {
    if (!qrData?.transactionId) return;
    setVerifying(true);
    setVerifyMessage(null);
    try {
      const res = await paymentApi.verify(qrData.transactionId);
      if (res.success && res.data?.status === 'SUCCESS') {
        setVerifySuccess(true);
        setVerifyMessage(res.message || 'Payment successfully confirmed!');
        setTimeout(() => {
          onConfirmPayment({
            paymentMethod: 'KHQR',
            paymentStatus: 'PAID',
            paidAmount: res.data?.amount || fee,
            paymentTransactionId: res.data?.transactionId || qrData.transactionId,
          });
        }, 1200);
      } else {
        setVerifyMessage(res.message || 'Payment not yet detected. Please check your banking app.');
      }
    } catch (err: any) {
      setVerifyMessage(err.response?.data?.message || 'Verification error. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleCopyKhqr = () => {
    if (!qrData?.khqrString) return;
    navigator.clipboard.writeText(qrData.khqrString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCashOrCardSubmit = () => {
    setCardError(null);

    if (selectedMethod === 'CREDIT_CARD') {
      if (!cardNumber || cardNumber.replace(/\s/g, '').length < 16) {
        setCardError('Please enter a valid 16-digit card number.');
        return;
      }
      if (!cardExpiry || !cardExpiry.includes('/')) {
        setCardError('Please enter a valid expiration date (MM/YY).');
        return;
      }
      if (!cardCvv || cardCvv.length < 3) {
        setCardError('Please enter a valid 3-digit CVV code.');
        return;
      }

      onConfirmPayment({
        paymentMethod: 'CREDIT_CARD',
        paymentStatus: 'PAID',
        paidAmount: fee,
        paymentTransactionId: `TXN-CARD-${Date.now().toString().slice(-8)}`,
      });
      return;
    }

    if (selectedMethod === 'CASH') {
      onConfirmPayment({
        paymentMethod: 'CASH',
        paymentStatus: 'PENDING_AT_CLINIC',
        paidAmount: fee,
        paymentTransactionId: `TXN-CASH-${Date.now().toString().slice(-8)}`,
      });
    }
  };

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#dd99bb]" />
            <span className="font-bold text-sm tracking-wide">MundulCare Consultation Payment</span>
          </div>
          <button
            onClick={onClose}
            disabled={verifying || isSubmitting}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-6 max-h-[85vh] overflow-y-auto">
          {/* Order Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Consultation Booking
                </span>
                <h3 className="font-bold text-slate-900 text-base">{doctorName}</h3>
                <p className="text-xs text-slate-500">
                  {specialtyName || 'Specialist Consultation'} · {branchName || 'MundulCare'}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-600 mt-1 font-tabular">
                  <span>{appointmentDate}</span>
                  <span>•</span>
                  <span>{startTime}</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Amount Due</span>
                <div className="text-2xl font-black text-[#aa5588] font-tabular">
                  ${fee.toFixed(2)}
                </div>
                <span className="text-[10px] text-slate-400 uppercase">USD / KHR Equiv.</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
              Select Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Bakong KHQR */}
              <button
                type="button"
                onClick={() => setSelectedMethod('KHQR')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center cursor-pointer ${
                  selectedMethod === 'KHQR'
                    ? 'border-[#aa5588] bg-[#fbf5f8] text-[#aa5588] ring-2 ring-[#aa5588]/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-xs shadow-xs mb-1.5">
                  KHQR
                </div>
                <span className="font-bold text-xs">Bakong KHQR</span>
                <span className="text-[10px] text-slate-400 mt-0.5">ABA, Wing, ACLEDA</span>
              </button>

              {/* Credit / Debit Card */}
              <button
                type="button"
                onClick={() => setSelectedMethod('CREDIT_CARD')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center cursor-pointer ${
                  selectedMethod === 'CREDIT_CARD'
                    ? 'border-[#aa5588] bg-[#fbf5f8] text-[#aa5588] ring-2 ring-[#aa5588]/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs mb-1.5">
                  <CreditCard className="w-5 h-5" />
                </div>
                <span className="font-bold text-xs">Card Payment</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Visa, Mastercard</span>
              </button>

              {/* Pay at Clinic */}
              <button
                type="button"
                onClick={() => setSelectedMethod('CASH')}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all text-center cursor-pointer ${
                  selectedMethod === 'CASH'
                    ? 'border-[#aa5588] bg-[#fbf5f8] text-[#aa5588] ring-2 ring-[#aa5588]/20 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white text-slate-600'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-slate-700 text-white flex items-center justify-center shadow-xs mb-1.5">
                  <Building className="w-5 h-5" />
                </div>
                <span className="font-bold text-xs">Pay at Clinic</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Cash / Counter</span>
              </button>
            </div>
          </div>

          {/* Genuine NBC Bakong KHQR UI */}
          {selectedMethod === 'KHQR' && (
            <div className="p-5 rounded-3xl bg-linear-to-b from-red-50/70 via-white to-slate-50 border border-red-200/80 flex flex-col items-center text-center space-y-4">
              {/* Bakong KHQR Header Banner */}
              <div className="w-full max-w-xs bg-red-600 text-white rounded-xl py-1.5 px-4 flex items-center justify-between shadow-xs">
                <span className="font-black text-sm tracking-widest">KHQR</span>
                <span className="text-[11px] font-semibold opacity-95">National Bank of Cambodia</span>
              </div>

              {/* Dynamic QR Display or Loader */}
              {loadingQr ? (
                <div className="w-56 h-56 bg-white p-4 rounded-2xl border-2 border-red-400 shadow-md flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-red-600 mb-2" />
                  <span className="text-xs font-semibold">Generating Dynamic KHQR...</span>
                </div>
              ) : qrError ? (
                <div className="w-full max-w-sm p-4 rounded-2xl bg-red-50 border border-red-200 text-left text-xs text-red-700 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-red-800">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span>KHQR Generation Note</span>
                  </div>
                  <p>{qrError}</p>
                </div>
              ) : qrData?.qrImageBase64 ? (
                <div className="relative group">
                  <div className="w-56 h-56 bg-white p-3 rounded-2xl border-2 border-red-500 shadow-lg flex items-center justify-center overflow-hidden">
                    <img
                      src={qrData.qrImageBase64}
                      alt="National Bank of Cambodia Genuine KHQR"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {verifySuccess && (
                    <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-white p-4 space-y-2 animate-in fade-in zoom-in-95 duration-200">
                      <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>
                      <span className="font-bold text-sm">Payment Verified!</span>
                      <span className="text-[11px] text-emerald-200 text-center">
                        Notifying Finance & Doctor...
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-xs text-slate-400">
                  Select payment to render Bakong QR.
                </div>
              )}

              {/* Merchant & Countdown Info */}
              <div className="space-y-1">
                <div className="font-extrabold text-sm text-slate-900">MundulCare Health System</div>
                <div className="text-xs text-slate-500">
                  Scan with Bakong, ABA Mobile, Wing, ACLEDA, or any KHQR banking app
                </div>
                <div className="text-sm font-mono font-black text-red-600 pt-0.5">
                  ${fee.toFixed(2)} USD
                </div>

                {/* Live Validity Countdown */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[11px] font-mono font-bold text-slate-700 mt-2">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Valid for: {formatCountdown(secondsRemaining)}</span>
                </div>
              </div>

              {/* Interactive Actions: Copy KHQR & Deep Link */}
              {qrData && (
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full max-w-sm">
                  <button
                    type="button"
                    onClick={handleCopyKhqr}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                    <span>{copied ? 'Copied!' : 'Copy KHQR'}</span>
                  </button>

                  <a
                    href={qrData.bakongDeepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Bakong App</span>
                  </a>
                </div>
              )}

              {/* Verification Message */}
              {verifyMessage && (
                <div
                  className={`w-full max-w-sm p-3 rounded-xl text-xs flex items-center gap-2 text-left ${
                    verifySuccess
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                      : 'bg-amber-50 border border-amber-200 text-amber-800'
                  }`}
                >
                  {verifySuccess ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  )}
                  <span>{verifyMessage}</span>
                </div>
              )}

              {/* Manual Verification Button */}
              {qrData && !verifySuccess && (
                <div className="w-full max-w-sm pt-1">
                  <button
                    type="button"
                    onClick={handleManualVerify}
                    disabled={verifying}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-red-400" />
                        <span>Verifying with NBC Bakong...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>I Have Completed Payment — Verify Now</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Credit Card Form */}
          {selectedMethod === 'CREDIT_CARD' && (
            <div className="space-y-3.5">
              {cardError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{cardError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cardholder Name</label>
                <input
                  type="text"
                  placeholder="e.g. SOK CHANTHA"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#aa5588]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Card Number</label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={19}
                    placeholder="4111 2222 3333 4444"
                    value={cardNumber}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 16);
                      const parts = v.match(/.{1,4}/g);
                      setCardNumber(parts ? parts.join(' ') : v);
                    }}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#aa5588] font-mono"
                  />
                  <CreditCard className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Expiry (MM/YY)</label>
                  <input
                    type="text"
                    maxLength={5}
                    placeholder="12/28"
                    value={cardExpiry}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                      if (v.length >= 2) v = v.slice(0, 2) + '/' + v.slice(2);
                      setCardExpiry(v);
                    }}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#aa5588] font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">CVV / CVC</label>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="123"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#aa5588] font-mono text-center"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleCashOrCardSubmit}
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-[#aa5588] hover:bg-[#924472] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <span>Authorize Card (${fee.toFixed(2)})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Pay at Clinic Notice */}
          {selectedMethod === 'CASH' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-800 space-y-2">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <Clock className="w-4 h-4" />
                  <span>Pay at the Hospital Reception Desk</span>
                </div>
                <p>
                  Your consultation appointment will be reserved. When arriving at MundulCare, simply present your queue ticket number at the front counter to settle your consultation fee in cash or card.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCashOrCardSubmit}
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Confirm Booking (Pay on Arrival)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
