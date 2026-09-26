import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, vi } from 'vitest';
import { MatrixTaskRow } from './matrix-task-row';
import type { TaskDTO } from './queries';

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 't1',
    text: 'Buy milk',
    listId: 'list1',
    priority: null,
    due: null,
    dueTime: null,
    duration: 60,
    done: false,
    order: 0,
    ...overrides,
  };
}

function noop() {}

describe('MatrixTaskRow', () => {
  test('renders the task text', () => {
    render(<MatrixTaskRow task={makeTask()} onToggleDone={vi.fn()} onOpen={vi.fn()} onDragStart={noop} onTouchStart={noop} onTouchMove={noop} onTouchEnd={noop} />);
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
  });

  test('strikes through the text when done', () => {
    render(<MatrixTaskRow task={makeTask({ done: true })} onToggleDone={vi.fn()} onOpen={vi.fn()} onDragStart={noop} onTouchStart={noop} onTouchMove={noop} onTouchEnd={noop} />);
    expect(screen.getByText('Buy milk')).toHaveStyle({ textDecoration: 'line-through' });
  });

  test('renders a due label when due is set', () => {
    render(<MatrixTaskRow task={makeTask({ due: '2026-03-01' })} onToggleDone={vi.fn()} onOpen={vi.fn()} onDragStart={noop} onTouchStart={noop} onTouchMove={noop} onTouchEnd={noop} />);
    expect(screen.getByText('03-01')).toBeInTheDocument();
  });

  test('clicking the row calls onOpen with the task', async () => {
    const onOpen = vi.fn();
    const task = makeTask();
    render(<MatrixTaskRow task={task} onToggleDone={vi.fn()} onOpen={onOpen} onDragStart={noop} onTouchStart={noop} onTouchMove={noop} onTouchEnd={noop} />);
    await userEvent.click(screen.getByText('Buy milk'));
    expect(onOpen).toHaveBeenCalledWith(task);
  });

  test('toggling the checkbox calls onToggleDone but not onOpen', async () => {
    const onToggleDone = vi.fn();
    const onOpen = vi.fn();
    render(<MatrixTaskRow task={makeTask()} onToggleDone={onToggleDone} onOpen={onOpen} onDragStart={noop} onTouchStart={noop} onTouchMove={noop} onTouchEnd={noop} />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onToggleDone).toHaveBeenCalledWith('t1');
    expect(onOpen).not.toHaveBeenCalled();
  });

  test('firing dragStart calls the onDragStart handler', () => {
    const onDragStart = vi.fn();
    render(<MatrixTaskRow task={makeTask()} onToggleDone={vi.fn()} onOpen={vi.fn()} onDragStart={onDragStart} onTouchStart={noop} onTouchMove={noop} onTouchEnd={noop} />);
    fireEvent.dragStart(screen.getByText('Buy milk').closest('[data-task-id]')!);
    expect(onDragStart).toHaveBeenCalled();
  });

  test('applies touch-action:none only while isTouchDragging is true', () => {
    const { rerender } = render(<MatrixTaskRow task={makeTask()} onToggleDone={vi.fn()} onOpen={vi.fn()} onDragStart={noop} onTouchStart={noop} onTouchMove={noop} onTouchEnd={noop} />);
    const row = screen.getByText('Buy milk').closest('[data-task-id]')!;
    expect(row).not.toHaveStyle({ touchAction: 'none' });
    rerender(<MatrixTaskRow task={makeTask()} onToggleDone={vi.fn()} onOpen={vi.fn()} onDragStart={noop} onTouchStart={noop} onTouchMove={noop} onTouchEnd={noop} isTouchDragging />);
    expect(row).toHaveStyle({ touchAction: 'none' });
  });
});
