'use client';

import { useState, useEffect, useTransition } from 'react';
import { HabitList } from './habit-list';
import { HabitDetail } from './habit-detail';
import { HabitDialog, type HabitDialogValues } from './habit-dialog';
import { moveHabit } from './habit-calc';
import { createHabit, updateHabit, deleteHabit, reorderHabits, toggleHabitLog } from './actions';
import { Button } from '@/app/components/ui/button';
import { useMediaQuery } from '@/app/lib/use-media-query';
import { todayKey as getTodayKey } from '@/app/lib/date-format';
import { addMonths } from '@/app/lib/calendar-dates';
import type { HabitDTO } from './queries';

const HEAT_WEEKS_NARROW = 14;
const HEAT_WEEKS_WIDE = 30;

export interface HabitsBoardProps {
  initialHabits: HabitDTO[];
}

function habitToDialogValues(habit: HabitDTO): HabitDialogValues {
  return {
    name: habit.name,
    freqType: habit.freqType,
    timesPerWeek: String(habit.timesPerWeek ?? 3),
    startDate: habit.startDate,
  };
}

export function HabitsBoard({ initialHabits }: HabitsBoardProps) {
  const [habits, setHabits] = useState(initialHabits);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(initialHabits[0]?.id ?? null);
  const [showDetailOnNarrow, setShowDetailOnNarrow] = useState(false);
  const [habitMonth, setHabitMonth] = useState(() => `${getTodayKey().slice(0, 8)}01`);
  const [dragHabitId, setDragHabitId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ habit: HabitDTO | null; values: HabitDialogValues } | null>(null);
  const isNarrow = useMediaQuery('(max-width: 860px)');
  const [, startTransition] = useTransition();

  const todayKey = getTodayKey();
  const selectedHabit = habits.find((h) => h.id === selectedHabitId) ?? null;
  const showHabitList = !isNarrow || !showDetailOnNarrow || !selectedHabit;
  const showHabitDetail = !!selectedHabit && (!isNarrow || showDetailOnNarrow);

  function handleSelect(habitId: string) {
    setSelectedHabitId(habitId);
    setShowDetailOnNarrow(true);
  }

  function handleToggleLog(habitId: string, dateKey: string) {
    const prevHabits = habits;
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const has = h.logs.includes(dateKey);
        return { ...h, logs: has ? h.logs.filter((d) => d !== dateKey) : [...h.logs, dateKey] };
      })
    );
    startTransition(async () => {
      try {
        await toggleHabitLog(habitId, dateKey);
      } catch {
        setHabits(prevHabits);
        window.alert('Could not update the habit log. Please try again.');
      }
    });
  }

  useEffect(() => {
    function clearDragState() {
      setDragHabitId(null);
    }
    window.addEventListener('dragend', clearDragState);
    return () => window.removeEventListener('dragend', clearDragState);
  }, []);

  function handleDragStart(habitId: string) {
    setDragHabitId(habitId);
  }

  function handleDropOnCard(targetId: string) {
    if (!dragHabitId) return;
    const prevHabits = habits;
    const next = moveHabit(habits, dragHabitId, targetId);
    setHabits(next);
    setDragHabitId(null);
    startTransition(async () => {
      try {
        await reorderHabits(next.map((h) => h.id));
      } catch {
        setHabits(prevHabits);
        window.alert('Could not reorder habits. Please try again.');
      }
    });
  }

  function handleSaveDialog(values: HabitDialogValues) {
    const editingId = dialog?.habit?.id ?? null;
    const timesPerWeek = values.freqType === 'WEEKLY' ? Number(values.timesPerWeek) || 1 : null;
    const startDate = values.startDate || todayKey;
    startTransition(async () => {
      try {
        if (editingId) {
          const updated = await updateHabit({ id: editingId, name: values.name, freqType: values.freqType, timesPerWeek, startDate });
          setHabits((prev) => prev.map((h) => (h.id === editingId ? updated : h)));
          setDialog(null);
        } else {
          const created = await createHabit({ name: values.name, freqType: values.freqType, timesPerWeek, startDate });
          setHabits((prev) => [...prev, created]);
          setSelectedHabitId((prev) => prev ?? created.id);
          setDialog(null);
        }
      } catch {
        window.alert('Could not save the habit. Please try again.');
      }
    });
  }

  function handleDeleteHabit(habitId: string) {
    if (!window.confirm('Delete this habit and all its logged days?')) return;
    const prevHabits = habits;
    const prevSelectedHabitId = selectedHabitId;
    const remaining = habits.filter((h) => h.id !== habitId);
    setHabits(remaining);
    setDialog(null);
    if (selectedHabitId === habitId) {
      setSelectedHabitId(remaining[0]?.id ?? null);
    }
    startTransition(async () => {
      try {
        await deleteHabit(habitId);
      } catch {
        setHabits(prevHabits);
        setSelectedHabitId(prevSelectedHabitId);
        window.alert('Could not delete the habit. Please try again.');
      }
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'var(--pw-vh)' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 'var(--space-3)', gap: 'var(--space-3)', padding: '0 clamp(16px, 3vw, 32px)', flex: 'none' }}>
        <Button
          onClick={() =>
            setDialog({ habit: null, values: { name: '', freqType: 'DAILY', timesPerWeek: '3', startDate: todayKey } })
          }
        >
          New habit
        </Button>
      </header>
      <div className="pw-habit-split">
        {showHabitList && (
          <div className="pw-habit-left pw-scroll">
            <HabitList
              habits={habits}
              selectedHabitId={selectedHabitId}
              todayKey={todayKey}
              heatWeeks={isNarrow ? HEAT_WEEKS_NARROW : HEAT_WEEKS_WIDE}
              onSelect={handleSelect}
              onToggleLog={handleToggleLog}
              onDragStart={handleDragStart}
              onDropOnCard={handleDropOnCard}
            />
          </div>
        )}
        {showHabitDetail && selectedHabit && (
          <div className="pw-habit-right pw-scroll">
            <HabitDetail
              habit={selectedHabit}
              todayKey={todayKey}
              monthKey={habitMonth}
              isNarrow={isNarrow}
              onBack={() => setShowDetailOnNarrow(false)}
              onEdit={() => setDialog({ habit: selectedHabit, values: habitToDialogValues(selectedHabit) })}
              onDelete={() => handleDeleteHabit(selectedHabit.id)}
              onToggleLog={(dateKey) => handleToggleLog(selectedHabit.id, dateKey)}
              onMonthPrev={() => setHabitMonth((m) => addMonths(m, -1))}
              onMonthNext={() => setHabitMonth((m) => addMonths(m, 1))}
            />
          </div>
        )}
      </div>
      {dialog && (
        <HabitDialog
          open
          mode={dialog.habit ? 'edit' : 'create'}
          initialValues={dialog.values}
          onClose={() => setDialog(null)}
          onSave={handleSaveDialog}
          onDelete={dialog.habit ? () => handleDeleteHabit(dialog.habit!.id) : undefined}
        />
      )}
    </div>
  );
}
