import { getDashboardTasks, getRecentNotes } from './queries';
import { getTaskLists } from '../tasks/queries';
import { getHabits } from '../habits/queries';
import { getFinanceEntries } from '../finance/queries';
import { DashboardBoard } from './dashboard-board';
import { addMonthKey } from '@/app/lib/finance';
import { todayKey } from '@/app/lib/date-format';

export default async function DashboardPage() {
  // The board works out "today" from the browser clock, which can be a day
  // off the server's, so the date-bound queries reach one day/month either side.
  const today = todayKey();
  const month = today.slice(0, 7);
  const [tasks, lists, habits, notes, entries] = await Promise.all([
    getDashboardTasks(today),
    getTaskLists(),
    getHabits(),
    getRecentNotes(3),
    getFinanceEntries(addMonthKey(month, -1), addMonthKey(month, 1)),
  ]);
  return (
    <DashboardBoard
      initialTasks={tasks}
      lists={lists.map((list) => ({ ...list, tasks: [] }))}
      initialHabits={habits}
      initialNotes={notes}
      financeEntries={entries}
    />
  );
}
