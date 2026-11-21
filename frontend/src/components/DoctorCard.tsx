'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Doctor } from '@/types/doctor';
import { Award, MapPin, ArrowRight, Calendar, Building2, Sparkles } from 'lucide-react';
import { getDoctorAvatarUrl } from '@/lib/doctorAvatar';

interface DoctorCardProps {
  doctor: Doctor;
  isNearestBranch?: boolean;
}

export default function DoctorCard({ doctor, isNearestBranch }: DoctorCardProps) {
  const router = useRouter();

  // Extract unique available days
  const availableDays = Array.from(
    new Set(doctor.schedules?.map((s) => s.dayOfWeek.slice(0, 3)) || [])
  );

  const avatarUrl = getDoctorAvatarUrl(doctor.name, doctor.id, doctor.profileImage);

  return (
    <div
      onClick={() => router.push(`/doctors/${doctor.id}`)}
      className="bg-white dark:bg-[#111726] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 hover:border-[#aa5588]/60 dark:hover:border-[#dd99bb]/50 hover:shadow-md dark:hover:shadow-none transition-all duration-200 flex flex-col justify-between group cursor-pointer"
    >
      <div>
        {/* Top Header: Real Avatar (Verified badge removed as requested) */}
        <div className="flex items-start gap-3.5">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0 shadow-xs">
            <img
              src={avatarUrl}
              alt={doctor.name}
              className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-200"
              loading="lazy"
            />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-white truncate group-hover:text-[#aa5588] dark:group-hover:text-[#dd99bb] transition-colors">
              {doctor.name}
            </h3>

            {/* Specialties: No background, neutral grey to keep focus on the doctor's name */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {doctor.specialties?.slice(0, 2).map((spec, idx) => (
                <React.Fragment key={spec.id}>
                  {idx > 0 && <span className="text-slate-300 dark:text-slate-600 font-normal">•</span>}
                  <span>{spec.name}</span>
                </React.Fragment>
              ))}
              {(doctor.specialties?.length || 0) > 2 && (
                <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">
                  +{(doctor.specialties?.length || 0) - 2} more
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Doctor Bio */}
        {doctor.bio && (
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-3.5 leading-relaxed line-clamp-2">
            {doctor.bio}
          </p>
        )}

        {/* Key Info: Clean colored icons without background boxes, grey location icon */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5 text-sm text-slate-600 dark:text-slate-400">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
              <Award className="w-4 h-4 text-amber-500 shrink-0" />
              Clinical Experience
            </span>
            <span className="font-bold text-slate-900 dark:text-white font-tabular text-sm">
              {doctor.experienceYears} Years
            </span>
          </div>

          {availableDays.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                Available Days
              </span>
              <div className="flex gap-1">
                {availableDays.map((day) => (
                  <span
                    key={day}
                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                  >
                    {day}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Hospital Campus / Branch Location */}
          <div className="flex items-center justify-between gap-2 pt-1 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 truncate font-medium">
              <Building2 className="w-3.5 h-3.5 text-[#aa5588] dark:text-[#dd99bb] shrink-0" />
              <span className="truncate">{doctor.branchName || 'MundulCare Main Campus (Phnom Penh)'}</span>
            </div>
            {isNearestBranch && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#aa5588] dark:text-[#dd99bb] bg-[#fbf5f8] dark:bg-pink-950/40 border border-[#edd5e3] dark:border-pink-900/60 px-2 py-0.5 rounded-full shrink-0">
                <Sparkles className="w-3 h-3" /> Nearest Branch
              </span>
            )}
          </div>

          {doctor.address && (
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs pt-0.5 truncate">
              <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
              <span className="truncate text-slate-600 dark:text-slate-300">{doctor.address}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer: Fee & Book Button */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
        <div>
          <span className="block text-xs text-slate-400 dark:text-slate-400 font-semibold uppercase tracking-wider">
            Consultation Fee
          </span>
          <span className="text-lg font-extrabold text-[#aa5588] dark:text-[#dd99bb] font-tabular">
            ${doctor.consultationFee.toFixed(2)}
          </span>
        </div>

        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#aa5588] hover:bg-[#924472] dark:bg-[#aa5588] dark:hover:bg-[#924472] text-white font-semibold text-sm shadow-xs transition-colors">
          <span>Book Visit</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </div>
  );
}
