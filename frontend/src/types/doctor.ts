export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface Specialty {
  id: number;
  name: string;
  description: string;
  branchName?: string;
  floorLocation?: string;
  headOfDepartment?: string;
}

export interface SpecialtyRequest {
  name: string;
  description?: string;
  branchName?: string;
  floorLocation?: string;
  headOfDepartment?: string;
}

export interface DoctorSchedule {
  id?: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  breakStart?: string | null;
  breakEnd?: string | null;
  isAvailable: boolean;
}

export interface UnavailableDate {
  id: number;
  doctorId: number;
  unavailableDate: string;
  reason?: string;
  createdAt?: string;
}

export interface DoctorRequest {
  name: string;
  email: string;
  phone?: string;
  gender?: Gender;
  licenseNumber: string;
  bio?: string;
  qualifications?: string;
  experienceYears: number;
  consultationFee: number;
  address?: string;
  branchName?: string;
  appointmentDurationMinutes?: number;
  isActive?: boolean;
  specialtyIds: number[];
  schedules?: DoctorSchedule[];
}

export interface Doctor {
  id: number;
  userId?: number | null;
  hasAccount?: boolean;
  accountEmail?: string | null;
  name: string;
  email: string;
  phone?: string;
  gender?: Gender;
  profileImage?: string;
  licenseNumber: string;
  bio?: string;
  qualifications?: string;
  experienceYears: number;
  consultationFee: number;
  address?: string;
  branchName?: string;
  appointmentDurationMinutes?: number;
  isActive: boolean;
  specialties: Specialty[];
  schedules: DoctorSchedule[];
  unavailableDates?: UnavailableDate[];
}

export interface SymptomMatchRequest {
  symptoms: string;
  branchName?: string;
  province?: string;
}

export interface SymptomMatchResponse {
  medicalRelated?: boolean;
  detectedSpecialty?: string | null;
  clinicalExplanation: string;
  recommendedBranch?: string;
  userProvince?: string;
  matchingDoctors: Doctor[];
}
