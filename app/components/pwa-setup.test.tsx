import { render } from '@testing-library/react';
import { afterEach, describe, test, expect, vi } from 'vitest';
import { PwaSetup } from '@/app/components/pwa-setup';

function stubServiceWorker(register: () => Promise<unknown>) {
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register } });
}

afterEach(() => {
  // @ts-expect-error jsdom has no serviceWorker; tests define it per case.
  delete navigator.serviceWorker;
});

describe('PwaSetup', () => {
  test('registers the worker for the whole site and renders nothing', () => {
    const register = vi.fn(async () => ({}));
    stubServiceWorker(register);
    const { container } = render(<PwaSetup />);
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/', updateViaCache: 'none' });
    expect(container).toBeEmptyDOMElement();
  });

  test('does nothing in a browser without service workers', () => {
    expect(() => render(<PwaSetup />)).not.toThrow();
  });

  test('ignores a failed registration', async () => {
    const register = vi.fn(async () => {
      throw new Error('blocked');
    });
    stubServiceWorker(register);
    render(<PwaSetup />);
    await new Promise((resolve) => setTimeout(resolve));
    expect(register).toHaveBeenCalledOnce();
  });
});
