import { lazy, Suspense, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MdBrush, MdClose } from 'react-icons/md';
import type { CartItem } from '@/@types/cart';
import type { FormAnswer } from '@/@types/formAnswer';

const WizardShowForm = lazy(() => import('../products/modal/WizardShowForm'));

type Props = {
  item: CartItem;
  /** Le formulaire a un champ obligatoire : le paiement reste bloqué tant qu'il n'est pas rempli. */
  required: boolean;
  onClose: () => void;
  /** Réponse du formulaire (fichiers DÉJÀ téléversés : leurs URL sont dans `answer.data`). */
  onSaved: (formAnswer: Partial<FormAnswer>) => void;
};

/**
 * Pop-up « Ajoutez votre logo » du panier, pour un article entré au panier sans sa
 * personnalisation (offre de l'assistant). Réutilise le formulaire de la fiche
 * produit (WizardShowForm) : le fichier est réellement téléversé à la sélection,
 * et la réponse — URL comprises — est enregistrée sur la ligne de panier, puis
 * créée avec la commande au paiement (PaymentContent.createFormAnswer).
 * Avant, il fallait repasser par la fiche en mode modification, dont le
 * récapitulatif créait un doublon de l'article.
 */
const PersonalizeDialog = ({ item, required, onClose, onSaved }: Props) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const quantity = item.sizeAndColors.reduce((n, s) => n + (s.quantity || 0), 0);
  const detail = item.sizeAndColors
    .map((s) => [s.size?.value !== 'DEFAULT' ? s.size?.name : '', s.color?.value !== 'DEFAULT' ? s.color?.name : ''].filter(Boolean).join(' '))
    .filter(Boolean)
    .join(', ');

  // Échap ferme, la page derrière ne défile pas, le focus entre dans la fenêtre.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  if (!item.product.form) return null;

  return createPortal(
    <div
      className="peg-personalize-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 10050, background: 'rgba(3,7,18,0.72)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'max(16px, env(safe-area-inset-top, 0px)) 16px max(16px, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <style>{`
        @keyframes wizFadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pegPersoIn { from { opacity: 0; transform: translateY(14px) scale(.98); } to { opacity: 1; transform: none; } }
        @media (prefers-reduced-motion: reduce) { .peg-personalize-panel { animation: none !important; } }
      `}</style>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="peg-personalize-title"
        tabIndex={-1}
        className="peg-personalize-panel"
        style={{
          width: 'min(560px, 100%)', maxHeight: '100%', overflowY: 'auto', outline: 'none',
          background: 'linear-gradient(160deg, #16263d 0%, #0f1c2e 100%)',
          border: '1px solid rgba(255,255,255,0.09)', borderRadius: '22px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.55)', animation: 'pegPersoIn .22s cubic-bezier(.2,.8,.2,1)',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {/* En-tête */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '20px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(168,85,247,0.08))', border: '1px solid rgba(168,85,247,0.35)' }}>
            <MdBrush size={20} color="#c084fc" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 id="peg-personalize-title" style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#fff' }}>
              Ajoutez votre logo
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'rgba(160,185,220,0.7)', lineHeight: 1.45 }}>
              {item.product.name} — {quantity} pièce{quantity > 1 ? 's' : ''}{detail ? ` · ${detail}` : ''}
            </p>
            {required && (
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#fca5a5', fontWeight: 600 }}>
                Obligatoire pour valider la commande.
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="peg-tap-target"
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '6px', borderRadius: '50%' }}>
            <MdClose size={20} />
          </button>
        </div>

        {/* Formulaire de personnalisation (téléversement réel des fichiers) */}
        <div className="dialog-formbuilder-body" style={{ padding: '18px 20px 8px' }}>
          <Suspense fallback={<div style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: 40 }}>Chargement…</div>}>
            <WizardShowForm
              fields={item.product.form.fields!}
              formAnswer={item.formAnswer}
              readOnly={false}
              onSubmit={(submission) => onSaved({ form: item.product.form, answer: submission })}
            />
          </Suspense>
        </div>

        <div style={{ padding: '4px 20px 18px', textAlign: 'center' }}>
          <button type="button" onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'rgba(160,185,220,0.65)', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
            {required ? 'Plus tard' : 'Plus tard — je l’enverrai ensuite'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default PersonalizeDialog;
