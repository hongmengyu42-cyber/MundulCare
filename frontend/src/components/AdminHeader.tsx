'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { LogOut, User, ArrowLeft, ChevronDown, Shield } from 'lucide-react';
import logoImg from '../../public/logo.png';
import { useAuth } from '@/context/AuthContext';
import { getImageUrl } from '@/lib/imageUrl';
import { useAdminBranchFilter } from '@/lib/adminBranchFilter';
import ThemeToggle from '@/components/ThemeToggle';

export default function AdminHeader() {
  const { user, logout } = useAuth();
  const [, , scopeInfo] = useAdminBranchFilter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin =
    scopeInfo.isGlobalAdmin &&
    (!user?.adminLevel || user?.adminLevel === 'SUPER_ADMIN') &&
    (!user?.assignedBranch || user?.assignedBranch === 'All Branches (Global)');

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-[#0B0F19] border-b border-slate-200 dark:border-slate-800 h-16 px-4 sm:px-6 flex items-center justify-between shadow-2xs transition-colors duration-150">
      {/* Left: Brand Logo & Title */}
      <Link href="/admin" className="flex items-center gap-3 group">
        <Image
          src={logoImg}
          alt="Mundul Care Logo"
          width={40}
          height={40}
          priority
          className="w-10 h-10 object-contain group-hover:scale-105 transition-transform"
        />
        <span className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Mundul <span className="text-[#aa5588] dark:text-[#dd99bb]">Care</span>
        </span>
      </Link>

      {/* Right: Theme Switcher & Admin Profile */}
      <div className="flex items-center gap-3">
        {/* Quick Theme Toggle Icon (Light / Dark) */}
        <ThemeToggle variant="icon" />

        {/* Admin Profile Dropdown */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-[#f5f3ff] dark:bg-purple-950/60 border border-[#ddd6fe] dark:border-purple-800 text-[#6D28D9] dark:text-purple-300 font-bold text-xs flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
              {user?.profileImage ? (
                <img src={getImageUrl(user.profileImage)} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user?.name ? user.name.charAt(0).toUpperCase() : 'A'
              )}
            </div>

            <div className="flex flex-col text-left">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                {user?.name || 'Admin'}
              </span>
              <span className="text-[10px] font-bold text-[#6D28D9] dark:text-purple-400 leading-none uppercase">
                Admin
              </span>
            </div>

            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                dropdownOpen ? 'rotate-180 text-slate-700 dark:text-slate-200' : 'rotate-0'
              }`}
            />
          </button>

          {/* Dropdown Popover */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl py-2 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{user?.email}</p>
                <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f5f3ff] dark:bg-purple-950/50 text-[#6D28D9] dark:text-purple-300 border border-[#ddd6fe] dark:border-purple-800">
                  <Shield className="w-3 h-3" /> Hospital Admin
                </span>
              </div>

              {/* Theme Preference inside Dropdown */}
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
                  Appearance
                </span>
                <ThemeToggle variant="segmented" className="w-full justify-between" />
              </div>

              <div className="py-1">
                <Link
                  href="/admin/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Admin Profile & Privileges</span>
                </Link>
                {isSuperAdmin && (
                  <Link
                    href="/admin/roles"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
                  >
                    <Shield className="w-4 h-4 text-slate-400" />
                    <span>Roles & Permissions</span>
                  </Link>
                )}
                <Link
                  href="/"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-400" />
                  <span>Exit to Public Site</span>
                </Link>
              </div>

              <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
