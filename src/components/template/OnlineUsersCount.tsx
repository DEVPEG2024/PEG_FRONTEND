import { useEffect, useRef, useState } from 'react';
import { useAppSelector } from '@/store';
import { RootState } from '@/store';
import { env } from '@/configs/env.config';

const BACKEND_URL = env?.EXPRESS_BACKEND_URL ?? '';
const PING_INTERVAL = 60_000; // 1 min
const FETCH_INTERVAL = 60_000; // 1 min

const OnlineUsersCount = () => {
  const [count, setCount] = useState<number | null>(null);
  const userId = useAppSelector((state: RootState) => state.auth.user.user?._id ?? state.auth.user.user?.id);
  const pingRef = useRef<ReturnType<typeof setInterval>>();
  const fetchRef = useRef<ReturnType<typeof setInterval>>();

  const ping = () => {
    if (!userId || !BACKEND_URL) return;
    fetch(`${BACKEND_URL}/auth/user/ping/${userId}`, { method: 'POST' }).catch(() => {});
  };

  const fetchCount = () => {
    if (!BACKEND_URL) return;
    fetch(`${BACKEND_URL}/auth/user/online-count`)
      .then((r) => r.json())
      .then((data) => { if (typeof data.count === 'number') setCount(data.count); })
      .catch(() => {});
  };

  useEffect(() => {
    ping();
    fetchCount();
    pingRef.current = setInterval(ping, PING_INTERVAL);
    fetchRef.current = setInterval(fetchCount, FETCH_INTERVAL);
    return () => {
      clearInterval(pingRef.current);
      clearInterval(fetchRef.current);
    };
  }, [userId]);

  if (count === null) return null;

  return (
    <div
      title={`${count} client${count > 1 ? 's' : ''} en ligne`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        background: 'rgba(34,197,94,0.1)',
        border: '1px solid rgba(34,197,94,0.25)',
        borderRadius: '100px',
        padding: '3px 10px 3px 7px',
        cursor: 'default',
        userSelect: 'none',
      }}
    >
      <span style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <span style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          background: '#22c55e',
          display: 'block',
          boxShadow: '0 0 5px rgba(34,197,94,0.7)',
          animation: 'pulse-green 2s ease-in-out infinite',
        }} />
      </span>
      <span style={{
        color: '#4ade80',
        fontSize: '12px',
        fontWeight: 700,
        fontFamily: 'Inter, sans-serif',
        letterSpacing: '0.01em',
        lineHeight: 1,
      }}>
        {count}
      </span>
    </div>
  );
};

export default OnlineUsersCount;
