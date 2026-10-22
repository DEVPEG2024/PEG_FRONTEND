import type { ChatOffer, ChatOfferLine } from '@/components/template/chatOffer';
import type {
  ChatFormAnswer,
  ChatFormAsk,
  ChatFormAskKind,
  ChatFormDraft,
  ChatFormInput,
  ChatFormLogo,
  ChatFormRecap,
  ChatFormTurn,
} from './chatFormTypes';

/**
 * Personnalisation guidée par l'assistant — logique du widget, sans React.
 *
 * Le brouillon de réponses vit dans le NAVIGATEUR (sessionStorage, une clé par
 * conversation), repart à chaque message (`formDraft`) et le serveur le
 * revalide intégralement : ce qui est lu ici n'est jamais cru sur parole, ni
 * côté serveur (revalidation), ni côté widget (tout ce qui vient du réseau ou
 * du stockage est vérifié avant d'être affiché).
 *
 * Un clic (option, fichier, « Passer »…) part en `formInput`, UNE seule fois,
 * avec le texte du clic comme message du client.
 */

export const CHAT_FORM_STORAGE_PREFIX = 'peg_chat_form_v1:';
/** Au-delà, le serveur ignore le brouillon : inutile de le garder ni de l'envoyer. */
export const CHAT_FORM_DRAFT_MAX_BYTES = 32 * 1024;
/** Suffixe de l'offre du récapitulatif (offre d'origine limitée au produit). */
export const RECAP_OFFER_SUFFIX = '-perso';

const ASK_KINDS: ChatFormAskKind[] = [
  'text',
  'textarea',
  'choice',
  'multichoice',
  'boolean',
  'email',
  'url',
  'phone',
  'number',
  'date',
  'datetime',
  'file',
];
const STATUSES = ['proposed', 'filling', 'review'];

// ── Vérifications de forme ───────────────────────────────────────────────────

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj =>
  !!x && typeof x === 'object' && !Array.isArray(x);
const isStr = (x: unknown): x is string => typeof x === 'string';
const isStrList = (x: unknown): x is string[] =>
  Array.isArray(x) && x.every(isStr);
const isOption = (o: unknown): o is { label: string; value: string } =>
  isObj(o) && isStr(o.label) && isStr(o.value);

const jsonSize = (x: unknown): number => {
  try {
    return new TextEncoder().encode(JSON.stringify(x)).length;
  } catch {
    return Infinity;
  }
};

const isFileValue = (f: unknown): boolean =>
  isObj(f) && f.storage === 'url' && isStr(f.url) && isStr(f.name);

const isFormValue = (v: unknown): boolean =>
  isStr(v) ||
  typeof v === 'boolean' ||
  (Array.isArray(v) && v.every(isFileValue)) ||
  (isObj(v) && Object.values(v).every((b) => typeof b === 'boolean'));

const isOfferLine = (l: unknown): l is ChatOfferLine =>
  isObj(l) &&
  isStr(l.productDocumentId) &&
  isStr(l.productName) &&
  Number(l.quantity) > 0 &&
  typeof l.totalHT === 'number';

const isSnapshot = (o: unknown): boolean =>
  isObj(o) &&
  isStr(o.id) &&
  Array.isArray(o.lines) &&
  o.lines.length > 0 &&
  o.lines.every(isOfferLine) &&
  typeof o.totalHT === 'number' &&
  typeof o.totalTTC === 'number';

/** Brouillon bien formé (forme seulement : le contenu est revalidé par le serveur). */
export const isChatFormDraft = (x: unknown): x is ChatFormDraft =>
  isObj(x) &&
  x.v === 1 &&
  isStr(x.productDocumentId) &&
  isStr(x.productName) &&
  (x.formDocumentId === null || isStr(x.formDocumentId)) &&
  STATUSES.includes(x.status as string) &&
  isSnapshot(x.offer) &&
  isObj(x.values) &&
  Object.values(x.values).every(isFormValue) &&
  isStrList(x.skipped) &&
  isStrList(x.later) &&
  isStrList(x.prefilled) &&
  typeof x.contactsConfirmed === 'boolean' &&
  (x.lastAsked === null || isStr(x.lastAsked));

