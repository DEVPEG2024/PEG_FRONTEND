import { renderToStaticMarkup } from 'react-dom/server';
import { renderChatMarkdown } from '@/utils/chatMarkdown';

// Rendu des réponses du chatbot (widget client + aperçu/historique admin).
// Le texte vient d'un LLM alimenté par des données saisies par des clients :
// il ne doit JAMAIS produire de HTML actif.
const html = (md: string) => renderToStaticMarkup(<div>{renderChatMarkdown(md)}</div>);

describe('renderChatMarkdown', () => {
  it('échappe le HTML brut (pas d’injection)', () => {
    const out = html('<img src=x onerror="alert(1)"> <script>alert(2)</script>');
    expect(out).not.toContain('<img');
    expect(out).not.toContain('<script');
    expect(out).toContain('&lt;script&gt;');
  });

  it('ne fait des liens que pour http(s)', () => {
    const out = html('[ok](https://app.mypeg.fr/customer/cart) [ko](javascript:alert(1))');
    expect(out).toContain('href="https://app.mypeg.fr/customer/cart"');
    expect(out).not.toContain('href="javascript:');
  });

  it('rend gras, italique et code', () => {
    const out = html('**Total HT : 1 004,40 €** et *indicatif* et `FAC-0212`');
    expect(out).toContain('<strong');
    expect(out).toContain('Total HT : 1 004,40 €');
    expect(out).toContain('<em');
    expect(out).toContain('<code');
  });

  it('n’italique pas les noms_de_fichier', () => {
    const out = html('Envoyez logo_final_v2.png');
    expect(out).not.toContain('<em');
    expect(out).toContain('logo_final_v2.png');
  });

  it('rend les listes à puces et numérotées', () => {
    const out = html('- Veste softshell FM\n- Casquette\n\n1. Choisir\n2. Commander');
    expect(out).toContain('<ul');
    expect(out.match(/<li/g)?.length).toBe(4);
    expect(out).toContain('<ol');
  });

  it('rend les tableaux markdown (sortie fréquente de gpt-oss)', () => {
    const out = html('| Numéro | Montant |\n|---|---|\n| FAC-0212 | 990,00 € |\n| FAC-0230 | 460,50 € |');
    expect(out).toContain('<table');
    expect(out.match(/<tr/g)?.length).toBe(3);
    expect(out).toContain('FAC-0230');
    expect(out).not.toContain('|---|');
  });

  it('rend les titres sans les dièses', () => {
    const out = html('### Votre offre');
    expect(out).toContain('Votre offre');
    expect(out).not.toContain('###');
  });

  describe('cartes', () => {
    const card = {
      url: 'https://app.mypeg.fr/customer/product/abc',
      kind: 'produit' as const,
      title: 'Casquette brodée',
      subtitle: 'Textile',
      image: 'https://cdn.example.com/c.jpg',
      badge: { label: 'En production', tone: 'blue' as const },
      meta: 'Dès 8,50 € HT',
    };
    const withCards = (md: string, cards = [card]) =>
      renderToStaticMarkup(<div>{renderChatMarkdown(md, { cards })}</div>);

    it('rend en carte un lien connu seul sur sa ligne (y compris en puce ou en gras)', () => {
      for (const md of [`[Casquette](${card.url})`, `- [Casquette](${card.url})`, `**[Casquette](${card.url})**`]) {
        const out = withCards(`Voici :\n${md}`);
        expect(out).toContain('Dès 8,50 € HT');
        expect(out).toContain('En production');
        expect(out).toContain('src="https://cdn.example.com/c.jpg"');
      }
    });

    it('rend en carte un lien suivi d’un complément, et garde le complément', () => {
      const out = withCards(`[Casquette](${card.url}) – en blanc et noir`);
      expect(out).toContain('Dès 8,50 € HT');
      expect(out).toContain('en blanc et noir');
    });

    it('laisse un simple lien si le lien est dans une phrase ou inconnu', () => {
      expect(withCards(`Voir [Casquette](${card.url}) ici`)).not.toContain('Dès 8,50');
      expect(withCards('[Autre](https://app.mypeg.fr/customer/product/zzz)')).not.toContain('Dès 8,50');
    });

    it("n'affiche ni lien ni image non http(s)", () => {
      const bad = { ...card, url: 'javascript:alert(1)', image: 'javascript:alert(2)' };
      const out = withCards('[x](javascript:alert(1))', [bad]);
      expect(out).not.toContain('href="javascript:');
      expect(out).not.toContain('src="javascript:');
    });
  });
});
