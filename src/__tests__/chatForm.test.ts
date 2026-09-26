/**
 * @jest-environment jsdom
 */
import {
  CHAT_FORM_STORAGE_PREFIX,
  ChatFormChannel,
  answersForMessage,
  attachAskOf,
  isAssistantFilled,
  keepAssistantMetadata,
  parseChatFormTurn,
  readChatFormDraft,
  recapOfferOf,
} from '@/components/template/chat/chatForm';
import {
  isChatOffer,
  pendingFormAnswer,
  readChatPrefill,
  type ChatOffer,
} from '@/components/template/chatOffer';
import type {
  ChatFormAnswer,
  ChatFormDraft,
  ChatFormTurn,
} from '@/components/template/chat/chatFormTypes';

// Personnalisation guidée : ce que le widget accepte du serveur (et du
// stockage), le brouillon par conversation, le clic envoyé UNE fois.

const offer = {
  id: 'o1',
  lines: [
    {
      productDocumentId: 'polo1',
      productName: 'Polo brodé',
      quantity: 20,
      sizeName: 'M',
      totalHT: 240,
    },
    {
      productDocumentId: 'cap1',
      productName: 'Casquette',
      quantity: 10,
      totalHT: 80,
    },
  ],
  totalHT: 249.9,
  totalTTC: 299.88,
};

const draftOf = (over: Partial<ChatFormDraft> = {}): ChatFormDraft => ({
  v: 1,
  offer: { ...offer, lines: [offer.lines[0]] },
  productDocumentId: 'polo1',
  productName: 'Polo brodé',
  formDocumentId: 'form1',
  status: 'filling',
  values: { e1txt: 'ACME', e4tech: { broderie: true, serigraphie: false } },
  skipped: [],
  later: [],
  prefilled: [],
  contactsConfirmed: false,
  lastAsked: 'e2col',
  ...over,
});

const answer: ChatFormAnswer = {
  data: { e1txt: 'ACME', e8logo: [] },
  metadata: {
    source: 'assistant',
    filledAt: '2026-09-26T10:00:00.000Z',
    conversationId: 'conv-12345678',
  },
  state: 'submitted',
};

const recapTurn = (): ChatFormTurn => ({
  draft: draftOf({ status: 'review' }),
  recap: {
    productDocumentId: 'polo1',
    productName: 'Polo brodé',
    formDocumentId: 'form1',
    items: [
      {
        key: 'e1txt',
        label: 'Texte à broder',
        display: 'ACME',
        status: 'filled',
      },
      {
        key: 'e8logo',
        label: 'Votre logo',
        display: 'À envoyer depuis le panier',
        status: 'later',
      },
    ],
    answer,
  },
});

beforeEach(() => sessionStorage.clear());

