import { useEffect, useRef, useState } from 'react';
import { useAppSelector } from '@/store';
import { RootState } from '@/store';

const BACKEND_URL = 'https://peg-backend.vercel.app';
const PING_INTERVAL = 60_000;
const FETCH_INTERVAL = 60_000;

const OnlineUsersCount = () => {
  const [count, setCount] = useState(0);
  const userId = useAppSelector((state: RootState) => {
    const u = state.auth.user.user;
    return u?._id ?? u?.id ?? u?.documentId ?? null;
  });
  const pingRef = useRef<ReturnType<typeof setInterval>>();
  const fetchRef = useRef<ReturnType<typeof setInterval>>();

  const ping = (id: string) => {
    fetch(`${BACKEND_URL}/auth/user/ping/${id}`, { method: 'POST' }).catch(() => {});
  };

  const fetchCount = () => {
    fetch(`${BACKEND_URL}/auth/user/online-count`)
      .then((r) => r.json())
      .then((data) => { if (typeof data.count === 'number') setCount(data.count); })
      .catch(() => {});
  };

  useEffect(() => {
    if (userId) ping(userId);
    fetchCount();
    pingRef.current = setInterval(() => { if (userId) ping(userId); }, PING_INTERVAL);
    fetchRef.current = setInterval(fetchCount, FETCH_INTERVAL);
    return () => {
      clearInterval(pingRef.current);
      clearInterval(fetchRef.current);
    };
  }, [userId]);

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
      <span style={{
        width: '7px',
        height: '7px',
        borderRadius: '50%',
        background: '#22c55e',
        display: 'block',
        boxShadow: '0 0 5px rgba(34,197,94,0.7)',
        animation: 'pulse-green 2s ease-in-out infinite',
        flexShrink: 0,
      }} />
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
