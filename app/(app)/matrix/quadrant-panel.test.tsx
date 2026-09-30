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
    completedAt: null,
    reminderOffset: null,
    order: 0,
    ...overrides,
  };
}

function noop() {}

describe('QuadrantPanel', () => {
  test('renders the title, subtitle, and count for a priority', () => {
    render(
      <QuadrantPanel priorityKey="RED" tasks={[makeTask()]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={noop} />
    );
    expect(screen.getByText('Do first')).toBeInTheDocument();
    expect(screen.getByText('Urgent & important')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
  });

  test('shows the empty state when there are no tasks', () => {
    render(
      <QuadrantPanel priorityKey="GREEN" tasks={[]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={noop} />
    );
    expect(screen.getByText('Nothing here.')).toBeInTheDocument();
  });

  test('the container carries a data-quad attribute matching its priority', () => {
    render(
      <QuadrantPanel priorityKey="BLUE" tasks={[]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={noop} />
    );
    expect(screen.getByText('Delegate').closest('[data-quad]')).toHaveAttribute('data-quad', 'BLUE');
  });

  test('dropping on the container calls onDrop', () => {
    const onDrop = vi.fn();
    render(
      <QuadrantPanel priorityKey="AMBER" tasks={[]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={onDrop} />
    );
    fireEvent.drop(screen.getByText('Schedule').closest('[data-quad]')!);
    expect(onDrop).toHaveBeenCalled();
  });

  test('dragging a task within the panel calls onTaskDragStart with that task', () => {
    const onTaskDragStart = vi.fn();
    const task = makeTask();
    render(
      <QuadrantPanel priorityKey="RED" tasks={[task]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={onTaskDragStart} onDragOver={noop} onDrop={noop} />
    );
    fireEvent.dragStart(screen.getByText('Buy milk').closest('div')!);
    expect(onTaskDragStart).toHaveBeenCalledWith(task);
  });

  test('isDropTarget marks the quadrant as the drop target', () => {
    const { rerender } = render(
      <QuadrantPanel priorityKey="RED" tasks={[]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={noop} isDropTarget={false} />
    );
    const container = screen.getByText('Do first').closest('[data-quad]')! as HTMLElement;
    expect(container).not.toHaveAttribute('data-drop-target');

    rerender(
      <QuadrantPanel priorityKey="RED" tasks={[]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={noop} isDropTarget={true} />
    );
    expect(container).toHaveAttribute('data-drop-target', 'true');
  });

  test('the quadrant has a neutral border and a muted header with a tinted numeral', () => {
    render(
      <QuadrantPanel priorityKey="AMBER" tasks={[makeTask({ priority: 'AMBER' })]} onToggleDone={vi.fn()} onOpen={vi.fn()} onTaskDragStart={noop} onDragOver={noop} onDrop={noop} />
    );
    const container = screen.getByText('Schedule').closest('[data-quad]') as HTMLElement;
    expect(container.style.border).not.toContain('var(--prio-yellow)');
    expect(screen.getByText('Schedule').style.color).toBe('var(--fg-1)');
    expect(screen.getByText('II').style.color).toContain('var(--prio-yellow)');
    expect(screen.getByText('II')).toBeInTheDocument();
    const header = screen.getByText('Schedule').closest('[data-quad-header]') as HTMLElement;
    expect(header).not.toBeNull();
    expect(header.style.background).toBe('');
    expect(header).toHaveTextContent('Not urgent but important');
    expect(header).toHaveTextContent('1');
  });
});
