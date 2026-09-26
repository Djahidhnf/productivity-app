import { getNotes } from './queries';
import { NotesBoard } from './notes-board';

export default async function NotesPage() {
  const notes = await getNotes();
  return <NotesBoard initialNotes={notes} />;
}
