'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Stethoscope } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import DoctorSidebar from '@/components/DoctorSidebar';
import DoctorHeader from '@/components/DoctorHeader';

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.role !== 'DOCTOR') {
        router.push(user?.role === 'ADMIN' ? '/admin' : '/');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#aa5588] animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Loading Doctor Portal...</p>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'DOCTOR') {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex flex-col items-center justify-center p-4 text-center">
        <Stethoscope className="w-12 h-12 text-rose-500 mb-3" />
        <h1 className="text-xl font-bold text-slate-900">Doctor Access Required</h1>
        <p className="text-sm text-slate-500 mt-1">Redirecting you to your portal...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] flex flex-col">
      <DoctorHeader />
      <div className="flex flex-1">
        <DoctorSidebar />
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