describe('form reçu du serveur', () => {
  it('tour complet : brouillon, question aux options exactes, « Voir le récapitulatif »', () => {
    const t = parseChatFormTurn({
      draft: draftOf(),
      ask: {
        key: 'e2col',
        label: 'Couleur du fil',
        section: 'Marquage',
        kind: 'choice',
        optional: true,
        options: [
          { label: 'Or', value: 'or' },
          { label: 'Argent', value: 'argent' },
        ],
      },
      canFinish: true,
    });
    expect(t?.draft?.productDocumentId).toBe('polo1');
    expect(t?.ask?.options).toEqual([
      { label: 'Or', value: 'or' },
      { label: 'Argent', value: 'argent' },
    ]);
    expect(t?.canFinish).toBe(true);
  });

  it('corrompu → ignoré (aucun changement du brouillon)', () => {
    expect(parseChatFormTurn(null)).toBeNull();
    expect(parseChatFormTurn('form')).toBeNull();
    expect(parseChatFormTurn({ ask: { key: 'x' } })).toBeNull(); // pas de draft
    expect(parseChatFormTurn({ draft: { ...draftOf(), v: 2 } })).toBeNull();
    expect(
      parseChatFormTurn({ draft: { ...draftOf(), status: 'done' } })
    ).toBeNull();
    expect(
      parseChatFormTurn({ draft: { ...draftOf(), values: { a: 12 } } })
    ).toBeNull();
    expect(
      parseChatFormTurn({
        draft: { ...draftOf(), offer: { id: 'o1', lines: [] } },
      })
    ).toBeNull();
    // > 32 Ko : le serveur l'ignorerait, le widget ne le garde pas.
    expect(
      parseChatFormTurn({
        draft: draftOf({ values: { big: 'x'.repeat(40_000) } }),
      })
    ).toBeNull();
  });

  it('partie d’affichage mal formée écartée, le brouillon reste', () => {
    const t = parseChatFormTurn({
      draft: draftOf(),
      ask: { key: 'e2col', label: 'Couleur', kind: 'select' }, // type inconnu
      recap: {
        productDocumentId: 'polo1',
        productName: 'Polo',
        items: [],
        answer: { data: {}, metadata: {}, state: 'submitted' },
      },
      proposal: 'oui',
    });
    expect(t).toEqual({ draft: draftOf() });
  });

  it('choix sans option → question ignorée ; vignette de logo non https → retirée', () => {
    expect(
      parseChatFormTurn({
        draft: draftOf(),
        ask: { key: 'k', label: 'L', kind: 'choice', optional: false },
      })?.ask
    ).toBeUndefined();
    const t = parseChatFormTurn({
      draft: draftOf(),
      ask: {
        key: 'e8logo',
        label: 'Votre logo',
        kind: 'file',
        optional: false,
        logos: [
          {
            clientFileDocumentId: 'cf1',
            name: 'Logo 2025',
            thumbnailUrl: 'javascript:alert(1)',
            mime: 'image/png',
          },
          {
            clientFileDocumentId: 'cf2',
            name: 'Logo',
            thumbnailUrl: 'https://s3.amazonaws.com/t.png',
            mime: null,
          },
          { clientFileDocumentId: 'cf3', name: 'A' },
          { clientFileDocumentId: 'cf4', name: 'B' },
        ],
      },
    });
    expect(t?.ask?.logos?.map((l) => l.thumbnailUrl)).toEqual([
      null,
      'https://s3.amazonaws.com/t.png',
      null,
    ]);
  });

  it('draft: null = personnalisation terminée ou abandonnée', () => {
    expect(
      parseChatFormTurn({
        draft: null,
        ask: { key: 'x', label: 'X', kind: 'text', optional: true },
      })
    ).toEqual({ draft: null });
  });
});

describe('brouillon par conversation (sessionStorage)', () => {
  it('rangé sous peg_chat_form_v1:<conversationId>, relu, effacé sur draft: null', () => {
    const ch = new ChatFormChannel('c1');
    expect(ch.draft).toBeNull();
    expect(ch.accept({ draft: draftOf() })).toBeUndefined(); // rien à afficher
    expect(
      JSON.parse(sessionStorage.getItem(`${CHAT_FORM_STORAGE_PREFIX}c1`)!)
    ).toEqual(draftOf());
    expect(readChatFormDraft('c1')).toEqual(draftOf());
    expect(new ChatFormChannel('c1').draft).toEqual(draftOf()); // rechargement de la page
    ch.accept({ draft: null });
    expect(sessionStorage.getItem(`${CHAT_FORM_STORAGE_PREFIX}c1`)).toBeNull();
  });

  it('nouvelle conversation : aucun brouillon ; retour à l’ancienne : le sien', () => {
    const ch = new ChatFormChannel('c1');
    ch.accept({ draft: draftOf() });
    expect(ch.switchTo('c2')).toBe(true);
    expect(ch.draft).toBeNull();
    expect(ch.requestFields()).toEqual({ formDraft: null });
    ch.switchTo('c1');
    expect(ch.draft?.productDocumentId).toBe('polo1');
  });

  it('stockage illisible ou corrompu : aucun brouillon, sans erreur', () => {
    sessionStorage.setItem(`${CHAT_FORM_STORAGE_PREFIX}c9`, '{pas du json');
    expect(readChatFormDraft('c9')).toBeNull();
    sessionStorage.setItem(
      `${CHAT_FORM_STORAGE_PREFIX}c9`,
      JSON.stringify({ v: 1 })
    );
    expect(new ChatFormChannel('c9').draft).toBeNull();
    const spy = jest
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('bloqué');
      });
    expect(readChatFormDraft('c1')).toBeNull();
    spy.mockRestore();
  });

  it('tour à afficher renvoyé (proposition, question, récapitulatif) ; tour muet → undefined', () => {
    const ch = new ChatFormChannel('c1');
    expect(
      ch.accept({ draft: draftOf({ status: 'proposed' }), proposal: true })
    ).toEqual({ draft: draftOf({ status: 'proposed' }), proposal: true });
    expect(ch.accept({ draft: draftOf() })).toBeUndefined();
    expect(ch.accept({ draft: { broken: true } })).toBeUndefined();
    expect(ch.draft).toEqual(draftOf()); // tour corrompu : brouillon inchangé
  });
});

