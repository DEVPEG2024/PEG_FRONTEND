import type { ChatOfferLine } from '@/components/template/chatOffer';

/**
 * Personnalisation guidée par l'assistant — format FILAIRE échangé avec le
 * serveur (identique à peg_strapi src/services/chat-form-text.ts).
 *
 * Le brouillon vit dans le navigateur (sessionStorage `peg_chat_form_v1:<conversationId>`),
 * repart à chaque tour et est REVALIDÉ par le serveur : il n'est jamais cru sur parole.
 * Les valeurs sont au format de la fiche produit (WizardShowForm) : la commande
 * s'affiche comme toutes les autres.
 */

export type ChatFormFileValue = {
  storage: 'url';
  name: string;
  originalName: string;
  url: string;
  size: number /* octets */;
  type: string;
};

export type ChatFormValue =
  | string
  | boolean
  | Record<string, boolean>
  | ChatFormFileValue[];

/** Offre du brouillon : lignes de CE produit (ChatOfferLine de chatOffer.ts). */
export type ChatOfferSnapshot = {
  id: string;
  lines: ChatOfferLine[];
  totalHT: number;
  totalTTC: number;
};

export type ChatFormDraft = {
  v: 1;
  /** Lignes de l'offre POUR CE PRODUIT (prix d'affichage du récapitulatif). */
  offer: ChatOfferSnapshot;
  productDocumentId: string;
  productName: string;
  formDocumentId: string | null;
  status: 'proposed' | 'filling' | 'review';
  /** Clés = c.id ?? c.key (comme WizardShowForm), valeurs au format WizardShowForm. */
  values: Record<string, ChatFormValue>;
  /** Champs facultatifs « passés ». */
  skipped: string[];
  /** Champs fichier « je l'enverrai plus tard ». */
  later: string[];
  /** Champs remplis depuis la fiche client (coordonnées). */
  prefilled: string[];
  contactsConfirmed: boolean;
  /** Clé | '__contacts__' | '__proposal__' | '__open__'. */
  lastAsked: string | null;
};

export type ChatFormInput =
  | { kind: 'proposal'; accept: boolean }
  /** Valeur(s) d'option EXACTES. */
  | { kind: 'choice'; key: string; value: string | string[] }
  /** Téléversés par 📎 (apiUploadFile). */
  | { kind: 'file'; key: string; files: ChatFormFileValue[] }
  /** Fichier « Mes fichiers » visible par le client. */
  | { kind: 'logo'; key: string; clientFileDocumentId: string }
  | { kind: 'later'; key: string }
  | { kind: 'skip'; key: string }
  | { kind: 'contacts'; confirm: boolean }
  /** « Voir le récapitulatif ». */
  | { kind: 'finish' };

export type ChatFormAskKind =
  | 'text'
  | 'textarea'
  | 'choice'
  | 'multichoice'
  | 'boolean'
  | 'email'
  | 'url'
  | 'phone'
  | 'number'
  | 'date'
  | 'datetime'
  | 'file';

export type ChatFormLogo = {
  clientFileDocumentId: string;
  name: string;
  thumbnailUrl: string | null;
  mime: string | null;
};

export type ChatFormAsk = {
  key: string;
  label: string;
  section: string | null;
  kind: ChatFormAskKind;
  options?: { label: string; value: string }[];
  optional: boolean;
  accept?: string | null;
  multiple?: boolean;
  /** 3 au plus. */
  logos?: ChatFormLogo[];
};

export type ChatFormAnswer = {
  data: Record<string, unknown>;
  metadata: {
    source: 'assistant';
    filledAt: string;
    conversationId?: string | null;
  };
  /** 'pending' si au moins un fichier « plus tard ». */
  state: 'submitted' | 'pending';
};

export type ChatFormRecap = {
  productDocumentId: string;
  productName: string;
  formDocumentId: string | null;
  items: {
    key: string;
    label: string;
    display: string;
    status: 'filled' | 'skipped' | 'later';
  }[];
  answer: ChatFormAnswer;
};

/** `done.form` / réponse JSON `form`. Absent ou null = aucun changement du brouillon. */
export type ChatFormTurn = {
  /** null = brouillon terminé/abandonné → le widget l'efface. */
  draft: ChatFormDraft | null;
  /** Rapide : boutons « Oui, remplissons-la » / « Plus tard ». */
  proposal?: boolean;
  /** À confirmer : « C'est bon » / « Modifier ». */
  contacts?: { label: string; value: string }[] | null;
  /** Prochain champ (boutons, 📎, logos, « Passer »). */
  ask?: ChatFormAsk | null;
  /** Bouton « Voir le récapitulatif ». */
  canFinish?: boolean;
  /** Statut 'review'. */
  recap?: ChatFormRecap | null;
};
