import { getMatrixTasks } from './queries';
import { getTaskLists } from '../tasks/queries';
import { MatrixBoard } from './matrix-board';

export default async function MatrixPage() {
  const [tasks, lists] = await Promise.all([getMatrixTasks(), getTaskLists()]);
  return <MatrixBoard initialTasks={tasks} lists={lists} />;
}
