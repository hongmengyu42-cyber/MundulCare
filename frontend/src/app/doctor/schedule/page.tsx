'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Clock,
  CalendarOff,
  Calendar,
  Save,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { doctorPortalApi } from '@/lib/api';
import { DoctorScheduleCalendar } from '@/types/doctorPortal';
import { DoctorSchedule } from '@/types/doctor';

const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

export default function DoctorSchedulePage() {
  const [calendar, setCalendar] = useState<DoctorScheduleCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editable weekly state
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [dayRows, setDayRows] = useState<Record<string, DoctorSchedule>>({});
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Unavailable Date form
  const [blockDate, setBlockDate] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blocking, setBlocking] = useState(false);

  // Calendar view toggle: 'WEEKLY' | 'MONTHLY'
  const [viewMode, setViewMode] = useState<'WEEKLY' | 'MONTHLY'>('WEEKLY');

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await doctorPortalApi.getScheduleCalendar();
      if (res.success && res.data) {
        setCalendar(res.data);
        setDurationMinutes(res.data.appointmentDurationMinutes || 30);

        const map: Record<string, DoctorSchedule> = {};
        for (const day of DAYS_OF_WEEK) {
          const found = res.data.weeklySchedules.find(
            (s) => s.dayOfWeek.toUpperCase() === day
          );
          map[day] = found
            ? {
                ...found,
                startTime: found.startTime.slice(0, 5),
                endTime: found.endTime.slice(0, 5),
                breakStart: found.breakStart ? found.breakStart.slice(0, 5) : '',
                breakEnd: found.breakEnd ? found.breakEnd.slice(0, 5) : '',
              }
            : {
                dayOfWeek: day,
                startTime: '09:00',
                endTime: '17:00',
                breakStart: '12:00',
                breakEnd: '13:00',
                isAvailable: false,
              };
        }
        setDayRows(map);
      } else {
        setError(res.message || 'Unable to load schedule.');
      }
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to load schedule.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadSchedule();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadSchedule]);

  const handleDayChange = (
    day: string,
    field: keyof DoctorSchedule,
    value: string | boolean
  ) => {
    setDayRows((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleSaveWeeklySchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSchedule(true);
    setSuccessMsg(null);
    setError(null);

    try {
      const activeSchedules: DoctorSchedule[] = DAYS_OF_WEEK.map((d) => dayRows[d])
        .filter((row) => row && row.isAvailable)
        .map((row) => ({
          dayOfWeek: row.dayOfWeek,
          startTime: row.startTime,
          endTime: row.endTime,
          breakStart: row.breakStart ? row.breakStart : null,
          breakEnd: row.breakEnd ? row.breakEnd : null,
          isAvailable: true,
        }));

      const res = await doctorPortalApi.updateWeeklySchedule({
        appointmentDurationMinutes: durationMinutes,
        schedules: activeSchedules,
      });

      if (res.success && res.data) {
        setCalendar(res.data);
        setSuccessMsg('Weekly availability, break times, and slot duration saved.');
      }
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to update schedule.'
      );
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleAddBlockedDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockDate) return;
    setBlocking(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await doctorPortalApi.addUnavailableDate({
        unavailableDate: blockDate,
        reason: blockReason.trim() || 'Clinical / Personal Leave',
      });
      if (res.success) {
        setBlockDate('');
        setBlockReason('');
        setSuccessMsg('Unavailable date blocked successfully.');
        await loadSchedule();
      }
    } catch (err: unknown) {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not block unavailable date.'
      );
    } finally {
      setBlocking(false);
    }
  };

  const handleRemoveBlockedDate = async (id: number) => {
    try {
      await doctorPortalApi.removeUnavailableDate(id);
      await loadSchedule();
    } catch (err: unknown) {
      alert(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Could not remove blocked date.'
      );
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="w-7 h-7 text-[#aa5588] animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500">Loading your schedule configuration...</p>
      </div>
    );
  }

  // Upcoming days for Weekly/Monthly schedule preview
  const previewDaysCount = viewMode === 'WEEKLY' ? 7 : 30;
  const upcomingDays = Array.from({ length: previewDaysCount }, (_, idx) => {
    const d = new Date();
    d.setDate(d.getDate() + idx);
    const iso = d.toISOString().split('T')[0];
    const weekday = d
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toUpperCase();
    const blocked = calendar?.unavailableDates.find((u) => u.unavailableDate === iso);
    const appts = (calendar?.appointments || []).filter((a) => a.appointmentDate === iso);
    const workingRule = dayRows[weekday];
    return { iso, weekday, blocked, appts, workingRule };
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <Clock className="w-6 h-6 text-[#aa5588]" />
          <span>My Schedule &amp; Availability</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure working days, working hours, break windows, appointment duration, and blocked leave dates
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Weekly Working Hours & Break Times Editor */}
        <form
          onSubmit={handleSaveWeeklySchedule}
          className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Weekly Working Days, Hours &amp; Break Times
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Patients cannot book during your break window or outside your available days
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label
                htmlFor="slot-duration"
                className="text-xs font-semibold text-slate-700 whitespace-nowrap"
              >
                Slot Duration:
              </label>
              <select
                id="slot-duration"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-[#aa5588] bg-[#fbf5f8]"
              >
                <option value={15}>15 mins</option>
                <option value={20}>20 mins</option>
                <option value={30}>30 mins</option>
                <option value={45}>45 mins</option>
                <option value={60}>60 mins</option>
              </select>
            </div>
          </div>

          <div className="space-y-2.5">
            {DAYS_OF_WEEK.map((day) => {
              const row = dayRows[day];
              if (!row) return null;
              return (
                <div
                  key={day}
                  className={`p-3.5 rounded-xl border transition-colors ${
                    row.isAvailable
                      ? 'bg-[#fbf5f8]/30 border-[#edd5e3]'
                      : 'bg-slate-50/60 border-slate-200/70 opacity-75'
                  }`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs">
                    <div className="sm:col-span-3 flex items-center gap-2.5">
                      <input
                        id={`avail-${day}`}
                        type="checkbox"
                        checked={row.isAvailable}
                        onChange={(e) =>
                          handleDayChange(day, 'isAvailable', e.target.checked)
                        }
                        className="w-4 h-4 accent-[#aa5588] rounded cursor-pointer"
                      />
                      <label
                        htmlFor={`avail-${day}`}
                        className="font-bold text-slate-900 cursor-pointer"
                      >
                        {day.charAt(0) + day.slice(1).toLowerCase()}
                      </label>
                    </div>

                    {row.isAvailable ? (
                      <>
                        <div className="sm:col-span-4 flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-500 font-semibold w-12">
                            Hours:
                          </span>
                          <input
                            type="time"
                            aria-label={`${day} start time`}
                            value={row.startTime}
                            onChange={(e) =>
                              handleDayChange(day, 'startTime', e.target.value)
                            }
                            className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-900"
                          />
                          <span className="text-slate-400">to</span>
                          <input
                            type="time"
                            aria-label={`${day} end time`}
                            value={row.endTime}
                            onChange={(e) =>
                              handleDayChange(day, 'endTime', e.target.value)
                            }
                            className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-900"
                          />
                        </div>

                        <div className="sm:col-span-5 flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-500 font-semibold w-12">
                            Break:
                          </span>
                          <input
                            type="time"
                            aria-label={`${day} break start`}
                            value={row.breakStart || ''}
                            onChange={(e) =>
                              handleDayChange(day, 'breakStart', e.target.value)
                            }
                            className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-900"
                          />
                          <span className="text-slate-400">to</span>
                          <input
                            type="time"
                            aria-label={`${day} break end`}
                            value={row.breakEnd || ''}
                            onChange={(e) =>
                              handleDayChange(day, 'breakEnd', e.target.value)
                            }
                            className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-900"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="sm:col-span-9 text-xs text-slate-400 italic">
                        Day off — Not accepting consultations
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingSchedule}
              className="px-5 py-2.5 rounded-xl bg-[#aa5588] hover:bg-[#924472] text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingSchedule ? 'Saving Schedule...' : 'Save Weekly Schedule'}</span>
            </button>
          </div>
        </form>

        {/* Right: Block Unavailable Dates (Leave / Off Days) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center gap-2">
              <CalendarOff className="w-5 h-5 text-rose-500" />
              <h2 className="text-base font-bold text-slate-900">
                Block Unavailable Dates
              </h2>
            </div>
            <p className="text-xs text-slate-500">
              Block specific dates for leave, conferences, or surgery duty. Patients cannot book on blocked dates.
            </p>

            <form onSubmit={handleAddBlockedDate} className="space-y-3 text-xs">
              <div>
                <label htmlFor="blk-date" className="block font-semibold text-slate-700 mb-1">
                  Date to Block *
                </label>
                <input
                  id="blk-date"
                  type="date"
                  required
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <div>
                <label htmlFor="blk-reason" className="block font-semibold text-slate-700 mb-1">
                  Reason / Leave Note
                </label>
                <input
                  id="blk-reason"
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="e.g. Medical Conference, Personal Leave"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>
              <button
                type="submit"
                disabled={blocking}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{blocking ? 'Blocking...' : 'Block Date'}</span>
              </button>
            </form>

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Blocked Dates ({calendar?.unavailableDates.length || 0})
              </p>
              {calendar?.unavailableDates.length === 0 ? (
                <p className="text-xs text-slate-400">No blocked dates configured.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {calendar?.unavailableDates.map((u) => (
                    <div
                      key={u.id}
                      className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-200/70 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-rose-900">{u.unavailableDate}</p>
                        <p className="text-[11px] text-rose-700">{u.reason}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBlockedDate(u.id)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 cursor-pointer"
                        title="Unblock date"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Weekly / Monthly Schedule Calendar Overview */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#aa5588]" />
              <span>
                {viewMode === 'WEEKLY' ? 'Weekly' : 'Monthly (30-Day)'} Schedule Calendar
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Combined view of your working hours, blocked dates, and booked patient slots
            </p>
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50">
            <button
              type="button"
              onClick={() => setViewMode('WEEKLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                viewMode === 'WEEKLY'
                  ? 'bg-white text-[#aa5588] shadow-2xs'
                  : 'text-slate-600'
              }`}
            >
              Weekly (7 Days)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('MONTHLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                viewMode === 'MONTHLY'
                  ? 'bg-white text-[#aa5588] shadow-2xs'
                  : 'text-slate-600'
              }`}
            >
              Monthly (30 Days)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {upcomingDays.map((item) => (
            <div
              key={item.iso}
              className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                item.blocked
                  ? 'bg-rose-50/40 border-rose-200'
                  : item.workingRule?.isAvailable
                  ? 'bg-white border-slate-200'
                  : 'bg-slate-50/70 border-slate-200/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{item.iso}</span>
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  {item.weekday.slice(0, 3)}
                </span>
              </div>

              {item.blocked ? (
                <p className="text-[11px] font-semibold text-rose-700">
                  Blocked: {item.blocked.reason}
                </p>
              ) : item.workingRule?.isAvailable ? (
                <p className="text-[11px] text-emerald-700 font-medium">
                  Hours: {item.workingRule.startTime} - {item.workingRule.endTime}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400">Regular Day Off</p>
              )}

              {item.appts.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-slate-100">
                  {item.appts.map((a) => (
                    <div
                      key={a.id}
                      className="px-2 py-1 rounded bg-[#fbf5f8] text-[#aa5588] font-semibold text-[11px] flex items-center justify-between"
                    >
                      <span className="truncate">{a.patientName}</span>
                      <span>{a.startTime}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
