import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { ListTabs, tabIndexAt, TAB_LONG_PRESS_MS } from './list-tabs';
import type { TaskListDTO } from './queries';

const lists: TaskListDTO[] = [
  { id: 'a', name: 'A', order: 0, tasks: [] },
  { id: 'b', name: 'B', order: 1, tasks: [] },
  { id: 'c', name: 'C', order: 2, tasks: [] },
];

function setup() {
  const props = { lists, activeId: 'a', onSelect: vi.fn(), onSelectNew: vi.fn(), onReorder: vi.fn() };
  const { container } = render(<ListTabs {...props} />);
  container.querySelectorAll<HTMLElement>('[data-list-id]').forEach((chip, i) => {
    chip.getBoundingClientRect = () => ({ left: i * 100, right: i * 100 + 90, width: 90, top: 0, bottom: 30, height: 30, x: i * 100, y: 0, toJSON: () => ({}) });
  });
  return { props, chip: (id: string) => container.querySelector(`[data-list-id="${id}"]`) as HTMLElement };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('tabIndexAt', () => {
  test('counts the other chips whose center is left of x', () => {
    expect(tabIndexAt([45, 145], 10)).toBe(0);
    expect(tabIndexAt([45, 145], 100)).toBe(1);
    expect(tabIndexAt([45, 145], 300)).toBe(2);
  });
});

describe('ListTabs', () => {
  test('a tap selects the list', () => {
    const { props, chip } = setup();
    fireEvent.pointerDown(chip('b'), { pointerId: 1, pointerType: 'touch', clientX: 145, clientY: 10 });
    fireEvent.pointerUp(chip('b'), { pointerId: 1, pointerType: 'touch', clientX: 145, clientY: 10 });
    fireEvent.click(chip('b'));
    expect(props.onSelect).toHaveBeenCalledWith('b');
  });

  test('a touch long-press then slide reorders, without selecting', () => {
    const { props, chip } = setup();
    fireEvent.pointerDown(chip('a'), { pointerId: 1, pointerType: 'touch', clientX: 45, clientY: 10 });
    act(() => {
      vi.advanceTimersByTime(TAB_LONG_PRESS_MS);
    });
    expect(chip('a')).toHaveAttribute('data-lifted', 'true');
    fireEvent.touchMove(document, { touches: [{ clientX: 260, clientY: 10 }] });
    expect(screen.getAllByRole('tab').map((t) => t.getAttribute('data-list-id'))).toEqual(['b', 'c', 'a']);
    fireEvent.touchEnd(document, { touches: [] });
    fireEvent.click(chip('a'));
    expect(props.onReorder).toHaveBeenCalledWith('a', 2);
    expect(props.onSelect).not.toHaveBeenCalled();
  });

  test('moving the finger before the long-press fires is a scroll, not a drag', () => {
    const { props, chip } = setup();
    fireEvent.pointerDown(chip('a'), { pointerId: 1, pointerType: 'touch', clientX: 45, clientY: 10 });
    fireEvent.pointerMove(chip('a'), { pointerId: 1, pointerType: 'touch', clientX: 90, clientY: 10 });
    act(() => {
      vi.advanceTimersByTime(TAB_LONG_PRESS_MS);
    });
    expect(chip('a')).not.toHaveAttribute('data-lifted');
    expect(props.onReorder).not.toHaveBeenCalled();
  });
});
