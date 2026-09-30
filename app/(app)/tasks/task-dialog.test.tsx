import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { TaskDialog, type TaskDialogValues } from './task-dialog';
import type { TaskListDTO } from './queries';

const lists: TaskListDTO[] = [
  { id: 'list1', name: 'Work', order: 0, tasks: [] },
  { id: 'list2', name: 'Home', order: 1, tasks: [] },
];

function emptyValues(): TaskDialogValues {
  return { text: '', listId: 'list1', priority: null, due: '', dueTime: '' };
}

describe('TaskDialog', () => {
  test('shows "New task" title in create mode and "Edit task" in edit mode', () => {
    const { rerender } = render(
      <TaskDialog open mode="create" lists={lists} initialValues={emptyValues()} onClose={vi.fn()} onSave={vi.fn()} />
    );
    expect(screen.getByRole('dialog', { name: 'New task' })).toBeInTheDocument();
    rerender(
      <TaskDialog open mode="edit" lists={lists} initialValues={emptyValues()} onClose={vi.fn()} onSave={vi.fn()} />
    );
    expect(screen.getByRole('dialog', { name: 'Edit task' })).toBeInTheDocument();
  });

  test('lists every list as a select option', () => {
    render(
      <TaskDialog open mode="create" lists={lists} initialValues={emptyValues()} onClose={vi.fn()} onSave={vi.fn()} />
    );
    expect(screen.getByRole('option', { name: 'Work' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Home' })).toBeInTheDocument();
  });

  test('submitting the form calls onSave with the edited values', async () => {
    const onSave = vi.fn();
    render(
      <TaskDialog open mode="create" lists={lists} initialValues={emptyValues()} onClose={vi.fn()} onSave={onSave} />
    );
    await userEvent.type(screen.getByLabelText('Task'), 'Buy milk');
    await userEvent.click(screen.getByRole('tab', { name: 'Do first' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith({ text: 'Buy milk', listId: 'list1', priority: 'RED', due: '', dueTime: '', reminderOffset: null });
  });

  test('the reminder is disabled until the task has a due date', () => {
    render(<TaskDialog open mode="create" lists={lists} initialValues={emptyValues()} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByLabelText('Reminder')).toBeDisabled();
    expect(screen.getByText('Set a due date to get a reminder')).toBeInTheDocument();
  });

  test('untimed tasks offer day-based options; timed tasks offer minute ones', () => {
    const { rerender } = render(
      <TaskDialog open mode="edit" lists={lists} initialValues={{ ...emptyValues(), due: '2026-10-05' }} onClose={vi.fn()} onSave={vi.fn()} />
    );
    const options = () => Array.from((screen.getByLabelText('Reminder') as HTMLSelectElement).options).map((o) => o.text);
    expect(options()).toEqual(['Never', 'On the day (9:00)', '1 day before', 'Custom…']);
    rerender(
      <TaskDialog open mode="edit" lists={lists} initialValues={{ ...emptyValues(), due: '2026-10-05', dueTime: '14:00' }} onClose={vi.fn()} onSave={vi.fn()} />
    );
    expect(options()).toEqual(['Never', 'On time', '30 min before', '1 hour before', '1 day before', 'Custom…']);
  });

  test('clearing the time resets a minute-based reminder to "on the day"', async () => {
    const onSave = vi.fn();
    render(
      <TaskDialog
        open
        mode="edit"
        lists={lists}
        initialValues={{ ...emptyValues(), text: 'Call', due: '2026-10-05', dueTime: '14:00', reminderOffset: 30 }}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );
    expect(screen.getByLabelText('Reminder')).toHaveValue('30');
    await userEvent.clear(screen.getByLabelText('Time'));
    expect(screen.getByLabelText('Reminder')).toHaveValue('0');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ dueTime: '', reminderOffset: 0 }));
  });

  test('a custom reminder saves amount × unit', async () => {
    const onSave = vi.fn();
    render(
      <TaskDialog open mode="edit" lists={lists} initialValues={{ ...emptyValues(), text: 'Call', due: '2026-10-05', dueTime: '14:00' }} onClose={vi.fn()} onSave={onSave} />
    );
    await userEvent.selectOptions(screen.getByLabelText('Reminder'), 'custom');
    await userEvent.clear(screen.getByLabelText('Remind this many'));
    await userEvent.type(screen.getByLabelText('Remind this many'), '3');
    await userEvent.selectOptions(screen.getByLabelText('Unit'), 'hours');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ reminderOffset: 180 }));
  });

  test('the delete button only appears in edit mode when onDelete is provided, and calls it when clicked', async () => {
    const onDelete = vi.fn();
    const { rerender } = render(
      <TaskDialog open mode="create" lists={lists} initialValues={emptyValues()} onClose={vi.fn()} onSave={vi.fn()} />
    );
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();

    rerender(
      <TaskDialog
        open
        mode="edit"
        lists={lists}
        initialValues={emptyValues()}
        onClose={vi.fn()}
        onSave={vi.fn()}
        onDelete={onDelete}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledOnce();
  });
});