describe('requête : formDraft à chaque tour, formInput une seule fois', () => {
  it('le clic est consommé par la première requête', () => {
    const ch = new ChatFormChannel('c1');
    ch.accept({ draft: draftOf() });
    ch.queue({ kind: 'choice', key: 'e2col', value: 'or' });
    expect(ch.requestFields()).toEqual({
      formDraft: draftOf(),
      formInput: { kind: 'choice', key: 'e2col', value: 'or' },
    });
    expect(ch.requestFields()).toEqual({ formDraft: draftOf() });
  });

  it('clic non envoyé (requête en cours) : annulé, il ne part pas avec le message suivant', () => {
    const ch = new ChatFormChannel('c1');
    ch.queue({ kind: 'finish' });
    expect(ch.cancelQueued()).toBe(true);
    expect(ch.requestFields()).toEqual({ formDraft: null });
    expect(ch.cancelQueued()).toBe(false);
  });
});

describe('offre du récapitulatif et réponses par produit', () => {
  it('recapOffer : offre du brouillon limitée au produit, id <offre>-perso', () => {
    const o = recapOfferOf(recapTurn())!;
    expect(o.id).toBe('o1-perso');
    expect(o.lines.map((l) => l.productDocumentId)).toEqual(['polo1']);
    expect(isChatOffer(o)).toBe(true);
    expect(recapOfferOf({ draft: draftOf() })).toBeUndefined();
    expect(recapOfferOf(undefined)).toBeUndefined();
  });

  it('answersFor : la réponse du récapitulatif, pour le produit de l’offre du message', () => {
    const t = recapTurn();
    expect(answersForMessage({ form: t, offer: recapOfferOf(t) })).toEqual({
      polo1: answer,
    });
    // Offre d'un autre produit, pas d'offre, form corrompu : aucune réponse.
    expect(
      answersForMessage({
        form: t,
        offer: { id: 'x', lines: [offer.lines[1]], totalHT: 1, totalTTC: 1 },
      })
    ).toBeUndefined();
    expect(answersForMessage({ form: t })).toBeUndefined();
    expect(
      answersForMessage({ form: { recap: t.recap }, offer: recapOfferOf(t) })
    ).toBeUndefined();
  });

  it('brouillon terminé quand l’offre d’origine entre au panier, ou quand le récapitulatif est pris en charge', () => {
    const ch = new ChatFormChannel('c1');
    ch.accept({ draft: draftOf() });
    const original = offer as ChatOffer;
    expect(
      ch.offerChanged({
        ...original,
        status: 'completing',
        pendingIds: ['cap1'],
      })
    ).toBe(false); // tailles à répartir : la fiche s'ouvre
    expect(
      ch.offerChanged({
        id: 'autre',
        lines: offer.lines,
        totalHT: 1,
        totalTTC: 1,
        status: 'added',
      })
    ).toBe(false);
    expect(ch.draft).not.toBeNull();
    expect(ch.offerChanged({ ...original, status: 'added' })).toBe(true);
    expect(ch.draft).toBeNull();
    ch.accept({ draft: draftOf({ status: 'review' }) });
    expect(
      ch.offerChanged({
        ...recapOfferOf(recapTurn())!,
        status: 'completing',
        pendingIds: ['polo1'],
      })
    ).toBe(true); // « Modifier »
    expect(ch.draft).toBeNull();
    expect(sessionStorage.getItem(`${CHAT_FORM_STORAGE_PREFIX}c1`)).toBeNull();
  });

  it('trombone : seulement si le DERNIER message demande un fichier et qu’un brouillon existe', () => {
    const fileTurn = {
      draft: draftOf(),
      ask: {
        key: 'e8logo',
        label: 'Votre logo',
        kind: 'file',
        optional: false,
        accept: '.png',
      },
    };
    const msgs = [{ role: 'user' }, { role: 'assistant', form: fileTurn }];
    expect(attachAskOf(msgs, draftOf())?.key).toBe('e8logo');
    expect(attachAskOf(msgs, null)).toBeNull();
    expect(attachAskOf([...msgs, { role: 'user' }], draftOf())).toBeNull();
    expect(
      attachAskOf(
        [{ role: 'assistant', error: true, form: fileTurn }],
        draftOf()
      )
    ).toBeNull();
    expect(
      attachAskOf(
        [
          {
            role: 'assistant',
            form: { ...fileTurn, ask: { ...fileTurn.ask, kind: 'text' } },
          },
        ],
        draftOf()
      )
    ).toBeNull();
  });
});

