import { readFileSync } from 'fs';
import { join } from 'path';
import { buildGroups } from '@/views/app/customer/products/modal/WizardShowForm';
import type { JSONValue } from '@/@types/form';

// Personnalisation remplie dans le chat : le serveur (peg_strapi
// chat-form-text.ts → extractFormFields) doit ranger les réponses sous EXACTEMENT
// les clés que la fiche produit (WizardShowForm) lit et écrit — sinon la
// commande s'afficherait vide. Fixture COMMUNE, copie identique des deux côtés
// (peg_strapi src/__tests__/fixtures/chat-form-fixture.json) : le test Strapi
// vérifie extractFormFields ≡ expected, celui-ci buildGroups ≡ expected.

// Le formulaire téléverse les fichiers : inutile de charger le client HTTP ici.
jest.mock('@/services/FileServices', () => ({ apiUploadFile: jest.fn() }));
jest.mock('react-toastify', () => ({
  toast: { error: jest.fn(), info: jest.fn() },
}));

type Fixture = {
  fields: JSONValue;
  expected: { key: string; kind: string; label: string }[];
  excludedByChat: { key: string; formioType: string; reason: string }[];
};

const fixture: Fixture = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'chat-form-fixture.json'), 'utf8')
);

const wizardFields = () => buildGroups(fixture.fields).flatMap((g) => g.fields);

describe('Personnalisation du chat ↔ fiche produit : mêmes champs', () => {
  it('buildGroups, moins les champs que le chat ne remplit pas, donne les clés attendues dans le même ordre', () => {
    const excluded = new Set(fixture.excludedByChat.map((e) => e.key));
    const keys = wizardFields()
      .map((f) => f.id)
      .filter((id) => !excluded.has(id));
    expect(keys).toEqual(fixture.expected.map((e) => e.key));
  });

  it('les champs exclus par le chat existent bien dans la fiche (sinon l’exclusion ne prouve rien)', () => {
    const ids = wizardFields().map((f) => f.id);
    for (const e of fixture.excludedByChat) expect(ids).toContain(e.key);
    // Exclus pour une raison que la fiche partage : signature inerte, liste sans options.
    const byId = new Map(wizardFields().map((f) => [f.id, f]));
    expect(byId.get('e9sig')?.type).toBe('signature');
    expect(byId.get('e7vide')?.options).toBeUndefined();
  });

  it('mêmes libellés que la fiche pour chaque champ rempli par le chat', () => {
    const byId = new Map(wizardFields().map((f) => [f.id, f]));
    for (const e of fixture.expected)
      expect(byId.get(e.key)?.label).toBe(e.label);
  });

  it('types de saisie cohérents (la valeur rangée par le chat est celle que la fiche relit)', () => {
    const byId = new Map(wizardFields().map((f) => [f.id, f]));
    const wizardType: Record<string, string[]> = {
      text: ['text'],
      textarea: ['textarea'],
      choice: ['select', 'radio'],
      multichoice: ['checkboxgroup'],
      boolean: ['checkbox'],
      email: ['email'],
      url: ['url'],
      phone: ['tel'],
      number: ['number'],
      date: ['date'],
      datetime: ['datetime-local'],
      file: ['file'],
    };
    for (const e of fixture.expected) {
      expect(wizardType[e.kind]).toContain(byId.get(e.key)?.type);
    }
  });
});
