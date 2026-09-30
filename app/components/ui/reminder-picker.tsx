'use client';

import { useState } from 'react';
import { Select } from '@/app/components/ui/select';
import { Input } from '@/app/components/ui/input';
import {
  MAX_CUSTOM_AMOUNT,
  MINUTES_PER_DAY,
  UNIT_MINUTES,
  decomposeOffset,
  type ReminderMode,
  type ReminderUnit,
} from '@/app/lib/reminders/offsets';

const NEVER = 'never';
const CUSTOM = 'custom';

const PRESETS: Record<'timed' | 'untimed', { value: string; label: string }[]> = {
  timed: [
    { value: NEVER, label: 'Never' },
    { value: '0', label: 'On time' },
    { value: '30', label: '30 min before' },
    { value: '60', label: '1 hour before' },
    { value: String(MINUTES_PER_DAY), label: '1 day before' },
    { value: CUSTOM, label: 'Custom…' },
  ],
  untimed: [
    { value: NEVER, label: 'Never' },
    { value: '0', label: 'On the day (9:00)' },
    { value: String(MINUTES_PER_DAY), label: '1 day before' },
    { value: CUSTOM, label: 'Custom…' },
  ],
};

const UNIT_OPTIONS: { value: ReminderUnit; label: string }[] = [
  { value: 'minutes', label: 'minutes' },
  { value: 'hours', label: 'hours' },
  { value: 'days', label: 'days' },
];

export interface ReminderPickerProps {
  /** Minutes before the due time; null = never. */
  value: number | null;
  onChange: (value: number | null) => void;
  mode: ReminderMode;
  /** Shown under the disabled select, e.g. "Set a due date to get a reminder". */
  disabledHint?: string;
  label?: string;
}

export function ReminderPicker({ value, onChange, mode, disabledHint, label = 'Reminder' }: ReminderPickerProps) {
  const presets = PRESETS[mode === 'untimed' ? 'untimed' : 'timed'];
  const matchesPreset = value == null || presets.some((p) => p.value === String(value));
  // Custom stays open while editing even if the amount happens to match a preset.
  const [customOpen, setCustomOpen] = useState(!matchesPreset);
  const showCustom = mode !== 'disabled' && value != null && (customOpen || !matchesPreset);
  const decomposed = decomposeOffset(value ?? 0, mode);
  const [unit, setUnit] = useState<ReminderUnit>(decomposed.unit);
  const effectiveUnit: ReminderUnit = mode === 'untimed' ? 'days' : unit;
  const [amountText, setAmountText] = useState(String(Math.max(1, Math.round((value ?? 0) / UNIT_MINUTES[effectiveUnit]))));

  const selectValue = mode === 'disabled' || value == null ? NEVER : showCustom ? CUSTOM : String(value);

  function applyAmount(text: string, nextUnit: ReminderUnit) {
    setAmountText(text);
    const amount = Number(text);
    if (Number.isInteger(amount) && amount >= 1 && amount <= MAX_CUSTOM_AMOUNT) onChange(amount * UNIT_MINUTES[nextUnit]);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Select
        label={label}
        options={presets}
        value={selectValue}
        disabled={mode === 'disabled'}
        onChange={(event) => {
          const next = event.target.value;
          if (next === NEVER) {
            setCustomOpen(false);
            onChange(null);
          } else if (next === CUSTOM) {
            setCustomOpen(true);
            const start = mode === 'untimed' ? { amount: 2, unit: 'days' as const } : { amount: 15, unit: 'minutes' as const };
            setUnit(start.unit);
            setAmountText(String(start.amount));
            onChange(start.amount * UNIT_MINUTES[start.unit]);
          } else {
            setCustomOpen(false);
            onChange(Number(next));
          }
        }}
      />
      {mode === 'disabled' && disabledHint && <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{disabledHint}</span>}
      {showCustom && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: 8, alignItems: 'end' }}>
          <Input
            aria-label="Remind this many"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_CUSTOM_AMOUNT}
            value={amountText}
            onChange={(event) => applyAmount(event.target.value, effectiveUnit)}
          />
          <Select
            aria-label="Unit"
            options={mode === 'untimed' ? UNIT_OPTIONS.filter((u) => u.value === 'days') : UNIT_OPTIONS}
            value={effectiveUnit}
            onChange={(event) => {
              const nextUnit = event.target.value as ReminderUnit;
              setUnit(nextUnit);
              applyAmount(amountText, nextUnit);
            }}
          />
        </div>
      )}
      {showCustom && <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>before the due time</span>}
    </div>
  );
}
