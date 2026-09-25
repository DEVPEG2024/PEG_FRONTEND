/**
 * @jest-environment jsdom
 */
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import cartReducer from '@/store/slices/base/cartSlice';
import ChatWidget from '@/components/template/ChatWidget';
import type { RecordingResult } from '@/components/template/chatVoice';

// Parler à l'assistant « comme à NOVA » (demande du 25/09/2026) : micro →
// transcription → message envoyé → réponse lue phrase par phrase, au fil du flux.
// Le matériel (micro, haut-parleur) est simulé ; toute la logique du widget est réelle.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom ne fait pas défiler : la conversation appelle scrollIntoView à chaque message.
Element.prototype.scrollIntoView = jest.fn();

jest.mock('@/utils/hooks/useResponsive', () => () => ({ smaller: { md: false }, larger: { md: true } }));

type AutoStop = () => void;
const mockRecorder = {
  level: 0.4,
  onAutoStop: null as AutoStop | null,
  start: jest.fn(async (_ctx: unknown, onAutoStop: AutoStop) => { mockRecorder.onAutoStop = onAutoStop; }),
  stop: jest.fn(async (): Promise<RecordingResult | null> => null),
  cancel: jest.fn(),
};
const mockSaid: string[] = [];
const mockPlayer = { ended: false, stopped: false, events: {} as { onStart?: () => void; onDone?: () => void } };
const mockCreatePlayer = jest.fn();
const mockTranscribe = jest.fn();

jest.mock('@/components/template/chatVoice', () => {
  const actual = jest.requireActual('@/components/template/chatVoice');
  return {
    ...actual,
    voiceCapable: () => true,
    audioContext: () => ({ state: 'running' }),
    setAudioSession: () => undefined,
    createRecorder: () => mockRecorder,
    transcribeQuestion: (...args: unknown[]) => mockTranscribe(...args),
    createSpeechPlayer: (_ctx: unknown, _fetch: unknown, events: { onStart?: () => void; onDone?: () => void }) => {
      mockCreatePlayer();
      mockPlayer.events = events;
      return {
        say: (s: string) => { mockSaid.push(s); if (mockSaid.length === 1) events.onStart?.(); },
        end: () => { mockPlayer.ended = true; },
        stop: () => { mockPlayer.stopped = true; events.onDone?.(); },
      };
    },
  };
});

const speech: RecordingResult = { blob: new Blob([new Uint8Array(30_000)], { type: 'audio/webm' }), mime: 'audio/webm', speech: true, analyserAlive: true, durationMs: 2_500 };

// Réponse en flux SSE de l'agent (POST /chatbot/chat/stream).
const sse = (deltas: string[], reply: string) => {
  const enc = new TextEncoder();
  const events = [
    ...deltas.map((text) => `event: delta\ndata: ${JSON.stringify({ text })}\n\n`),
    `event: done\ndata: ${JSON.stringify({ reply, authenticated: true, cards: [] })}\n\n`,
  ];
  let i = 0;
  return {
    ok: true,
    status: 200,
    headers: { get: () => 'text/event-stream' },
    body: { getReader: () => ({ read: async () => (i < events.length ? { value: enc.encode(events[i++]), done: false } : { value: undefined, done: true }) }) },
  };
};

let token: string | null = 'jwt';
const makeStore = () =>
  configureStore({
    reducer: combineReducers({
      auth: combineReducers({
        user: () => ({ user: { documentId: 'u1', firstName: 'Léa', lastName: 'Martin' } }),
        session: () => ({ token }),
      }),
      base: combineReducers({ cart: cartReducer }),
    }),
    middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
  });

let container: HTMLDivElement;
let root: Root;
const fetchMock = jest.fn();
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  mockSaid.length = 0;
  mockPlayer.ended = false;
  mockPlayer.stopped = false;
  mockRecorder.onAutoStop = null;
  mockRecorder.start.mockClear();
  mockRecorder.stop.mockReset().mockResolvedValue(speech);
  mockRecorder.cancel.mockClear();
  mockCreatePlayer.mockClear();
  mockTranscribe.mockReset().mockResolvedValue({ text: 'Je veux 10 bonnets noirs', noSpeech: false });
  fetchMock.mockReset().mockResolvedValue(
    sse(['Bonjour Léa ! Voici le bonnet :\n[Bonnet', ' noir](/customer/product/b1)\n', 'Prix : 8 € HT.'],
      'Bonjour Léa ! Voici le bonnet :\n[Bonnet noir](/customer/product/b1)\nPrix : 8 € HT.'),
  );
  (globalThis as { fetch?: unknown }).fetch = fetchMock;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  token = 'jwt';
});

const render = () =>
  act(() => {
    root.render(
      <Provider store={makeStore()}>
        <MemoryRouter initialEntries={['/home']}>
          <ChatWidget />
        </MemoryRouter>
      </Provider>,
    );
  });
const flush = () => act(async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); });
const q = <T extends Element = HTMLButtonElement>(sel: string) => container.querySelector(sel) as T | null;
const openChat = () => act(() => { q('button[aria-label="Ouvrir le chat assistant"]')!.click(); });
const mic = () => q('button[aria-label="Parler à l\'assistant"]');
const click = (el: Element | null) => act(() => { (el as HTMLButtonElement).click(); });

