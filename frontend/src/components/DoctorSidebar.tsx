'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  FileText,
  Pill,
  Clock,
  Bell,
  UserCircle,
  Settings,
  LogOut,
  ArrowLeft,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function DoctorSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', href: '/doctor', icon: LayoutDashboard },
    { name: 'My Appointments', href: '/doctor/appointments', icon: CalendarCheck },
    { name: 'My Patients', href: '/doctor/patients', icon: Users },
    { name: 'Medical Records', href: '/doctor/records', icon: FileText },
    { name: 'Prescriptions', href: '/doctor/prescriptions', icon: Pill },
    { name: 'My Schedule', href: '/doctor/schedule', icon: Clock },
    { name: 'Notifications', href: '/doctor/notifications', icon: Bell },
    { name: 'My Profile', href: '/doctor/profile', icon: UserCircle },
    { name: 'Settings', href: '/doctor/settings', icon: Settings },
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-white py-4">
      {/* Nav Links */}
      <nav aria-label="Doctor Portal Navigation" className="px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === '/doctor'
              ? pathname === '/doctor'
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-[#fbf5f8] text-[#aa5588] border border-[#edd5e3] font-bold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer: Public Site & Logout */}
      <div className="px-3 pt-4 border-t border-slate-100 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Public Website</span>
        </Link>
        <button
          type="button"
          onClick={() => {
            setMobileOpen(false);
            logout();
          }}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50 print:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-12 h-12 rounded-full bg-[#aa5588] text-white flex items-center justify-center shadow-lg cursor-pointer"
          aria-label="Toggle Doctor Navigation"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white min-h-[calc(100vh-64px)] flex-col border-r border-slate-200 shrink-0 select-none print:hidden">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex print:hidden">
          <div className="w-64 bg-white h-full border-r border-slate-200 flex flex-col animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
          <div className="flex-1" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
