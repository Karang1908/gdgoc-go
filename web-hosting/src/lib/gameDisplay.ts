type LegacyDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => void | Promise<void>;
};

type LegacyElement = HTMLElement & {
  webkitRequestFullscreen?: () => void | Promise<void>;
};

export function isStandaloneDisplay(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

export function isFullscreenDisplay(): boolean {
  return Boolean(
    document.fullscreenElement ||
    (document as LegacyDocument).webkitFullscreenElement,
  );
}

export function canFullscreenDisplay(): boolean {
  const root = document.documentElement as LegacyElement;
  return Boolean((document.fullscreenEnabled && root.requestFullscreen) || root.webkitRequestFullscreen);
}

async function lockLandscape(): Promise<void> {
  const orientation = screen.orientation as ScreenOrientation & {
    lock?: (mode: 'landscape') => Promise<void>;
  };

  try {
    await orientation?.lock?.('landscape');
  } catch {
    // iOS does not expose orientation locking. The responsive game view remains usable.
  }
}

export function requestFullscreenDisplay(target: HTMLElement): Promise<boolean> {
  if (isStandaloneDisplay()) {
    void lockLandscape();
    return Promise.resolve(true);
  }

  const legacyTarget = target as LegacyElement;
  try {
    let request: void | Promise<void> | undefined;
    if (document.fullscreenEnabled && target.requestFullscreen) {
      request = target.requestFullscreen({ navigationUI: 'hide' });
    } else if (legacyTarget.webkitRequestFullscreen) {
      request = legacyTarget.webkitRequestFullscreen();
    } else {
      return Promise.resolve(false);
    }

    return Promise.resolve(request)
      .then(async () => {
        await lockLandscape();
        return true;
      })
      .catch(() => false);
  } catch {
    return Promise.resolve(false);
  }
}

export async function exitFullscreenDisplay(): Promise<void> {
  const legacyDocument = document as LegacyDocument;
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (legacyDocument.webkitFullscreenElement && legacyDocument.webkitExitFullscreen) {
      await legacyDocument.webkitExitFullscreen();
    }
  } catch {
    // The browser may already have exited through its own system UI.
  }
}
