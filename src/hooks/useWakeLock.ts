import { useEffect, useRef } from 'react';

/**
 * Requests a screen wake lock while `active` is true, so the phone screen
 * doesn't sleep and kill the training timer. Releases on pause/finish/unmount.
 * The Wake Lock API auto-releases when the tab is backgrounded, so it must be
 * re-requested on `visibilitychange` once the tab is visible again.
 */
export function useWakeLock(active: boolean): void {
  const lockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;

    async function requestLock() {
      try {
        lockRef.current = await navigator.wakeLock.request('screen');
      } catch {
        // Unsupported or denied — training still works, screen may sleep.
      }
    }

    requestLock();

    function onVisibility() {
      if (document.visibilityState === 'visible' && !lockRef.current) requestLock();
    }
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      lockRef.current?.release().catch(() => {});
      lockRef.current = null;
    };
  }, [active]);
}
