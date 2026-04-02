import { useState, useEffect } from 'react';
import { useAppSelector } from '@/store';
import { RootState } from '@/store';
import { fetchPreferences, updatePreferences } from '@/services/NotificationService';
import { toast } from 'react-toastify';

interface ChannelPref {
  push: boolean;
  email: boolean;
}

interface Preferences {
  new_order: ChannelPref;
  project_status_change: ChannelPref;
  new_invoice: ChannelPref;
  new_ticket: ChannelPref;
  payment_received: ChannelPref;
}

const EVENT_LABELS: Record<string, { label: string; roles: string[] }> = {
  new_order:             { label: 'Nouvelle commande',           roles: ['admin', 'super_admin', 'producer'] },
  project_status_change: { label: 'Changement statut projet',   roles: ['admin', 'super_admin', 'customer'] },
  new_invoice:           { label: 'Nouvelle facture',            roles: ['admin', 'super_admin', 'customer'] },
  new_ticket:            { label: 'Nouveau ticket',              roles: ['admin', 'super_admin', 'customer', 'producer'] },
  payment_received:      { label: 'Paiement reçu',              roles: ['admin', 'super_admin', 'producer'] },
};

const toggleStyle = (enabled: boolean): React.CSSProperties => ({
  width: '40px',
  height: '22px',
  borderRadius: '11px',
  border: 'none',
  cursor: 'pointer',
  background: enabled ? '#2f6fed' : 'rgba(255,255,255,0.1)',
  position: 'relative',
  transition: 'background 0.2s',
});

const toggleDotStyle = (enabled: boolean): React.CSSProperties => ({
  width: '16px',
  height: '16px',
  borderRadius: '50%',
  background: '#fff',
  position: 'absolute',
  top: '3px',
  left: enabled ? '21px' : '3px',
  transition: 'left 0.2s',
});

const NotificationPreferences = () => {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [saving, setSaving] = useState(false);

  const userId = useAppSelector((state: RootState) => {
    const u = state.auth.user.user;
    return u?._id ?? u?.id ?? u?.documentId ?? null;
  });
  const userAuthority = useAppSelector(
    (state: RootState) => state.auth.user.user.authority,
  ) as string[];

  useEffect(() => {
    if (!userId) return;
    fetchPreferences(userId).then((data) => {
      if (data.preferences) setPrefs(data.preferences);
    });
  }, [userId]);

  const handleToggle = async (
    eventType: keyof Preferences,
    channel: 'push' | 'email',
  ) => {
    if (!prefs || !userId) return;

    const updated = {
      ...prefs,
      [eventType]: {
        ...prefs[eventType],
        [channel]: !prefs[eventType][channel],
      },
    };
    setPrefs(updated);
    setSaving(true);
    try {
      await updatePreferences(userId, updated);
      toast.success('Préférences mises à jour');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
    setSaving(false);
  };

  const visibleEvents = Object.entries(EVENT_LABELS).filter(([, cfg]) =>
    cfg.roles.some((r) => userAuthority?.includes(r)),
  );

  if (!prefs) {
    return (
      <div style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.5)' }}>
        Chargement...
      </div>
    );
  }

  return (
    <div>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '20px' }}>
        Choisissez comment recevoir vos notifications pour chaque type d'événement.
      </p>

      {/* Table header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 60px 60px',
          gap: '8px',
          padding: '0 0 10px 0',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          marginBottom: '8px',
        }}
      >
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Événement
        </span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
          Push
        </span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
          Email
        </span>
      </div>

      {/* Rows */}
      {visibleEvents.map(([eventType, cfg]) => {
        const ep = prefs[eventType as keyof Preferences];
        return (
          <div
            key={eventType}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 60px 60px',
              gap: '8px',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 500 }}>
              {cfg.label}
            </span>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => handleToggle(eventType as keyof Preferences, 'push')}
                style={toggleStyle(ep.push)}
                disabled={saving}
              >
                <span style={toggleDotStyle(ep.push)} />
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => handleToggle(eventType as keyof Preferences, 'email')}
                style={toggleStyle(ep.email)}
                disabled={saving}
              >
                <span style={toggleDotStyle(ep.email)} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationPreferences;
