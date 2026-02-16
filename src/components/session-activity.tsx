'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

const SESSION_PING_PATH = '/api/auth/session/ping';
const PROTECTED_PREFIXES = ['/lab', '/dashboard', '/challenges', '/privacy', '/theme'];
const THROTTLE_MS = 60_000;
const HEARTBEAT_MS = 5 * 60_000;

export default function SessionActivity() {
  const pathname = usePathname();
  const lastPingRef = useRef(0);

  useEffect(() => {
    if (!pathname || !PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return;

    const ping = async () => {
      const now = Date.now();
      if (now - lastPingRef.current < THROTTLE_MS) return;
      lastPingRef.current = now;

      try {
        const res = await fetch(SESSION_PING_PATH, {
          method: 'POST',
          credentials: 'include',
          keepalive: true,
        });

        if (res.status === 401) {
          window.location.href = '/login?expired=1';
        }
      } catch (err) {
        // Ignora falhas de rede temporárias
      }
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

