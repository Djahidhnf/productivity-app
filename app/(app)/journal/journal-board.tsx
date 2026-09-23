'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Mood } from '@prisma/client';
import { JournalHeader } from './journal-header';
import { JournalEditor } from './journal-editor';
import { JournalHistory } from './journal-history';
import { buildJournalHistory } from './journal-views';
import { saveJournalEntry, type SaveJournalEntryInput } from './actions';
import { todayKey as getTodayKey } from '@/app/lib/date-format';
import { addDays, calendarDateLabel } from '@/app/lib/calendar-dates';
import type { JournalEntryDTO } from './queries';

const SAVE_DEBOUNCE_MS = 600;

export interface JournalBoardProps {
  initialEntries: JournalEntryDTO[];
}

export function JournalBoard({ initialEntries }: JournalBoardProps) {
  const [entries, setEntries] = useState<Record<string, JournalEntryDTO>>(() =>
    Object.fromEntries(initialEntries.map((e) => [e.date, e]))
  );
  const [journalDate, setJournalDate] = useState(() => getTodayKey());

  const pendingSaveRef = useRef<SaveJournalEntryInput | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushPendingSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingSaveRef.current;
    if (!pending) return;
    pendingSaveRef.current = null;
    saveJournalEntry(pending).catch(() => {
      window.alert('Could not save your journal entry. Please try again.');
    });
  }, []);

  useEffect(() => {
    return () => {
      flushPendingSave();
    };
  }, [flushPendingSave]);

  function scheduleSave(date: string, text: string, mood: Mood) {
    pendingSaveRef.current = { date, text, mood };
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      flushPendingSave();
    }, SAVE_DEBOUNCE_MS);
  }

  const todayKey = getTodayKey();
  const currentEntry: JournalEntryDTO = entries[journalDate] ?? { date: journalDate, text: '', mood: 'OKAY' };
  const historyItems = buildJournalHistory(Object.values(entries), journalDate, todayKey);

  function handleTextChange(text: string) {
    setEntries((prev) => ({ ...prev, [journalDate]: { ...currentEntry, text } }));
    scheduleSave(journalDate, text, currentEntry.mood);
  }

  function handleMoodChange(mood: Mood) {
    setEntries((prev) => ({ ...prev, [journalDate]: { ...currentEntry, mood } }));
    scheduleSave(journalDate, currentEntry.text, mood);
    flushPendingSave();
  }

  function navigateTo(date: string) {
    flushPendingSave();
    setJournalDate(date);
  }

  function handlePrev() {
    navigateTo(addDays(journalDate, -1));
  }

  function handleNext() {
    navigateTo(addDays(journalDate, 1));
  }

  function handleToday() {
    navigateTo(todayKey);
  }

  return (
    <div style={{ maxWidth: 1440, padding: '0 clamp(16px, 3vw, 32px)' }}>
      <JournalHeader
        dateLabel={calendarDateLabel(journalDate, todayKey)}
        onPrev={handlePrev}
        onToday={handleToday}
        onNext={handleNext}
      />
      <div className="pw-journal-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 'var(--space-6)' }}>
        <JournalEditor
          mood={currentEntry.mood}
          text={currentEntry.text}
          onMoodChange={handleMoodChange}
          onTextChange={handleTextChange}
        />
        <JournalHistory items={historyItems} onOpen={navigateTo} />
      </div>
    </div>
  );
}
