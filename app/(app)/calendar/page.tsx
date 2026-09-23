import { getCalendarTasks } from './queries';
import { getTaskLists } from '../tasks/queries';
import { CalendarBoard } from './calendar-board';

export default async function CalendarPage() {
  const [tasks, lists] = await Promise.all([getCalendarTasks(), getTaskLists()]);
  return <CalendarBoard initialTasks={tasks} lists={lists} />;
}
