import { useCallback, useEffect, useRef, useState } from 'react';
import {
  RecorderError,
  SentenceSplitter,
  VoiceRequestError,
  audioContext,
  createRecorder,
  createSpeechPlayer,
  fetchSpeech,
  setAudioSession,
  transcribeQuestion,
  voiceCapable,
  worthTranscribing,
  type QuestionRecorder,
  type SpeechPlayer,
} from '@/components/template/chatVoice';

export type VoicePhase = 'idle' | 'recording' | 'transcribing';

/** Lecture d'une réponse, alimentée au fil du flux (cf. requestReply du widget). */
export type SpokenReply = {
  push: (delta: string) => void;
  /** Fin de la réponse. Si rien n'a été reçu en flux (repli JSON, erreur), `fullText` est lu en entier. */
  finish: (fullText: string) => void;
  cancel: () => void;
};

// Choix de l'appareil : réponses lues à voix haute ou non (pour tous les comptes de l'appareil).
const MUTE_KEY = 'peg_chat_voice_muted';
const NOTICE_MS = 6_000;

const readMuted = (): boolean => {
  try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
};

/**
 * Parler à l'assistant comme à NOVA : micro → transcription → message envoyé
 * (`onQuestion`) → réponse lue phrase par phrase. Les réponses d'un message TAPÉ
 * ne sont pas lues : on répond à la voix quand on nous parle.
 */
export function useChatVoice(opts: { token: string | null; onQuestion: (text: string) => void }) {
  // Réservé aux comptes connectés : le serveur refuse la voix sans jeton.
  const supported = !!opts.token && voiceCapable();
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [speaking, setSpeaking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [muted, setMuted] = useState(readMuted);

  const recorderRef = useRef<QuestionRecorder | null>(null);
  const playerRef = useRef<SpeechPlayer | null>(null);
  const transcribeAbort = useRef<AbortController | null>(null);
  const tokenRef = useRef(opts.token);
  tokenRef.current = opts.token;
  const onQuestionRef = useRef(opts.onQuestion);
  onQuestionRef.current = opts.onQuestion;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(t);
  }, [notice]);

  const stopSpeaking = useCallback(() => {
    const player = playerRef.current;
    playerRef.current = null;
    player?.stop();
    setSpeaking(false);
  }, []);

  const finishRecording = useCallback(async () => {
    const rec = recorderRef.current;
    if (!rec) return;
    recorderRef.current = null;
    const result = await rec.stop();
    if (!result) { setPhase('idle'); return; }
    if (!worthTranscribing(result)) {
      setPhase('idle');
      setNotice("Je n'ai rien entendu. Réessayez en parlant près du micro.");
      return;
    }
    setPhase('transcribing');
    const ctrl = new AbortController();
    transcribeAbort.current = ctrl;
    try {
      const { text, noSpeech } = await transcribeQuestion(result.blob, result.mime, tokenRef.current, ctrl.signal);
      if (ctrl.signal.aborted) return;
      if (noSpeech || !text) { setNotice("Je n'ai pas compris. Réessayez en parlant près du micro."); return; }
      onQuestionRef.current(text);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      const status = e instanceof VoiceRequestError ? e.status : 0;
      setNotice(
        status === 429 ? 'Beaucoup de demandes vocales : réessayez dans un instant.'
          : status === 401 ? "Reconnectez-vous pour parler à l'assistant."
          : typeof navigator !== 'undefined' && !navigator.onLine ? 'Vous semblez hors ligne. Vérifiez votre connexion.'
          : 'La transcription a échoué. Réessayez, ou écrivez votre message.',
      );
    } finally {
      if (transcribeAbort.current === ctrl) transcribeAbort.current = null;
      setPhase((p) => (p === 'transcribing' ? 'idle' : p));
    }
  }, []);

  /**
   * À appeler DANS le geste de l'utilisateur (clic sur le micro) : iOS ne laisse
   * naître le son qu'à ce moment-là, et la réponse sera lue plusieurs secondes après.
   */
  const startRecording = useCallback(() => {
    if (!supported || recorderRef.current || phase === 'transcribing') return;
    let ctx: AudioContext;
    try { ctx = audioContext(); } catch { setNotice('Le micro est indisponible sur ce navigateur.'); return; }
    stopSpeaking(); // on coupe la parole à l'assistant, comme à NOVA
    setNotice(null);
    const rec = createRecorder();
    recorderRef.current = rec;
    setPhase('recording');
    rec.start(ctx, () => { if (recorderRef.current === rec) void finishRecording(); }).catch((e) => {
      if (recorderRef.current === rec) recorderRef.current = null;
      setPhase('idle');
      const kind = e instanceof RecorderError ? e.kind : 'failed';
      setNotice(
        kind === 'denied' ? "Micro refusé : autorisez-le dans les réglages du navigateur pour parler à l'assistant."
          : kind === 'no-mic' ? 'Aucun micro détecté sur cet appareil.'
          : "Le micro n'a pas pu démarrer. Réessayez.",
      );
    });
  }, [supported, phase, stopSpeaking, finishRecording]);

  const cancelRecording = useCallback(() => {
    recorderRef.current?.cancel();
    recorderRef.current = null;
    transcribeAbort.current?.abort();
    transcribeAbort.current = null;
    setPhase('idle');
  }, []);

  /** Niveau du micro (0 à 1) pour l'animation de la barre d'enregistrement. */
  const getLevel = useCallback(() => recorderRef.current?.level ?? 0, []);

  /** Lecteur pour la réponse d'un tour vocal, ou null (voix coupée, non disponible). */
  const beginSpokenReply = useCallback((): SpokenReply | null => {
    if (!supported || mutedRef.current) return null;
    let ctx: AudioContext;
    try { ctx = audioContext(); } catch { return null; }
    stopSpeaking();
    setAudioSession('playback');
    const player = createSpeechPlayer(ctx, (text, signal) => fetchSpeech(text, tokenRef.current, signal), {
      onStart: () => { if (playerRef.current === player) setSpeaking(true); },
      onDone: () => {
        if (playerRef.current !== player) return;
        playerRef.current = null;
        setSpeaking(false);
      },
    });
    playerRef.current = player;
    const splitter = new SentenceSplitter();
    let streamed = false;
    return {
      push: (delta) => {
        streamed = true;
        splitter.push(delta).forEach((s) => player.say(s));
      },
      finish: (fullText) => {
        if (streamed) splitter.flush().forEach((s) => player.say(s));
        else {
          const whole = new SentenceSplitter();
          [...whole.push(fullText), ...whole.flush()].forEach((s) => player.say(s));
        }
        player.end();
      },
      cancel: () => {
        if (playerRef.current === player) stopSpeaking();
        else player.stop();
      },
    };
  }, [supported, stopSpeaking]);

  const toggleMuted = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      try { localStorage.setItem(MUTE_KEY, next ? '1' : '0'); } catch { /* stockage bloqué */ }
      return next;
    });
    stopSpeaking();
  }, [stopSpeaking]);

  // Widget démonté (changement de mise en page, déconnexion) : micro rendu, voix coupée.
  useEffect(() => () => {
    recorderRef.current?.cancel();
    transcribeAbort.current?.abort();
    playerRef.current?.stop();
  }, []);

  return {
    supported,
    phase,
    speaking,
    notice,
    muted,
    startRecording,
    finishRecording,
    cancelRecording,
    stopSpeaking,
    beginSpokenReply,
    toggleMuted,
    getLevel,
    clearNotice: useCallback(() => setNotice(null), []),
  };
}
