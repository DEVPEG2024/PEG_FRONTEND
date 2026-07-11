/**
 * @jest-environment jsdom
 *
 * Tests — ErrorBoundary (composant critique pour le lancement).
 *
 * Rôle : empêcher l'écran blanc si un composant plante en prod. On vérifie
 * qu'un enfant qui lève une erreur déclenche le repli (fallback) au lieu de
 * casser toute l'app, que les enfants sains s'affichent normalement, et que
 * le bouton de repli renvoie vers l'accueil (route valable pour TOUS les
 * rôles — un client ne doit pas être envoyé vers /admin).
 */

import * as React from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot, Root } from 'react-dom/client';
import ErrorBoundary from '@/components/ErrorBoundary';

const Boom = (): JSX.Element => {
  throw new Error('boom test');
};

let container: HTMLDivElement;
let root: Root;
let consoleErr: jest.SpyInstance;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  // React journalise l'erreur attrapée ; on la masque pour garder la sortie propre.
  consoleErr = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  consoleErr.mockRestore();
});

describe('ErrorBoundary', () => {
  test('affiche les enfants quand tout va bien', () => {
    act(() => {
      root.render(
        <ErrorBoundary>
          <p>Contenu OK</p>
        </ErrorBoundary>
      );
    });
    expect(container.textContent).toContain('Contenu OK');
    expect(container.textContent).not.toContain('Une erreur est survenue');
  });

  test('affiche le repli quand un enfant plante (pas d\'écran blanc)', () => {
    act(() => {
      root.render(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
      );
    });
    expect(container.textContent).toContain('Une erreur est survenue');
  });

  test('le repli propose un retour à l\'accueil (route valable tous rôles)', () => {
    act(() => {
      root.render(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
      );
    });
    const labels = Array.from(container.querySelectorAll('button')).map((b) => b.textContent);
    expect(labels).toContain("Retour à l'accueil");
    // ne doit PAS renvoyer vers une route admin (inaccessible aux clients)
    expect(container.innerHTML).not.toContain('/admin/dashboard');
  });

  test('utilise un fallback personnalisé si fourni', () => {
    act(() => {
      root.render(
        <ErrorBoundary fallback={<div>Repli maison</div>}>
          <Boom />
        </ErrorBoundary>
      );
    });
    expect(container.textContent).toContain('Repli maison');
    expect(container.textContent).not.toContain('Une erreur est survenue');
  });
});
