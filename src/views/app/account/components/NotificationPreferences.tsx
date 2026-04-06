import { useState, useEffect, useRef } from 'react';
import { useAppSelector } from '@/store';
import { RootState } from '@/store';
import { fetchPreferences, updatePreferences } from '@/services/NotificationService';
import { toast } from 'react-toastify';

interface ChannelPref {
  push: boolean;
  email: boolean;
}

interface Preferences {
  [key: string]: ChannelPref;
}

const EVENT_LABELS: Record<string, { label: string; description: string; roles: string[] }> = {
  new_order:             { label: 'Nouvelle commande',         description: 'Quand un client passe une commande',                  roles: ['admin', 'super_admin', 'producer'] },
  project_status_change: { label: 'Changement statut projet', description: "Quand l'état d'un projet change",                     roles: ['admin', 'super_admin', 'customer'] },
  new_comment:           { label: 'Nouveau message',           description: 'Quand quelqu\'un commente un projet',                roles: ['admin', 'super_admin', 'customer', 'producer'] },
  new_file:              { label: 'Nouveau fichier',           description: 'Quand un fichier est ajouté à un projet',            roles: ['admin', 'super_admin', 'customer', 'producer'] },
  new_task:              { label: 'Nouvelle tâche',            description: 'Quand une tâche est créée dans un projet',           roles: ['admin', 'super_admin', 'customer'] },
  task_status_change:    { label: 'Tâche mise à jour',         description: "Quand le statut d'une tâche change",                 roles: ['admin', 'super_admin', 'customer'] },
  new_invoice:           { label: 'Nouvelle facture',          description: 'Quand une facture est créée',                        roles: ['admin', 'super_admin', 'customer'] },
  new_ticket:            { label: 'Nouveau ticket',            description: "Quand un ticket d'assistance est ouvert",            roles: ['admin', 'super_admin', 'customer', 'producer'] },
  payment_received:      { label: 'Paiement reçu',            description: 'Quand un paiement est confirmé',                     roles: ['admin', 'super_admin', 'producer'] },
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
  const previousPrefsRef = useRef<Preferences | null>(null);

  const userId = useAppSelector((state: RootState) => {
    const u = state.auth.user.user;
    return u?.documentId || u?.id || u?._id || null;
  });
  const userAuthority = useAppSelector(
    (state: RootState) => state.auth.user.user.authority,
  ) as string[];

  useEffect(() => {
    if (!userId) return;
    const defaultPrefs: Preferences = Object.fromEntries(
      Object.keys(EVENT_LABELS).map((key) => [key, { push: true, email: true }]),
    );
    fetchPreferences(userId)
      .then((data) => {
        setPrefs(data?.preferences ?? defaultPrefs);
      })
      .catch(() => {
        setPrefs(defaultPrefs);
      });
  }, [userId]);

  const handleToggle = async (
    eventType: string,
    channel: 'push' | 'email',
  ) => {
    if (!prefs || !userId) return;

    const current = prefs[eventType] ?? { push: true, email: true };
    const previous = { ...prefs, [eventType]: { ...current } };
    const updated: Preferences = {
      ...prefs,
      [eventType]: {
        ...current,
        [channel]: !current[channel],
      },
    };

    previousPrefsRef.current = previous;
    setPrefs(updated);
    setSaving(true);

    try {
      const res = await updatePreferences(userId, updated);
      if (res?.result) {
        toast.success('Préférences mises à jour');
      } else {
        throw new Error('Update failed');
      }
    } catch (err) {
      console.error('[NotificationPreferences] update error:', err);
      setPrefs(previousPrefsRef.current);
      toast.error('Erreur lors de la mise à jour des préférences');
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
        const ep = prefs[eventType as string] ?? { push: true, email: true };
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
            <div>
              <span style={{ color: '#fff', fontSize: '13px', fontWeight: 500, display: 'block' }}>
                {cfg.label}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', display: 'block', marginTop: '2px' }}>
                {cfg.description}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => handleToggle(eventType as string, 'push')}
                style={toggleStyle(ep.push)}
                disabled={saving}
              >
                <span style={toggleDotStyle(ep.push)} />
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => handleToggle(eventType as string, 'email')}
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
