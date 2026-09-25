import { EXPRESS_BACKEND_URL } from '@/configs/api.config';

/**
 * Chat client à la voix (demande Nova du 25/09/2026 : « échanger à la voix
 * comme avec NOVA »). Même parcours que NOVA 3.3 :
 *   1. un appui sur le micro enregistre UNE question (arrêt tout seul après un
 *      court silence, ou au second appui) ;
 *   2. le serveur la transcrit (POST /chatbot/voice/transcribe, Whisper) et le
 *      texte part à l'agent comme un message tapé — outils, cartes et offre
 *      panier inchangés ;
 *   3. chaque phrase de la réponse est lue dès qu'elle arrive dans le flux
 *      (POST /chatbot/voice/speak, voix Rémy de NOVA), enchaînée sans blanc.
 *
 * Pas de mode « mains libres » : NOVA l'a retiré (micro resté ouvert, relances
 * en boucle, transcriptions facturées en pièce vide). Un appui = un tour.
 */

// ── Texte lu à voix haute ────────────────────────────────────────────────────

const EMOJI_RE = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}]/gu;

/** Réponse markdown → texte à prononcer (liens, adresses, emphase, puces, emojis retirés). */
export function speakableText(markdown: string): string {
  return String(markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/(^|\s)\/(customer|common|admin|home)\/\S*/g, '$1')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,!?:;]|$)/g, '$1$2')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*(?:[-*•+]|\d{1,2}[.)])\s+/gm, '')
    .replace(EMOJI_RE, ' ')
    .replace(/\s*[→➜]\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

const hasWords = (s: string) => /[\p{L}\p{N}]/u.test(s);

/**
 * Découpe le flux de la réponse en phrases prêtes à lire, au fil de l'eau : la
 * première phrase part à la synthèse pendant que le modèle écrit la suite.
 * Coupure sur . ! ? … suivis d'un espace, et sur chaque fin de ligne (listes,
 * cartes) — jamais à l'intérieur d'un lien markdown ni d'un nombre (« 24,90 »).
 */
export class SentenceSplitter {
  private buf = '';

  constructor(private readonly maxChars = 220) {}

  push(delta: string): string[] {
    this.buf += delta;
    const out: string[] = [];
    for (;;) {
      const cut = this.boundary();
      if (cut < 0) break;
      this.emit(this.buf.slice(0, cut), out);
      this.buf = this.buf.slice(cut).replace(/^\s+/, '');
    }
    return out;
  }

  flush(): string[] {
    const out: string[] = [];
    this.emit(this.buf, out);
    this.buf = '';
    return out;
  }

  private emit(raw: string, out: string[]) {
    const text = speakableText(raw);
    if (hasWords(text)) out.push(text);
  }

  /** Index de fin de la première phrase complète, ou -1 s'il faut attendre la suite. */
  private boundary(): number {
    const b = this.buf;
    // Le tampon commence toujours en début de ligne (on coupe à chaque fin de ligne).
    let inLinkText = false; // entre [ et ] d'un lien — une adresse, elle, ne contient pas d'espace
    for (let i = 0; i < b.length; i++) {
      const c = b[i];
      if (c === '[') inLinkText = true;
      else if (c === ']') inLinkText = false;
      if (c === '\n') return i + 1;
      if (!inLinkText && /[.!?…]/.test(c)) {
        if (i + 1 >= b.length) return -1; // la suite dira si c'est une fin de phrase
        if (!/\s/.test(b[i + 1])) continue;
        // « 1. » d'une liste numérotée, « M. » d'un nom : pas une fin de phrase.
        const before = b.slice(0, i);
        if (/^\s*(\d{1,2}|[A-Z])$/.test(before) || /(^|\s)(M|Mme|Mlle|St|réf|n°)$/i.test(before)) continue;
        return i + 1;
      }
    }
    // Phrase interminable sans ponctuation : on coupe à la dernière virgule ou au dernier espace.
    if (b.length > this.maxChars) {
      const head = b.slice(0, this.maxChars);
      const at = Math.max(head.lastIndexOf(', '), head.lastIndexOf(' '));
      return at > 40 ? at + 1 : this.maxChars;
    }
    return -1;
  }
}

// ── Appels serveur ───────────────────────────────────────────────────────────

export class VoiceRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const authHeaders = (token: string | null): Record<string, string> => (token ? { Authorization: `Bearer ${token}` } : {});

const extFor = (mime: string) => (/mp4|m4a|aac/.test(mime) ? 'mp4' : /ogg/.test(mime) ? 'ogg' : /wav/.test(mime) ? 'wav' : 'webm');

export async function transcribeQuestion(
  blob: Blob,
  mime: string,
  token: string | null,
  signal?: AbortSignal,
): Promise<{ text: string; noSpeech: boolean }> {
  const form = new FormData();
  form.append('audio', blob, `question.${extFor(mime)}`);
  const res = await fetch(`${EXPRESS_BACKEND_URL}/chatbot/voice/transcribe`, {
    method: 'POST',
    headers: authHeaders(token),
    body: form,
    signal,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new VoiceRequestError(String(data?.message || 'Transcription indisponible'), res.status);
  return { text: String(data?.text || '').trim(), noSpeech: !!data?.noSpeech || !String(data?.text || '').trim() };
}

export async function fetchSpeech(text: string, token: string | null, signal?: AbortSignal): Promise<ArrayBuffer> {
  const res = await fetch(`${EXPRESS_BACKEND_URL}/chatbot/voice/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify({ text }),
    signal,
  });
  if (!res.ok) throw new VoiceRequestError('Voix indisponible', res.status);
  return res.arrayBuffer();
}

// ── Contexte audio ───────────────────────────────────────────────────────────

type WindowWithAudio = typeof window & { webkitAudioContext?: typeof AudioContext };
type NavigatorWithSession = Navigator & { audioSession?: { type: string } };

let sharedContext: AudioContext | null = null;

/**
 * UN contexte audio pour toute la session, créé et relancé PENDANT l'appui sur
 * le micro : iOS n'autorise le son qu'à partir d'un geste de l'utilisateur, et
 * suspend le contexte à la moindre interruption (appel, verrouillage).
 */
export function audioContext(): AudioContext {
  if (!sharedContext) {
    const Ctor = window.AudioContext || (window as WindowWithAudio).webkitAudioContext;
    sharedContext = new Ctor!();
  }
  if (sharedContext.state === 'suspended') sharedContext.resume().catch(() => undefined);
  return sharedContext;
}

/**
 * iPhone : sans ce réglage la voix est muette quand le bouton latéral est sur
 * « silencieux » (le son Web Audio suit la sonnerie). Micro : session partagée.
 */
export function setAudioSession(type: 'playback' | 'play-and-record' | 'auto') {
  try {
    const session = (navigator as NavigatorWithSession).audioSession;
    if (session && session.type !== type) session.type = type;
  } catch { /* navigateur sans Audio Session API */ }
}

/** Micro, enregistreur et Web Audio disponibles (contexte sécurisé, navigateur récent). */
export function voiceCapable(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const w = window as WindowWithAudio;
  return (
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof window.MediaRecorder === 'function' &&
    typeof (w.AudioContext || w.webkitAudioContext) === 'function'
  );
}

// ── Enregistrement d'une question ────────────────────────────────────────────

export type RecordingResult = { blob: Blob; mime: string; speech: boolean; analyserAlive: boolean; durationMs: number };
export type RecorderErrorKind = 'denied' | 'no-mic' | 'failed';

export class RecorderError extends Error {
  constructor(readonly kind: RecorderErrorKind) {
    super(kind);
  }
}

export interface QuestionRecorder {
  /** Niveau sonore courant, 0 à 1 (lu par l'animation de la barre d'enregistrement). */
  readonly level: number;
  start(ctx: AudioContext, onAutoStop: () => void): Promise<void>;
  stop(): Promise<RecordingResult | null>;
  cancel(): void;
}

const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm'];

// Réglages repris de NOVA (validés sur iPhone) : moyenne du spectre > 10 = voix.
const SPEECH_LEVEL = 10;
const SILENCE_AFTER_SPEECH_MS = 1_200;
const NO_SPEECH_TIMEOUT_MS = 8_000;
const MAX_RECORDING_MS = 30_000;

class MediaQuestionRecorder implements QuestionRecorder {
  level = 0;
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private chunks: Blob[] = [];
  private mime = '';
  private startedAt = 0;
  private speech = false;
  private analyserAlive = false;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private poll: ReturnType<typeof setInterval> | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped: Promise<RecordingResult | null> | null = null;
  private cancelled = false;

  async start(ctx: AudioContext, onAutoStop: () => void): Promise<void> {
    setAudioSession('play-and-record');
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch (e) {
      setAudioSession('playback');
      const name = (e as { name?: string })?.name;
      throw new RecorderError(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' ? 'no-mic' : 'failed');
    }
    // Arrêté ou annulé pendant la demande d'autorisation : on rend le micro aussitôt.
    if (this.cancelled || this.stopped) { stream.getTracks().forEach((t) => t.stop()); setAudioSession('playback'); return; }
    this.stream = stream;

    const mime = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported?.(m)) || '';
    let recorder: MediaRecorder;
    try {
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch {
      this.release();
      throw new RecorderError('failed');
    }
    this.recorder = recorder;
    this.mime = recorder.mimeType || mime || 'audio/webm';
    recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) this.chunks.push(e.data); };

    // Mesure du volume : arrêt tout seul après un court silence qui SUIT la parole.
    try {
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.3;
      source.connect(analyser);
      this.source = source;
      const bins = new Uint8Array(analyser.frequencyBinCount);
      this.poll = setInterval(() => {
        analyser.getByteFrequencyData(bins);
        let sum = 0;
        for (let i = 0; i < bins.length; i++) sum += bins[i];
        // Zéro parfait sur toutes les bandes = analyseur qui ne reçoit rien (contexte iOS cassé).
        if (sum > 0) this.analyserAlive = true;
        const avg = sum / bins.length;
        this.level = Math.min(1, avg / 45);
        if (avg > SPEECH_LEVEL) {
          this.speech = true;
          if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null; }
        } else if (this.speech && !this.silenceTimer) {
          this.silenceTimer = setTimeout(onAutoStop, SILENCE_AFTER_SPEECH_MS);
        }
      }, 50);
    } catch { /* pas d'analyse : arrêt au second appui ou au bout de 30 s */ }

    this.timers.push(setTimeout(onAutoStop, MAX_RECORDING_MS));
    // Personne ne parle : on referme le micro au lieu de l'oublier ouvert.
    this.timers.push(setTimeout(() => { if (this.analyserAlive && !this.speech) onAutoStop(); }, NO_SPEECH_TIMEOUT_MS));

    this.startedAt = Date.now();
    recorder.start(250);
  }

  stop(): Promise<RecordingResult | null> {
    if (this.stopped) return this.stopped;
    this.stopped = new Promise((resolve) => {
      const recorder = this.recorder;
      if (!recorder || recorder.state === 'inactive') { this.release(); resolve(null); return; }
      recorder.onstop = () => {
        const result: RecordingResult = {
          blob: new Blob(this.chunks, { type: this.mime }),
          mime: this.mime,
          speech: this.speech,
          analyserAlive: this.analyserAlive,
          durationMs: Date.now() - this.startedAt,
        };
        this.release();
        resolve(this.cancelled ? null : result);
      };
      try { recorder.stop(); } catch { this.release(); resolve(null); }
    });
    return this.stopped;
  }

  cancel() {
    this.cancelled = true;
    void this.stop();
  }

  /** Micro rendu tout de suite : sur iPhone, tant qu'il est ouvert le son sort par l'écouteur. */
  private release() {
    if (this.poll) { clearInterval(this.poll); this.poll = null; }
    if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null; }
    this.timers.forEach(clearTimeout);
    this.timers = [];
    try { this.source?.disconnect(); } catch { /* déjà déconnecté */ }
    this.source = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.level = 0;
    setAudioSession('playback');
  }
}

export const createRecorder = (): QuestionRecorder => new MediaQuestionRecorder();

/**
 * Faut-il envoyer l'enregistrement à la transcription ? Jamais sans parole
 * détectée (coût, et Whisper invente des phrases sur le silence). Si l'analyseur
 * n'a rien mesuré du tout (contexte audio iOS cassé), la taille reste le seul
 * indice : seuil large pour ne pas perdre une vraie question.
 */
export function worthTranscribing(r: RecordingResult): boolean {
  if (r.blob.size < 2_000 || r.durationMs < 400) return false;
  if (r.analyserAlive) return r.speech;
  return r.blob.size > 8_000;
}

// ── Lecture enchaînée des phrases ────────────────────────────────────────────

export interface SpeechPlayer {
  /** Ajoute une phrase : synthétisée tout de suite, lue dans l'ordre d'arrivée. */
  say(sentence: string): void;
  /** Plus aucune phrase ne viendra : `onDone` part quand la dernière est lue. */
  end(): void;
  stop(): void;
}

type Slot = AudioBuffer | 'failed' | null;

/**
 * Lecture sans blanc entre les phrases (leçon de NOVA) : chaque MP3 est
 * PROGRAMMÉ à l'avance sur l'horloge du contexte audio, et le silence que
 * l'encodeur place en tête de chaque fichier (~26 ms) est sauté. Enchaîner sur
 * `onended` laissait 50 à 200 ms de trou à chaque phrase, davantage sur téléphone.
 */
class ScheduledSpeechPlayer implements SpeechPlayer {
  private slots: Slot[] = [];
  private next = 0;
  private nextStart = 0;
  private playing = new Set<AudioBufferSourceNode>();
  private ended = false;
  private stopped = false;
  private done = false;
  private started = false;
  private readonly abort = new AbortController();
  private finalTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly ctx: AudioContext,
    private readonly fetchAudio: (text: string, signal: AbortSignal) => Promise<ArrayBuffer>,
    private readonly events: { onStart?: () => void; onDone?: () => void },
  ) {}

  say(sentence: string) {
    if (this.stopped || this.ended) return;
    const index = this.slots.push(null) - 1;
    this.load(sentence)
      .then((buf) => { this.slots[index] = buf ?? 'failed'; })
      .catch(() => { this.slots[index] = 'failed'; })
      .finally(() => this.schedule());
  }

  end() {
    this.ended = true;
    this.schedule();
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    this.abort.abort();
    for (const s of this.playing) { try { s.onended = null; s.stop(); } catch { /* déjà arrêtée */ } }
    this.playing.clear();
    this.finish();
  }

  private async load(sentence: string, attempt = 0): Promise<AudioBuffer | null> {
    try {
      const data = await this.fetchAudio(sentence, this.abort.signal);
      return await this.ctx.decodeAudioData(data);
    } catch {
      if (attempt === 0 && !this.abort.signal.aborted) return this.load(sentence, 1);
      return null;
    }
  }

  /** Premier échantillon audible (60 ms au plus : au-delà on mangerait une syllabe). */
  private leadingSilence(buf: AudioBuffer): number {
    const data = buf.getChannelData(0);
    const max = Math.min(data.length, Math.floor(buf.sampleRate * 0.06));
    for (let i = 0; i < max; i++) if (Math.abs(data[i]) > 0.0015) return i / buf.sampleRate;
    return max / buf.sampleRate;
  }

  private schedule() {
    if (this.stopped) return;
    if (this.ctx.state === 'suspended') {
      this.nextStart = 0;
      this.ctx.resume().then(() => this.schedule()).catch(() => undefined);
      return;
    }
    for (;;) {
      while (this.slots[this.next] === 'failed') this.next++;
      const buf = this.slots[this.next];
      if (!buf || buf === 'failed') break;
      this.next++;
      const offset = this.leadingSilence(buf);
      const duration = Math.max(0, buf.duration - offset);
      // 150 ms d'avance : sur iPhone le fil principal décode aussi la phrase suivante.
      const at = Math.max(this.ctx.currentTime + 0.15, this.nextStart);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.ctx.destination);
      this.playing.add(src);
      src.onended = () => { this.playing.delete(src); this.checkDone(); };
      src.start(at, offset);
      this.nextStart = at + duration;
      if (!this.started) { this.started = true; this.events.onStart?.(); }
    }
    this.checkDone();
  }

  private checkDone() {
    if (this.done || this.stopped || !this.ended) return;
    const pending = this.slots.slice(this.next).some((s) => s !== 'failed');
    if (pending) return;
    if (this.playing.size === 0) { this.finish(); return; }
    // Filet : sur iOS `onended` peut ne jamais arriver.
    if (this.finalTimer) clearTimeout(this.finalTimer);
    const left = Math.max(0, this.nextStart - this.ctx.currentTime);
    this.finalTimer = setTimeout(() => { this.playing.clear(); this.finish(); }, left * 1000 + 1_500);
  }

  private finish() {
    if (this.done) return;
    this.done = true;
    if (this.finalTimer) clearTimeout(this.finalTimer);
    this.events.onDone?.();
  }
}

export const createSpeechPlayer = (
  ctx: AudioContext,
  fetchAudio: (text: string, signal: AbortSignal) => Promise<ArrayBuffer>,
  events: { onStart?: () => void; onDone?: () => void },
): SpeechPlayer => new ScheduledSpeechPlayer(ctx, fetchAudio, events);
