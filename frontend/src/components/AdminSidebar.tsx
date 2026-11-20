'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  UserCheck,
  BriefcaseMedical,
  Layers,
  Building2,
  ShieldCheck,
  History,
  Settings,
  UserCircle,
  ArrowLeft,
  Menu,
  X,
  MapPin,
  Lock,
  RotateCcw,
  BellRing,
} from 'lucide-react';
import { userApi } from '@/lib/api';
import { UserProfile } from '@/types/auth';
import { useAuth } from '@/context/AuthContext';
import { useAdminBranchFilter, syncAdminBranchScope } from '@/lib/adminBranchFilter';

export default function AdminSidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeBranchFilter, setActiveBranchFilter, scopeInfo] = useAdminBranchFilter();

  useEffect(() => {
    let mounted = true;
    userApi
      .getMyProfile()
      .then((res) => {
        if (mounted && res.success && res.data) {
          setProfile(res.data);
          // Synchronize Global Admin vs. Branch Admin scope lock across the Admin Portal
          syncAdminBranchScope(res.data.assignedBranch, res.data.adminLevel);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const effectiveLevel =
    profile?.adminLevel ||
    user?.adminLevel ||
    (scopeInfo.isBranchLocked ? 'BRANCH_ADMIN' : 'SUPER_ADMIN');
  const effectivePerms = profile?.permissions || user?.permissions || '';

  const isSuperAdmin =
    !scopeInfo.isBranchLocked &&
    effectiveLevel === 'SUPER_ADMIN' &&
    (!profile?.assignedBranch || profile?.assignedBranch === 'All Branches (Global)') &&
    (!user?.assignedBranch || user?.assignedBranch === 'All Branches (Global)');

  const hasPermission = (permKey?: string, superAdminOnly?: boolean) => {
    if (superAdminOnly) {
      return isSuperAdmin;
    }
    if (!permKey) return true;
    if (isSuperAdmin) return true;
    if (!effectivePerms) return false;
    const list = effectivePerms.split(',').map((s) => s.trim());
    return list.includes(permKey);
  };

  const navItems = [
    { name: 'Dashboard Overview', href: '/admin', icon: LayoutDashboard },
    { name: 'Appointments', href: '/admin/appointments', icon: CalendarCheck, perm: 'MANAGE_APPOINTMENTS' },
    { name: 'Patients', href: '/admin/patients', icon: Users, perm: 'MANAGE_PATIENTS' },
    { name: 'Doctors & Schedules', href: '/admin/doctors', icon: UserCheck, perm: 'MANAGE_DOCTORS' },
    { name: 'Hospital Staff', href: '/admin/staff', icon: BriefcaseMedical, perm: 'MANAGE_STAFF' },
    { name: 'Departments', href: '/admin/specialties', icon: Layers, perm: 'MANAGE_DEPARTMENTS' },
    { name: 'Branches & Locations', href: '/admin/branches', icon: Building2, perm: 'MANAGE_BRANCHES', superAdminOnly: true },
    { name: 'Roles & Permissions', href: '/admin/roles', icon: ShieldCheck, perm: 'MANAGE_ROLES', superAdminOnly: true },
    { name: 'Audit Logs', href: '/admin/audit-logs', icon: History, perm: 'VIEW_AUDIT_LOGS' },
    { name: 'Notifications & Alerts', href: '/admin/notifications', icon: BellRing, perm: 'MANAGE_SETTINGS' },
    { name: 'System Settings', href: '/admin/settings', icon: Settings, perm: 'MANAGE_SETTINGS', superAdminOnly: true },
    { name: 'Admin Profile', href: '/admin/profile', icon: UserCircle },
  ];

  const adminTierLabel = (level?: string) => {
    switch (level) {
      case 'BRANCH_ADMIN':
        return 'Branch Admin';
      case 'CLINICAL_ADMIN':
        return 'Clinical Admin';
      case 'OPERATIONS_ADMIN':
        return 'Operations Admin';
      default:
        return 'Super Admin';
    }
  };

  const displayedScope =
    activeBranchFilter !== 'ALL'
      ? activeBranchFilter
      : profile?.assignedBranch || 'All Branches (Global)';

  const isLockedToAssignedBranch =
    Boolean(profile?.assignedBranch) &&
    profile?.assignedBranch !== 'All Branches (Global)' &&
    profile?.adminLevel !== 'SUPER_ADMIN';

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-white dark:bg-[#0B0F19] py-4 overflow-y-auto transition-colors duration-150">
      {/* Navigation Links */}
      <nav className="px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          const allowed = hasPermission(item.perm, item.superAdminOnly);

          if (!allowed) {
            return null;
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-[#f5f3ff] dark:bg-purple-950/60 text-[#6D28D9] dark:text-purple-300 border border-[#ddd6fe] dark:border-purple-800/80 font-bold shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer: Active Branch Scope Badge + Exit to Public Site */}
      <div className="px-3 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
        <div className="px-3.5 py-2.5 rounded-xl bg-[#f5f3ff]/70 dark:bg-purple-950/30 border border-[#ddd6fe] dark:border-purple-800/60">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-[#6D28D9] dark:text-purple-400 uppercase tracking-wider">
              {activeBranchFilter !== 'ALL' ? 'Active Branch Filter' : adminTierLabel(profile?.adminLevel)}
            </span>
            {activeBranchFilter !== 'ALL' && !isLockedToAssignedBranch ? (
              <button
                type="button"
                onClick={() => setActiveBranchFilter('ALL')}
                title="Reset to All Branches"
                className="inline-flex items-center gap-1 text-[10px] font-bold text-[#6D28D9] dark:text-purple-400 hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-[#6D28D9] dark:text-purple-400" />
            )}
          </div>
          <div
            className="mt-1 flex items-center gap-1.5 text-xs text-slate-800 dark:text-slate-200 font-semibold truncate"
            title={displayedScope}
          >
            <MapPin className="w-3.5 h-3.5 text-[#6D28D9] dark:text-purple-400 shrink-0" />
            <span className="truncate">{displayedScope}</span>
          </div>
        </div>

        <Link
          href="/"
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit to Public Site</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-12 h-12 rounded-full bg-[#6D28D9] text-white flex items-center justify-center shadow-lg cursor-pointer"
          aria-label="Toggle Navigation"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white dark:bg-[#0B0F19] min-h-[calc(100vh-64px)] flex-col border-r border-slate-200 dark:border-slate-800 shrink-0 select-none transition-colors duration-150">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex">
          <div className="w-64 bg-white dark:bg-[#0B0F19] h-full border-r border-slate-200 dark:border-slate-800 flex flex-col animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
          <div className="flex-1" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
