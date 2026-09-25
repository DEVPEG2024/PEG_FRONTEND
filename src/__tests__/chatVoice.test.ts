import { SentenceSplitter, speakableText, worthTranscribing, type RecordingResult } from '@/components/template/chatVoice';

// Chat client à la voix (25/09/2026) : ce qui est LU à voix haute, et quand
// l'enregistrement mérite d'être transcrit.

const feed = (chunks: string[]) => {
  const s = new SentenceSplitter();
  const out: string[] = [];
  chunks.forEach((c) => out.push(...s.push(c)));
  out.push(...s.flush());
  return out;
};

describe('speakableText — la réponse telle qu’elle est prononcée', () => {
  it('lit le nom du lien, jamais l’adresse', () => {
    expect(speakableText('[Sweat brodé](/customer/product/abc123)')).toBe('Sweat brodé');
    expect(speakableText('Voir https://app.mypeg.fr/customer/cart ou /customer/invoices')).toBe('Voir ou');
  });

  it('retire emphase, titres, puces et emojis', () => {
    expect(speakableText('**Total : 249 € TTC** 🎉')).toBe('Total : 249 euros TTC');
    expect(speakableText('## Vos commandes\n- Casquette *brodée*\n2. Tote bag')).toBe('Vos commandes Casquette brodée Tote bag');
  });

  it('garde les dates intactes', () => {
    expect(speakableText('Livraison le 02/10, 10 pièces.')).toBe('Livraison le 02/10, 10 pièces.');
  });
});

describe('SentenceSplitter — lecture au fil du flux', () => {
  it('rend chaque phrase dès qu’elle est complète', () => {
    const s = new SentenceSplitter();
    expect(s.push('Bonjour Léa ! Votre commande')).toEqual(['Bonjour Léa !']);
    expect(s.push(' est en production. Livraison')).toEqual(['Votre commande est en production.']);
    expect(s.flush()).toEqual(['Livraison']);
  });

  it('attend la suite quand la ponctuation arrive en fin de morceau', () => {
    const s = new SentenceSplitter();
    expect(s.push('Total : 24.')).toEqual([]);
    expect(s.push('90 € TTC. Merci')).toEqual(['Total : 24 euros 90 TTC.']);
  });

  it('coupe à chaque ligne : une carte produit est lue par son nom', () => {
    expect(feed(['Voici ce qu’il vous faut :\n[Bonnet', ' noir](/customer/product/x1)\n', 'Prix : 8 € HT.'])).toEqual([
      'Voici ce qu’il vous faut :',
      'Bonnet noir',
      'Prix : 9 euros 60 TTC.',
    ]);
  });

  it('ne coupe ni dans le texte d’un lien, ni après « 1. » ou « M. »', () => {
    expect(feed(['[Sweat. Édition limitée](/customer/product/y) disponible.'])).toEqual(['Sweat. Édition limitée disponible.']);
    expect(feed(['1. Casquette brodée\n2. Tote bag'])).toEqual(['Casquette brodée', 'Tote bag']);
    expect(feed(['Taille M. Couleur noire.'])).toEqual(['Taille M. Couleur noire.']);
  });

  it('ignore les lignes sans mots (séparateurs, emojis seuls)', () => {
    expect(feed(['---\n👍\nOK.'])).toEqual(['OK.']);
  });

  it('découpe une phrase interminable sans ponctuation', () => {
    const long = Array.from({ length: 60 }, (_, i) => `mot${i}`).join(' ');
    const out = feed([long]);
    expect(out.length).toBeGreaterThan(1);
    expect(out.every((p) => p.length <= 220)).toBe(true);
    expect(out.join(' ')).toBe(long);
  });
});

