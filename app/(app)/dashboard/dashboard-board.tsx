'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/app/components/shell/page-header';
import { ThemeToggle } from '@/app/components/shell/theme-toggle';
import { Icon, type IconName } from '@/app/components/icons';
import { Input } from '@/app/components/ui/input';
import { CheckToggle } from '@/app/components/ui/check-toggle';
import { formatTime, relativeTime, todayKey as getTodayKey } from '@/app/lib/date-format';
import { formatMoney, monthKeyLabel } from '@/app/lib/finance';
import type { TaskDTO } from '@/app/lib/task-dto';
import type { HabitDTO } from '@/app/lib/habit-dto';
import type { NoteDTO } from '@/app/lib/note-dto';
import type { FinanceEntryDTO } from '@/app/lib/finance-dto';
import { PriorityFlag } from '@/app/components/ui/priority-flag';
import { TaskDialog, taskToDialogValues, parseDueTime, type TaskDialogValues } from '../tasks/task-dialog';
import { updateTask, deleteTask } from '../tasks/actions';
import type { TaskListDTO } from '../tasks/queries';
import { toggleHabitLog } from '../habits/actions';
import { createNote } from '../notes/actions';
import { monthTotals } from '../finance/finance-views';
import { scheduleForToday, habitsForToday, longDateLabel } from './dashboard-views';

const RECENT_NOTES = 3;

export interface DashboardBoardProps {
  initialTasks: TaskDTO[];
  lists: TaskListDTO[];
  initialHabits: HabitDTO[];
  initialNotes: NoteDTO[];
  /** Entries around the current month; filtered to the browser's month here. */
  financeEntries: FinanceEntryDTO[];
}

function Section({ title, count, href, linkLabel, children }: { title: string; count?: string; href: string; linkLabel: string; children: ReactNode }) {
  return (
    <section className="pw-today-sec">
      <div className="pw-today-sechead">
        <h2 className="st-label">
          {title}
          {count && <span className="st-label-count">{count}</span>}
        </h2>
        <Link href={href} className="pw-today-link">
          {linkLabel}
        </Link>
      </div>
      {children}
    </section>
  );
}

function AddRow({ icon, label, placeholder, disabled, onAdd }: { icon: IconName; label: string; placeholder: string; disabled?: boolean; onAdd: (text: string) => Promise<boolean> }) {
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    const ok = await onAdd(text);
    setSaving(false);
    if (ok) setDraft('');
  }

  return (
    <form
      className="st-addrow"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <Icon name={icon} size={16} />
      <Input
        variant="bare"
        aria-label={label}
        placeholder={placeholder}
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
      />
    </form>
  );
}

