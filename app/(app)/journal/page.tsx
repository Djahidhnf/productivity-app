import { getJournalEntries } from './queries';
import { JournalBoard } from './journal-board';

export default async function JournalPage() {
  const entries = await getJournalEntries();
  return <JournalBoard initialEntries={entries} />;
}
