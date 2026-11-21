'use client';

import React from 'react';
import Link from 'next/link';
import {
  MapPin,
  Navigation,
  Building2,
  Clock,
  Phone,
  Sparkles,
  Check,
  X,
  Compass,
  ArrowRight,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import {
  usePatientLocationBranch,
  CAMBODIA_PROVINCES,
} from '@/lib/locationRecommender';
import CustomSelect from '@/components/CustomSelect';

interface NearestBranchBannerProps {
  onBranchFilterChange?: (branchName: string | null) => void;
  activeBranchFilter?: string | null;
  compact?: boolean;
}

export default function NearestBranchBanner({
  onBranchFilterChange,
  activeBranchFilter,
  compact = false,
}: NearestBranchBannerProps) {
  const {
    selectedProvince,
    setSelectedProvince,
    recommendation,
    isLoading,
    isDetectingGps,
    gpsError,
    detectGpsLocation,
    clearLocationFilter,
    allProvinces,
  } = usePatientLocationBranch();

  const handleSelectProvince = (provName: string) => {
    setSelectedProvince(provName);
    if (onBranchFilterChange) {
      if (provName) {
        const prov = allProvinces.find((p) => p.name === provName);
        if (prov) {
          onBranchFilterChange(prov.recommendedBranchName);
        }
      } else {
        onBranchFilterChange(null);
      }
    }
  };

  const handleClear = () => {
    clearLocationFilter();
    if (onBranchFilterChange) {
      onBranchFilterChange(null);
    }
  };

  const provinceOptions = [
    { value: '', label: 'Select your province or city...' },
    ...allProvinces.map((p) => ({
      value: p.name,
      label: `${p.name} (${p.khmerName})`,
    })),
  ];

  return (
    <div className="bg-white dark:bg-[#111726] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 mb-8 shadow-xs transition-all">
      {/* Top Controls: Location Selector + GPS Auto-detect */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fbf5f8] dark:bg-pink-950/40 text-[#aa5588] dark:text-[#dd99bb] border border-[#edd5e3] dark:border-pink-900/60 text-xs font-bold mb-1.5">
            <Compass className="w-3.5 h-3.5 text-[#aa5588] dark:text-[#dd99bb]" />
            <span>Regional Care Network · Cambodia</span>
          </div>
          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Find the Hospital Branch Nearest to You
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Filter by your province or auto-detect your location — our medical system recommends your closest MundulCare campus with on-duty specialists.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="w-full sm:w-72">
            <CustomSelect
              value={selectedProvince}
              onChange={handleSelectProvince}
              options={provinceOptions}
              icon={<MapPin className="w-4 h-4 text-[#aa5588] shrink-0" />}
              accentColor="#aa5588"
              className="w-full"
            />
          </div>

          <button
            type="button"
            onClick={detectGpsLocation}
            disabled={isDetectingGps}
            title="Auto-detect closest branch using your GPS location"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-[#fbf5f8] dark:hover:bg-slate-700 hover:border-[#edd5e3] dark:hover:border-slate-600 hover:text-[#aa5588] dark:hover:text-[#dd99bb] text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-2xs disabled:opacity-60 cursor-pointer"
          >
            {isDetectingGps ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#aa5588] dark:text-[#dd99bb]" />
            ) : (
              <Navigation className="w-4 h-4 text-[#aa5588] dark:text-[#dd99bb]" />
            )}
            <span>{isDetectingGps ? 'Detecting...' : 'Near Me (GPS)'}</span>
          </button>

          {selectedProvince && (
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              title="Clear province filter"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {gpsError && (
        <div className="mt-3.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2">
          <span>{gpsError}</span>
          <button
            type="button"
            onClick={() => handleSelectProvince('Phnom Penh')}
            className="font-bold underline cursor-pointer"
          >
            Use Phnom Penh
          </button>
        </div>
      )}

      {/* Recommended Branch Card (Shows when a province is selected or detected) */}
      {selectedProvince && recommendation && (
        <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800/80">
          <div className="bg-linear-to-r from-[#fbf5f8] via-[#fbf5f8]/80 to-white dark:from-pink-950/20 dark:via-slate-900 dark:to-slate-900/90 rounded-2xl border border-[#edd5e3] dark:border-pink-900/40 p-5 sm:p-6 transition-all">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#aa5588] text-white text-[11px] font-bold shadow-2xs">
                    <Sparkles className="w-3 h-3" />
                    <span>Recommended Nearest Branch</span>
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    for <strong className="text-slate-800 dark:text-white">{recommendation.userProvince}</strong>
                  </span>
                  <span className="text-xs font-bold text-[#aa5588] dark:text-[#dd99bb] bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-[#edd5e3] dark:border-pink-900/40">
                    {recommendation.estimatedDistanceKm === 0 || recommendation.estimatedDistanceKm <= 5
                      ? 'Local City Facility'
                      : `~${recommendation.estimatedDistanceKm} km away`}
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#aa5588] dark:text-[#dd99bb] shrink-0" />
                  <span>{recommendation.recommendedBranch.name}</span>
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                  {recommendation.note}
                </p>

                {/* Campus Details Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{recommendation.recommendedBranch.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{recommendation.estimatedTravelTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <a
                      href={`tel:${recommendation.recommendedBranch.phone || '+855 23 999 100'}`}
                      className="font-bold text-[#aa5588] dark:text-[#dd99bb] hover:underline"
                    >
                      {recommendation.recommendedBranch.phone || '+855 23 999 100'}
                    </a>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 justify-center">
                {onBranchFilterChange && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeBranchFilter === recommendation.recommendedBranch.name) {
                        onBranchFilterChange(null);
                      } else {
                        onBranchFilterChange(recommendation.recommendedBranch.name);
                      }
                    }}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      activeBranchFilter === recommendation.recommendedBranch.name
                        ? 'bg-slate-900 dark:bg-slate-700 text-white'
                        : 'bg-[#aa5588] hover:bg-[#924472] text-white'
                    }`}
                  >
                    {activeBranchFilter === recommendation.recommendedBranch.name ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Showing Branch Doctors</span>
                      </>
                    ) : (
                      <>
                        <span>Filter Doctors at this Branch</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}

                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(
                    recommendation.recommendedBranch.name + ', ' + recommendation.recommendedBranch.address
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5 text-[#aa5588] dark:text-[#dd99bb]" />
                  <span>Get Directions</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