export function DashboardBoard({ initialTasks, lists, initialHabits, initialNotes, financeEntries }: DashboardBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [habits, setHabits] = useState(initialHabits);
  const [notes, setNotes] = useState(initialNotes);
  const [dialog, setDialog] = useState<{ task: TaskDTO; values: TaskDialogValues } | null>(null);

  const today = getTodayKey();
  const month = today.slice(0, 7);
  const schedule = scheduleForToday(tasks, today);
  const todaysHabits = habitsForToday(habits, today);
  const habitsDone = todaysHabits.filter((h) => h.logs.includes(today)).length;
  const totals = monthTotals(financeEntries, month);
  const now = new Date();

  async function handleSaveTask(values: TaskDialogValues) {
    if (!dialog) return;
    const taskId = dialog.task.id;
    setDialog(null);
    try {
      const updated = await updateTask({
        id: taskId,
        text: values.text,
        listId: values.listId,
        priority: values.priority,
        due: values.due || null,
        dueTime: parseDueTime(values.dueTime),
      });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
    } catch {
      window.alert('Could not save the task. Please try again.');
    }
  }

  async function handleDeleteTask() {
    if (!dialog) return;
    const task = dialog.task;
    setDialog(null);
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await deleteTask(task.id);
    } catch {
      setTasks((prev) => [...prev, task]);
      window.alert('Could not delete the task. Please try again.');
    }
  }

  async function handleToggleHabit(habitId: string) {
    const flip = (h: HabitDTO) =>
      h.id !== habitId ? h : { ...h, logs: h.logs.includes(today) ? h.logs.filter((d) => d !== today) : [...h.logs, today] };
    setHabits((prev) => prev.map(flip));
    try {
      await toggleHabitLog(habitId, today);
    } catch {
      setHabits((prev) => prev.map(flip));
      window.alert('Could not update the habit. Please try again.');
    }
  }

  async function handleAddNote(text: string): Promise<boolean> {
    try {
      const note = await createNote(text);
      setNotes((prev) => [note, ...prev].slice(0, RECENT_NOTES));
      return true;
    } catch {
      window.alert('Could not save the note. Please try again.');
      return false;
    }
  }

  function openTask(task: TaskDTO) {
    setDialog({ task, values: taskToDialogValues(task) });
  }

  return (
    <div style={{ paddingBottom: 48 }}>
      {/* The date comes from the browser clock, so it can differ from the server render. */}
      <PageHeader
        title="Today"
        eyebrow={longDateLabel(today)}
        className="pw-todayhead"
        // The sidebar holds the theme switch on desktop; phones have no sidebar.
        actions={<ThemeToggle className="pw-phone-only" />}
      />
      <div className="pw-today">
        <Section title="Schedule" href="/calendar" linkLabel="Calendar">
          {schedule.map((task) => (
            <div key={task.id} className="st-row pw-today-slot" data-done={task.done || undefined} onClick={() => openTask(task)}>
              <span className="pw-today-time">{formatTime(task.dueTime!)}</span>
              <span className="st-row-text">{task.text}</span>
              {task.priority && <PriorityFlag priority={task.priority} />}
            </div>
          ))}
          {schedule.length === 0 && <p className="st-empty">Nothing scheduled.</p>}
        </Section>

        <Section title="Habits" count={todaysHabits.length ? `${habitsDone}/${todaysHabits.length}` : undefined} href="/habits" linkLabel="Habits">
          {todaysHabits.length > 0 ? (
            <div className="pw-today-habits">
              {todaysHabits.map((habit) => {
                const checked = habit.logs.includes(today);
                return (
                  <div key={habit.id} className="pw-today-habit" data-done={checked || undefined} onClick={() => void handleToggleHabit(habit.id)}>
                    <CheckToggle checked={checked} onToggle={() => void handleToggleHabit(habit.id)} label={habit.name} />
                    <span>{habit.name}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="st-empty">No habits yet.</p>
          )}
        </Section>

        <Section title="Notes" href="/notes" linkLabel="All notes">
          <AddRow icon="sticky-note" label="Add a note" placeholder="Something to remember?" onAdd={handleAddNote} />
          {notes.map((note) => (
            <Link key={note.id} href="/notes" className="st-row pw-today-note">
              <span className="st-row-text">{note.text}</span>
              <span className="st-due" suppressHydrationWarning>
                {relativeTime(note.updatedAt, now)}
              </span>
            </Link>
          ))}
        </Section>

        <Section title={`${monthKeyLabel(month).split(' ')[0]} so far`} href="/finance" linkLabel="Finance">
          <div className="pw-today-fin">
            <div className="pw-stat">
              <span className="pw-today-fin-label">Spent</span>
              <span className="pw-today-fin-value">{formatMoney(totals.spent)}</span>
            </div>
            <div className="pw-stat">
              <span className="pw-today-fin-label">Earned</span>
              <span className="pw-today-fin-value">{formatMoney(totals.earned)}</span>
            </div>
            <div className="pw-stat">
              <span className="pw-today-fin-label">Net</span>
              <span className="pw-today-fin-value" data-negative={totals.net < 0 || undefined}>
                {formatMoney(totals.net, { signed: true })}
              </span>
            </div>
          </div>
        </Section>
      </div>
      {dialog && (
        <TaskDialog
          open
          mode="edit"
          lists={lists}
          initialValues={dialog.values}
          onClose={() => setDialog(null)}
          onSave={(values) => void handleSaveTask(values)}
          onDelete={() => void handleDeleteTask()}
        />
      )}
    </div>
  );
}
