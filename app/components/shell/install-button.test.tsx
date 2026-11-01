import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, test, expect, vi } from 'vitest';
import { InstallButton } from '@/app/components/shell/install-button';

function fireInstallable() {
  const prompt = vi.fn(async () => {});
  const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), { prompt });
  act(() => {
    window.dispatchEvent(event);
  });
  return { event, prompt };
}

// The store is module-level, so clear it between tests.
afterEach(() => {
  act(() => {
    window.dispatchEvent(new Event('appinstalled'));
  });
});

describe('InstallButton', () => {
  test('is hidden until the browser says the app can be installed', () => {
    const { container } = render(<InstallButton />);
    expect(container).toBeEmptyDOMElement();
  });

  test('appears after beforeinstallprompt and suppresses the default prompt', () => {
    render(<InstallButton />);
    const { event } = fireInstallable();
    expect(screen.getByRole('button', { name: 'Install Klivr' })).toBeInTheDocument();
    expect(event.defaultPrevented).toBe(true);
  });

  test('picks up an event that fired before it mounted', () => {
    fireInstallable();
    render(<InstallButton />);
    expect(screen.getByRole('button', { name: 'Install Klivr' })).toBeInTheDocument();
  });

  test('clicking prompts once and hides the button', async () => {
    render(<InstallButton />);
    const { prompt } = fireInstallable();
    await userEvent.click(screen.getByRole('button', { name: 'Install Klivr' }));
    expect(prompt).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Install Klivr' })).not.toBeInTheDocument();
  });

  test('hides after appinstalled', () => {
    render(<InstallButton />);
    fireInstallable();
    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });
    expect(screen.queryByRole('button', { name: 'Install Klivr' })).not.toBeInTheDocument();
  });
});
