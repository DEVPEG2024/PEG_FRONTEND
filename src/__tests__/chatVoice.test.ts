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
    expect(speakableText('**Total : 249 € HT** 🎉')).toBe('Total : 249 € HT');
    expect(speakableText('## Vos commandes\n- Casquette *brodée*\n2. Tote bag')).toBe('Vos commandes Casquette brodée Tote bag');
  });

  it('garde les montants et les dates intacts', () => {
    expect(speakableText('Prix : 24,90 € HT, livraison le 02/10.')).toBe('Prix : 24,90 € HT, livraison le 02/10.');
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
    expect(s.push('90 € HT. Merci')).toEqual(['Total : 24.90 € HT.']);
  });

  it('coupe à chaque ligne : une carte produit est lue par son nom', () => {
    expect(feed(['Voici ce qu’il vous faut :\n[Bonnet', ' noir](/customer/product/x1)\n', 'Prix : 8 € HT.'])).toEqual([
      'Voici ce qu’il vous faut :',
      'Bonnet noir',
      'Prix : 8 € HT.',
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
