import { useEffect, useRef, useState } from 'react';
import { MdArrowUpward, MdClose } from 'react-icons/md';

const BARS = 26;
const STEP_MS = 70;

/**
 * Barre d'enregistrement qui remplace le champ de saisie pendant que le client
 * parle : annuler, durée, onde qui suit la voix, envoyer. L'envoi part aussi
 * tout seul après un court silence (cf. chatVoice.ts).
 *
 * L'onde est animée hors de React (transform posé directement sur les barres) :
 * un rendu par image aurait redessiné toute la conversation 60 fois par seconde.
 */
const ChatVoiceBar = ({ getLevel, onCancel, onSend }: { getLevel: () => number; onCancel: () => void; onSend: () => void }) => {
  const waveRef = useRef<HTMLDivElement>(null);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const tick = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 250);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const history: number[] = new Array(BARS).fill(0);
    let last = 0;
    let frame = 0;
    const draw = (t: number) => {
      if (t - last >= STEP_MS) {
        last = t;
        history.shift();
        history.push(getLevel());
        const bars = waveRef.current?.children;
        if (bars) for (let i = 0; i < bars.length; i++) (bars[i] as HTMLElement).style.transform = `scaleY(${(0.14 + history[i] * 0.86).toFixed(3)})`;
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [getLevel]);

  return (
    <div className="pcw-field pcw-rec" role="group" aria-label="Enregistrement de votre question">
      <button type="button" className="pcw-rec-cancel" onClick={onCancel} aria-label="Annuler l'enregistrement" title="Annuler">
        <MdClose size={18} />
      </button>
      <span className="pcw-rec-dot" aria-hidden="true" />
      <span className="pcw-rec-time">{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}</span>
      <div className="pcw-rec-wave" ref={waveRef} aria-hidden="true">
        {Array.from({ length: BARS }, (_, i) => <i key={i} />)}
      </div>
      <span className="pcw-sr" role="status">Je vous écoute. Votre question part dès que vous vous arrêtez de parler.</span>
      <button type="button" className="pcw-send" onClick={onSend} aria-label="Envoyer ma question" title="Envoyer">
        <MdArrowUpward size={19} />
      </button>
    </div>
  );
};

export default ChatVoiceBar;
