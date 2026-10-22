/**
 * Style de réponse de l'assistant (26/09/2026) : ⚡ Rapide / 💬 Conseil.
 *
 * - Le client choisit à la 1re ouverture (boutons de la bulle d'accueil) et bascule
 *   quand il veut dans l'en-tête du chat. S'il écrit sans choisir → Conseil.
 * - Choix mémorisé PAR COMPTE et PAR APPAREIL : localStorage
 *   `peg_chat_style:<user.documentId>`.
 * - Le style part avec chaque message (`style`) ; seul le serveur change de consignes
 *   (Rapide = prompt inchangé). Visiteur non connecté : rien n'est envoyé.
 * - Serveur pas encore redéployé : son événement SSE `open` n'annonce pas
 *   `features: ['style']` → bascule masquée et style plus envoyé (sessionStorage
 *   `peg_chat_features_v1`, relu à chaque ouverture d'onglet).
 *
 * Toute lecture/écriture du stockage est protégée (navigation privée, stockage bloqué).
 */

export type ChatStyle = 'quick' | 'advice';

export const CHAT_STYLE_STORAGE_PREFIX = 'peg_chat_style:';
export const CHAT_FEATURES_STORAGE_KEY = 'peg_chat_features_v1';

/** « S'il écrit sans choisir → Conseil. » */
export const STYLE_WHEN_UNCHOSEN: ChatStyle = 'advice';

export const CHAT_STYLE_LABELS: Record<
  ChatStyle,
  { emoji: string; label: string; hint: string }
> = {
  quick: {
    emoji: '⚡',
    label: 'Rapide',
    hint: 'Réponses courtes, droit au but',
  },
  advice: {
    emoji: '💬',
    label: 'Conseil',
    hint: "Je m'intéresse à votre projet et je vous conseille",
  },
};

export const otherChatStyle = (style: ChatStyle): ChatStyle =>
  style === 'advice' ? 'quick' : 'advice';

const isChatStyle = (v: unknown): v is ChatStyle =>
  v === 'quick' || v === 'advice';

/** Style enregistré pour ce compte sur cet appareil ; `null` = jamais choisi (ou valeur inconnue). */
export function readChatStyle(
  userDocumentId?: string | null
): ChatStyle | null {
  if (!userDocumentId) return null;
  try {
    const raw = localStorage.getItem(
      `${CHAT_STYLE_STORAGE_PREFIX}${userDocumentId}`
    );
    return isChatStyle(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function saveChatStyle(
  userDocumentId: string | null | undefined,
  style: ChatStyle
): void {
  if (!userDocumentId || !isChatStyle(style)) return;
  try {
    localStorage.setItem(
      `${CHAT_STYLE_STORAGE_PREFIX}${userDocumentId}`,
      style
    );
  } catch {
    /* stockage bloqué */
  }
}

// ── Fonctions annoncées par le serveur ───────────────────────────────────────
// Repli mémoire UNIQUEMENT si le stockage de session est inaccessible : un stockage
// vidé (nouvel onglet, tests) doit redonner « inconnu », pas une valeur périmée.
let memoryFeatures: string[] | null = null;
const listeners = new Set<() => void>();

/**
 * Appelé sur l'événement SSE `open`. Absent ou mal formé = serveur sans styles
 * (backend antérieur : `open` ne portait que `model`).
 */
export function noteChatServerFeatures(features: unknown): void {
  const list = Array.isArray(features)
    ? features.filter((f): f is string => typeof f === 'string').slice(0, 20)
    : [];
  memoryFeatures = list;
  try {
    sessionStorage.setItem(CHAT_FEATURES_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* repli mémoire */
  }
  listeners.forEach((l) => l());
}

const readFeatures = (): string[] | null => {
  try {
    const raw = sessionStorage.getItem(CHAT_FEATURES_STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((f): f is string => typeof f === 'string')
      : null;
  } catch {
    return memoryFeatures;
  }
};

/** `true`/`false` selon la dernière annonce du serveur ; `null` = inconnu (optimiste : on affiche et on envoie). */
export function chatStyleSupported(): boolean | null {
  const features = readFeatures();
  return features === null ? null : features.includes('style');
}

/** Abonnement aux annonces du serveur (useChatStyle se re-rend sans attendre un autre état). */
export function subscribeChatServerFeatures(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
