'use client';

import { useState, useEffect, useCallback } from 'react';
import { HospitalBranch, BranchRecommendation } from '@/types/auth';
import { publicBranchApi } from './api';

export interface ProvinceLocation {
  name: string;
  khmerName: string;
  cluster: 'PHNOM_PENH' | 'SIEM_REAP' | 'BATTAMBANG';
  recommendedBranchName: string;
  distanceKm: number;
  travelTime: string;
  note: string;
}

export const CAMBODIA_BRANCH_COORDINATES = {
  PHNOM_PENH: {
    name: 'MundulCare Main Campus (Phnom Penh)',
    lat: 11.5564,
    lng: 104.9282,
  },
  SIEM_REAP: {
    name: 'MundulCare Siem Reap Branch',
    lat: 13.3633,
    lng: 103.8564,
  },
  BATTAMBANG: {
    name: 'MundulCare Battambang Medical Center',
    lat: 13.0957,
    lng: 103.2022,
  },
};

export const CAMBODIA_PROVINCES: ProvinceLocation[] = [
  // --- Central / South Cluster (Served by MundulCare Main Campus - Phnom Penh) ---
  {
    name: 'Phnom Penh',
    khmerName: 'រាជធានីភ្នំពេញ',
    cluster: 'PHNOM_PENH',
    recommendedBranchName: 'MundulCare Main Campus (Phnom Penh)',
    distanceKm: 2.0,
    travelTime: 'Immediate · 5-15 mins drive',
    note: 'Central tertiary hospital with 24/7 trauma & emergency response.',
  },
  {
    name: 'Kandal',
    khmerName: 'ខេត្តកណ្តាល',
    cluster: 'PHNOM_PENH',
    recommendedBranchName: 'MundulCare Main Campus (Phnom Penh)',
    distanceKm: 18.0,
    travelTime: '~20-35 mins drive',
    note: 'Direct metropolitan access across Monivong and Chroy Changvar bridges.',
  },
  {
    name: 'Kampong Speu',
    khmerName: 'ខេត្តកំពង់ស្ពឺ',
    cluster: 'PHNOM_PENH',
    recommendedBranchName: 'MundulCare Main Campus (Phnom Penh)',
    distanceKm: 48.0,
    travelTime: '~50 mins drive via NR 4',
    note: 'Fast access via National Road 4 and Expressway.',
  },
  {
    name: 'Takeo',
    khmerName: 'ខេត្តតាកែវ',
    cluster: 'PHNOM_PENH',
    recommendedBranchName: 'MundulCare Main Campus (Phnom Penh)',
    distanceKm: 78.0,
    travelTime: '~1 hr 20 mins drive via NR 2 / NR 3',
    note: 'Direct route via National Road 2 and National Road 3.',
  },
  {
    name: 'Kampong Chhnang',
    khmerName: 'ខេត្តកំពង់ឆ្នាំង',
    cluster: 'PHNOM_PENH',
    recommendedBranchName: 'MundulCare Main Campus (Phnom Penh)',
    distanceKm: 91.0,
    travelTime: '~1 hr 30 mins drive via NR 5',
    note: 'Direct access via National Road 5 southern link.',
  },
  {
    name: 'Prey Veng',
    khmerName: 'ខេត្តព្រៃវែង',
    cluster: 'PHNOM_PENH',
    recommendedBranchName: 'MundulCare Main Campus (Phnom Penh)',
    distanceKm: 94.0,
    travelTime: '~1 hr 45 mins via Neak Loeung Bridge',
    note: 'Direct connectivity across Tsubasa (Neak Loeung) Bridge via NR 1.',
  },
  {
    name: 'Kampong Cham',
    khmerName: 'ខេត្តកំពង់ចាម',
    cluster: 'PHNOM_PENH',
    recommendedBranchName: 'MundulCare Main Campus (Phnom Penh)',
    distanceKm: 124.0,
    travelTime: '~2 hours drive via NR 6 / NR 7',
    note: 'Direct highway route via Kizuna Bridge and National Road 7.',
  },
  {
    name: 'Svay Rieng',
    khmerName: 'ខេត្តស្វាយរៀង',
    cluster: 'PHNOM_PENH',
    recommendedBranchName: 'MundulCare Main Campus (Phnom Penh)',
    distanceKm: 125.0,
    travelTime: '~2 hours drive via NR 1',
    note: 'Connected via Asian Highway 1 (National Road 1).',
  },
  {
    name: 'Kampot',
    khmerName: 'ខេត្តកំពត',
    cluster: 'PHNOM_PENH',
    recommendedBranchName: 'MundulCare Main Campus (Phnom Penh)',
    distanceKm: 148.0,
    travelTime: '~2.5 hours drive via NR 3',
    note: 'Fast transit via renovated National Road 3.',
  },
  {
    name: 'Tboung Khmum',
    khmerName: 'ខេត្តត្បូងឃ្មុំ',
    cluster: 'PHNOM_PENH',
    recommendedBranchName: 'MundulCare Main Campus (Phnom Penh)',
    distanceKm: 152.0,
    travelTime: '~2.5 hours drive via NR 7',
    note: 'Direct highway corridor via National Road 7.',
  },
  {
    name: 'Kep',
    khmerName: 'ខេត្តកែប',
    cluster: 'PHNOM_PENH',
    recommendedBranchName: 'MundulCare Main Campus (Phnom Penh)',
    distanceKm: 162.0,
    travelTime: '~2.5 hours drive via NR 33 & NR 3',
    note: 'Direct coastal connection to Phnom Penh headquarters.',
  },
  {
    name: 'Preah Sihanouk (Sihanoukville)',
    khmerName: 'ខេត្តព្រះសីហនុ',
    cluster: 'PHNOM_PENH',
    recommendedBranchName: 'MundulCare Main Campus (Phnom Penh)',
    distanceKm: 210.0,
    travelTime: '~2 hours drive via Expressway',
    note: 'Direct express travel via the Phnom Penh-Sihanoukville E4 Expressway.',
  },
  {
    name: 'Kratie',
    khmerName: 'ខេត្តក្រចេះ',
    cluster: 'PHNOM_PENH',
    recommendedBranchName: 'MundulCare Main Campus (Phnom Penh)',
    distanceKm: 245.0,
    travelTime: '~4 hours drive via NR 7',
    note: 'Eastern regional transfer corridor to Phnom Penh Main Campus.',
  },
  {
    name: 'Koh Kong',
    khmerName: 'ខេត្តកោះកុង',
    cluster: 'PHNOM_PENH',
    recommendedBranchName: 'MundulCare Main Campus (Phnom Penh)',
    distanceKm: 285.0,
    travelTime: '~4.5 hours drive via NR 48',
    note: 'Southwestern link connected via National Road 48.',
  },
  {
    name: 'Mondulkiri',
    khmerName: 'ខេត្តមណ្ឌលគិរី',
    cluster: 'PHNOM_PENH',
    recommendedBranchName: 'MundulCare Main Campus (Phnom Penh)',
    distanceKm: 375.0,
    travelTime: '~5.5 hours drive via NR 76 & NR 7',
    note: 'Highlands route connecting through Kratie to Phnom Penh.',
  },
  {
    name: 'Stung Treng',
    khmerName: 'ខេត្តស្ទឹងត្រែង',
    cluster: 'PHNOM_PENH',
    recommendedBranchName: 'MundulCare Main Campus (Phnom Penh)',
    distanceKm: 450.0,
    travelTime: '~6.5 hours drive via NR 7',
    note: 'Northern Mekong corridor to Phnom Penh Main Campus.',
  },
  {
    name: 'Ratanakiri',
    khmerName: 'ខេត្តរតនគិរី',
    cluster: 'PHNOM_PENH',
    recommendedBranchName: 'MundulCare Main Campus (Phnom Penh)',
    distanceKm: 580.0,
    travelTime: '~8 hours drive via NR 78 & NR 7',
    note: 'Northeastern corridor routed directly to Phnom Penh Main Campus.',
  },

  // --- Northern Cluster (Served by MundulCare Siem Reap Branch) ---
  {
    name: 'Siem Reap',
    khmerName: 'ខេត្តសៀមរាប',
    cluster: 'SIEM_REAP',
    recommendedBranchName: 'MundulCare Siem Reap Branch',
    distanceKm: 3.5,
    travelTime: 'Immediate · 10-15 mins drive',
    note: 'Located on Charles de Gaulle Blvd, minutes from central Siem Reap.',
  },
  {
    name: 'Banteay Meanchey',
    khmerName: 'ខេត្តបន្ទាយមានជ័យ',
    cluster: 'SIEM_REAP',
    recommendedBranchName: 'MundulCare Siem Reap Branch',
    distanceKm: 104.0,
    travelTime: '~1 hr 45 mins drive via NR 6',
    note: 'Direct transit from Poipet / Sisophon along National Road 6.',
  },
  {
    name: 'Oddar Meanchey',
    khmerName: 'ខេត្តឧត្តរមានជ័យ',
    cluster: 'SIEM_REAP',
    recommendedBranchName: 'MundulCare Siem Reap Branch',
    distanceKm: 132.0,
    travelTime: '~2 hours drive via NR 68',
    note: 'Primary regional hospital for northern border districts.',
  },
  {
    name: 'Preah Vihear',
    khmerName: 'ខេត្តព្រះវិហារ',
    cluster: 'SIEM_REAP',
    recommendedBranchName: 'MundulCare Siem Reap Branch',
    distanceKm: 138.0,
    travelTime: '~2 hours 15 mins drive via NR 62',
    note: 'Direct regional connection via National Road 62 & NR 6.',
  },
  {
    name: 'Kampong Thom',
    khmerName: 'ខេត្តកំពង់ធំ',
    cluster: 'SIEM_REAP',
    recommendedBranchName: 'MundulCare Siem Reap Branch',
    distanceKm: 145.0,
    travelTime: '~2 hours drive via NR 6',
    note: 'Direct highway transit along the National Road 6 northwest corridor.',
  },

  // --- Northwestern Cluster (Served by MundulCare Battambang Medical Center) ---
  {
    name: 'Battambang',
    khmerName: 'ខេត្តបាត់ដំបង',
    cluster: 'BATTAMBANG',
    recommendedBranchName: 'MundulCare Battambang Medical Center',
    distanceKm: 4.0,
    travelTime: 'Immediate · 10-20 mins drive',
    note: 'Serving Battambang city and surrounding western districts on National Road 5.',
  },
  {
    name: 'Pailin',
    khmerName: 'ខេត្តប៉ៃលិន',
    cluster: 'BATTAMBANG',
    recommendedBranchName: 'MundulCare Battambang Medical Center',
    distanceKm: 82.0,
    travelTime: '~1 hr 20 mins drive via NR 57',
    note: 'Direct scenic highway connection down National Road 57.',
  },
  {
    name: 'Pursat',
    khmerName: 'ខេត្តពោធិ៍សាត់',
    cluster: 'BATTAMBANG',
    recommendedBranchName: 'MundulCare Battambang Medical Center',
    distanceKm: 105.0,
    travelTime: '~1 hr 30 mins drive via NR 5',
    note: 'Fast connection along National Road 5.',
  },
];

