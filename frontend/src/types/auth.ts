export type Role = 'ADMIN' | 'DOCTOR' | 'PATIENT';
export type OtpType = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';
export type AuthProvider = 'LOCAL' | 'GOOGLE';

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  profileImage?: string;
  isActive: boolean;
  isVerified: boolean;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  userId: number;
  name: string;
  email: string;
  role: Role;
  profileImage?: string;
  adminLevel?: string;
  assignedBranch?: string;
  permissions?: string;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  profileImage?: string;
  role: Role;
  authProvider: AuthProvider;
  isVerified: boolean;
  adminLevel?: string;
  assignedBranch?: string;
  permissions?: string;
  createdAt: string;
}

export interface AdminPatient {
  id: number;
  name: string;
  email: string;
  phone?: string;
  profileImage?: string;
  isActive: boolean;
  isVerified: boolean;
  isLocked: boolean;
  assignedBranch?: string;
  createdAt: string;
  appointmentCount: number;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  dateOfBirth?: string;
  bloodType?: string;
  allergies?: string;
  chronicConditions?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface AdminPatientRequest {
  name: string;
  email: string;
  phone?: string;
  password?: string;
  isActive?: boolean;
  assignedBranch?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  dateOfBirth?: string | null;
  bloodType?: string;
  allergies?: string;
  chronicConditions?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export interface StaffMember {
  id: number;
  employeeId: string;
  name: string;
  email: string;
  phone?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  staffRole: string;
  departmentName?: string;
  branchName?: string;
  shift?: string;
  joiningDate?: string;
  isActive?: boolean;
  active?: boolean;
  notes?: string;
}

export interface StaffRequest {
  employeeId: string;
  name: string;
  email: string;
  phone?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  staffRole: string;
  departmentName?: string;
  branchName?: string;
  shift?: string;
  joiningDate?: string | null;
  isActive?: boolean;
  notes?: string;
}

export interface HospitalBranch {
  id: number;
  name: string;
  code: string;
  city: string;
  address: string;
  phone?: string;
  email?: string;
  operatingHours?: string;
  managerName?: string;
  isMainCampus: boolean;
  isActive: boolean;
}

export interface HospitalBranchRequest {
  name: string;
  code: string;
  city: string;
  address: string;
  phone?: string;
  email?: string;
  operatingHours?: string;
  managerName?: string;
  isMainCampus?: boolean;
  isActive?: boolean;
}

export interface AdminUserAccount {
  id: number;
  name: string;
  email: string;
  phone?: string;
  profileImage?: string;
  role: Role;
  authProvider: AuthProvider;
  isActive: boolean;
  isVerified: boolean;
  isLocked: boolean;
  failedLoginAttempts: number;
  adminLevel?: string | null;
  assignedBranch: string;
  permissions: string;
  createdAt: string;
}

export interface CreateAdminUserRequest {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: Role;
  adminLevel?: string;
  assignedBranch?: string;
  permissions?: string;
}

export interface UpdateUserPrivilegesRequest {
  name?: string;
  phone?: string;
  password?: string;
  role?: Role;
  adminLevel?: string;
  assignedBranch?: string;
  permissions?: string;
  isActive?: boolean;
}

export const PERMISSION_MODULES = [
  { key: 'MANAGE_APPOINTMENTS', label: 'Appointment Management', desc: 'Confirm, reject, reschedule, and export bookings' },
  { key: 'MANAGE_PATIENTS', label: 'Patient Management', desc: 'Register patients and edit clinical/allergy profiles' },
  { key: 'MANAGE_DOCTORS', label: 'Doctor Management', desc: 'Onboard physicians, manage schedules & doctor accounts' },
  { key: 'MANAGE_STAFF', label: 'Staff Management', desc: 'Manage nurses, pharmacists, lab & reception roster' },
  { key: 'MANAGE_DEPARTMENTS', label: 'Department Management', desc: 'Configure specialties, floor wings & department heads' },
  { key: 'MANAGE_BRANCHES', label: 'Branch & Location Management', desc: 'Manage hospital campuses and regional clinics' },
  { key: 'MANAGE_ROLES', label: 'Role & Permission Management', desc: 'Assign roles, admin tiers, branches & permissions' },
  { key: 'VIEW_AUDIT_LOGS', label: 'Audit Logs', desc: 'Inspect immutable security and operational audit trail' },
  { key: 'MANAGE_SETTINGS', label: 'System Settings', desc: 'Control maintenance mode and global platform config' },
];

export interface UpdateProfileRequest {
  name: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  currentPassword?: string;
  newPassword: string;
}

export interface GoogleAuthRequest {
  idToken: string;
}

export interface AuditLogEntry {
  id: number;
  adminName: string;
  adminEmail: string;
  actorRole?: string;
  action: string;
  targetType?: string;
  targetId?: number;
  details?: string;
  createdAt: string;
}

export interface MaintenanceStatus {
  enabled: boolean;
  message: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
  type: OtpType;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface ResendOtpRequest {
  email: string;
  type: OtpType;
}

export interface BranchRecommendation {
  userProvince: string;
  recommendedBranch: HospitalBranch;
  estimatedDistanceKm: number;
  estimatedTravelTime: string;
  note: string;
  availableDoctorsCount: number;
}
