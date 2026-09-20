import { getTaskLists } from './queries';
import { TasksBoard } from './tasks-board';

export default async function TasksPage() {
  const lists = await getTaskLists();
  return <TasksBoard initialLists={lists} />;
}