/**
 * Calculates Haversine distance between two latitude/longitude points in kilometers.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const STORAGE_PATIENT_LOCATION_KEY = 'mundulcare_patient_location_province';

/**
 * React Hook for Patients to filter their location (province or GPS)
 * and automatically receive the nearest hospital branch recommendation.
 */
export function usePatientLocationBranch() {
  const [selectedProvince, setSelectedProvinceState] = useState<string>('');
  const [recommendation, setRecommendation] = useState<BranchRecommendation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Load initial saved province from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_PATIENT_LOCATION_KEY);
      if (saved && saved.trim()) {
        setSelectedProvinceState(saved.trim());
      }
    }
  }, []);

  const fetchRecommendation = useCallback(
    async (province?: string, lat?: number, lng?: number) => {
      setIsLoading(true);
      try {
        const res = await publicBranchApi.recommend({
          province: province || undefined,
          lat,
          lng,
        });
        if (res.success && res.data) {
          setRecommendation(res.data);
        }
      } catch (err) {
        // Fallback to client-side local database if API is temporarily unavailable
        const matched = CAMBODIA_PROVINCES.find(
          (p) =>
            p.name.toLowerCase() === (province || '').toLowerCase() ||
            (province || '').toLowerCase().includes(p.name.toLowerCase())
        ) || CAMBODIA_PROVINCES[0];

        const mockBranch: HospitalBranch = {
          id: matched.cluster === 'SIEM_REAP' ? 2 : matched.cluster === 'BATTAMBANG' ? 3 : 1,
          code:
            matched.cluster === 'SIEM_REAP'
              ? 'MC-SRP-02'
              : matched.cluster === 'BATTAMBANG'
              ? 'MC-BTB-03'
              : 'MC-PNH-01',
          name: matched.recommendedBranchName,
          city:
            matched.cluster === 'SIEM_REAP'
              ? 'Siem Reap'
              : matched.cluster === 'BATTAMBANG'
              ? 'Battambang'
              : 'Phnom Penh',
          address:
            matched.cluster === 'SIEM_REAP'
              ? '#88 Charles de Gaulle Blvd, Svay Dangkum'
              : matched.cluster === 'BATTAMBANG'
              ? '#12 National Road 5, Sangkat Svay Por'
              : '#245 Preah Monivong Blvd, Sangkat Boeung Keng Kang I',
          phone:
            matched.cluster === 'SIEM_REAP'
              ? '+855 63 999 200'
              : matched.cluster === 'BATTAMBANG'
              ? '+855 53 999 300'
              : '+855 23 999 100',
          operatingHours:
            matched.cluster === 'SIEM_REAP'
              ? 'Daily (07:30 - 19:30)'
              : matched.cluster === 'BATTAMBANG'
              ? 'Mon–Sat (07:30 - 18:00)'
              : '24/7 Emergency & Outpatient (07:00 - 20:00)',
          isMainCampus: matched.cluster === 'PHNOM_PENH',
          isActive: true,
        };

        setRecommendation({
          userProvince: matched.name,
          recommendedBranch: mockBranch,
          estimatedDistanceKm: matched.distanceKm,
          estimatedTravelTime: matched.travelTime,
          note: matched.note,
          availableDoctorsCount: matched.cluster === 'PHNOM_PENH' ? 4 : matched.cluster === 'SIEM_REAP' ? 2 : 1,
        });
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedProvince) {
      fetchRecommendation(selectedProvince);
    } else {
      setRecommendation(null);
    }
  }, [selectedProvince, fetchRecommendation]);

  const setSelectedProvince = useCallback((prov: string) => {
    setSelectedProvinceState(prov);
    setGpsError(null);
    if (typeof window !== 'undefined') {
      if (prov) {
        localStorage.setItem(STORAGE_PATIENT_LOCATION_KEY, prov);
      } else {
        localStorage.removeItem(STORAGE_PATIENT_LOCATION_KEY);
      }
    }
  }, []);

  const detectGpsLocation = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingGps(false);
        const { latitude, longitude } = pos.coords;

        // Calculate closest branch by GPS distance
        const dPnh = calculateDistanceKm(
          latitude,
          longitude,
          CAMBODIA_BRANCH_COORDINATES.PHNOM_PENH.lat,
          CAMBODIA_BRANCH_COORDINATES.PHNOM_PENH.lng
        );
        const dSrp = calculateDistanceKm(
          latitude,
          longitude,
          CAMBODIA_BRANCH_COORDINATES.SIEM_REAP.lat,
          CAMBODIA_BRANCH_COORDINATES.SIEM_REAP.lng
        );
        const dBtb = calculateDistanceKm(
          latitude,
          longitude,
          CAMBODIA_BRANCH_COORDINATES.BATTAMBANG.lat,
          CAMBODIA_BRANCH_COORDINATES.BATTAMBANG.lng
        );

        let detectedName = 'Phnom Penh';
        if (dSrp < dPnh && dSrp < dBtb) {
          detectedName = 'Siem Reap';
        } else if (dBtb < dPnh && dBtb < dSrp) {
          detectedName = 'Battambang';
        }

        setSelectedProvinceState(detectedName);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_PATIENT_LOCATION_KEY, detectedName);
        }
        fetchRecommendation(detectedName, latitude, longitude);
      },
      (err) => {
        setIsDetectingGps(false);
        setGpsError(
          err.code === 1
            ? 'Location access was denied. Please select your province from the list.'
            : 'Unable to detect location. Please select your province from the list.'
        );
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, [fetchRecommendation]);

  const clearLocationFilter = useCallback(() => {
    setSelectedProvinceState('');
    setRecommendation(null);
    setGpsError(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_PATIENT_LOCATION_KEY);
    }
  }, []);

  return {
    selectedProvince,
    setSelectedProvince,
    recommendation,
    isLoading,
    isDetectingGps,
    gpsError,
    detectGpsLocation,
    clearLocationFilter,
    allProvinces: CAMBODIA_PROVINCES,
  };
}