describe('ChatWidget — parler à l’assistant', () => {
  it('question dictée : transcrite, envoyée, et réponse lue phrase par phrase au fil du flux', async () => {
    render();
    openChat();
    expect(q('.pcw-intro')!.textContent).toContain('touchez le micro');
    click(mic());
    expect(mockRecorder.start).toHaveBeenCalledTimes(1);
    expect(q('[aria-label="Enregistrement de votre question"]')).not.toBeNull();
    expect(q('.pcw-sub')!.textContent).toBe('Vous écoute…');

    click(q('button[aria-label="Envoyer ma question"]'));
    await flush();

    // Transcription avec le jeton du client, puis message envoyé à l'agent.
    expect(mockTranscribe).toHaveBeenCalledWith(speech.blob, 'audio/webm', 'jwt', expect.anything());
    const bubbles = [...container.querySelectorAll('.pcw-bubble--user')].map((b) => b.textContent);
    expect(bubbles).toEqual(['Je veux 10 bonnets noirs']);
    expect(q('[aria-label="Question dictée"]')).not.toBeNull();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages.at(-1)).toEqual({ role: 'user', content: 'Je veux 10 bonnets noirs' });

    // Lue telle qu'affichée : le lien est prononcé par son nom, jamais son adresse.
    expect(mockSaid).toEqual(['Bonjour Léa !', 'Voici le bonnet :', 'Bonnet noir', 'Prix : 8 € HT.']);
    expect(mockPlayer.ended).toBe(true);
    expect(q('.pcw-speaking')!.textContent).toContain("L'assistant vous répond");

    // « Arrêter » coupe la voix.
    click(q('.pcw-speaking-stop'));
    expect(mockPlayer.stopped).toBe(true);
    expect(q('.pcw-speaking')).toBeNull();
  });

  it('s’arrête tout seul après un silence : pas besoin de retoucher le bouton', async () => {
    render();
    openChat();
    click(mic());
    await act(async () => { mockRecorder.onAutoStop!(); });
    await flush();
    expect(mockTranscribe).toHaveBeenCalledTimes(1);
    expect(mockSaid.length).toBeGreaterThan(0);
  });

  it('question TAPÉE : réponse écrite seulement, rien n’est lu', async () => {
    render();
    openChat();
    const field = q<HTMLTextAreaElement>('textarea')!;
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(field, 'Où en est ma commande ?');
      field.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(mic()).toBeNull(); // du texte → le bouton d'envoi remplace le micro
    click(q('button[aria-label="Envoyer"]'));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(mockCreatePlayer).not.toHaveBeenCalled();
    expect(mockSaid).toEqual([]);
  });

  it('voix coupée (choix mémorisé sur l’appareil) : la question dictée reçoit une réponse écrite', async () => {
    render();
    openChat();
    click(q('button[aria-label="Réponses lues à voix haute — les couper"]'));
    expect(localStorage.getItem('peg_chat_voice_muted')).toBe('1');
    click(mic());
    click(q('button[aria-label="Envoyer ma question"]'));
    await flush();
    expect(mockTranscribe).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('.pcw-bubble--bot').length).toBe(1);
    expect(mockCreatePlayer).not.toHaveBeenCalled();
  });

  it('personne n’a parlé : rien n’est envoyé à la transcription, et on le dit', async () => {
    mockRecorder.stop.mockResolvedValue({ ...speech, speech: false });
    render();
    openChat();
    click(mic());
    click(q('button[aria-label="Envoyer ma question"]'));
    await flush();
    expect(mockTranscribe).not.toHaveBeenCalled();
    expect(q('.pcw-voice-note')!.textContent).toContain("Je n'ai rien entendu");
    expect(mic()).not.toBeNull();
  });

  it('micro refusé par le navigateur : message clair, champ de saisie rendu', async () => {
    const { RecorderError } = jest.requireActual('@/components/template/chatVoice');
    mockRecorder.start.mockImplementationOnce(async () => { throw new RecorderError('denied'); });
    render();
    openChat();
    click(mic());
    await flush();
    expect(q('.pcw-voice-note')!.textContent).toContain('Micro refusé');
    expect(q('textarea')).not.toBeNull();
  });

  it('annuler l’enregistrement : micro rendu, rien d’envoyé', async () => {
    render();
    openChat();
    click(mic());
    click(q('button[aria-label="Annuler l\'enregistrement"]'));
    await flush();
    expect(mockRecorder.cancel).toHaveBeenCalled();
    expect(mockTranscribe).not.toHaveBeenCalled();
    expect(q('textarea')).not.toBeNull();
  });

  it('fermer le chat coupe la voix en cours', async () => {
    render();
    openChat();
    click(mic());
    click(q('button[aria-label="Envoyer ma question"]'));
    await flush();
    expect(mockPlayer.stopped).toBe(false);
    click(q('button[aria-label="Fermer le chat"]'));
    expect(mockPlayer.stopped).toBe(true);
  });

  it('sans compte connecté : pas de micro (le serveur refuse la voix sans jeton)', () => {
    token = null;
    render();
    openChat();
    expect(mic()).toBeNull();
    expect(q('button[aria-label="Envoyer"]')).not.toBeNull();
  });
});
