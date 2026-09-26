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
    expect(onSave).toHaveBeenCalledWith({ text: 'Buy milk', listId: 'list1', priority: 'RED', due: '', dueTime: '' });
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
