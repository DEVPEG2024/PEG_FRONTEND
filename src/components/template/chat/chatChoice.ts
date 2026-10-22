import { isChatOffer, type ChatOfferLine } from '@/components/template/chatOffer';

/**
 * Couleur demandée par l'assistant AVANT l'offre panier (22/10/2026) : « 3 bonnets »
 * sur un Bonnet à 9 couleurs. Le serveur donne le prix et « Quelle couleur pour vos
 * 3 pièces « Bonnet » ? » avec `choice` ; le widget affiche une pastille par couleur. Le clic part
 * comme message du client (« MARINE ») avec `offerChoice` : le serveur rechiffre
 * l'offre depuis la base et la renvoie prête — l'article entre directement au panier.
 * Format identique à peg_strapi `src/services/chat-offer-choice.ts`.
 */
export type ChatChoiceOption = { documentId: string; name: string; hex: string | null };

export type ChatChoice = {
  kind: 'color';
  productDocumentId: string;
  productName: string;
  quantity: number;
  options: ChatChoiceOption[];
  lines: ChatOfferLine[];
};

/** Corps du clic (`offerChoice`) : le serveur ne croit que la forme, il rechiffre tout. */
export type ChatChoiceRequest = { productDocumentId: string; optionDocumentId: string; lines: ChatOfferLine[] };

const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** `choice` reçu du réseau ou relu du stockage : validé, sinon undefined. */
export const parseChatChoice = (raw: unknown): ChatChoice | undefined => {
  const c = raw as Partial<ChatChoice> | null;
  if (!c || typeof c !== 'object' || c.kind !== 'color') return undefined;
  if (typeof c.productDocumentId !== 'string' || !ID_RE.test(c.productDocumentId)) return undefined;
  const quantity = Number(c.quantity);
  if (!Number.isFinite(quantity) || quantity < 1) return undefined;
  const options = (Array.isArray(c.options) ? c.options : [])
    .filter((o): o is ChatChoiceOption => !!o && typeof o.documentId === 'string' && ID_RE.test(o.documentId) && typeof o.name === 'string' && !!o.name.trim())
    .map((o) => ({ documentId: o.documentId, name: o.name.trim(), hex: typeof o.hex === 'string' && HEX_RE.test(o.hex) ? o.hex : null }));
  if (options.length < 2) return undefined;
  // Mêmes exigences qu'une offre (lignes avec produit et quantité) : sinon rien à rechiffrer.
  if (!isChatOffer({ id: 'choix', lines: c.lines, totalHT: 0, totalTTC: 0 })) return undefined;
  if (!(c.lines as ChatOfferLine[]).some((l) => l.productDocumentId === c.productDocumentId)) return undefined;
  return {
    kind: 'color',
    productDocumentId: c.productDocumentId,
    productName: String(c.productName ?? ''),
    quantity: Math.floor(quantity),
    options,
    lines: c.lines as ChatOfferLine[],
  };
};

export const choiceRequest = (choice: ChatChoice, option: ChatChoiceOption): ChatChoiceRequest => ({
  productDocumentId: choice.productDocumentId,
  optionDocumentId: option.documentId,
  lines: choice.lines,
});
