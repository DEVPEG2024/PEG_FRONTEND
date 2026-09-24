import { useState, useEffect, useRef } from 'react';
import { useAppSelector } from '@/store';
import { RootState } from '@/store';
import { fetchPreferences, updatePreferences } from '@/services/NotificationService';
import { toast } from 'react-toastify';
import usePushPermission from '@/utils/hooks/usePushPermission';
import { enablePush, isAppleMobile } from '@/utils/webPush';
import { isStandalone } from '@/utils/pwa';

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

/**
 * Notifications push sur CET appareil : les interrupteurs « Push » ci-dessous
 * choisissent les événements, mais rien n'arrive tant que l'appareil n'a pas
 * donné son autorisation. Sur iPhone, elle ne peut être demandée que par un
 * toucher, et seulement dans l'app installée.
 */
const DevicePushStatus = ({ userId }: { userId: string }) => {
  const permission = usePushPermission();
  const [busy, setBusy] = useState(false);
  const iphoneBrowser = permission === 'unsupported' && isAppleMobile() && !isStandalone();
  if (permission === 'unsupported' && !iphoneBrowser) return null;

  const activate = () => {
    setBusy(true);
    enablePush(userId)
      .then((result) => {
        if (result === 'granted') toast.success('Notifications activées sur cet appareil');
      })
      .catch(() => toast.error("Les notifications n'ont pas pu être activées"))
      .finally(() => setBusy(false));
  };

  const status =
    permission === 'granted'
      ? { color: '#4ade80', text: 'Activées sur cet appareil' }
      : permission === 'denied'
        ? { color: '#f87171', text: "Bloquées sur cet appareil : autorisez MyPEG dans les réglages de notifications de l'appareil ou du navigateur." }
        : permission === 'default'
          ? { color: '#fbbf24', text: 'Pas encore activées sur cet appareil' }
          : { color: 'rgba(255,255,255,0.4)', text: "Sur iPhone, les notifications arrivent dans l'app installée : Partager, puis « Sur l'écran d'accueil »." };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 14px',
        marginBottom: '20px',
        borderRadius: '12px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: status.color, flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0, color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>{status.text}</span>
      {permission === 'default' && (
        <button
          type="button"
          className="peg-tap-target"
          onClick={activate}
          disabled={busy}
          style={{
            flexShrink: 0,
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1px solid rgba(47,111,237,0.55)',
            background: 'rgba(47,111,237,0.28)',
            color: '#e8eefc',
            fontSize: '12.5px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Activer
        </button>
      )}
    </div>
  );
};

const NotificationPreferences = () => {
  const [prefs, setPrefs] = useState<Preferences | null>(null);
  const [saving, setSaving] = useState(false);
  const previousPrefsRef = useRef<Preferences | null>(null);

  const userId = useAppSelector((state: RootState) => {
    const u = state.auth.user.user;
    const raw = u?.documentId || u?.id || u?._id || null;
    return raw != null ? String(raw) : null;
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

      {userId && <DevicePushStatus userId={userId} />}

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
