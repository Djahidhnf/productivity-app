'use client';

import { IconButton } from '@/app/components/ui/icon-button';
import { Icon } from '@/app/components/icons';
import { useInstallPrompt } from '@/app/lib/install-prompt';

/** Renders nothing unless the browser says the app can be installed right now. */
export function InstallButton() {
  const { canInstall, install } = useInstallPrompt();
  if (!canInstall) return null;
  return (
    <IconButton label="Install Klivr" size="sm" onClick={() => void install()}>
      <Icon name="download" size={16} />
    </IconButton>
  );
}
