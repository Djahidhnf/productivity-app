import { getHabits } from './queries';
import { HabitsBoard } from './habits-board';

export default async function HabitsPage() {
  const habits = await getHabits();
  return <HabitsBoard initialHabits={habits} />;
}
