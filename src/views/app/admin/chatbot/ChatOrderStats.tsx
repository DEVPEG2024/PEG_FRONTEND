import { useEffect, useState, type ReactNode } from 'react';
import { MdShoppingBag, MdEuro, MdForum } from 'react-icons/md';
import { apiGetChatOrderStats } from '@/services/ChatTraceServices';
import type { ChatOrderStatsResponse } from '@/components/template/chat/chatClosing';

type Stats = ChatOrderStatsResponse['stats'];

const fmtEur = (n: number) =>
  `${(Math.round(n * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const fmtInt = (n: number) => n.toLocaleString('fr-FR');

const isStats = (s: unknown): s is Stats => {
  const x = s as Stats | null;
  const bucket = (b: unknown) =>
    !!b &&
    typeof (b as { orders?: unknown }).orders === 'number' &&
    typeof (b as { revenueHT?: unknown }).revenueHT === 'number';
  return (
    !!x &&
    bucket(x.allTime) &&
    bucket(x.last30Days) &&
    typeof x.closedConversations === 'number'
  );
};

/**
 * Commandes et CA HT issus de l'assistant (articles ajoutés depuis une offre du
 * chat, projet non annulé). Masqué tant que le serveur ne fournit pas les
 * chiffres (backend pas encore redéployé, erreur) : rien ne casse.
 */
const ChatOrderStats = () => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGetChatOrderStats()
      .then((res) => {
        if (!cancelled && res.data?.result === true && isStats(res.data.stats))
          setStats(res.data.stats);
      })
      .catch(() => {
        /* route absente ou refusée : tuiles masquées */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!stats) return null;

  // Sous-titre = MÊME mesure que le chiffre principal, sur 30 jours : les
  // conversations closes (et non les conversations ayant un article du chat,
  // closes ou non), sinon le sous-titre pourrait dépasser le total.
  const closedRecent =
    typeof stats.closedConversationsLast30Days === 'number'
      ? fmtInt(stats.closedConversationsLast30Days)
      : null;

  const tiles: {
    icon: ReactNode;
    label: string;
    value: string;
    recent: string | null;
    color: string;
  }[] = [
    {
      icon: <MdShoppingBag size={18} />,
      label: "Commandes issues de l'assistant",
      value: fmtInt(stats.allTime.orders),
      recent: fmtInt(stats.last30Days.orders),
      color: '#22c55e',
    },
    {
      icon: <MdEuro size={18} />,
      label: "CA HT issu de l'assistant",
      value: fmtEur(stats.allTime.revenueHT),
      recent: fmtEur(stats.last30Days.revenueHT),
      color: '#6b9eff',
    },
    {
      icon: <MdForum size={18} />,
      label: 'Conversations conclues par une commande',
      value: fmtInt(stats.closedConversations),
      recent: closedRecent,
      color: '#a78bfa',
    },
  ];

  return (
    <div
      aria-label="Commandes issues de l'assistant"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))',
        gap: '12px',
        marginBottom: '16px',
      }}
    >
      {tiles.map((t) => (
        <div
          key={t.label}
          style={{
            background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'rgba(255,255,255,0.55)',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <span
              style={{ color: t.color, display: 'flex' }}
              aria-hidden="true"
            >
              {t.icon}
            </span>
            {t.label}
          </div>
          <div
            style={{
              color: '#fff',
              fontSize: '22px',
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
          >
            {t.value}
          </div>
          {t.recent !== null && (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11.5px' }}>
              30 derniers jours : {t.recent}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ChatOrderStats;
