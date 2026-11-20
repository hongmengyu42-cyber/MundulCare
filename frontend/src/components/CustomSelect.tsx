'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  /** Brand accent color for focus ring & selected option. Defaults to the client pink. */
  accentColor?: string;
  icon?: React.ReactNode;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  className = '',
  accentColor = '#aa5588',
  icon,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Tailwind needs full literal class names to generate them, so the two accent
  // variants this app actually uses (client pink / admin purple) are spelled out.
  const isPurple = accentColor === '#6D28D9';
  const ringClass = isPurple ? 'focus:ring-[#6D28D9]/20' : 'focus:ring-[#aa5588]/20';
  const selectedClass = isPurple
    ? 'bg-[#f5f3ff] dark:bg-purple-950/50 text-[#6D28D9] dark:text-purple-300'
    : 'bg-[#fbf5f8] dark:bg-pink-950/50 text-[#aa5588] dark:text-pink-300';
  const checkClass = isPurple ? 'text-[#6D28D9] dark:text-purple-300' : 'text-[#aa5588] dark:text-pink-300';

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full min-w-0 ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full max-w-full min-w-0 overflow-hidden flex items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 ${ringClass} transition-all cursor-pointer shadow-2xs`}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1 text-left overflow-hidden">
          {icon && <span className="shrink-0">{icon}</span>}
          <span
            className="truncate block min-w-0 flex-1"
            title={selectedOption ? selectedOption.label : placeholder}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-200 ease-in-out ${
            isOpen ? 'rotate-180 text-slate-700 dark:text-slate-200' : 'rotate-0'
          }`}
        />
      </button>

      {/* Dropdown Menu with animation */}
      {isOpen && (
        <div className="absolute right-0 left-0 z-50 mt-1.5 w-full min-w-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xl py-1.5 max-h-64 overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-150">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-sm font-medium transition-colors flex items-center justify-between cursor-pointer min-w-0 overflow-hidden ${
                  isSelected
                    ? `${selectedClass} font-bold`
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="truncate flex-1 min-w-0 pr-2" title={opt.label}>
                  {opt.label}
                </span>
                {isSelected && <span className={`${checkClass} text-xs shrink-0 ml-1`}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
