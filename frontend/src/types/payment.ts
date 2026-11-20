export interface InitiatePaymentRequest {
  appointmentId: number;
  paymentMethod?: string;
  currency?: string;
}

export interface InitiatePaymentResponse {
  transactionId: string;
  invoiceNumber: string;
  appointmentId: number;
  amount: number;
  currency: string;
  khqrString: string;
  khqrMd5Hash: string;
  qrImageBase64: string;
  bakongDeepLink: string;
  expiresAt: string;
  status: string;
}

export interface PaymentStatusResponse {
  transactionId: string;
  invoiceNumber: string;
  appointmentId: number;
  status: 'INITIALIZED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'REFUNDED';
  amount: number;
  currency: string;
  expiresAt?: string;
  verifiedAt?: string;
  failureReason?: string;
}

export interface VerifyPaymentResponse {
  transactionId: string;
  invoiceNumber: string;
  status: string;
  amount: number;
  currency: string;
  verifiedAt?: string;
  payerAccountId?: string;
  payerName?: string;
  message: string;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  appointmentId: number;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  branchName?: string;
  departmentName?: string;
  subtotal: number;
  tax: number;
  totalAmount: number;
  currency: string;
  status: 'UNPAID' | 'PAID' | 'VOID' | 'EXPIRED' | 'REFUNDED';
  dueDate?: string;
  paidAt?: string;
  paymentMethod?: string;
  paymentTransactionId?: string;
  createdAt: string;
}

export interface NotificationSetting {
  id?: number;
  telegramBotToken?: string;
  telegramFinanceChatId?: string;
  telegramOperationsChatId?: string;
  telegramAdminChatId?: string;
  telegramEnabled: boolean;
  notifyOnPayment: boolean;
  notifyOnCheckIn: boolean;
  notifyOnAppointmentBooked: boolean;
  notifyOnAppointmentCancelled: boolean;
  updatedBy?: string;
  updatedAt?: string;
}

export interface NotificationDeliveryLog {
  id: number;
  channel: 'IN_APP' | 'TELEGRAM' | 'EMAIL';
  eventType: string;
  recipientTarget: string;
  branchName?: string;
  departmentName?: string;
  title: string;
  messagePreview: string;
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  errorDetails?: string;
  createdAt: string;
}
