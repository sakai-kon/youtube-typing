'use client';

import { useEffect } from 'react';

const BUILD_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? 'development';
const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '');
const ATTEMPT_KEY = 'youtube-typing-update-reload-attempt';

type VersionResponse = { version?: unknown };
type ReloadAttempt = { attempt: string; at: number };

export function UpdateChecker() {
  useEffect(() => {
    let pendingVersion: string | null = null;
    let lastInteraction = Date.now();
    const mountedAt = Date.now();

    const isPlayPage = () => {
      const path = window.location.pathname;
      return path.includes('/play/') || path.endsWith('/play');
    };

    const isSafeToReload = () =>
      !isPlayPage() && Date.now() - lastInteraction > 45_000;

    const navigateToLatest = (latestVersion: string) => {
      const attempt = `${BUILD_VERSION}:${latestVersion}`;

      try {
        const raw = window.sessionStorage.getItem(ATTEMPT_KEY);
        if (raw) {
          const previous = JSON.parse(raw) as ReloadAttempt;
          if (
            previous.attempt === attempt &&
            Date.now() - previous.at < 60_000
          ) {
            return;
          }
        }
        window.sessionStorage.setItem(
          ATTEMPT_KEY,
          JSON.stringify({ attempt, at: Date.now() } satisfies ReloadAttempt),
        );
      } catch {
        // Storage may be unavailable in private browsing; continue without it.
      }

      const url = new URL(window.location.href);
      url.searchParams.set('_app_version', latestVersion);
      url.searchParams.set('_refresh', String(Date.now()));
      window.location.replace(url.toString());
    };

    const checkLatestVersion = async () => {
      try {
        const response = await fetch(
          `${BASE_PATH}/version.json?check=${Date.now()}`,
          { cache: 'no-store' },
        );
        if (!response.ok) return;

        const data = (await response.json()) as VersionResponse;
        const latestVersion =
          typeof data.version === 'string' ? data.version.trim() : '';
        if (!latestVersion) return;

        if (latestVersion === BUILD_VERSION) {
          pendingVersion = null;
          try {
            window.sessionStorage.removeItem(ATTEMPT_KEY);
          } catch {
            // Ignore unavailable storage.
          }
          return;
        }

        pendingVersion = latestVersion;

        // On initial entry, refresh immediately before the user starts interacting.
        if (Date.now() - mountedAt < 8_000 || isSafeToReload()) {
          navigateToLatest(latestVersion);
        }
      } catch {
        // Keep the current page usable if the version check cannot reach the server.
      }
    };

    const markInteraction = () => {
      lastInteraction = Date.now();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkLatestVersion();
        if (pendingVersion && isSafeToReload()) {
          navigateToLatest(pendingVersion);
        }
      }
    };

    const interactionEvents = ['pointerdown', 'keydown', 'input', 'touchstart'];
    interactionEvents.forEach((eventName) => {
      window.addEventListener(eventName, markInteraction, { passive: true });
    });
    document.addEventListener('visibilitychange', onVisibilityChange);

    void checkLatestVersion();
    const timer = window.setInterval(() => {
      void checkLatestVersion();
      if (pendingVersion && isSafeToReload()) {
        navigateToLatest(pendingVersion);
      }
    }, 30_000);

    return () => {
      window.clearInterval(timer);
      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, markInteraction);
      });
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return null;
}
