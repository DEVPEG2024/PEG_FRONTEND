import { Container } from '@/components/shared';
import { Switcher } from '@/components/ui';
import { useEffect, useState } from 'react';
import { User } from '@/@types/user';
import { useNavigate } from 'react-router-dom';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, { deleteUser, getUsers, getUsersIdTable, updateUser, useAppSelector } from './store';
import { HiOutlineSearch, HiPlus, HiPencil, HiTrash, HiUserGroup } from 'react-icons/hi';
import { IoWarningOutline } from 'react-icons/io5';

injectReducer('users', reducer);

const ROLE_CFG: Record<string, { label: string; bg: string; border: string; color: string }> = {
  super_admin: { label: 'Super Admin', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   color: '#f87171' },
  admin:       { label: 'Admin',       bg: 'rgba(168,85,247,0.12)',  border: 'rgba(168,85,247,0.3)',  color: '#c084fc' },
  producer:    { label: 'Producteur',  bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.3)',   color: '#4ade80' },
  customer:    { label: 'Client',      bg: 'rgba(47,111,237,0.12)',  border: 'rgba(47,111,237,0.25)', color: '#6b9eff' },
}
const AVATAR_COLORS = ['rgba(47,111,237,0.3)', 'rgba(168,85,247,0.3)', 'rgba(34,197,94,0.25)', 'rgba(234,179,8,0.25)', 'rgba(239,68,68,0.25)', 'rgba(20,184,166,0.25)']
const avatarColor = (name: string) => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

const Btn = ({ onClick, icon, hoverBg, hoverColor, hoverBorder, title, disabled }: any) => (
  <button title={title} onClick={onClick} disabled={disabled}
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: disabled ? 'not-allowed' : 'pointer', color: disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.5)', transition: 'all 0.15s' }}
    onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = hoverBg; e.currentTarget.style.color = hoverColor; e.currentTarget.style.borderColor = hoverBorder } }}
    onMouseLeave={(e) => { if (!disabled) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' } }}
  >{icon}</button>
)

const UsersList = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const { users, total, loading, usersId } = useAppSelector((state) => state.users.data);

  useEffect(() => {
    dispatch(getUsers({ pagination: { page: currentPage, pageSize }, searchTerm }));
    dispatch(getUsersIdTable());
  }, [currentPage, searchTerm]);

  const isUserMissingInfos = (user: User) =>
    (user.role?.name === 'producer' && !user.producer) ||
    (user.role?.name === 'customer' && !user.customer)

  return (
    <Container style={{ fontFamily: 'Inter, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', paddingTop: '28px', paddingBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>Administration</p>
          <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Utilisateurs <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '16px', fontWeight: 500 }}>({total})</span>
          </h2>
        </div>
        <button onClick={() => navigate('/admin/users/add')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(90deg, #2f6fed, #1f4bb6)', border: 'none', borderRadius: '10px', padding: '10px 18px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(47,111,237,0.4)', fontFamily: 'Inter, sans-serif' }}>
          <HiPlus size={16} /> Nouvel utilisateur
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: '24px', maxWidth: '400px' }}>
        <HiOutlineSearch size={15} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.55)', pointerEvents: 'none' }} />
        <input type="text" placeholder="Rechercher un utilisateur…" value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
          style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '10px 14px 10px 36px', color: '#fff', fontSize: '13px', fontFamily: 'Inter, sans-serif', outline: 'none', boxSizing: 'border-box' }}
          onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)' }}
          onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)' }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', height: '68px', border: '1px solid rgba(255,255,255,0.06)' }} />)}
        </div>
      ) : users.length === 0 ? (
        <div style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', borderRadius: '16px', padding: '64px 24px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.07)' }}>
          <HiUserGroup size={48} style={{ color: 'rgba(255,255,255,0.1)', margin: '0 auto 14px', display: 'block' }} />
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '15px', fontWeight: 600 }}>Aucun utilisateur</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '40px' }}>
          {users.map((user: User) => {
            const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.username || '?'
            const roleCfg = ROLE_CFG[user.role?.name] ?? ROLE_CFG.customer
            const isSuperAdmin = user.role?.name === 'super_admin'
            const numericId = usersId.find(({ documentId: dId }) => dId === user.documentId)?.id
            const missing = isUserMissingInfos(user)
            return (
              <div key={user.documentId}
                style={{ background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)', border: `1.5px solid ${user.blocked ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', transition: 'border-color 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = user.blocked ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.14)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = user.blocked ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)')}
              >
                {/* Avatar */}
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: avatarColor(fullName), border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
                  {user.avatar?.url
                    ? <img src={user.avatar.url} style={{ width: '100%', height: '100%', borderRadius: '12px', objectFit: 'cover' }} />
                    : <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{(fullName[0] ?? '?').toUpperCase()}</span>
                  }
                  {user.blocked && <span style={{ position: 'absolute', bottom: '-3px', right: '-3px', width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444', border: '2px solid #0f1c2e' }} />}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>{fullName}</span>
                    <span style={{ background: roleCfg.bg, border: `1px solid ${roleCfg.border}`, borderRadius: '100px', padding: '1px 8px', color: roleCfg.color, fontSize: '11px', fontWeight: 600 }}>{roleCfg.label}</span>
                    {missing && (
                      <span title="Lien non renseigné" style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '100px', padding: '1px 8px', color: '#fbbf24', fontSize: '11px', fontWeight: 600 }}>
                        <IoWarningOutline size={11} /> Non lié
                      </span>
                    )}
                    {user.blocked && <span style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '100px', padding: '1px 8px', color: '#f87171', fontSize: '11px', fontWeight: 600 }}>Bloqué</span>}
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: '12px' }}>{user.email}</span>
                </div>

                {/* Block toggle */}
                <Switcher
                  checked={!user.blocked}
                  disabled={isSuperAdmin || numericId === undefined}
                  onChange={() => numericId !== undefined && dispatch(updateUser({ user: { blocked: !user.blocked }, id: String(numericId) }))}
                />

                {/* Actions */}
                <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                  <Btn onClick={() => navigate(`/admin/users/edit/${user.documentId}`)} icon={<HiPencil size={13} />} hoverBg="rgba(47,111,237,0.15)" hoverColor="#6b9eff" hoverBorder="rgba(47,111,237,0.4)" title="Modifier" />
                  <Btn onClick={() => numericId !== undefined && dispatch(deleteUser(String(numericId)))} icon={<HiTrash size={13} />} hoverBg="rgba(239,68,68,0.12)" hoverColor="#f87171" hoverBorder="rgba(239,68,68,0.3)" title="Supprimer" disabled={isSuperAdmin || numericId === undefined} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Container>
  );
};

export default UsersList;
