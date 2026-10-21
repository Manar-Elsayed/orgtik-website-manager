"use client";

import { Combobox } from "@orgtik/ui";

const YEARS = Array.from({ length: 201 }, (_, index) => String(1900 + index));

/** Search or choose a year; retain existing years outside the usual calendar range. */
export function YearPicker({ value, onValueChange, label, allLabel, disabled, size }: {
  value: string;
  onValueChange: (value: string | null) => void;
  label: string;
  allLabel?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const years = /^\d{4}$/.test(value) && !YEARS.includes(value)
    ? [...YEARS, value].sort()
    : YEARS;
  return (
    <Combobox
      size={size}
      aria-label={label}
      placeholder={label}
      popupClassName="min-w-40"
      value={value || (allLabel ? "all" : null)}
      onValueChange={onValueChange}
      disabled={disabled}
      options={[
        ...(allLabel ? [{ value: "all", label: `${label}: ${allLabel}` }] : []),
        ...years.map(year => ({ value: year, label: year })),
      ]}
    />
  );
}
