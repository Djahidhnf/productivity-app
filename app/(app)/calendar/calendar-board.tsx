'use client';

import { useState, useEffect, useTransition } from 'react';
import { CalendarHeader } from './calendar-header';
import { CalendarViewPill, type CalView } from './calendar-view-pill';
import { DayWeekGrid } from './day-week-grid';
import { MonthView } from './month-view';
import { YearView, type YearMonthData } from './year-view';
import { AgendaView } from './agenda-view';
import { TaskDialog, type TaskDialogValues } from '../tasks/task-dialog';
import { createTask, updateTask, deleteTask, toggleTaskDone } from '../tasks/actions';
import { useMediaQuery } from '@/app/lib/use-media-query';
import { todayKey } from '@/app/lib/date-format';
import {
  addDays,
  addMonths,
  addYears,
  weekDates,
  startOfWeekSunday,
  buildMonthGrid,
  calendarDateLabel,
  shortDateLabel,
  monthYearLabel,
} from '@/app/lib/calendar-dates';
import { timedTasksByDate, untimedTasksByDate, tasksByDate, buildMonthCells, buildAgendaGroups } from './calendar-views';
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

export function CalendarBoard({ initialTasks, lists }: CalendarBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [calView, setCalView] = useState<CalView>('day');
  const [calDate, setCalDate] = useState(todayKey());
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ mode: 'create' | 'edit'; task?: TaskDTO; values: TaskDialogValues } | null>(null);
  const isNarrow = useMediaQuery('(max-width: 860px)');
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
    else if (calView === 'month') setCalDate((d) => addMonths(d, -1));
    else if (calView === 'year') setCalDate((d) => addYears(d, -1));
    else setCalDate((d) => addDays(d, -60));
  }

  function handleNext() {
    if (calView === 'day') setCalDate((d) => addDays(d, 1));
    else if (calView === '3day') setCalDate((d) => addDays(d, 3));
    else if (calView === 'week') setCalDate((d) => addDays(d, 7));
    else if (calView === 'month') setCalDate((d) => addMonths(d, 1));
    else if (calView === 'year') setCalDate((d) => addYears(d, 1));
    else setCalDate((d) => addDays(d, 60));
  }

  function handleToday() {
    setCalDate(todayKey());
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
        try {
          const created = await createTask({ text: values.text, listId: values.listId });
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
          ? (() => {
              const start = startOfWeekSunday(calDate);
              return `${shortDateLabel(start)} – ${shortDateLabel(addDays(start, 6))}`;
            })()
          : calView === 'month'
            ? monthYearLabel(calDate)
            : calView === 'year'
              ? String(new Date(`${calDate}T00:00:00`).getFullYear())
              : `From ${calendarDateLabel(calDate, today)}`;

  const dateKeysForGrid =
    calView === 'day' ? [calDate] : calView === '3day' ? [calDate, addDays(calDate, 1), addDays(calDate, 2)] : weekDates(startOfWeekSunday(calDate));

  const [yearStr, monthStr] = calDate.split('-');
  const year = Number(yearStr);
  const month0 = Number(monthStr) - 1;

  const monthCells = calView === 'month' ? buildMonthCells(tasks, buildMonthGrid(year, month0)) : [];

  const yearsToShow = isNarrow ? [year - 2, year - 1, year, year + 1, year + 2] : [year];
  const yearMonths: YearMonthData[] =
    calView === 'year'
      ? yearsToShow.flatMap((y) =>
          Array.from({ length: 12 }, (_, m) => ({
            year: y,
            month: m,
            label: new Date(y, m, 1).toLocaleDateString('en-US', { month: 'long' }),
            days: buildMonthGrid(y, m)
              .slice(0, 35)
              .map((c) => ({ dateKey: c.dateKey, dayNum: String(Number(c.dateKey.slice(-2))), inMonth: c.inMonth })),
          }))
        )
      : [];

  const agendaGroups = calView === 'agenda' ? buildAgendaGroups(tasks, calDate, 60) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'var(--pw-vh)' }}>
      <CalendarHeader title={title} onPrev={handlePrev} onToday={handleToday} onNext={handleNext} onNewTask={handleNewTask} />
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
        />
      ) : calView === 'month' ? (
        <MonthView
          cells={monthCells}
          onCellClick={handleCellClick}
          onTaskOpen={handleOpenTask}
          onTaskDragStart={(task) => setDragTaskId(task.id)}
          onCellDrop={handleMonthCellDrop}
        />
      ) : calView === 'year' ? (
        <YearView
          months={yearMonths}
          tasksByDate={(key) => tasksByDate(tasks, key)}
          onMonthOpen={(y, m) => {
            setCalDate(`${y}-${String(m + 1).padStart(2, '0')}-01`);
            setCalView('month');
          }}
          todayKey={today}
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
