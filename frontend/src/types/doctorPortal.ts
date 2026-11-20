import { AppointmentResponse } from './appointment';
import { Doctor, DoctorSchedule, Gender, UnavailableDate } from './doctor';

export type PrescriptionStatus = 'ACTIVE' | 'CANCELLED';

export type NotificationType =
  | 'APPOINTMENT_REQUESTED'
  | 'APPOINTMENT_CONFIRMED'
  | 'APPOINTMENT_REJECTED'
  | 'APPOINTMENT_CANCELLED'
  | 'APPOINTMENT_RESCHEDULED'
  | 'APPOINTMENT_COMPLETED'
  | 'MEDICAL_RECORD_UPDATED'
  | 'PRESCRIPTION_ISSUED'
  | 'SYSTEM';

export interface NotificationItem {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  referenceId?: number | null;
  referenceType?: string | null;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface DailyStatPoint {
  date: string;
  label: string;
  total: number;
  completed: number;
  confirmed: number;
  pending: number;
}

export interface DoctorDashboardData {
  doctorProfile: Doctor;
  totalAppointments: number;
  todayAppointmentsCount: number;
  upcomingAppointmentsCount: number;
  completedAppointmentsCount: number;
  pendingRequestsCount: number;
  cancelledAppointmentsCount: number;
  rejectedAppointmentsCount: number;
  totalAssignedPatients: number;
  totalMedicalRecordsAuthored: number;
  totalPrescriptionsIssued: number;
  unreadNotificationsCount: number;
  statusBreakdown: Record<string, number>;
  weeklyTrend: DailyStatPoint[];
  todaySchedule: AppointmentResponse[];
  pendingRequests: AppointmentResponse[];
  upcomingAppointments: AppointmentResponse[];
}

export interface UpdateDoctorOwnProfileRequest {
  phone?: string;
  gender?: Gender;
  bio?: string;
  qualifications?: string;
  address?: string;
  appointmentDurationMinutes?: number;
}

export interface DoctorAppointmentActionRequest {
  reason: string;
}

export interface RescheduleAppointmentRequest {
  appointmentDate: string;
  startTime: string;
  endTime: string;
  reason?: string;
}

export interface PatientMedicalProfile {
  id?: number;
  userId: number;
  gender?: Gender | null;
  dateOfBirth?: string | null;
  bloodType?: string | null;
  allergies?: string | null;
  chronicConditions?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  updatedByDoctorName?: string | null;
  updatedAt?: string | null;
}

export interface PatientMedicalProfileRequest {
  gender?: Gender;
  dateOfBirth?: string;
  bloodType?: string;
  allergies?: string;
  chronicConditions?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface DoctorPatientSummary {
  patientUserId: number;
  patientCode: string;
  name: string;
  email: string;
  phone?: string | null;
  profileImage?: string | null;
  gender?: Gender | null;
  dateOfBirth?: string | null;
  bloodType?: string | null;
  allergies?: string | null;
  chronicConditions?: string | null;
  totalVisitsWithMe: number;
  lastVisitDate?: string | null;
  nextAppointmentDate?: string | null;
  latestDiagnosis?: string | null;
}

export interface MedicalRecordRevision {
  id: number;
  version: number;
  symptoms?: string | null;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  heartRate?: number | null;
  temperatureC?: number | null;
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  diagnosis: string;
  treatmentPlan?: string | null;
  clinicalNotes?: string | null;
  followUpRecommendation?: string | null;
  followUpDate?: string | null;
  amendedByDoctorId: number;
  amendedByDoctorName: string;
  amendmentReason: string;
  createdAt: string;
}

export interface MedicalRecord {
  id: number;
  patientUserId: number;
  patientCode: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string | null;
  doctorId: number;
  doctorName: string;
  doctorSpecialty: string;
  appointmentId?: number | null;
  appointmentDate?: string | null;
  symptoms?: string | null;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  heartRate?: number | null;
  temperatureC?: number | null;
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  diagnosis: string;
  treatmentPlan?: string | null;
  clinicalNotes?: string | null;
  followUpRecommendation?: string | null;
  followUpDate?: string | null;
  version: number;
  isEditableByCurrentDoctor: boolean;
  revisions: MedicalRecordRevision[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateMedicalRecordRequest {
  patientUserId: number;
  appointmentId?: number | null;
  symptoms?: string;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  heartRate?: number | null;
  temperatureC?: number | null;
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  diagnosis: string;
  treatmentPlan?: string;
  clinicalNotes?: string;
  followUpRecommendation?: string;
  followUpDate?: string | null;
}

export interface AmendMedicalRecordRequest {
  symptoms?: string;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  heartRate?: number | null;
  temperatureC?: number | null;
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  diagnosis: string;
  treatmentPlan?: string;
  clinicalNotes?: string;
  followUpRecommendation?: string;
  followUpDate?: string | null;
  amendmentReason: string;
}

export interface PrescriptionItem {
  id?: number;
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: string;
  instructions?: string;
}

export interface Prescription {
  id: number;
  prescriptionNumber: string;
  patientUserId: number;
  patientCode: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string | null;
  doctorId: number;
  doctorName: string;
  doctorLicenseNumber: string;
  doctorSpecialty: string;
  doctorPhone?: string | null;
  doctorAddress?: string | null;
  appointmentId?: number | null;
  appointmentDate?: string | null;
  medicalRecordId?: number | null;
  diagnosisSummary?: string | null;
  notes?: string | null;
  status: PrescriptionStatus;
  cancelReason?: string | null;
  isAuthorCurrentDoctor: boolean;
  items: PrescriptionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrescriptionRequest {
  patientUserId: number;
  appointmentId?: number | null;
  medicalRecordId?: number | null;
  diagnosisSummary?: string;
  notes?: string;
  items: PrescriptionItem[];
}

export interface DoctorPatientDetail {
  patientUserId: number;
  patientCode: string;
  name: string;
  email: string;
  phone?: string | null;
  profileImage?: string | null;
  medicalProfile: PatientMedicalProfile;
  appointments: AppointmentResponse[];
  medicalRecords: MedicalRecord[];
  prescriptions: Prescription[];
}

export interface DoctorScheduleCalendar {
  appointmentDurationMinutes: number;
  weeklySchedules: DoctorSchedule[];
  unavailableDates: UnavailableDate[];
  appointments: AppointmentResponse[];
}

export interface DoctorScheduleUpdateRequest {
  appointmentDurationMinutes?: number;
  schedules: DoctorSchedule[];
}

export interface UnavailableDateRequest {
  unavailableDate: string;
  reason?: string;
}