/** Réponse de formulaire produite par l'assistant (récapitulatif). */
export const isChatFormAnswer = (x: unknown): x is ChatFormAnswer =>
  isObj(x) &&
  isObj(x.data) &&
  isObj(x.metadata) &&
  x.metadata.source === 'assistant' &&
  isStr(x.metadata.filledAt) &&
  (x.state === 'submitted' || x.state === 'pending');

/** Vignette affichée dans une <img> : https, ou chemin de l'API. */
const safeImageUrl = (u: unknown): string | null =>
  isStr(u) && (/^https:\/\//i.test(u) || /^\/(?!\/)/.test(u)) ? u : null;

const parseLogos = (raw: unknown): ChatFormLogo[] | undefined => {
  if (!Array.isArray(raw)) return undefined;
  const logos = raw
    .filter(
      (l): l is Obj =>
        isObj(l) && isStr(l.clientFileDocumentId) && isStr(l.name)
    )
    .slice(0, 3)
    .map((l) => ({
      clientFileDocumentId: l.clientFileDocumentId as string,
      name: l.name as string,
      thumbnailUrl: safeImageUrl(l.thumbnailUrl),
      mime: isStr(l.mime) ? l.mime : null,
    }));
  return logos.length ? logos : undefined;
};

const parseAsk = (raw: unknown): ChatFormAsk | null => {
  if (!isObj(raw) || !isStr(raw.key) || !isStr(raw.label)) return null;
  if (!ASK_KINDS.includes(raw.kind as ChatFormAskKind)) return null;
  const kind = raw.kind as ChatFormAskKind;
  const ask: ChatFormAsk = {
    key: raw.key,
    label: raw.label,
    section: isStr(raw.section) ? raw.section : null,
    kind,
    optional: raw.optional === true,
  };
  if (Array.isArray(raw.options)) {
    if (!raw.options.every(isOption)) return null;
    ask.options = raw.options.map((o) => ({ label: o.label, value: o.value }));
  }
  // Un choix sans option : rien de cliquable, la question est ignorée.
  if (
    ['choice', 'multichoice', 'boolean'].includes(kind) &&
    !ask.options?.length
  )
    return null;
  if (isStr(raw.accept)) ask.accept = raw.accept;
  if (typeof raw.multiple === 'boolean') ask.multiple = raw.multiple;
  const logos = parseLogos(raw.logos);
  if (logos) ask.logos = logos;
  return ask;
};

const parseContacts = (
  raw: unknown
): { label: string; value: string }[] | null =>
  Array.isArray(raw) &&
  raw.length > 0 &&
  raw.every((c) => isObj(c) && isStr(c.label) && isStr(c.value))
    ? raw.map((c) => ({ label: c.label, value: c.value }))
    : null;

const RECAP_STATUSES = ['filled', 'skipped', 'later'];

const parseRecap = (raw: unknown): ChatFormRecap | null => {
  if (!isObj(raw) || !isStr(raw.productDocumentId) || !isStr(raw.productName))
    return null;
  if (!isChatFormAnswer(raw.answer) || !Array.isArray(raw.items)) return null;
  const itemsOk = raw.items.every(
    (it) =>
      isObj(it) &&
      isStr(it.key) &&
      isStr(it.label) &&
      isStr(it.display) &&
      RECAP_STATUSES.includes(it.status as string)
  );
  if (!itemsOk) return null;
  return {
    productDocumentId: raw.productDocumentId,
    productName: raw.productName,
    formDocumentId: isStr(raw.formDocumentId) ? raw.formDocumentId : null,
    items: raw.items as ChatFormRecap['items'],
    answer: raw.answer,
  };
};

/**
 * `form` reçu du serveur (`done.form` / réponse JSON) ou relu d'un message
 * conservé. null = rien d'exploitable → aucun changement du brouillon.
 * Un brouillon corrompu fait ignorer tout le tour ; une partie d'affichage
 * mal formée (question, récapitulatif…) est simplement écartée.
 */
export function parseChatFormTurn(raw: unknown): ChatFormTurn | null {
  if (!isObj(raw) || !('draft' in raw)) return null;
  let draft: ChatFormDraft | null = null;
  if (raw.draft !== null) {
    if (!isChatFormDraft(raw.draft)) return null;
    if (jsonSize(raw.draft) > CHAT_FORM_DRAFT_MAX_BYTES) return null;
    draft = raw.draft;
  }
  const turn: ChatFormTurn = { draft };
  if (!draft) return turn;
  if (raw.proposal === true) turn.proposal = true;
  const contacts = parseContacts(raw.contacts);
  if (contacts) turn.contacts = contacts;
  const ask = parseAsk(raw.ask);
  if (ask) turn.ask = ask;
  if (raw.canFinish === true) turn.canFinish = true;
  const recap = parseRecap(raw.recap);
  if (recap) turn.recap = recap;
  return turn;
}

/** Le tour a-t-il quelque chose à montrer (boutons, récapitulatif) ? */
export const isShownTurn = (t: ChatFormTurn | null | undefined): boolean =>
  !!t &&
  !!(t.proposal || t.contacts?.length || t.ask || t.canFinish || t.recap);

// ── Stockage (sessionStorage, une clé par conversation) ──────────────────────

const storageKey = (conversationId: string) =>
  `${CHAT_FORM_STORAGE_PREFIX}${conversationId}`;

export const readChatFormDraft = (
  conversationId: string
): ChatFormDraft | null => {
  try {
    const raw = sessionStorage.getItem(storageKey(conversationId));
    if (!raw) return null;
    const draft: unknown = JSON.parse(raw);
    return isChatFormDraft(draft) ? draft : null;
  } catch {
    return null;
  }
};

export const saveChatFormDraft = (
  conversationId: string,
  draft: ChatFormDraft | null
): void => {
  try {
    if (draft)
      sessionStorage.setItem(storageKey(conversationId), JSON.stringify(draft));
    else sessionStorage.removeItem(storageKey(conversationId));
  } catch {
    /* navigation privée, stockage bloqué : le brouillon vit le temps de l'onglet */
  }
};

// ── Offre du récapitulatif, réponses par produit ─────────────────────────────

export const recapOfferId = (offerId: string) =>
  `${offerId}${RECAP_OFFER_SUFFIX}`;

/**
 * Offre du récapitulatif : l'offre du brouillon limitée au produit personnalisé,
 * id `<offre>-perso`. Stockée dans le message comme toute offre (le suivi de la
 * commande retrouve ainsi la conversation), elle passe au panier avec la
 * réponse remplie dans le chat.
 */
export const recapOfferOf = (
  turn: ChatFormTurn | null | undefined
): ChatOffer | undefined => {
  const recap = turn?.recap;
  const draft = turn?.draft;
  if (!recap || !draft) return undefined;
  const lines = draft.offer.lines.filter(
    (l) => l.productDocumentId === recap.productDocumentId
  );
  if (!lines.length) return undefined;
  return {
    id: recapOfferId(draft.offer.id),
    lines,
    totalHT: draft.offer.totalHT,
    totalTTC: draft.offer.totalTTC,
  };
};

/**
 * Réponses de personnalisation d'un message, par produit : seulement un
 * récapitulatif dont le produit figure dans l'offre du message.
 */
export const answersForMessage = (msg: {
  form?: unknown;
  offer?: ChatOffer;
}): Record<string, ChatFormAnswer> | undefined => {
  const recap = parseChatFormTurn(msg.form)?.recap;
  if (!recap || !msg.offer) return undefined;
  const inOffer = msg.offer.lines.some(
    (l) => l.productDocumentId === recap.productDocumentId
  );
  return inOffer ? { [recap.productDocumentId]: recap.answer } : undefined;
};

/** Champ fichier demandé par le DERNIER message (trombone de la zone de saisie). */
export const attachAskOf = (
  messages: { role: string; error?: boolean; form?: unknown }[],
  draft: ChatFormDraft | null
): ChatFormAsk | null => {
  if (!draft) return null;
  const last = messages[messages.length - 1];
  if (!last || last.role !== 'assistant' || last.error) return null;
  const ask = parseChatFormTurn(last.form)?.ask;
  return ask && ask.kind === 'file' ? ask : null;
};

// ── Réponse enregistrée : trace « Rempli avec l'assistant » ──────────────────

type Meta = { source?: unknown; filledAt?: unknown; conversationId?: unknown };

const metadataOf = (answer: unknown): Meta | null => {
  let a: unknown = answer;
  if (isStr(a)) {
    try {
      a = JSON.parse(a);
    } catch {
      return null;
    }
  }
  return isObj(a) && isObj(a.metadata) ? (a.metadata as Meta) : null;
};

/**
 * Réponse remplie AVEC l'assistant (récapitulatif du chat) : `source` ET
 * `filledAt`. Une ligne ajoutée au panier sans personnalisation porte déjà
 * `source: 'assistant'` (réponse « en attente », sans `filledAt`) : elle ne
 * compte pas.
 */
export const isAssistantFilled = (answer: unknown): boolean => {
  const m = metadataOf(answer);
  return (
    !!m && m.source === 'assistant' && isStr(m.filledAt) && m.filledAt !== ''
  );
};

/**
 * Soumission du formulaire (pop-up du panier) : la trace de l'assistant
 * (`source`, `filledAt`, `conversationId`) de la réponse précédente est
 * conservée — le client n'a fait que compléter ce qui restait (son logo).
 */
export const keepAssistantMetadata = <T extends { metadata?: unknown }>(
  submission: T,
  previousFormAnswer: unknown
): T => {
  const prev = metadataOf(
    isObj(previousFormAnswer) ? previousFormAnswer.answer : null
  );
  if (!prev || prev.source !== 'assistant') return submission;
  const base = isObj(submission.metadata) ? submission.metadata : {};
  return {
    ...submission,
    metadata: {
      ...base,
      source: 'assistant',
      ...(isStr(prev.filledAt) ? { filledAt: prev.filledAt } : {}),
      ...(isStr(prev.conversationId)
        ? { conversationId: prev.conversationId }
        : {}),
    },
  };
};

// ── Canal du widget : brouillon courant + clic en attente d'envoi ────────────

export type ChatFormRequestFields = {
  /**
   * Envoyé à CHAQUE message, null sans brouillon : il signale au serveur que ce
   * widget sait afficher la personnalisation (un ancien widget ne l'envoie pas).
   */
  formDraft: ChatFormDraft | null;
  formInput?: ChatFormInput;
};

/**
 * État de la personnalisation pour UNE conversation à la fois. Sans React :
 * `useChatForm` l'enveloppe, les tests l'exercent directement.
 */
export class ChatFormChannel {
  conversationId: string;
  draft: ChatFormDraft | null;
  private pending: ChatFormInput | null = null;

  constructor(conversationId: string) {
    this.conversationId = conversationId;
    this.draft = readChatFormDraft(conversationId);
  }

  /** Autre conversation (nouvelle, autre compte, clôture) : son propre brouillon. */
  switchTo(conversationId: string): boolean {
    if (conversationId === this.conversationId) return false;
    this.conversationId = conversationId;
    this.draft = readChatFormDraft(conversationId);
    this.pending = null;
    return true;
  }

  queue(input: ChatFormInput): void {
    this.pending = input;
  }

  /** Clic non envoyé (requête déjà en cours…) : il ne part pas avec le message suivant. */
  cancelQueued(): boolean {
    const had = this.pending !== null;
    this.pending = null;
    return had;
  }

  /** Champs à ajouter au corps de la requête ; le clic en attente est consommé. */
  requestFields(): ChatFormRequestFields {
    const input = this.pending;
    this.pending = null;
    return { formDraft: this.draft, ...(input ? { formInput: input } : {}) };
  }

  /**
   * Tour reçu du serveur : met à jour le brouillon (`draft: null` → effacé) et
   * renvoie ce qu'il faut afficher sous la réponse, ou undefined.
   */
  accept(raw: unknown): ChatFormTurn | undefined {
    const turn = parseChatFormTurn(raw);
    if (!turn) return undefined;
    this.setDraft(turn.draft);
    return isShownTurn(turn) ? turn : undefined;
  }

  /**
   * État d'une offre changé (bouton panier du chat). Brouillon terminé quand
   * l'offre d'origine entre telle quelle au panier, quand l'offre du
   * récapitulatif y entre, ou quand « Modifier » confie la suite à la fiche.
   */
  offerChanged(offer: ChatOffer): boolean {
    const d = this.draft;
    if (!d || !offer.status) return false;
    const isRecap = offer.id === recapOfferId(d.offer.id);
    if (!(isRecap || (offer.id === d.offer.id && offer.status === 'added')))
      return false;
    this.setDraft(null);
    return true;
  }

  private setDraft(draft: ChatFormDraft | null): void {
    this.draft = draft;
    saveChatFormDraft(this.conversationId, draft);
  }
}
