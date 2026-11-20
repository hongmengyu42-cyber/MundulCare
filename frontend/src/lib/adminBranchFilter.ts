'use client';

import { useEffect, useState, useCallback } from 'react';
import { Doctor } from '@/types/doctor';
import { AppointmentResponse } from '@/types/appointment';

const STORAGE_KEY = 'mundulcare_admin_branch_filter';
const LOCKED_BRANCH_KEY = 'mundulcare_admin_locked_branch';
const ADMIN_LEVEL_KEY = 'mundulcare_admin_level';
const EVENT_NAME = 'mundulcare-admin-branch-change';

export const DEFAULT_MAIN_BRANCH = 'MundulCare Main Campus (Phnom Penh)';

export interface AdminScopeInfo {
  isGlobalAdmin: boolean;
  isBranchLocked: boolean;
  lockedBranch: string | null;
  adminLevel: string;
}

export function getLockedAdminBranch(): string | null {
  if (typeof window === 'undefined') return null;
  const locked = localStorage.getItem(LOCKED_BRANCH_KEY);
  return locked && locked.trim() ? locked.trim() : null;
}

export function getSavedAdminLevel(): string {
  if (typeof window === 'undefined') return 'SUPER_ADMIN';
  return localStorage.getItem(ADMIN_LEVEL_KEY) || 'SUPER_ADMIN';
}

export function getSavedAdminBranch(): string {
  if (typeof window === 'undefined') return 'ALL';
  const locked = getLockedAdminBranch();
  if (locked) return locked;
  return localStorage.getItem(STORAGE_KEY) || 'ALL';
}

export function setSavedAdminBranch(branch: string) {
  if (typeof window === 'undefined') return;
  const locked = getLockedAdminBranch();
  const effective = locked || branch;
  localStorage.setItem(STORAGE_KEY, effective);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: effective }));
}

/**
 * Synchronizes the logged-in administrator's branch scope lock.
 * - Global Super Admins have no lock (can view 'ALL' or filter to any branch).
 * - Branch Admins are strictly locked to their assigned hospital branch.
 */
export function syncAdminBranchScope(assignedBranch?: string | null, adminLevel?: string | null) {
  if (typeof window === 'undefined') return;
  const level = adminLevel || 'SUPER_ADMIN';
  localStorage.setItem(ADMIN_LEVEL_KEY, level);

  const isGlobal =
    level === 'SUPER_ADMIN' ||
    !assignedBranch ||
    !assignedBranch.trim() ||
    assignedBranch.trim() === 'All Branches (Global)';

  const previousLock = localStorage.getItem(LOCKED_BRANCH_KEY);

  if (!isGlobal && assignedBranch) {
    const cleanBranch = assignedBranch.trim();
    localStorage.setItem(LOCKED_BRANCH_KEY, cleanBranch);
    localStorage.setItem(STORAGE_KEY, cleanBranch);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: cleanBranch }));
  } else {
    localStorage.removeItem(LOCKED_BRANCH_KEY);
    // If transitioning from a locked Branch Admin session to a Global Admin session, reset filter to ALL
    if (previousLock) {
      localStorage.setItem(STORAGE_KEY, 'ALL');
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: 'ALL' }));
    } else {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: getSavedAdminBranch() }));
    }
  }
}

/**
 * Shared React hook that synchronizes the active Hospital Branch filter across
 * AdminHeader, AdminSidebar, AdminDashboard, and all Admin Portal modules.
 */
export function useAdminBranchFilter() {
  const [branchFilter, setBranchFilterState] = useState<string>('ALL');
  const [lockedBranch, setLockedBranch] = useState<string | null>(null);
  const [adminLevel, setAdminLevel] = useState<string>('SUPER_ADMIN');

  useEffect(() => {
    const syncFromStorage = () => {
      const locked = getLockedAdminBranch();
      setLockedBranch(locked);
      setAdminLevel(getSavedAdminLevel());
      setBranchFilterState(locked || getSavedAdminBranch());
    };

    syncFromStorage();

    const handleBranchChange = () => {
      syncFromStorage();
    };

    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === STORAGE_KEY ||
        e.key === LOCKED_BRANCH_KEY ||
        e.key === ADMIN_LEVEL_KEY
      ) {
        syncFromStorage();
      }
    };

    window.addEventListener(EVENT_NAME, handleBranchChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, handleBranchChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setBranchFilter = useCallback((nextBranch: string) => {
    const locked = getLockedAdminBranch();
    const effective = locked || nextBranch;
    setBranchFilterState(effective);
    setSavedAdminBranch(effective);
  }, []);

  const scopeInfo: AdminScopeInfo = {
    isGlobalAdmin: !lockedBranch && adminLevel === 'SUPER_ADMIN',
    isBranchLocked: Boolean(lockedBranch),
    lockedBranch,
    adminLevel,
  };

  return [lockedBranch || branchFilter, setBranchFilter, scopeInfo] as const;
}

/**
 * Resolves a Doctor's hospital branch from either explicit branchName, specialty branchName, or seeded doctor fallback.
 */
export function resolveDoctorBranch(doc: Doctor): string {
  if (doc.branchName && doc.branchName.trim()) {
    return doc.branchName.trim();
  }
  const specBranch = doc.specialties?.find((s) => s.branchName && s.branchName.trim())?.branchName;
  if (specBranch) return specBranch;

  const name = doc.name || '';
  if (name.includes('Mary Johnson') || name.includes('Voleak Pich')) {
    return 'MundulCare Siem Reap Branch';
  }
  if (name.includes('Bunroeun Seng')) {
    return 'MundulCare Battambang Medical Center';
  }
  return DEFAULT_MAIN_BRANCH;
}

/**
 * Resolves an Appointment's hospital branch from explicit branchName or its assigned Doctor.
 */
export function resolveAppointmentBranch(apt: AppointmentResponse, doctors: Doctor[] = []): string {
  if (apt.branchName && apt.branchName.trim()) {
    return apt.branchName.trim();
  }
  const matchedDoc = doctors.find((d) => d.id === apt.doctorId || d.name === apt.doctorName);
  if (matchedDoc) {
    return resolveDoctorBranch(matchedDoc);
  }
  const dName = apt.doctorName || '';
  if (dName.includes('Mary Johnson') || dName.includes('Voleak Pich')) {
    return 'MundulCare Siem Reap Branch';
  }
  if (dName.includes('Bunroeun Seng')) {
    return 'MundulCare Battambang Medical Center';
  }
  return DEFAULT_MAIN_BRANCH;
}
