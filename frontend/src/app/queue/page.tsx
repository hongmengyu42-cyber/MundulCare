'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Clock,
  Building2,
  Sparkles,
  Users,
  BellRing,
  ArrowRight,
  Stethoscope,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { appointmentApi, publicBranchApi } from '@/lib/api';
import { AppointmentResponse } from '@/types/appointment';
import { HospitalBranch } from '@/types/auth';

export default function WaitingRoomQueuePage() {
  const [mounted, setMounted] = useState(false);
  const [queue, setQueue] = useState<AppointmentResponse[]>([]);
  const [branches, setBranches] = useState<HospitalBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [lastCalledId, setLastCalledId] = useState<number | null>(null);

  const prevCallingTicketRef = useRef<string | null>(null);

  // Update clock every second after mount
  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch branches
  useEffect(() => {
    publicBranchApi.getAll().then((res: any) => {
      if (res.success && res.data) {
        setBranches(res.data);
      }
    });
  }, []);

  // Play audio chime using Web Audio API (cross-browser compatible without external audio files)
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      const now = ctx.currentTime;
      // High-pitched chime tone sequence: Ding-Dong (880Hz -> 659.25Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.2);
      gain2.gain.setValueAtTime(0.4, now + 0.2);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.2);
      osc2.stop(now + 1.2);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Poll live queue every 4 seconds
  const fetchQueue = async () => {
    try {
      const res = await appointmentApi.getLiveQueue(selectedBranch);
      if (res.success && res.data) {
        setQueue(res.data);

        // Check if there is a newly called ticket to trigger audio chime
        const activeCalling = res.data.find((a) => a.queueStatus === 'CALLING');
        if (activeCalling && activeCalling.queueNumber !== prevCallingTicketRef.current) {
          prevCallingTicketRef.current = activeCalling.queueNumber || null;
          setLastCalledId(activeCalling.id);
          playChime();
        }
      }
    } catch (err) {
      console.error('Failed to fetch live queue', err);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 4000);
    return () => clearInterval(interval);
  }, [selectedBranch]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Segregate appointments
  const callingList = queue.filter((a) => a.queueStatus === 'CALLING');
  const inConsultationList = queue.filter((a) => a.queueStatus === 'IN_CONSULTATION');
  const waitingList = queue.filter((a) => a.queueStatus === 'WAITING');

  // Primary called ticket to highlight on the main board
  const primaryCalled = callingList[0] || inConsultationList[0] || null;

  // Mask patient name for HIPAA/Privacy on public waiting room display (e.g., "Sokha P.")
  const maskName = (name: string) => {
    if (!name) return 'Patient';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans select-none">
      {/* Top TV Header Bar */}
      <header className="px-6 sm:px-10 py-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        {/* Branding */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-[#aa5588] to-[#dd99bb] text-white flex items-center justify-center font-black text-2xl shadow-lg">
            +
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-white">MundulCare</span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                LIVE QUEUE
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {selectedBranch === 'all'
                  ? 'All Campus Locations'
                  : branches.find((b) => b.name === selectedBranch)?.name || selectedBranch}
              </span>
            </div>
          </div>
        </div>

        {/* Live Controls & Digital Clock */}
        <div className="flex items-center gap-5">
          {/* Branch Filter dropdown */}
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Sound Mute Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
              soundEnabled
                ? 'bg-slate-800 border-slate-700 text-emerald-400 hover:bg-slate-700'
                : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'
            }`}
            title={soundEnabled ? 'Mute Chime' : 'Unmute Chime'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          {/* Big Digital Clock */}
          <div className="text-right pl-3 border-l border-slate-800" suppressHydrationWarning>
            <div className="text-2xl font-black font-mono tracking-wider text-white" suppressHydrationWarning>
              {mounted && currentTime
                ? currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : '--:--:--'}
            </div>
            <div className="text-xs text-slate-400 font-medium font-tabular" suppressHydrationWarning>
              {mounted && currentTime
                ? currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                : 'MundulCare Outpatient'}
            </div>
          </div>
        </div>
      </header>

      {/* Main TV Screen Content */}
      <main className="flex-1 p-6 sm:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Big Spotlight on NOW CALLING (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Spotlight Hero Card */}
          <div className="flex-1 rounded-3xl bg-linear-to-br from-slate-900 via-slate-900 to-indigo-950/60 border-2 border-indigo-500/40 p-8 sm:p-10 shadow-2xl flex flex-col justify-between relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#aa5588]/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header Badge */}
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black tracking-widest uppercase animate-pulse">
                <BellRing className="w-4 h-4 text-emerald-400" />
                <span>Now Calling into Room</span>
              </div>
              <span className="text-xs font-mono text-slate-500">Live Audio Chime Active</span>
            </div>

            {/* Huge Number & Room */}
            {primaryCalled ? (
              <div className="my-6 space-y-6">
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                    Queue Ticket Number
                  </div>
                  <div className="text-7xl sm:text-9xl font-black font-mono tracking-tight text-white drop-shadow-md">
                    {primaryCalled.queueNumber || 'A-001'}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                  <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Proceed To
                    </div>
                    <div className="text-2xl font-black text-emerald-400">
                      {primaryCalled.roomNumber || 'Room 101'}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">Consultation & Examination</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/80">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Attending Doctor
                    </div>
                    <div className="text-lg font-bold text-slate-100 truncate">
                      {primaryCalled.doctorName}
                    </div>
                    <div className="text-xs text-[#dd99bb] font-medium mt-0.5">
                      Patient: {maskName(primaryCalled.patientName)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="my-12 text-center text-slate-500 space-y-2">
                <Stethoscope className="w-12 h-12 mx-auto text-slate-600 opacity-50" />
                <div className="text-lg font-bold">Waiting Lounge Active</div>
                <p className="text-xs max-w-sm mx-auto text-slate-400">
                  New queue tickets will be spotlighted here with sound notification when called by the physician.
                </p>
              </div>
            )}

            {/* Footer announcement */}
            <div className="text-xs text-slate-400 flex items-center justify-between pt-4 border-t border-slate-800/80">
              <span>Please proceed promptly with your ticket slip.</span>
              <span className="font-semibold text-slate-300">MundulCare Outpatient</span>
            </div>
          </div>

          {/* Active In-Consultation Row */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-indigo-400" />
              <span>Currently In Consultation Room</span>
            </h3>

            {inConsultationList.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {inConsultationList.map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-lg font-black font-mono text-indigo-300">{apt.queueNumber}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[100px]">{apt.doctorName}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                      {apt.roomNumber?.split(',')[0] || 'In Room'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic py-2">
                No consultations actively in session right now.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Waiting Queue in Lounge (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl">
          <div className="flex items-center justify-between pb-5 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#dd99bb]" />
              <h2 className="text-lg font-black text-white tracking-wide">Waiting in Lounge</h2>
            </div>
            <span className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {waitingList.length} Waiting
            </span>
          </div>

          {/* Waiting Queue List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {waitingList.length > 0 ? (
              waitingList.map((apt, index) => (
                <div
                  key={apt.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-xs font-bold text-slate-500 font-mono">
                      #{index + 1}
                    </span>
                    <div className="w-16 text-xl font-black font-mono text-white tracking-wide">
                      {apt.queueNumber}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-200">{maskName(apt.patientName)}</div>
                      <div className="text-[11px] text-slate-400">{apt.doctorName}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      In Lounge
                    </span>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">
                      Check-in:{' '}
                      {apt.checkInTime
                        ? new Date(apt.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : apt.startTime}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-16 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-500/40 mb-2" />
                <div className="text-sm font-bold text-slate-400">All Checked-In Patients Served</div>
                <div className="text-xs text-slate-600 mt-1">Waiting lounge queue is currently clear.</div>
              </div>
            )}
          </div>

          {/* Public Return Link */}
          <div className="pt-4 mt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <Link
              href="/"
              className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 font-semibold"
            >
              <span>← Back to Portal</span>
            </Link>
            <span className="text-[11px] text-slate-500">Auto-refresh every 4s</span>
          </div>
        </div>
      </main>
    </div>
  );
}
