/**
 * @jest-environment jsdom
 *
 * Tests unitaires — défense XSS (sanitizeHtml.safeHtmlParse).
 *
 * SÉCURITÉ : ce helper doit être utilisé partout à la place d'un parseur HTML
 * brut. Il passe le HTML dans DOMPurify AVANT rendu → tout script, gestionnaire
 * d'événement inline ou URL javascript: doit disparaître, tandis que le balisage
 * légitime (gras, liens, listes) est préservé.
 *
 * Nécessite un DOM → environnement jsdom (docblock ci-dessus). DOMPurify
 * s'appuie sur `window`, fourni par jsdom.
 */

import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { safeHtmlParse } from '@/utils/sanitizeHtml';

// Rend le résultat (nœuds React) en HTML statique pour inspection.
const render = (html: string): string =>
  renderToStaticMarkup(
    React.createElement(React.Fragment, null, safeHtmlParse(html))
  );

describe('safeHtmlParse — neutralise les vecteurs XSS', () => {
  test('supprime les balises <script> mais garde le texte légitime', () => {
    const out = render('<script>alert("xss")</script><p>Bonjour</p>');
    expect(out).toContain('Bonjour');
    expect(out).not.toContain('<script');
    expect(out).not.toContain('alert(');
  });

  test('retire les gestionnaires d\'événement inline (onerror, onclick)', () => {
    const out = render('<img src="x" onerror="alert(1)">');
    expect(out).toContain('<img');
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('alert(1)');
  });

  test('neutralise les URL javascript: dans les liens', () => {
    const out = render('<a href="javascript:alert(1)">clic</a>');
    expect(out).toContain('clic');
    expect(out).not.toContain('javascript:');
  });

  test('supprime une balise <iframe> injectée', () => {
    const out = render('<iframe src="https://evil.example"></iframe><span>ok</span>');
    expect(out).not.toContain('<iframe');
    expect(out).toContain('ok');
  });
});

describe('safeHtmlParse — préserve le contenu légitime', () => {
  test('conserve le formatage de base', () => {
    const out = render('<b>gras</b> et <i>italique</i>');
    expect(out).toContain('<b>gras</b>');
    expect(out).toContain('<i>italique</i>');
  });

  test('conserve un lien http légitime', () => {
    const out = render('<a href="https://mypeg.fr">site</a>');
    expect(out).toContain('href="https://mypeg.fr"');
    expect(out).toContain('site');
  });

  test('laisse passer le texte simple', () => {
    expect(render('juste du texte')).toContain('juste du texte');
  });

  test('chaîne vide → rendu vide', () => {
    expect(render('')).toBe('');
  });
});
