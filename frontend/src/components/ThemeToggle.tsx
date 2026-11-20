'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, ChevronDown, Check } from 'lucide-react';
import { useTheme, Theme } from '@/context/ThemeContext';

interface ThemeToggleProps {
  variant?: 'icon' | 'segmented' | 'dropdown';
  className?: string;
}

export default function ThemeToggle({
  variant = 'icon',
  className = '',
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [dropdownOpen]);

  // Segmented control (Three-state button row)
  if (variant === 'segmented') {
    return (
      <div
        className={`flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 text-xs ${className}`}
        role="group"
        aria-label="Color theme selection"
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
            theme === 'light'
              ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          aria-label="Light Theme"
        >
          <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>Light</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
            theme === 'dark'
              ? 'bg-white dark:bg-slate-700 text-indigo-500 dark:text-indigo-400 shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          aria-label="Dark Theme"
        >
          <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>Dark</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('system')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
            theme === 'system'
              ? 'bg-white dark:bg-slate-700 text-[#aa5588] dark:text-[#dd99bb] shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
          aria-label="System Auto Theme"
        >
          <Laptop className="w-3.5 h-3.5 shrink-0" />
          <span>Auto</span>
        </button>
      </div>
    );
  }

  // Dropdown variant
  if (variant === 'dropdown') {
    return (
      <div ref={dropdownRef} className={`relative inline-block ${className}`}>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          aria-haspopup="true"
          aria-expanded={dropdownOpen}
        >
          {theme === 'dark' ? (
            <Moon className="w-4 h-4 text-indigo-400" />
          ) : theme === 'light' ? (
            <Sun className="w-4 h-4 text-amber-500" />
          ) : (
            <Laptop className="w-4 h-4 text-slate-400" />
          )}
          <span className="capitalize">{theme === 'system' ? 'System' : theme}</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 mt-2 w-36 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl py-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-100">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTheme(t);
                  setDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                  theme === t
                    ? 'text-[#aa5588] dark:text-[#dd99bb] bg-[#fbf5f8] dark:bg-[#aa5588]/15'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {t === 'light' && <Sun className="w-3.5 h-3.5 text-amber-500" />}
                  {t === 'dark' && <Moon className="w-3.5 h-3.5 text-indigo-400" />}
                  {t === 'system' && <Laptop className="w-3.5 h-3.5 text-slate-400" />}
                  <span className="capitalize">{t}</span>
                </div>
                {theme === t && <Check className="w-3.5 h-3.5 text-[#aa5588] dark:text-[#dd99bb]" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default Quick-Toggle Icon (Cycles or toggles effortlessly)
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className={`relative p-2 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${className}`}
      title={
        resolvedTheme === 'dark'
          ? 'Switch to Light Theme'
          : 'Switch to Dark Theme'
      }
      aria-label="Toggle dark mode"
    >
      <div className="w-4 h-4 flex items-center justify-center">
        {resolvedTheme === 'dark' ? (
          <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-90 duration-200" />
        ) : (
          <Moon className="w-4 h-4 text-slate-600 animate-in spin-in-90 duration-200" />
        )}
      </div>
    </button>
  );
}
