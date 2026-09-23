'use client';

import { useState, useEffect, useTransition } from 'react';
import { CalendarHeader } from './calendar-header';
import { CalendarViewPill, type CalView } from './calendar-view-pill';
import { DayWeekGrid } from './day-week-grid';
import { MonthView } from './month-view';
import { YearView } from './year-view';
import { AgendaView } from './agenda-view';
import { TaskDialog, type TaskDialogValues } from '../tasks/task-dialog';
import { createTask, updateTask, deleteTask, toggleTaskDone } from '../tasks/actions';
import type { SwipeStrength } from '@/app/lib/use-swipe';
import { todayKey } from '@/app/lib/date-format';
import {
  MAX_MONTH_INDEX,
  MAX_YEAR,
  MIN_MONTH_INDEX,
  MIN_YEAR,
  monthIndexOfDateKey,
  yearOfDateKey,
} from '@/app/lib/calendar-units';
import {
  addDays,
  addMonths,
  addYears,
  weekDates,
  calendarDateLabel,
  shortDateLabel,
  monthYearLabel,
} from '@/app/lib/calendar-dates';
import {
  timedTasksByDate,
  untimedTasksByDate,
  buildAgendaGroups,
  swipeStepDays,
} from './calendar-views';
import type { TaskDTO } from './queries';
import type { TaskListDTO } from '../tasks/queries';

export interface CalendarBoardProps {
  initialTasks: TaskDTO[];
  lists: TaskListDTO[];
}

function taskToDialogValues(task: TaskDTO): TaskDialogValues {
  const dueTime =
    task.dueTime == null
      ? ''
      : `${String(Math.floor(task.dueTime / 60)).padStart(2, '0')}:${String(task.dueTime % 60).padStart(2, '0')}`;
  return { text: task.text, listId: task.listId, priority: task.priority, due: task.due ?? '', dueTime };
}

