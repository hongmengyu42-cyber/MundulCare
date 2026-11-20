import axios from 'axios';
import {
  AdminPatient,
  AdminPatientRequest,
  AdminUserAccount,
  ApiResponse,
  AuditLogEntry,
  AuthResponse,
  BranchRecommendation,
  ChangePasswordRequest,
  CreateAdminUserRequest,
  ForgotPasswordRequest,
  GoogleAuthRequest,
  HospitalBranch,
  HospitalBranchRequest,
  LoginRequest,
  MaintenanceStatus,
  RegisterRequest,
  ResetPasswordRequest,
  ResendOtpRequest,
  StaffMember,
  StaffRequest,
  UpdateProfileRequest,
  UpdateUserPrivilegesRequest,
  UserProfile,
  VerifyOtpRequest,
} from '@/types/auth';
import {
  Doctor,
  DoctorRequest,
  Specialty,
  SpecialtyRequest,
  SymptomMatchRequest,
  SymptomMatchResponse,
} from '@/types/doctor';
import {
  AppointmentResponse,
  AppointmentStatus,
  BookAppointmentRequest,
  CallQueueRequest,
  CompleteConsultationRequest,
  UpdateAppointmentStatusRequest,
} from '@/types/appointment';
import {
  AmendMedicalRecordRequest,
  CreateMedicalRecordRequest,
  CreatePrescriptionRequest,
  DoctorAppointmentActionRequest,
  DoctorDashboardData,
  DoctorPatientDetail,
  DoctorPatientSummary,
  DoctorScheduleCalendar,
  DoctorScheduleUpdateRequest,
  MedicalRecord,
  NotificationItem,
  PatientMedicalProfile,
  PatientMedicalProfileRequest,
  Prescription,
  RescheduleAppointmentRequest,
  UnavailableDateRequest,
  UpdateDoctorOwnProfileRequest,
} from '@/types/doctorPortal';
import { UnavailableDate } from '@/types/doctor';
import {
  InitiatePaymentRequest,
  InitiatePaymentResponse,
  PaymentStatusResponse,
  VerifyPaymentResponse,
  Invoice,
  NotificationSetting,
  NotificationDeliveryLog,
} from '@/types/payment';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT Bearer token to every request if present
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto-logout on 401 (expired/invalid token) — redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error?.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login?session=expired';
    }
    return Promise.reject(error);
  }
);

