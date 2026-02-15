'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const PROTECTED_PREFIXES = ['/lab', '/dashboard', '/challenges', '/privacy', '/theme'];
const THROTTLE_MS = 60_000;
const HEARTBEAT_MS = 5 * 60_000;

export default function SessionActivity() {
  const pathname = usePathname();
  const lastPingRef = useRef(0);

  useEffect(() => {
    if (!pathname || !PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;

    const ping = () => {
      const now = Date.now();
      if (now - lastPingRef.current < THROTTLE_MS) return;
      lastPingRef.current = now;

      fetch('/api/auth/session/ping', {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
      }).catch(() => {
        // Falha silenciosa: middleware tratará sessão expirada no próximo request.
      });
    };

    const onActivity = () => ping();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') ping();
    };

    ping();
    const interval = window.setInterval(ping, HEARTBEAT_MS);
    window.addEventListener('click', onActivity, { passive: true });
    window.addEventListener('keydown', onActivity);
    window.addEventListener('mousemove', onActivity, { passive: true });
    window.addEventListener('scroll', onActivity, { passive: true });
    window.addEventListener('touchstart', onActivity, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('click', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('scroll', onActivity);
      window.removeEventListener('touchstart', onActivity);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pathname]);

  return null;
}

