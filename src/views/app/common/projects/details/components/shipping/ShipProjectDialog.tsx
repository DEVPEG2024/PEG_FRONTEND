import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import dayjs from 'dayjs';
import { MdClose, MdLocalShipping } from 'react-icons/md';
import type {
  MarkProjectShippedRequest,
  ProjectShipping,
  ShippingCarrier,
  ShippingCarrierOption,
} from '@/@types/shipping';

type Props = {
  projectName: string;
  carriers: ShippingCarrierOption[];
  /** Expédition déjà enregistrée : le dialogue s'ouvre pré-rempli (« Modifier »). */
  current: ProjectShipping | null;
  onClose: () => void;
  /** Renvoie un message d'erreur à afficher, ou null si c'est enregistré. */
  onSubmit: (req: MarkProjectShippedRequest) => Promise<string | null>;
};

/** Même règle que le serveur (normalizeTrackingNumber) : espaces retirés, majuscules. */
const cleanNumber = (raw: string) => raw.replace(/\s+/g, '').toUpperCase();
const NUMBER_RE = /^[A-Z0-9-]{4,40}$/;

const CSS = `
@keyframes pegShipIn { from { opacity: 0; transform: translateY(14px) scale(.98); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .peg-ship-panel { animation: none !important; } }
.peg-ship-field { display: flex; flex-direction: column; gap: 6px; }
.peg-ship-label { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.7); }
.peg-ship-input {
  width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 10px; font: inherit; font-size: 14px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #fff; outline: none;
  color-scheme: dark;
}
.peg-ship-input:focus { border-color: rgba(125,211,252,0.6); }
.peg-ship-input option { background: #0f1c2e; color: #fff; }
/* Téléphone : plein écran, boutons en bas */
@media (max-width: 767.98px) {
  .peg-ship-overlay { padding: 0 !important; align-items: stretch !important; }
  .peg-ship-panel {
    width: 100% !important; max-height: none !important; height: 100%; border-radius: 0 !important;
    display: flex; flex-direction: column;
    padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .peg-ship-body { flex: 1; }
  .peg-ship-input { font-size: 16px; }
}
`;

/**
 * Dialogue « Expédition » (admin et producteur attribué) : transporteur, numéro de
 * suivi facultatif, date d'expédition (aujourd'hui par défaut). Le numéro n'est
 * demandé que pour un transporteur qui a un suivi en ligne.
 */
const ShipProjectDialog = ({
  projectName,
  carriers,
  current,
  onClose,
  onSubmit,
}: Props) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const today = dayjs().format('YYYY-MM-DD');
  const [carrier, setCarrier] = useState<ShippingCarrier | ''>(
    current?.carrier ?? ''
  );
  const [number, setNumber] = useState(current?.trackingNumber ?? '');
  const [date, setDate] = useState(
    current?.shippedAt ? dayjs(current.shippedAt).format('YYYY-MM-DD') : today
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const option = carriers.find((c) => c.value === carrier);
  const withTracking = !!option?.tracking;

  // Le focus entre dans la fenêtre à l'ouverture, la page derrière ne défile pas.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Échap ferme (sauf pendant l'enregistrement).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!carrier) {
      setError('Choisissez un transporteur.');
      return;
    }
    const trackingNumber =
      withTracking && number.trim() ? cleanNumber(number) : null;
    if (trackingNumber && !NUMBER_RE.test(trackingNumber)) {
      setError('Numéro de suivi invalide');
      return;
    }
    if (!date) {
      setError("Date d'expédition invalide");
      return;
    }
    setBusy(true);
    setError(null);
    const message = await onSubmit({
      carrier,
      trackingNumber,
      shippedAt: date,
    });
    setBusy(false);
    if (message) setError(message);
  };

  return createPortal(
    <div
      className="peg-ship-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10050,
        background: 'rgba(3,7,18,0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding:
          'max(16px, env(safe-area-inset-top, 0px)) 16px max(16px, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <style>{CSS}</style>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="peg-ship-title"
        tabIndex={-1}
        className="peg-ship-panel"
        style={{
          width: 'min(460px, 100%)',
          maxHeight: '100%',
          overflowY: 'auto',
          outline: 'none',
          background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '22px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
          animation: 'pegShipIn .22s cubic-bezier(.2,.8,.2,1)',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <form
          onSubmit={submit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: '100%',
          }}
        >
          {/* En-tête */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '20px 20px 14px',
              borderBottom: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background:
                  'linear-gradient(135deg, rgba(56,189,248,0.25), rgba(56,189,248,0.08))',
                border: '1px solid rgba(56,189,248,0.35)',
              }}
            >
              <MdLocalShipping size={20} color="#7dd3fc" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3
                id="peg-ship-title"
                style={{
                  margin: 0,
                  fontSize: '17px',
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                Expédition
              </h3>
              <p
                style={{
                  margin: '3px 0 0',
                  fontSize: '13px',
                  color: 'rgba(160,185,220,0.7)',
                  lineHeight: 1.45,
                  overflowWrap: 'anywhere',
                }}
              >
                {projectName}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              aria-label="Fermer"
              className="peg-tap-target"
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '50%',
              }}
            >
              <MdClose size={20} />
            </button>
          </div>

          {/* Champs */}
          <div
            className="peg-ship-body"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '18px 20px',
            }}
          >
            <label className="peg-ship-field">
              <span className="peg-ship-label">Transporteur</span>
              <select
                className="peg-ship-input"
                value={carrier}
                onChange={(e) => {
                  setCarrier(e.target.value as ShippingCarrier | '');
                  setError(null);
                }}
                required
              >
                <option value="" disabled>
                  Choisir…
                </option>
                {carriers.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            {withTracking && (
              <label className="peg-ship-field">
                <span className="peg-ship-label">
                  Numéro de suivi (facultatif)
                </span>
                <input
                  className="peg-ship-input"
                  type="text"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={60}
                  value={number}
                  onChange={(e) => {
                    setNumber(e.target.value);
                    setError(null);
                  }}
                />
              </label>
            )}

            <label className="peg-ship-field">
              <span className="peg-ship-label">{"Date d'expédition"}</span>
              <input
                className="peg-ship-input"
                type="date"
                value={date}
                max={dayjs().add(1, 'day').format('YYYY-MM-DD')}
                min={dayjs().subtract(90, 'day').format('YYYY-MM-DD')}
                onChange={(e) => {
                  setDate(e.target.value);
                  setError(null);
                }}
                required
              />
            </label>

            {error && (
              <p
                role="alert"
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: '#fca5a5',
                  fontWeight: 600,
                }}
              >
                {error}
              </p>
            )}
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              padding: '14px 20px 20px',
              borderTop: '1px solid rgba(255,255,255,0.07)',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="peg-tap-target"
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={busy}
              className="peg-tap-target"
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(90deg, #0284c7, #0369a1)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 700,
                cursor: busy ? 'wait' : 'pointer',
                opacity: busy ? 0.7 : 1,
                fontFamily: 'inherit',
              }}
            >
              {"Enregistrer l'expédition"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ShipProjectDialog;