function parseDueTime(value: string): number | null {
  if (!value) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTimeInput(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

// Header arrows stop at the 1900-2100 bounds instead of moving calDate past them.
function stepMonth(dateKey: string, delta: 1 | -1): string {
  const next = addMonths(dateKey, delta);
  const index = monthIndexOfDateKey(next);
  return index < MIN_MONTH_INDEX || index > MAX_MONTH_INDEX ? dateKey : next;
}

function stepYear(dateKey: string, delta: 1 | -1): string {
  const next = addYears(dateKey, delta);
  const year = yearOfDateKey(next);
  return year < MIN_YEAR || year > MAX_YEAR ? dateKey : next;
}

export function CalendarBoard({ initialTasks, lists }: CalendarBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [calView, setCalView] = useState<CalView>('day');
  const [calDate, setCalDate] = useState(todayKey());
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ mode: 'create' | 'edit'; task?: TaskDTO; values: TaskDialogValues } | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    function clearDragState() {
      setDragTaskId(null);
    }
    window.addEventListener('dragend', clearDragState);
    return () => window.removeEventListener('dragend', clearDragState);
  }, []);

  function handlePrev() {
    if (calView === 'day') setCalDate((d) => addDays(d, -1));
    else if (calView === '3day') setCalDate((d) => addDays(d, -3));
    else if (calView === 'week') setCalDate((d) => addDays(d, -7));
    else if (calView === 'month') setCalDate((d) => stepMonth(d, -1));
    else if (calView === 'year') setCalDate((d) => stepYear(d, -1));
    else setCalDate((d) => addDays(d, -60));
  }

  function handleNext() {
    if (calView === 'day') setCalDate((d) => addDays(d, 1));
    else if (calView === '3day') setCalDate((d) => addDays(d, 3));
    else if (calView === 'week') setCalDate((d) => addDays(d, 7));
    else if (calView === 'month') setCalDate((d) => stepMonth(d, 1));
    else if (calView === 'year') setCalDate((d) => stepYear(d, 1));
    else setCalDate((d) => addDays(d, 60));
  }

  function handleToday() {
    setCalDate(todayKey());
  }

  function handleVisibleMonthChange(dateKey: string) {
    setCalDate((prev) => (monthIndexOfDateKey(prev) === monthIndexOfDateKey(dateKey) ? prev : dateKey));
  }

  function handleVisibleYearChange(dateKey: string) {
    setCalDate((prev) => (yearOfDateKey(prev) === yearOfDateKey(dateKey) ? prev : dateKey));
  }

  function handleSwipe(direction: 1 | -1, strength: SwipeStrength) {
    setCalDate((d) => addDays(d, direction * swipeStepDays(calView, strength)));
  }

  function handleOpenTask(task: TaskDTO) {
    setDialog({ mode: 'edit', task, values: taskToDialogValues(task) });
  }

  function handleNewTask() {
    setDialog({ mode: 'create', values: { text: '', listId: lists[0]?.id ?? '', priority: null, due: calDate, dueTime: '' } });
  }

  function handleGridClick(dateKey: string, minutes: number) {
    setDialog({
      mode: 'create',
      values: { text: '', listId: lists[0]?.id ?? '', priority: null, due: dateKey, dueTime: minutesToTimeInput(minutes) },
    });
  }

  function handleCellClick(dateKey: string) {
    setDialog({ mode: 'create', values: { text: '', listId: lists[0]?.id ?? '', priority: null, due: dateKey, dueTime: '' } });
  }

  function handleSaveDialog(values: TaskDialogValues) {
    const dueTime = parseDueTime(values.dueTime);
    if (dialog?.mode === 'edit' && dialog.task) {
      const taskId = dialog.task.id;
      startTransition(async () => {
        try {
          const updated = await updateTask({
            id: taskId,
            text: values.text,
            listId: values.listId,
            priority: values.priority,
            due: values.due || null,
            dueTime,
          });
          setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
        } catch {
          window.alert('Could not save the task. Please try again.');
        }
      });
    } else {
      startTransition(async () => {
        let created: TaskDTO | undefined;
        try {
          created = await createTask({ text: values.text, listId: values.listId });
          const updated = await updateTask({
            id: created.id,
            text: values.text,
            listId: values.listId,
            priority: values.priority,
            due: values.due || null,
            dueTime,
          });
          setTasks((prev) => [...prev, updated]);
        } catch {
          if (created) {
            try {
              await deleteTask(created.id);
            } catch {
              // Best-effort cleanup only -- the create failure below is the
              // primary error already being reported to the user.
            }
          }
          window.alert('Could not create the task. Please try again.');
        }
      });
    }
    setDialog(null);
  }

  function handleDeleteFromDialog() {
    if (dialog?.mode !== 'edit' || !dialog.task) return;
    const taskId = dialog.task.id;
    const prevTasks = tasks;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    startTransition(async () => {
      try {
        await deleteTask(taskId);
      } catch {
        setTasks(prevTasks);
        window.alert('Could not delete the task. Please try again.');
      }
    });
    setDialog(null);
  }

  function handleToggleDone(taskId: string) {
    const prevTasks = tasks;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)));
    startTransition(async () => {
      try {
        await toggleTaskDone(taskId);
      } catch {
        setTasks(prevTasks);
        window.alert('Could not update the task. Please try again.');
      }
    });
  }

  function applyReschedule(taskId: string, due: string, dueTime: number | null) {
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;
    const prevTasks = tasks;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, due, dueTime } : t)));
    startTransition(async () => {
      try {
        await updateTask({ id: taskId, text: target.text, listId: target.listId, priority: target.priority, due, dueTime });
      } catch {
        setTasks(prevTasks);
        window.alert('Could not reschedule the task. Please try again.');
      }
    });
  }

  function handleGridDrop(dateKey: string, minutes: number) {
    if (!dragTaskId) return;
    applyReschedule(dragTaskId, dateKey, minutes);
    setDragTaskId(null);
  }

  function handleMonthCellDrop(dateKey: string) {
    if (!dragTaskId) return;
    const target = tasks.find((t) => t.id === dragTaskId);
    applyReschedule(dragTaskId, dateKey, target?.dueTime ?? null);
    setDragTaskId(null);
  }

  const today = todayKey();
  const title =
    calView === 'day'
      ? calendarDateLabel(calDate, today)
      : calView === '3day'
        ? `${shortDateLabel(calDate)} – ${shortDateLabel(addDays(calDate, 2))}`
        : calView === 'week'
          ? `${shortDateLabel(calDate)} – ${shortDateLabel(addDays(calDate, 6))}`
          : calView === 'month'
            ? monthYearLabel(calDate)
            : calView === 'year'
              ? String(new Date(`${calDate}T00:00:00`).getFullYear())
              : `From ${calendarDateLabel(calDate, today)}`;

  const dateKeysForGrid =
    calView === 'day' ? [calDate] : calView === '3day' ? [calDate, addDays(calDate, 1), addDays(calDate, 2)] : weekDates(calDate);

  const agendaGroups = calView === 'agenda' ? buildAgendaGroups(tasks, calDate, 60) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'var(--pw-vh)' }}>
      <CalendarHeader title={title} onPrev={handlePrev} onToday={handleToday} onNext={handleNext} onNewTask={handleNewTask}
        picker={calView === 'month' || calView === 'year' ? { mode: calView, value: calDate, onPick: setCalDate } : undefined}
      />
      {calView === 'day' || calView === '3day' || calView === 'week' ? (
        <DayWeekGrid
          dateKeys={dateKeysForGrid}
          timedTasksFor={(key) => timedTasksByDate(tasks, key)}
          untimedTasksFor={(key) => untimedTasksByDate(tasks, key)}
          onTaskOpen={handleOpenTask}
          onGridClick={handleGridClick}
          onTaskDragStart={(task) => setDragTaskId(task.id)}
          onGridDrop={handleGridDrop}
          onTaskToggleDone={handleToggleDone}
          onSwipePrev={(strength) => handleSwipe(-1, strength)}
          onSwipeNext={(strength) => handleSwipe(1, strength)}
        />
      ) : calView === 'month' ? (
        <MonthView
          tasks={tasks}
          anchor={calDate}
          todayKey={today}
          onVisibleMonthChange={handleVisibleMonthChange}
          onCellClick={handleCellClick}
          onTaskOpen={handleOpenTask}
          onTaskDragStart={(task) => setDragTaskId(task.id)}
          onCellDrop={handleMonthCellDrop}
        />
      ) : calView === 'year' ? (
        <YearView
          tasks={tasks}
          anchor={calDate}
          todayKey={today}
          onVisibleYearChange={handleVisibleYearChange}
          onMonthOpen={(y, m) => {
            setCalDate(`${y}-${String(m + 1).padStart(2, '0')}-01`);
            setCalView('month');
          }}
        />
      ) : (
        <AgendaView groups={agendaGroups} todayKey={today} onTaskOpen={handleOpenTask} />
      )}
      <CalendarViewPill value={calView} onChange={setCalView} />
      {dialog && (
        <TaskDialog
          open
          mode={dialog.mode}
          lists={lists}
          initialValues={dialog.values}
          onClose={() => setDialog(null)}
          onSave={handleSaveDialog}
          onDelete={dialog.mode === 'edit' ? handleDeleteFromDialog : undefined}
        />
      )}
    </div>
  );
}