describe('trace « Rempli avec l’assistant »', () => {
  it('source assistant ET filledAt ; la réponse « en attente » d’une offre ajoutée telle quelle ne compte pas', () => {
    expect(isAssistantFilled(answer)).toBe(true);
    expect(isAssistantFilled(JSON.stringify(answer))).toBe(true);
    const pending = pendingFormAnswer({
      form: { documentId: 'f', fields: [] },
    } as never) as { answer: unknown };
    expect(isAssistantFilled(pending.answer)).toBe(false);
    expect(
      isAssistantFilled({ data: {}, metadata: {}, state: 'submitted' })
    ).toBe(false);
    expect(isAssistantFilled(null)).toBe(false);
    expect(isAssistantFilled('{')).toBe(false);
  });

  it('pop-up du panier : la trace de l’assistant est conservée dans la nouvelle soumission', () => {
    const submission = {
      data: { e8logo: [{ url: 'https://s3.amazonaws.com/l.png' }] },
      metadata: {},
      state: 'submitted',
    };
    const kept = keepAssistantMetadata(submission, {
      form: {},
      answer: { ...answer, state: 'pending' },
    });
    expect(kept).toEqual({
      ...submission,
      metadata: {
        source: 'assistant',
        filledAt: answer.metadata.filledAt,
        conversationId: 'conv-12345678',
      },
    });
    expect(isAssistantFilled(kept)).toBe(true);
    // Ligne « en attente » ajoutée sans personnalisation : source seule, pas de filledAt.
    expect(
      keepAssistantMetadata(
        submission,
        pendingFormAnswer({ form: { documentId: 'f', fields: [] } } as never)
      ).metadata
    ).toEqual({ source: 'assistant' });
    // Réponse remplie sur la fiche : rien à conserver.
    expect(
      keepAssistantMetadata(submission, {
        answer: { data: {}, metadata: {}, state: 'submitted' },
      })
    ).toBe(submission);
    expect(keepAssistantMetadata(submission, null)).toBe(submission);
  });
});

describe('fiche produit : réponse du chat relue de la navigation', () => {
  const base = { offerId: 'o1-perso', quantity: 20, lines: [offer.lines[0]] };
  it('réponse valide conservée avec openForm ; réponse mal formée écartée', () => {
    expect(
      readChatPrefill({ chatOffer: { ...base, answer, openForm: true } })
    ).toEqual({ ...base, answer, openForm: true });
    expect(
      readChatPrefill({
        chatOffer: { ...base, answer: { data: 'x', state: 'submitted' } },
      })?.answer
    ).toBeUndefined();
    expect(
      readChatPrefill({
        chatOffer: { ...base, answer: { data: {}, state: 'fini' } },
      })?.answer
    ).toBeUndefined();
    expect(readChatPrefill({ chatOffer: { ...base, quantity: 0 } })).toBeNull();
    expect(readChatPrefill(null)).toBeNull();
  });
});
