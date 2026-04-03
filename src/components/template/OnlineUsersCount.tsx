import { useEffect, useRef, useState } from 'react';
import { useAppSelector } from '@/store';
import { RootState } from '@/store';
import { HiUserCircle } from 'react-icons/hi';

const BACKEND_URL = import.meta.env.DEV ? 'http://localhost:3000' : 'https://peg-backend.vercel.app';
const PING_INTERVAL = 5_000;
const FETCH_INTERVAL = 5_000;

interface OnlineUser {
  user_id: string;
  display_name: string;
  avatar_url: string;
  role: string;
  last_seen: string;
}

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  admin:       { label: 'Admin',       color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  super_admin: { label: 'Admin',       color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  customer:    { label: 'Client',      color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  producer:    { label: 'Producteur',  color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
};

const OnlineUsersCount = () => {
  const [count, setCount] = useState(0);
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pingRef = useRef<ReturnType<typeof setInterval>>();
  const fetchRef = useRef<ReturnType<typeof setInterval>>();

  const user = useAppSelector((state: RootState) => state.auth.user.user);
  const userId = user?._id ?? user?.id ?? user?.documentId ?? null;
  const displayName = user?.companyName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '';
  const avatarUrl = user?.avatar?.url || '';
  const userRole = user?.authority?.[0] || user?.role?.name || '';

  const ping = (id: string) => {
    fetch(`${BACKEND_URL}/auth/user/ping/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName, avatarUrl, role: userRole }),
    }).catch(() => {});
  };

  const fetchCount = () => {
    fetch(`${BACKEND_URL}/auth/user/online-count`)
      .then((r) => r.json())
      .then((data) => { if (typeof data.count === 'number') setCount(data.count); })
      .catch(() => {});
  };

  const fetchUsers = () => {
    fetch(`${BACKEND_URL}/auth/user/online-users`)
      .then((r) => r.json())
      .then((data) => { if (data.users) setUsers(data.users); })
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

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = () => {
    if (!open) fetchUsers();
    setOpen(!open);
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={handleClick}
        title={`${count} personne${count > 1 ? 's' : ''} en ligne`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.25)',
          borderRadius: '100px',
          padding: '3px 10px 3px 7px',
          cursor: 'pointer',
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
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          right: 0,
          marginTop: '8px',
          width: '280px',
          background: '#1a2332',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 50,
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>
              En ligne
            </span>
            <span style={{
              background: 'rgba(34,197,94,0.15)',
              color: '#4ade80',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '100px',
            }}>
              {users.length}
            </span>
          </div>

          {/* User list */}
          <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '6px 0' }}>
            {users.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>
                Aucun utilisateur en ligne
              </div>
            ) : (
              users.map((u) => {
                const roleInfo = ROLE_LABELS[u.role] || { label: u.role || 'Utilisateur', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' };
                const isMe = u.user_id === userId;
                return (
                  <div
                    key={u.user_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 16px',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
                  >
                    {/* Avatar */}
                    {u.avatar_url ? (
                      <img
                        src={u.avatar_url}
                        alt=""
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid rgba(34,197,94,0.4)',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid rgba(34,197,94,0.4)',
                        flexShrink: 0,
                      }}>
                        <HiUserCircle style={{ color: 'rgba(255,255,255,0.3)', fontSize: '20px' }} />
                      </div>
                    )}

                    {/* Name + role */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {u.display_name || 'Utilisateur'}
                        </span>
                        {isMe && (
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 700,
                            color: 'rgba(255,255,255,0.3)',
                            textTransform: 'uppercase',
                          }}>
                            (vous)
                          </span>
                        )}
                      </div>
                      <span style={{
                        display: 'inline-block',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: roleInfo.color,
                        background: roleInfo.bg,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        marginTop: '2px',
                      }}>
                        {roleInfo.label}
                      </span>
                    </div>

                    {/* Online dot */}
                    <span style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#22c55e',
                      boxShadow: '0 0 4px rgba(34,197,94,0.6)',
                      flexShrink: 0,
                    }} />
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineUsersCount;
