import type { Product } from '@/@types/product';
import {
  describeLines,
  formRequiresInput,
  prefillForProduct,
  selectionForLines,
  isChatOffer,
  missingSteps,
  pendingFormAnswer,
  personalizationStatus,
  readChatPrefill,
  selectionForLine,
  type ChatOfferLine,
} from '@/components/template/chatOffer';

// Offre de l'assistant → ligne de panier : la sélection doit être STRICTEMENT
// celle que produirait la fiche produit (SizeAndColorsChoice), sinon le panier
// et le paiement divergent.

const opt = (id: string, name: string) => ({ documentId: id, name, value: name.toUpperCase(), description: '' });

const product = (over: Partial<Product> = {}): Product =>
  ({
    documentId: 'p1',
    name: 'Produit',
    sizes: [],
    colors: [],
    priceTiers: [{ minQuantity: 1, price: 10 }],
    pricingMode: 'tiers',
    ...over,
  }) as unknown as Product;

const line = (over: Partial<ChatOfferLine> = {}): ChatOfferLine => ({
  productDocumentId: 'p1',
  productName: 'Produit',
  quantity: 2,
  totalHT: 20,
  ...over,
});

describe('selectionForLine', () => {
  it('produit sans taille ni couleur (oriflamme) : choix DEFAULT, comme la fiche', () => {
    const sel = selectionForLine(product(), line());
    expect(sel).toHaveLength(1);
    expect(sel![0].size.value).toBe('DEFAULT');
    expect(sel![0].color.value).toBe('DEFAULT');
    expect(sel![0].quantity).toBe(2);
  });

  it('taille et couleur précisées par le client : reprises du produit', () => {
    const p = product({ sizes: [opt('s', 'S'), opt('m', 'M')] as never, colors: [opt('b', 'Blanc'), opt('n', 'Noir')] as never });
    const sel = selectionForLine(p, line({ sizeDocumentId: 'm', colorDocumentId: 'b' }));
    expect(sel![0].size.name).toBe('M');
    expect(sel![0].color.name).toBe('Blanc');
  });

  it('une seule taille / couleur possible : choisie automatiquement', () => {
    const p = product({ sizes: [opt('u', 'Unique')] as never, colors: [opt('r', 'Rouge')] as never });
    expect(selectionForLine(p, line())![0].size.name).toBe('Unique');
  });

  it('plusieurs tailles sans précision : au client de répartir (null)', () => {
    const p = product({ sizes: [opt('s', 'S'), opt('m', 'M')] as never });
    expect(selectionForLine(p, line())).toBeNull();
  });

  it('m² : dimensions obligatoires, reprises en mètres', () => {
    const p = product({ pricingMode: 'm2', pricePerM2: 20 } as never);
    expect(selectionForLine(p, line())).toBeNull();
    const sel = selectionForLine(p, line({ width: 2, height: 0.8 }));
    expect(sel![0]).toMatchObject({ width: 2, height: 0.8, quantity: 2 });
  });
});

describe('missingSteps', () => {
  it('rien à faire → ligne prête pour le panier', () => {
    const p = product();
    expect(missingSteps(p, line(), selectionForLine(p, line()))).toEqual([]);
  });

  it('formulaire de personnalisation : ne bloque PAS l’ajout (complété depuis le panier)', () => {
    const p = product({ form: { documentId: 'f' } as never });
    expect(missingSteps(p, line(), selectionForLine(p, line()))).toEqual([]);
  });

  it('tailles à répartir + couleur connue', () => {
    const p = product({ sizes: [opt('s', 'S'), opt('m', 'M')] as never, colors: [opt('b', 'Blanc'), opt('n', 'Noir')] as never });
    const l = line({ colorDocumentId: 'b' });
    expect(missingSteps(p, l, selectionForLine(p, l))).toEqual(['les tailles']);
  });
});

describe('validation des données reçues', () => {
  it('isChatOffer refuse une offre vide ou malformée', () => {
    expect(isChatOffer({ id: 'o', lines: [line()], totalHT: 1, totalTTC: 1 })).toBe(true);
    expect(isChatOffer({ id: 'o', lines: [] })).toBe(false);
    expect(isChatOffer({ id: 'o', lines: [{ quantity: 1 }] })).toBe(false);
    expect(isChatOffer(null)).toBe(false);
  });

  it('readChatPrefill ignore un state de navigation étranger', () => {
    expect(readChatPrefill(null)).toBeNull();
    expect(readChatPrefill({ from: '/home' })).toBeNull();
    expect(readChatPrefill({ chatOffer: { offerId: 'o', quantity: 3, lines: [line({ quantity: 3 })] } })?.quantity).toBe(3);
    expect(readChatPrefill({ chatOffer: { offerId: 'o', quantity: 3, lines: [] } })).toBeNull();
  });
});

