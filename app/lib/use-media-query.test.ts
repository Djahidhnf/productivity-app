import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { useMediaQuery } from './use-media-query';

describe('useMediaQuery', () => {
  test('returns the current match and updates on a change event', () => {
    const listeners: Array<() => void> = [];
    let matches = false;
    const mockMql = {
      get matches() {
        return matches;
      },
      addEventListener: vi.fn((_: string, cb: () => void) => listeners.push(cb)),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mockMql));

    const { result } = renderHook(() => useMediaQuery('(max-width: 860px)'));
    expect(result.current).toBe(false);

    matches = true;
    act(() => {
      listeners.forEach((cb) => cb());
    });
    expect(result.current).toBe(true);

    vi.unstubAllGlobals();
  });
});
