import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { UnflaggedPanel } from './unflagged-panel';
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

describe('UnflaggedPanel', () => {
  test('renders the header, count, and tasks', () => {
    render(
      <UnflaggedPanel tasks={[makeTask()]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={noop} onTaskTouchStart={noop} onTaskTouchMove={noop} onTaskTouchEnd={noop} touchDragTaskId={null} />
    );
    expect(screen.getByText('Unflagged')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
  });

  test('shows the empty state when there are no tasks', () => {
    render(
      <UnflaggedPanel tasks={[]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={noop} onTaskTouchStart={noop} onTaskTouchMove={noop} onTaskTouchEnd={noop} touchDragTaskId={null} />
    );
    expect(screen.getByText('Everything is flagged.')).toBeInTheDocument();
  });

  test('the container carries data-quad="none"', () => {
    render(
      <UnflaggedPanel tasks={[]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={noop} onTaskTouchStart={noop} onTaskTouchMove={noop} onTaskTouchEnd={noop} touchDragTaskId={null} />
    );
    expect(screen.getByText('Unflagged').closest('[data-quad]')).toHaveAttribute('data-quad', 'none');
  });

  test('dropping on the container calls onDrop', () => {
    const onDrop = vi.fn();
    render(
      <UnflaggedPanel tasks={[]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={onDrop} onTaskTouchStart={noop} onTaskTouchMove={noop} onTaskTouchEnd={noop} touchDragTaskId={null} />
    );
    fireEvent.drop(screen.getByText('Unflagged').closest('[data-quad]')!);
    expect(onDrop).toHaveBeenCalled();
  });

  test('isDropTarget renders an accent dashed outline', () => {
    const { rerender } = render(
      <UnflaggedPanel tasks={[]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={noop} onTaskTouchStart={noop} onTaskTouchMove={noop} onTaskTouchEnd={noop} touchDragTaskId={null} isDropTarget={false} />
    );
    // jsdom/jest-dom's toHaveStyle can't reliably resolve custom-property
    // (`var(...)`) values inside a border shorthand, so assert the raw
    // inline style string directly instead.
    const container = screen.getByText('Unflagged').closest('[data-quad]')! as HTMLElement;
    expect(container.style.border).toBe('1px dashed transparent');

    rerender(
      <UnflaggedPanel tasks={[]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={noop} onTaskTouchStart={noop} onTaskTouchMove={noop} onTaskTouchEnd={noop} touchDragTaskId={null} isDropTarget={true} />
    );
    expect(container.style.border).toBe('1px dashed var(--accent)');
  });
});
