"use client";

import { useState, useRef, useEffect, ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption<T = string> {
  value: T;
  label: string;
  subLabel?: string;
  badge?: string;
  badgeColor?: "amber" | "rose" | "emerald" | "indigo" | "slate";
  icon?: ReactNode;
  flag?: string;
  disabled?: boolean;
  onPreview?: () => void;
  previewLabel?: string;
}

interface CustomSelectProps<T = string> {
  value: T;
  onChange: (val: T) => void;
  options: SelectOption<T>[];
  label?: string;
  icon?: ReactNode;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  width?: string | number;
  align?: "left" | "right";
}

export function CustomSelect<T = string>({
  value,
  onChange,
  options,
  label,
  icon,
  placeholder = "Select",
  buttonClassName = "",
  menuClassName = "",
  width,
  align = "left",
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className="relative inline-block text-left shrink-0 max-w-full"
      style={{ width: width ? width : undefined }}
    >
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-[46px] sm:h-[48px] w-full flex items-center justify-between gap-2 px-3 sm:px-3.5 rounded-2xl border border-slate-200 bg-white text-slate-800 text-xs sm:text-sm font-semibold shadow-2xs hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] transition-all cursor-pointer select-none whitespace-nowrap ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 truncate min-w-0">
          {selectedOption?.flag ? (
            <span className="shrink-0 text-base leading-none">{selectedOption.flag}</span>
          ) : (
            icon && <span className="shrink-0 text-slate-500">{icon}</span>
          )}
          <div className="flex flex-col text-left truncate leading-tight">
            {label && (
              <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wider font-extrabold truncate">
                {label}
              </span>
            )}
            <span className="truncate text-xs sm:text-sm font-bold text-slate-900">
              {selectedOption?.label || placeholder}
            </span>
          </div>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-indigo-600" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } top-[calc(100%+6px)] z-[999] w-[calc(100vw-32px)] sm:w-auto min-w-[240px] max-w-[340px] max-h-[320px] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl ${menuClassName}`}
          style={{
            boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.18), 0 4px 10px -2px rgba(0, 0, 0, 0.08)",
          }}
          role="listbox"
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={idx}
                className={`group flex items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm transition-all cursor-pointer select-none ${
                  isSelected
                    ? "bg-indigo-50 font-bold text-indigo-900"
                    : opt.disabled
                    ? "text-slate-500 hover:bg-slate-50 opacity-90"
                    : "text-slate-800 hover:bg-slate-100 font-medium"
                }`}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                role="option"
                aria-selected={isSelected}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {opt.flag ? (
                    <span className="text-base shrink-0">{opt.flag}</span>
                  ) : (
                    opt.icon && <span className="text-slate-400 shrink-0">{opt.icon}</span>
                  )}
                  <div className="flex flex-col truncate min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="truncate text-xs sm:text-sm leading-tight font-bold">{opt.label}</span>
                      {opt.badge && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 border ${
                            opt.badgeColor === "amber"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {opt.badge}
                        </span>
                      )}
                    </div>
                    {opt.subLabel && (
                      <span className="truncate text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-tight">
                        {opt.subLabel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {opt.onPreview && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        opt.onPreview?.();
                      }}
                      className="px-2 py-1 rounded-lg text-[11px] font-bold bg-slate-100 hover:bg-indigo-100 text-slate-700 hover:text-indigo-800 transition-colors cursor-pointer"
                    >
                      {opt.previewLabel || "Nghe"}
                    </button>
                  )}
                  {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0 stroke-[3]" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
