import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { QuadrantPanel } from './quadrant-panel';
import type { TaskDTO } from './queries';

function makeTask(overrides: Partial<TaskDTO> = {}): TaskDTO {
  return {
    id: 't1',
    text: 'Buy milk',
    listId: 'list1',
    priority: 'RED',
    due: null,
    dueTime: null,
    duration: 60,
    done: false,
    order: 0,
    ...overrides,
  };
}

function noop() {}

describe('QuadrantPanel', () => {
  test('renders the title, subtitle, and count for a priority', () => {
    render(
      <QuadrantPanel priorityKey="RED" tasks={[makeTask()]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={noop} onTaskTouchStart={noop} onTaskTouchMove={noop} onTaskTouchEnd={noop} touchDragTaskId={null} />
    );
    expect(screen.getByText('Do first')).toBeInTheDocument();
    expect(screen.getByText('Urgent & important')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
  });

  test('shows the empty state when there are no tasks', () => {
    render(
      <QuadrantPanel priorityKey="GREEN" tasks={[]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={noop} onTaskTouchStart={noop} onTaskTouchMove={noop} onTaskTouchEnd={noop} touchDragTaskId={null} />
    );
    expect(screen.getByText('Nothing here.')).toBeInTheDocument();
  });

  test('the container carries a data-quad attribute matching its priority', () => {
    render(
      <QuadrantPanel priorityKey="BLUE" tasks={[]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={noop} onTaskTouchStart={noop} onTaskTouchMove={noop} onTaskTouchEnd={noop} touchDragTaskId={null} />
    );
    expect(screen.getByText('Delegate').closest('[data-quad]')).toHaveAttribute('data-quad', 'BLUE');
  });

  test('dropping on the container calls onDrop', () => {
    const onDrop = vi.fn();
    render(
      <QuadrantPanel priorityKey="AMBER" tasks={[]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={onDrop} onTaskTouchStart={noop} onTaskTouchMove={noop} onTaskTouchEnd={noop} touchDragTaskId={null} />
    );
    fireEvent.drop(screen.getByText('Schedule').closest('[data-quad]')!);
    expect(onDrop).toHaveBeenCalled();
  });

  test('dragging a task within the panel calls onTaskDragStart with that task', () => {
    const onTaskDragStart = vi.fn();
    const task = makeTask();
    render(
      <QuadrantPanel priorityKey="RED" tasks={[task]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={onTaskDragStart} onDragOver={noop} onDrop={noop} onTaskTouchStart={noop} onTaskTouchMove={noop} onTaskTouchEnd={noop} touchDragTaskId={null} />
    );
    fireEvent.dragStart(screen.getByText('Buy milk').closest('div')!);
    expect(onTaskDragStart).toHaveBeenCalledWith(task);
  });

  test('isDropTarget marks the quadrant as the drop target', () => {
    const { rerender } = render(
      <QuadrantPanel priorityKey="RED" tasks={[]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={noop} onTaskTouchStart={noop} onTaskTouchMove={noop} onTaskTouchEnd={noop} touchDragTaskId={null} isDropTarget={false} />
    );
    const container = screen.getByText('Do first').closest('[data-quad]')! as HTMLElement;
    expect(container).not.toHaveAttribute('data-drop-target');

    rerender(
      <QuadrantPanel priorityKey="RED" tasks={[]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={noop} onTaskTouchStart={noop} onTaskTouchMove={noop} onTaskTouchEnd={noop} touchDragTaskId={null} isDropTarget={true} />
    );
    expect(container).toHaveAttribute('data-drop-target', 'true');
  });
});
