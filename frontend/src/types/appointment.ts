export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'REJECTED';
export type QueueStatus = 'WAITING' | 'CALLING' | 'IN_CONSULTATION' | 'COMPLETED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'PENDING_AT_CLINIC' | 'REFUNDED';
export type PaymentMethod = 'KHQR' | 'BAKONG' | 'CREDIT_CARD' | 'CASH';

export interface PrescribedMedicationItem {
  id?: number | string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface BookAppointmentRequest {
  doctorId: number;
  appointmentDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  patientPhone?: string;
  reason: string;
  paymentMethod?: PaymentMethod | string;
  paymentStatus?: PaymentStatus | string;
  paidAmount?: number;
  paymentTransactionId?: string;
}

export interface CompleteConsultationRequest {
  diagnosis: string;
  clinicalNotes?: string;
  prescribedMedications?: string; // JSON string of PrescribedMedicationItem[]
}

export interface CallQueueRequest {
  roomNumber?: string;
}

export interface UpdateAppointmentStatusRequest {
  status: AppointmentStatus;
  rejectionReason?: string;
}

export interface AppointmentResponse {
  id: number;
  doctorId: number;
  doctorName: string;
  doctorEmail: string;
  doctorAddress?: string;
  branchName?: string;
  consultationFee: number;
  patientUserId: number;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  reason: string;
  status: AppointmentStatus;
  rejectionReason?: string;
  cancellationReason?: string;
  cancelledByRole?: string;
  rescheduledFromDate?: string;
  rescheduledFromStart?: string;
  rescheduledFromEnd?: string;
  hasMedicalRecord?: boolean;
  medicalRecordId?: number | null;
  // Queue & Check-In
  queueNumber?: string;
  queueStatus?: QueueStatus | string;
  checkInTime?: string;
  roomNumber?: string;
  // Payment
  paymentStatus?: PaymentStatus | string;
  paymentMethod?: PaymentMethod | string;
  paidAmount?: number;
  paymentTransactionId?: string;
  paidAt?: string;
  // Post-Consultation Summary & Digital Prescription
  diagnosis?: string;
  clinicalNotes?: string;
  prescribedMedications?: string;
  completedAt?: string;
  createdAt: string;
}