describe('worthTranscribing — jamais de silence envoyé à la transcription', () => {
  const rec = (over: Partial<RecordingResult>): RecordingResult => ({
    blob: new Blob([new Uint8Array(20_000)]), mime: 'audio/webm', speech: true, analyserAlive: true, durationMs: 3_000, ...over,
  });
  it('voix détectée → transcrite', () => expect(worthTranscribing(rec({}))).toBe(true));
  it('micro vivant mais personne n’a parlé → rien n’est envoyé', () => expect(worthTranscribing(rec({ speech: false }))).toBe(false));
  it('analyseur muet (iPhone) : la taille décide', () => {
    expect(worthTranscribing(rec({ analyserAlive: false, speech: false }))).toBe(true);
    expect(worthTranscribing(rec({ analyserAlive: false, speech: false, blob: new Blob([new Uint8Array(5_000)]) }))).toBe(false);
  });
  it('un simple clic → rien', () => expect(worthTranscribing(rec({ durationMs: 200 }))).toBe(false));
});

// Demande du 25/09/2026 : « la voix ne doit pas parler anglais, elle doit annoncer
// seulement le prix TTC ». Le texte AFFICHÉ, lui, ne change pas.
describe('ce que dit la voix : prix TTC seulement', () => {
  it('offre « X € HT (Y € TTC) » → seul le TTC est annoncé', () => {
    expect(speakableText('Total : 89 € HT (106,80 € TTC), livraison incluse.')).toBe('Total : 106 euros 80 TTC, livraison incluse.');
    expect(speakableText('**Total : 1 234,50 € HT (1 481,40 € TTC)**')).toBe('Total : 1481 euros 40 TTC');
    expect(speakableText('Total : 106,80 € TTC (89 € HT).')).toBe('Total : 106 euros 80 TTC.');
    expect(speakableText('89 € HT, soit 106,80 € TTC.')).toBe('106 euros 80 TTC.');
  });

  it('prix donné en HT seul → converti en TTC avec la règle du panier (TVA 20 %)', () => {
    expect(speakableText('Prix bref : dès 8,50 € HT la pièce.')).toBe('Prix bref : dès 10 euros 20 TTC la pièce.');
    expect(speakableText('Livraison 9,90 € HT.')).toBe('Livraison 11 euros 88 TTC.');
    expect(speakableText('Premium : 250 € HT/mois.')).toBe('Premium : 300 euros TTC par mois.');
    expect(speakableText('Total HT : 89 €.')).toBe('Total : 106 euros 80 TTC.');
    expect(speakableText('Bâche : 18 € HT/m².')).toBe('Bâche : 21 euros 60 TTC le mètre carré.');
  });

  it('montant déjà TTC (factures, sommes dues) : annoncé tel quel', () => {
    expect(speakableText('Reste à payer : 240 € TTC.')).toBe('Reste à payer : 240 euros TTC.');
    expect(speakableText('Total TTC : 0,50 €')).toBe('Total : 50 centimes TTC');
    expect(speakableText('1 € TTC')).toBe('1 euro TTC');
  });

  it('ne touche ni aux quantités, ni aux dates, ni aux décimales à point', () => {
    expect(speakableText('10 pièces, livraison le 02/10.')).toBe('10 pièces, livraison le 02/10.');
    expect(speakableText('8.50 € HT')).toBe('10 euros 20 TTC');
  });
});

describe('ce que dit la voix : en français', () => {
  it('couleurs anglaises du catalogue dites en français', () => {
    expect(speakableText('[Hoodie BLACK](https://app.mypeg.fr/customer/product/h1)')).toBe('Hoodie noir');
    expect(speakableText('Sweat HEATHER GREY, taille M.')).toBe('Sweat gris chiné, taille M.');
    expect(speakableText('Polo Navy Blue ou Royal Blue')).toBe('Polo bleu marine ou bleu roi');
  });

  it('mots en MAJUSCULES lus comme des mots ; sigles et tailles préservés', () => {
    expect(speakableText('BONNET BRODÉ : BAT à valider, facture FAC-0012 en PDF, taille XXL.')).toBe('bonnet brodé : BAT à valider, facture FAC-0012 en PDF, taille XXL.');
  });
});