// 1. Authentication API
export const authApi = {
  register: async (data: RegisterRequest): Promise<ApiResponse<string>> => {
    const res = await api.post<ApiResponse<string>>('/auth/register', data);
    return res.data;
  },

  verifyEmail: async (data: VerifyOtpRequest): Promise<ApiResponse<AuthResponse>> => {
    const res = await api.post<ApiResponse<AuthResponse>>('/auth/verify-email', data);
    return res.data;
  },

  login: async (data: LoginRequest): Promise<ApiResponse<AuthResponse>> => {
    const res = await api.post<ApiResponse<AuthResponse>>('/auth/login', data);
    return res.data;
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<ApiResponse<string>> => {
    const res = await api.post<ApiResponse<string>>('/auth/forgot-password', data);
    return res.data;
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<ApiResponse<string>> => {
    const res = await api.post<ApiResponse<string>>('/auth/reset-password', data);
    return res.data;
  },

  resendOtp: async (data: ResendOtpRequest): Promise<ApiResponse<string>> => {
    const res = await api.post<ApiResponse<string>>('/auth/resend-otp', data);
    return res.data;
  },

  googleLogin: async (data: GoogleAuthRequest): Promise<ApiResponse<AuthResponse>> => {
    const res = await api.post<ApiResponse<AuthResponse>>('/auth/google', data);
    return res.data;
  },
};

// 2. Specialties API
export const specialtyApi = {
  getAll: async (): Promise<ApiResponse<Specialty[]>> => {
    const res = await api.get<ApiResponse<Specialty[]>>('/specialties');
    return res.data;
  },

  getById: async (id: number): Promise<ApiResponse<Specialty>> => {
    const res = await api.get<ApiResponse<Specialty>>(`/specialties/${id}`);
    return res.data;
  },

  create: async (data: SpecialtyRequest): Promise<ApiResponse<Specialty>> => {
    const res = await api.post<ApiResponse<Specialty>>('/specialties', data);
    return res.data;
  },

  update: async (id: number, data: SpecialtyRequest): Promise<ApiResponse<Specialty>> => {
    const res = await api.put<ApiResponse<Specialty>>(`/specialties/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<ApiResponse<string>> => {
    const res = await api.delete<ApiResponse<string>>(`/specialties/${id}`);
    return res.data;
  },
};

// 3. Doctors API
export const doctorApi = {
  getAll: async (params?: { specialtyId?: number; search?: string }): Promise<ApiResponse<Doctor[]>> => {
    const res = await api.get<ApiResponse<Doctor[]>>('/doctors', { params });
    return res.data;
  },

  // Admin-only: includes inactive/deactivated doctors so they stay manageable (e.g. reactivating them).
  getAllForAdmin: async (): Promise<ApiResponse<Doctor[]>> => {
    const res = await api.get<ApiResponse<Doctor[]>>('/doctors/admin/all');
    return res.data;
  },

  getById: async (id: number): Promise<ApiResponse<Doctor>> => {
    const res = await api.get<ApiResponse<Doctor>>(`/doctors/${id}`);
    return res.data;
  },

  create: async (data: DoctorRequest): Promise<ApiResponse<Doctor>> => {
    const res = await api.post<ApiResponse<Doctor>>('/doctors', data);
    return res.data;
  },

  update: async (id: number, data: DoctorRequest): Promise<ApiResponse<Doctor>> => {
    const res = await api.put<ApiResponse<Doctor>>(`/doctors/${id}`, data);
    return res.data;
  },

  delete: async (id: number): Promise<ApiResponse<string>> => {
    const res = await api.delete<ApiResponse<string>>(`/doctors/${id}`);
    return res.data;
  },

  uploadProfileImage: async (id: number, file: File): Promise<ApiResponse<string>> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<ApiResponse<string>>(`/doctors/${id}/profile-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  deleteProfileImage: async (id: number): Promise<ApiResponse<string>> => {
    const res = await api.delete<ApiResponse<string>>(`/doctors/${id}/profile-image`);
    return res.data;
  },

  provisionAccount: async (
    id: number,
    data: { email?: string; password: string }
  ): Promise<ApiResponse<Doctor>> => {
    const res = await api.post<ApiResponse<Doctor>>(`/doctors/${id}/account`, data);
    return res.data;
  },
};

// 4. AI Symptom Assistant API
export const aiApi = {
  matchSymptoms: async (data: SymptomMatchRequest): Promise<ApiResponse<SymptomMatchResponse>> => {
    const res = await api.post<ApiResponse<SymptomMatchResponse>>('/ai/symptom-match', data);
    return res.data;
  },
};

// 5. Appointments API
export const appointmentApi = {
  book: async (data: BookAppointmentRequest): Promise<ApiResponse<AppointmentResponse>> => {
    const res = await api.post<ApiResponse<AppointmentResponse>>('/appointments/book', data);
    return res.data;
  },

  getMyAppointments: async (): Promise<ApiResponse<AppointmentResponse[]>> => {
    const res = await api.get<ApiResponse<AppointmentResponse[]>>('/appointments/my-appointments');
    return res.data;
  },

  cancel: async (id: number): Promise<ApiResponse<AppointmentResponse>> => {
    const res = await api.put<ApiResponse<AppointmentResponse>>(`/appointments/${id}/cancel`);
    return res.data;
  },

  getAll: async (): Promise<ApiResponse<AppointmentResponse[]>> => {
    const res = await api.get<ApiResponse<AppointmentResponse[]>>('/appointments/all');
    return res.data;
  },

  updateStatus: async (
    id: number,
    data: UpdateAppointmentStatusRequest
  ): Promise<ApiResponse<AppointmentResponse>> => {
    const res = await api.put<ApiResponse<AppointmentResponse>>(`/appointments/${id}/status`, data);
    return res.data;
  },

  checkIn: async (id: number): Promise<ApiResponse<AppointmentResponse>> => {
    const res = await api.post<ApiResponse<AppointmentResponse>>(`/appointments/${id}/check-in`);
    return res.data;
  },

  callQueue: async (id: number, roomNumber?: string): Promise<ApiResponse<AppointmentResponse>> => {
    const res = await api.post<ApiResponse<AppointmentResponse>>(`/appointments/${id}/call-queue`, {
      roomNumber,
    });
    return res.data;
  },

  startConsultation: async (id: number): Promise<ApiResponse<AppointmentResponse>> => {
    const res = await api.post<ApiResponse<AppointmentResponse>>(`/appointments/${id}/start-consultation`);
    return res.data;
  },

  completeConsultation: async (
    id: number,
    data: CompleteConsultationRequest
  ): Promise<ApiResponse<AppointmentResponse>> => {
    const res = await api.post<ApiResponse<AppointmentResponse>>(`/appointments/${id}/complete-consultation`, data);
    return res.data;
  },

  getLiveQueue: async (branchName?: string): Promise<ApiResponse<AppointmentResponse[]>> => {
    const res = await api.get<ApiResponse<AppointmentResponse[]>>('/appointments/queue/live', {
      params: branchName ? { branchName } : undefined,
    });
    return res.data;
  },

  // Downloads the CSV and triggers a save-as in the browser (auth header can't be attached to a plain <a> link)
  exportCsv: async (): Promise<void> => {
    const res = await api.get('/appointments/export/csv', { responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'appointments.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

// 6. User Profile API (the logged-in user's own account)
export const userApi = {
  getMyProfile: async (): Promise<ApiResponse<UserProfile>> => {
    const res = await api.get<ApiResponse<UserProfile>>('/users/me');
    return res.data;
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<ApiResponse<UserProfile>> => {
    const res = await api.put<ApiResponse<UserProfile>>('/users/me', data);
    return res.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<ApiResponse<string>> => {
    const res = await api.put<ApiResponse<string>>('/users/me/password', data);
    return res.data;
  },

  uploadProfileImage: async (file: File): Promise<ApiResponse<string>> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<ApiResponse<string>>('/users/me/profile-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  deleteProfileImage: async (): Promise<ApiResponse<string>> => {
    const res = await api.delete<ApiResponse<string>>('/users/me/profile-image');
    return res.data;
  },
};

// 7. Admin Audit Log API
export const auditLogApi = {
  getAll: async (): Promise<ApiResponse<AuditLogEntry[]>> => {
    const res = await api.get<ApiResponse<AuditLogEntry[]>>('/admin/audit-logs');
    return res.data;
  },
};

// 8. System Settings API (maintenance mode)
export const settingsApi = {
  getMaintenanceStatus: async (): Promise<ApiResponse<MaintenanceStatus>> => {
    const res = await api.get<ApiResponse<MaintenanceStatus>>('/settings/maintenance');
    return res.data;
  },

  updateMaintenanceMode: async (enabled: boolean, message?: string): Promise<ApiResponse<MaintenanceStatus>> => {
    const res = await api.put<ApiResponse<MaintenanceStatus>>('/admin/settings/maintenance', { enabled, message });
    return res.data;
  },
};

// 8b. Admin Operations API (Patients, Staff, Branches & Locations, Roles & Privileges)
export const adminPatientApi = {
  getAll: async (): Promise<ApiResponse<AdminPatient[]>> => {
    const res = await api.get<ApiResponse<AdminPatient[]>>('/admin/patients');
    return res.data;
  },
  create: async (data: AdminPatientRequest): Promise<ApiResponse<AdminPatient>> => {
    const res = await api.post<ApiResponse<AdminPatient>>('/admin/patients', data);
    return res.data;
  },
  update: async (id: number, data: AdminPatientRequest): Promise<ApiResponse<AdminPatient>> => {
    const res = await api.put<ApiResponse<AdminPatient>>(`/admin/patients/${id}`, data);
    return res.data;
  },
  delete: async (id: number): Promise<ApiResponse<string>> => {
    const res = await api.delete<ApiResponse<string>>(`/admin/patients/${id}`);
    return res.data;
  },
};

export const adminStaffApi = {
  getAll: async (): Promise<ApiResponse<StaffMember[]>> => {
    const res = await api.get<ApiResponse<StaffMember[]>>('/admin/staff');
    return res.data;
  },
  create: async (data: StaffRequest): Promise<ApiResponse<StaffMember>> => {
    const res = await api.post<ApiResponse<StaffMember>>('/admin/staff', data);
    return res.data;
  },
  update: async (id: number, data: StaffRequest): Promise<ApiResponse<StaffMember>> => {
    const res = await api.put<ApiResponse<StaffMember>>(`/admin/staff/${id}`, data);
    return res.data;
  },
  delete: async (id: number): Promise<ApiResponse<string>> => {
    const res = await api.delete<ApiResponse<string>>(`/admin/staff/${id}`);
    return res.data;
  },
};

export const adminBranchApi = {
  getAll: async (): Promise<ApiResponse<HospitalBranch[]>> => {
    const res = await api.get<ApiResponse<HospitalBranch[]>>('/admin/branches');
    return res.data;
  },
  create: async (data: HospitalBranchRequest): Promise<ApiResponse<HospitalBranch>> => {
    const res = await api.post<ApiResponse<HospitalBranch>>('/admin/branches', data);
    return res.data;
  },
  update: async (id: number, data: HospitalBranchRequest): Promise<ApiResponse<HospitalBranch>> => {
    const res = await api.put<ApiResponse<HospitalBranch>>(`/admin/branches/${id}`, data);
    return res.data;
  },
  delete: async (id: number): Promise<ApiResponse<string>> => {
    const res = await api.delete<ApiResponse<string>>(`/admin/branches/${id}`);
    return res.data;
  },
  removeDirector: async (id: number): Promise<ApiResponse<HospitalBranch>> => {
    const res = await api.delete<ApiResponse<HospitalBranch>>(`/admin/branches/${id}/director`);
    return res.data;
  },
};

export const adminRoleApi = {
  getAllUsers: async (): Promise<ApiResponse<AdminUserAccount[]>> => {
    const res = await api.get<ApiResponse<AdminUserAccount[]>>('/admin/users');
    return res.data;
  },
  createUser: async (data: CreateAdminUserRequest): Promise<ApiResponse<AdminUserAccount>> => {
    const res = await api.post<ApiResponse<AdminUserAccount>>('/admin/users', data);
    return res.data;
  },
  updatePrivileges: async (id: number, data: UpdateUserPrivilegesRequest): Promise<ApiResponse<AdminUserAccount>> => {
    const res = await api.put<ApiResponse<AdminUserAccount>>(`/admin/users/${id}/privileges`, data);
    return res.data;
  },
  unlockUser: async (id: number): Promise<ApiResponse<AdminUserAccount>> => {
    const res = await api.put<ApiResponse<AdminUserAccount>>(`/admin/users/${id}/unlock`);
    return res.data;
  },
  lockUser: async (id: number): Promise<ApiResponse<AdminUserAccount>> => {
    const res = await api.put<ApiResponse<AdminUserAccount>>(`/admin/users/${id}/lock`);
    return res.data;
  },
  deleteUser: async (id: number): Promise<ApiResponse<string>> => {
    const res = await api.delete<ApiResponse<string>>(`/admin/users/${id}`);
    return res.data;
  },
};

// 9. Doctor Portal API (/api/doctor-portal/** - requires ROLE_DOCTOR)
export const doctorPortalApi = {
  getDashboard: async (): Promise<ApiResponse<DoctorDashboardData>> => {
    const res = await api.get<ApiResponse<DoctorDashboardData>>('/doctor-portal/dashboard');
    return res.data;
  },

  getOwnProfile: async (): Promise<ApiResponse<Doctor>> => {
    const res = await api.get<ApiResponse<Doctor>>('/doctor-portal/profile');
    return res.data;
  },

  updateOwnProfile: async (data: UpdateDoctorOwnProfileRequest): Promise<ApiResponse<Doctor>> => {
    const res = await api.put<ApiResponse<Doctor>>('/doctor-portal/profile', data);
    return res.data;
  },

  uploadOwnProfileImage: async (file: File): Promise<ApiResponse<string>> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<ApiResponse<string>>('/doctor-portal/profile/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  deleteOwnProfileImage: async (): Promise<ApiResponse<string>> => {
    const res = await api.delete<ApiResponse<string>>('/doctor-portal/profile/image');
    return res.data;
  },

  // Appointments
  getAppointments: async (params?: {
    date?: string;
    from?: string;
    to?: string;
    status?: AppointmentStatus;
    search?: string;
  }): Promise<ApiResponse<AppointmentResponse[]>> => {
    const res = await api.get<ApiResponse<AppointmentResponse[]>>('/doctor-portal/appointments', { params });
    return res.data;
  },

  getAppointmentById: async (id: number): Promise<ApiResponse<AppointmentResponse>> => {
    const res = await api.get<ApiResponse<AppointmentResponse>>(`/doctor-portal/appointments/${id}`);
    return res.data;
  },

  confirmAppointment: async (id: number): Promise<ApiResponse<AppointmentResponse>> => {
    const res = await api.put<ApiResponse<AppointmentResponse>>(`/doctor-portal/appointments/${id}/confirm`);
    return res.data;
  },

  rejectAppointment: async (
    id: number,
    data: DoctorAppointmentActionRequest
  ): Promise<ApiResponse<AppointmentResponse>> => {
    const res = await api.put<ApiResponse<AppointmentResponse>>(`/doctor-portal/appointments/${id}/reject`, data);
    return res.data;
  },

  cancelAppointment: async (
    id: number,
    data: DoctorAppointmentActionRequest
  ): Promise<ApiResponse<AppointmentResponse>> => {
    const res = await api.put<ApiResponse<AppointmentResponse>>(`/doctor-portal/appointments/${id}/cancel`, data);
    return res.data;
  },

  completeAppointment: async (id: number): Promise<ApiResponse<AppointmentResponse>> => {
    const res = await api.put<ApiResponse<AppointmentResponse>>(`/doctor-portal/appointments/${id}/complete`);
    return res.data;
  },

  callQueue: async (id: number, roomNumber?: string): Promise<ApiResponse<AppointmentResponse>> => {
    const res = await api.put<ApiResponse<AppointmentResponse>>(`/doctor-portal/appointments/${id}/call`, {
      roomNumber,
    });
    return res.data;
  },

  startConsultation: async (id: number): Promise<ApiResponse<AppointmentResponse>> => {
    const res = await api.put<ApiResponse<AppointmentResponse>>(`/doctor-portal/appointments/${id}/start-consultation`);
    return res.data;
  },

  completeConsultation: async (
    id: number,
    data: CompleteConsultationRequest
  ): Promise<ApiResponse<AppointmentResponse>> => {
    const res = await api.put<ApiResponse<AppointmentResponse>>(
      `/doctor-portal/appointments/${id}/complete-consultation`,
      data
    );
    return res.data;
  },

  rescheduleAppointment: async (
    id: number,
    data: RescheduleAppointmentRequest
  ): Promise<ApiResponse<AppointmentResponse>> => {
    const res = await api.put<ApiResponse<AppointmentResponse>>(
      `/doctor-portal/appointments/${id}/reschedule`,
      data
    );
    return res.data;
  },

  // Patients
  getPatients: async (search?: string): Promise<ApiResponse<DoctorPatientSummary[]>> => {
    const res = await api.get<ApiResponse<DoctorPatientSummary[]>>('/doctor-portal/patients', {
      params: search ? { search } : undefined,
    });
    return res.data;
  },

  getPatientDetail: async (patientUserId: number): Promise<ApiResponse<DoctorPatientDetail>> => {
    const res = await api.get<ApiResponse<DoctorPatientDetail>>(`/doctor-portal/patients/${patientUserId}`);
    return res.data;
  },

  updatePatientMedicalProfile: async (
    patientUserId: number,
    data: PatientMedicalProfileRequest
  ): Promise<ApiResponse<PatientMedicalProfile>> => {
    const res = await api.put<ApiResponse<PatientMedicalProfile>>(
      `/doctor-portal/patients/${patientUserId}/medical-profile`,
      data
    );
    return res.data;
  },

  // Medical Records
  getMedicalRecords: async (params?: {
    patientUserId?: number;
    search?: string;
  }): Promise<ApiResponse<MedicalRecord[]>> => {
    const res = await api.get<ApiResponse<MedicalRecord[]>>('/doctor-portal/medical-records', { params });
    return res.data;
  },

  getMedicalRecordById: async (id: number): Promise<ApiResponse<MedicalRecord>> => {
    const res = await api.get<ApiResponse<MedicalRecord>>(`/doctor-portal/medical-records/${id}`);
    return res.data;
  },

  createMedicalRecord: async (data: CreateMedicalRecordRequest): Promise<ApiResponse<MedicalRecord>> => {
    const res = await api.post<ApiResponse<MedicalRecord>>('/doctor-portal/medical-records', data);
    return res.data;
  },

  amendMedicalRecord: async (
    id: number,
    data: AmendMedicalRecordRequest
  ): Promise<ApiResponse<MedicalRecord>> => {
    const res = await api.put<ApiResponse<MedicalRecord>>(`/doctor-portal/medical-records/${id}`, data);
    return res.data;
  },

  // Prescriptions
  getPrescriptions: async (params?: {
    patientUserId?: number;
    search?: string;
  }): Promise<ApiResponse<Prescription[]>> => {
    const res = await api.get<ApiResponse<Prescription[]>>('/doctor-portal/prescriptions', { params });
    return res.data;
  },

  getPrescriptionById: async (id: number): Promise<ApiResponse<Prescription>> => {
    const res = await api.get<ApiResponse<Prescription>>(`/doctor-portal/prescriptions/${id}`);
    return res.data;
  },

  createPrescription: async (data: CreatePrescriptionRequest): Promise<ApiResponse<Prescription>> => {
    const res = await api.post<ApiResponse<Prescription>>('/doctor-portal/prescriptions', data);
    return res.data;
  },

  cancelPrescription: async (id: number, cancelReason: string): Promise<ApiResponse<Prescription>> => {
    const res = await api.put<ApiResponse<Prescription>>(`/doctor-portal/prescriptions/${id}/cancel`, {
      cancelReason,
    });
    return res.data;
  },

  // Schedule & Unavailable Dates
  getScheduleCalendar: async (params?: {
    from?: string;
    to?: string;
  }): Promise<ApiResponse<DoctorScheduleCalendar>> => {
    const res = await api.get<ApiResponse<DoctorScheduleCalendar>>('/doctor-portal/schedule', { params });
    return res.data;
  },

  updateWeeklySchedule: async (
    data: DoctorScheduleUpdateRequest
  ): Promise<ApiResponse<DoctorScheduleCalendar>> => {
    const res = await api.put<ApiResponse<DoctorScheduleCalendar>>('/doctor-portal/schedule', data);
    return res.data;
  },

  addUnavailableDate: async (data: UnavailableDateRequest): Promise<ApiResponse<UnavailableDate>> => {
    const res = await api.post<ApiResponse<UnavailableDate>>(
      '/doctor-portal/schedule/unavailable-dates',
      data
    );
    return res.data;
  },

  removeUnavailableDate: async (id: number): Promise<ApiResponse<string>> => {
    const res = await api.delete<ApiResponse<string>>(`/doctor-portal/schedule/unavailable-dates/${id}`);
    return res.data;
  },
};

// 10. Notifications API (/api/notifications/**)
export const notificationApi = {
  getAll: async (unreadOnly = false): Promise<ApiResponse<NotificationItem[]>> => {
    const res = await api.get<ApiResponse<NotificationItem[]>>('/notifications', {
      params: { unreadOnly },
    });
    return res.data;
  },

  getUnreadCount: async (): Promise<ApiResponse<{ unreadCount: number }>> => {
    const res = await api.get<ApiResponse<{ unreadCount: number }>>('/notifications/unread-count');
    return res.data;
  },

  markAsRead: async (id: number): Promise<ApiResponse<NotificationItem>> => {
    const res = await api.put<ApiResponse<NotificationItem>>(`/notifications/${id}/read`);
    return res.data;
  },

  markAllAsRead: async (): Promise<ApiResponse<string>> => {
    const res = await api.put<ApiResponse<string>>('/notifications/read-all');
    return res.data;
  },
};

// 11. Public Hospital Branch & Location Recommendation API (/api/branches/**)
export const publicBranchApi = {
  getAll: async (): Promise<ApiResponse<HospitalBranch[]>> => {
    const res = await api.get<ApiResponse<HospitalBranch[]>>('/branches');
    return res.data;
  },

  getById: async (id: number): Promise<ApiResponse<HospitalBranch>> => {
    const res = await api.get<ApiResponse<HospitalBranch>>(`/branches/${id}`);
    return res.data;
  },

  recommend: async (params?: {
    province?: string;
    lat?: number;
    lng?: number;
  }): Promise<ApiResponse<BranchRecommendation>> => {
    const res = await api.get<ApiResponse<BranchRecommendation>>('/branches/recommend', { params });
    return res.data;
  },
};

// 12. Genuine NBC Bakong KHQR Payment API (/api/payments/**)
export const paymentApi = {
  initiate: async (data: InitiatePaymentRequest): Promise<ApiResponse<InitiatePaymentResponse>> => {
    const res = await api.post<ApiResponse<InitiatePaymentResponse>>('/payments/initiate', data);
    return res.data;
  },

  getStatus: async (transactionId: string): Promise<ApiResponse<PaymentStatusResponse>> => {
    const res = await api.get<ApiResponse<PaymentStatusResponse>>(`/payments/${transactionId}/status`);
    return res.data;
  },

  verify: async (transactionId: string): Promise<ApiResponse<VerifyPaymentResponse>> => {
    const res = await api.post<ApiResponse<VerifyPaymentResponse>>(`/payments/${transactionId}/verify`);
    return res.data;
  },
};

// 13. Hospital Billing & Invoices API (/api/invoices/**)
export const invoiceApi = {
  getById: async (id: number): Promise<ApiResponse<Invoice>> => {
    const res = await api.get<ApiResponse<Invoice>>(`/invoices/${id}`);
    return res.data;
  },

  getByAppointmentId: async (appointmentId: number): Promise<ApiResponse<Invoice>> => {
    const res = await api.get<ApiResponse<Invoice>>(`/invoices/appointment/${appointmentId}`);
    return res.data;
  },

  getMyInvoices: async (): Promise<ApiResponse<Invoice[]>> => {
    const res = await api.get<ApiResponse<Invoice[]>>('/invoices/my-invoices');
    return res.data;
  },

  getAll: async (branch?: string): Promise<ApiResponse<Invoice[]>> => {
    const res = await api.get<ApiResponse<Invoice[]>>('/invoices/all', { params: { branch } });
    return res.data;
  },
};

// 14. Centralized Notification Settings & Telegram Delivery API (/api/admin/notifications/**)
export const adminNotificationApi = {
  getSettings: async (): Promise<ApiResponse<NotificationSetting>> => {
    const res = await api.get<ApiResponse<NotificationSetting>>('/admin/notifications/settings');
    return res.data;
  },

  updateSettings: async (settings: Partial<NotificationSetting>): Promise<ApiResponse<NotificationSetting>> => {
    const res = await api.put<ApiResponse<NotificationSetting>>('/admin/notifications/settings', settings);
    return res.data;
  },

  testTelegram: async (params?: { botToken?: string; chatId?: string }): Promise<ApiResponse<boolean>> => {
    const res = await api.post<ApiResponse<boolean>>('/admin/notifications/test-telegram', params || {});
    return res.data;
  },

  getDeliveryLogs: async (): Promise<ApiResponse<NotificationDeliveryLog[]>> => {
    const res = await api.get<ApiResponse<NotificationDeliveryLog[]>>('/admin/notifications/logs');
    return res.data;
  },
};

export default api;
