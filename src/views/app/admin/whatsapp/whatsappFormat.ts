import type { WhatsappConversation, WhatsappMessage } from '@/@types/whatsapp';

export type StateInfo = {
  label: string;
  color: string;
  bg: string;
  border: string;
};

export const stateInfo = (
  c: Pick<WhatsappConversation, 'state'>
): StateInfo => {
  if (c.state === 'waiting_human')
    return {
      label: 'À vous de répondre',
      color: '#fbbf24',
      bg: 'rgba(251,191,36,0.14)',
      border: 'rgba(251,191,36,0.35)',
    };
  if (c.state === 'human')
    return {
      label: 'Vous avez repris',
      color: '#60a5fa',
      bg: 'rgba(96,165,250,0.14)',
      border: 'rgba(96,165,250,0.35)',
    };
  return {
    label: 'Agent',
    color: '#4ade80',
    bg: 'rgba(74,222,128,0.12)',
    border: 'rgba(74,222,128,0.3)',
  };
};

/** « Plus que 3 h » : temps restant avant que WhatsApp bloque une réponse libre. */
export const timeLeftLabel = (
  closesAt: string | null | undefined,
  now: number = Date.now()
): string | null => {
  if (!closesAt) return null;
  const left = new Date(closesAt).getTime() - now;
  if (Number.isNaN(left)) return null;
  if (left <= 0) return '24 h dépassées';
  const minutes = Math.ceil(left / 60_000);
  if (minutes < 60) return `Plus que ${minutes} min`;
  return `Plus que ${Math.ceil(minutes / 60)} h`;
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** Heure dans la liste : 14:32 aujourd'hui, « Hier », sinon 05/11. */
export const listTime = (
  iso: string | null | undefined,
  now: Date = new Date()
): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  if (sameDay(d, now))
    return d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
};

export const messageTime = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

/** Ceux qui attendent une réponse d'abord (le plus ancien en tête : c'est le plus urgent), puis le plus récent. */
export const sortConversations = (
  list: WhatsappConversation[]
): WhatsappConversation[] =>
  [...list].sort((a, b) => {
    const wa = a.state === 'waiting_human' ? 0 : 1;
    const wb = b.state === 'waiting_human' ? 0 : 1;
    if (wa !== wb) return wa - wb;
    if (wa === 0)
      return (
        new Date(a.handoffAt || 0).getTime() -
        new Date(b.handoffAt || 0).getTime()
      );
    return (
      new Date(b.updatedAt || 0).getTime() -
      new Date(a.updatedAt || 0).getTime()
    );
  });

export const initials = (name: string): string => {
  const parts = name
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
};

/** L'agent écrit encore : dernier message du contact, très récent, conversation pas reprise. */
export const agentIsTyping = (
  conv: Pick<WhatsappConversation, 'state'> | null,
  messages: WhatsappMessage[],
  now: number = Date.now()
): boolean => {
  if (!conv || conv.state === 'human' || !messages.length) return false;
  const last = messages[messages.length - 1];
  return (
    last.direction === 'in' && now - new Date(last.createdAt).getTime() < 30_000
  );
};

export const authorLabel = (m: Pick<WhatsappMessage, 'author'>): string => {
  if (m.author === 'admin') return 'Équipe PEG';
  if (m.author === 'agent') return 'Agent';
  if (m.author === 'system') return 'PEG';
  return '';
};

export const statusLabel = (status: string): string | null => {
  switch (status) {
    case 'simulated':
      return 'Essai';
    case 'queued':
      return 'Envoi…';
    case 'sent':
      return 'Envoyé';
    case 'delivered':
      return 'Remis';
    case 'read':
      return 'Lu';
    case 'failed':
      return 'Non remis';
    default:
      return null;
  }
};

/** Module absent du serveur (front déployé avant le back). */
export const isBackendMissing = (e: any): boolean =>
  e?.response?.status === 404 || e?.response?.status === 405;

export const errorText = (e: any, fallback: string): string => {
  const m = e?.response?.data?.error;
  return typeof m === 'string' && m.trim() ? m : fallback;
};

export const eurFr = (n: number | null | undefined): string =>
  n == null
    ? ''
    : `${Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