describe('personnalisation différée (panier)', () => {
  const optionalForm = { documentId: 'f1', fields: JSON.stringify([{ type: 'file', label: 'Logo', input: true }]) };
  const requiredForm = { documentId: 'f2', fields: [{ type: 'panel', components: [{ type: 'file', label: 'Logo', input: true, validate: { required: true } }] }] };

  it('formRequiresInput lit les champs obligatoires (chaîne JSON, imbrication, { components })', () => {
    expect(formRequiresInput(optionalForm.fields)).toBe(false);
    expect(formRequiresInput(requiredForm.fields)).toBe(true);
    expect(formRequiresInput({ components: [{ type: 'textfield', required: true }] })).toBe(true);
    expect(formRequiresInput('pas du json')).toBe(false);
    expect(formRequiresInput(undefined)).toBe(false);
  });

  it('personalizationStatus : sans formulaire / à compléter (facultatif ou requis) / fait', () => {
    expect(personalizationStatus({ product: product(), formAnswer: null } as never)).toBe('none');
    const pOpt = product({ form: optionalForm as never });
    const pReq = product({ form: requiredForm as never });
    expect(personalizationStatus({ product: pOpt, formAnswer: pendingFormAnswer(pOpt) } as never)).toBe('optional');
    expect(personalizationStatus({ product: pReq, formAnswer: pendingFormAnswer(pReq) } as never)).toBe('required');
    const done = { form: requiredForm, answer: { data: { logo: 'x' }, metadata: {}, state: 'submitted' } };
    expect(personalizationStatus({ product: pReq, formAnswer: done } as never)).toBe('done');
  });

  it('pendingFormAnswer : valide pour apiCreateFormAnswer (form.documentId + answer)', () => {
    const p = product({ form: optionalForm as never });
    const fa = pendingFormAnswer(p) as { form: { documentId: string }; answer: { state: string } };
    expect(fa.form.documentId).toBe('f1');
    expect(fa.answer.state).toBe('pending');
    expect(pendingFormAnswer(product())).toBeNull();
  });
});

describe('répartition et pré-remplissage de la fiche', () => {
  const tshirt = product({ sizes: [opt('s', 'S'), opt('m', 'M'), opt('l', 'L')] as never, colors: [opt('b', 'Blanc'), opt('n', 'Noir')] as never });

  it('« 5 M et 5 L » en blanc → deux entrées, comme la fiche', () => {
    const sel = selectionForLines(tshirt, [
      line({ quantity: 5, sizeDocumentId: 'm', colorDocumentId: 'b' }),
      line({ quantity: 5, sizeDocumentId: 'l', colorDocumentId: 'b' }),
    ]);
    expect(sel).toHaveLength(2);
    expect(sel!.map((x) => `${x.quantity} ${x.size.name} ${x.color.name}`)).toEqual(['5 M Blanc', '5 L Blanc']);
  });

  it('même taille et couleur citées deux fois → quantités additionnées', () => {
    const sel = selectionForLines(tshirt, [
      line({ quantity: 3, sizeDocumentId: 'm', colorDocumentId: 'n' }),
      line({ quantity: 2, sizeDocumentId: 'm', colorDocumentId: 'n' }),
    ]);
    expect(sel).toEqual([expect.objectContaining({ quantity: 5 })]);
  });

  it('une taille manquante dans la répartition → rien d’imposé (au client de répartir)', () => {
    expect(selectionForLines(tshirt, [line({ quantity: 5, sizeDocumentId: 'm', colorDocumentId: 'b' }), line({ quantity: 5, colorDocumentId: 'b' })])).toBeNull();
  });

  it('prefillForProduct : lignes du produit et quantité totale ; describeLines lisible', () => {
    const offer = { id: 'o', totalHT: 1, totalTTC: 1, lines: [
      line({ productDocumentId: 'p1', quantity: 5, sizeName: 'M', colorName: 'Blanc' }),
      line({ productDocumentId: 'autre', quantity: 2 }),
      line({ productDocumentId: 'p1', quantity: 5, sizeName: 'L', colorName: 'Blanc' }),
    ] };
    const prefill = prefillForProduct(offer, 'p1')!;
    expect(prefill.quantity).toBe(10);
    expect(prefill.lines).toHaveLength(2);
    expect(describeLines(prefill.lines)).toBe('5 M Blanc, 5 L Blanc');
    expect(describeLines([line({ colorName: 'NOIR' })])).toBe('NOIR');
    expect(prefillForProduct(offer, 'absent')).toBeNull();
  });
});

describe('Bonnet réel : taille unique, NOIR et HEATHER GREY au même code #000000', () => {
  const tu = { documentId: 's199', name: 'Taille unique', value: 'Taille unique', description: '' };
  const colors = [
    { documentId: 'c67', name: 'NOIR', value: '#000000', description: '' },
    { documentId: 'c68', name: 'BLANC', value: '#ffffff', description: '' },
    { documentId: 'c173', name: 'HEATHER GREY', value: '#000000', description: '' },
  ];
  const bonnet = product({ sizes: [tu] as never, colors: colors as never, form: { documentId: 'f44' } as never });

  it('« 10 bonnets noirs » → Taille unique (seule taille) + NOIR, quantité 10', () => {
    const sel = selectionForLines(bonnet, [line({ quantity: 10, colorDocumentId: 'c67', colorName: 'NOIR' })]);
    expect(sel).toEqual([expect.objectContaining({ quantity: 10, size: expect.objectContaining({ name: 'Taille unique' }), color: expect.objectContaining({ name: 'NOIR' }) })]);
  });

  it('fiche chargée SANS documentId (ancienne requête) : couleur retrouvée par son nom', () => {
    const legacy = product({
      sizes: [{ name: 'Taille unique', value: 'Taille unique' }] as never,
      colors: colors.map(({ name, value }) => ({ name, value })) as never,
    });
    const sel = selectionForLines(legacy, [line({ quantity: 10, colorDocumentId: 'c67', colorName: 'NOIR' })]);
    expect(sel?.[0].color.name).toBe('NOIR');
    expect(sel?.[0].size.name).toBe('Taille unique');
  });

  it('5 noirs + 5 heather grey → deux entrées distinctes (même code hex)', () => {
    const sel = selectionForLines(bonnet, [
      line({ quantity: 5, colorDocumentId: 'c67', colorName: 'NOIR' }),
      line({ quantity: 5, colorDocumentId: 'c173', colorName: 'HEATHER GREY' }),
    ]);
    expect(sel).toHaveLength(2);
  });
});
