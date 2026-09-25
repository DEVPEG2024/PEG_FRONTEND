/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import PersonalizeDialog from '@/views/app/customer/cart/PersonalizeDialog';
import { personalizationStatus, pendingFormAnswer } from '@/components/template/chatOffer';
import type { CartItem } from '@/@types/cart';

// Pop-up « Ajoutez votre logo » du panier, avec le VRAI formulaire du Bonnet de
// prod (« Personnalisation du produit », logo obligatoire). Seul le téléversement
// est simulé : on vérifie que l'URL du fichier finit dans la réponse enregistrée
// sur la ligne de panier (c'est elle que PaymentContent crée avec la commande).

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
jest.mock('react-toastify', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
const upload = jest.fn();
jest.mock('@/services/FileServices', () => ({ apiUploadFile: (f: File) => upload(f) }));

const form = {
  documentId: 'mxlpy1o4l9qmfh95vnt1qg41',
  name: 'Personnalisation du produit',
  fields: { fields: [{ id: 'file_1784150795675_58ey', type: 'file', label: 'Logo à télécharger', width: 100, required: true }] },
};
const bonnet = { documentId: 'h1py87r1dcy1jc411dbr7qew', name: 'Bonnet', form, sizes: [], colors: [], priceTiers: [] };
const item = {
  id: 'ci1', userDocumentId: 'u1', product: bonnet,
  sizeAndColors: [{ size: { name: 'Taille unique', value: 'Taille unique' }, color: { name: 'NOIR', value: '#000000' }, quantity: 10 }],
  formAnswer: pendingFormAnswer(bonnet as never),
} as unknown as CartItem;

let container: HTMLDivElement;
let root: Root;
beforeEach(() => {
  upload.mockReset();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const render = async (onSaved: jest.Mock) => {
  await act(async () => {
    root.render(<PersonalizeDialog item={item} required onClose={() => undefined} onSaved={onSaved} />);
  });
  await flush(); // formulaire chargé à la demande (lazy)
};
const clickValider = () => act(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => /Valider/.test(b.textContent || '')) as HTMLButtonElement;
  btn.click();
});

describe('Pop-up logo du panier', () => {
  it('article du chat sans logo : personnalisation OBLIGATOIRE manquante', () => {
    expect(personalizationStatus(item)).toBe('required');
  });

  it('présente le produit et la quantité', async () => {
    await render(jest.fn());
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.textContent).toContain('Ajoutez votre logo');
    expect(dialog.textContent).toContain('Bonnet — 10 pièces · Taille unique NOIR');
    expect(dialog.textContent).toContain('Obligatoire pour valider la commande');
  });

  it('sans fichier : refus, rien n’est enregistré', async () => {
    const onSaved = jest.fn();
    await render(onSaved);
    clickValider();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('fichier choisi → téléversé → son URL est dans la réponse enregistrée', async () => {
    upload.mockResolvedValue({ url: '/uploads/logo_client_ab12.png', name: 'logo_client_ab12.png' });
    const onSaved = jest.fn();
    await render(onSaved);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['png'], 'logo client.png', { type: 'image/png' });
    await act(async () => {
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await flush();
    expect(upload).toHaveBeenCalledWith(file);
    expect(document.body.textContent).toContain('logo client.png');
    clickValider();
    expect(onSaved).toHaveBeenCalledTimes(1);
    const saved = onSaved.mock.calls[0][0];
    expect(saved.form.documentId).toBe('mxlpy1o4l9qmfh95vnt1qg41');
    expect(saved.answer.state).toBe('submitted');
    expect(saved.answer.data.file_1784150795675_58ey).toEqual([
      expect.objectContaining({ url: 'http://localhost:1337/uploads/logo_client_ab12.png', originalName: 'logo client.png', type: 'image/png' }),
    ]);
    // Ligne de panier mise à jour → plus rien ne bloque le paiement.
    expect(personalizationStatus({ ...item, formAnswer: saved } as CartItem)).toBe('done');
  });
});

// Dernier maillon : au paiement, PaymentContent.createFormAnswer appelle
// apiCreateFormAnswer(item.formAnswer). La mutation doit porter l'URL du logo.
describe('Au paiement : la réponse envoyée au serveur contient le fichier', () => {
  it('apiCreateFormAnswer → variables { form: documentId, answer } avec l’URL', async () => {
    jest.resetModules();
    const fetchData = jest.fn().mockResolvedValue({ data: { data: { createFormAnswer: { documentId: 'fa1' } } } });
    jest.doMock('@/services/ApiService', () => ({ __esModule: true, default: { fetchData } }));
    const { apiCreateFormAnswer } = await import('@/services/FormAnswerService');
    const answer = { data: { file_1784150795675_58ey: [{ url: 'http://localhost:1337/uploads/logo.png', name: 'logo.png' }] }, metadata: {}, state: 'submitted' };
    await apiCreateFormAnswer({ form: { documentId: 'mxlpy1o4l9qmfh95vnt1qg41' }, answer } as never);
    const vars = fetchData.mock.calls[0][0].data.variables.data;
    expect(vars.form).toBe('mxlpy1o4l9qmfh95vnt1qg41');
    expect(vars.answer.data.file_1784150795675_58ey[0].url).toBe('http://localhost:1337/uploads/logo.png');
  });
});
