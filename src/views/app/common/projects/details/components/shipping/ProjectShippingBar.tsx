/*
 * Barre « Expédition » de l'en-tête projet (ordinateur : ProjectHeader ; téléphone :
 * carte héros de ProjectHeaderMobile, `variant="mobile"`).
 *
 *  - Client : « Expédié le 2 oct. · Colissimo · Suivre le colis » une fois le projet
 *    expédié ; rien avant.
 *  - Admin et producteur ATTRIBUÉ (`canEdit`, décidé par le serveur) : « Marquer
 *    comme expédié », puis « Modifier » · « Annuler l'expédition ».
 *
 * Tout passe par la route dédiée `/api/shipping/projects/:documentId` (jamais
 * `project.update`) : c'est elle qui prévient le client (cloche, push, e-mail).
 * Route absente (front déployé avant Strapi) ou refus → la barre ne s'affiche pas.
 */
import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { MdLocalShipping, MdStorefront } from 'react-icons/md';
import type { Project } from '@/@types/project';
import type {
  MarkProjectShippedRequest,
  MarkProjectShippedResponse,
} from '@/@types/shipping';
import { useProjectShipping } from './useProjectShipping';
import ShipProjectDialog from './ShipProjectDialog';

type Props = {
  project: Pick<Project, 'documentId' | 'name'>;
  variant?: 'desktop' | 'mobile';
};

const SAVE_FAILED = "Impossible d'enregistrer l'expédition";

/** Toast après enregistrement, selon ce que le serveur a réellement envoyé. */
const savedToast = ({ notified }: MarkProjectShippedResponse) => {
  if (notified?.bell === 'sent' || notified?.email === 'sent')
    toast.success('Expédition enregistrée — le client est prévenu');
  else if (notified?.bell === 'sandbox' || notified?.email === 'sandbox')
    toast.info(
      "Expédition enregistrée (bac à sable : le client n'est pas prévenu)"
    );
  else toast.success('Expédition enregistrée');
};

/** Le lien vient du serveur (construit depuis le transporteur) : on n'ouvre que du https. */
const safeUrl = (url: string | null) =>
  url && /^https:\/\//i.test(url) ? url : null;

const CSS = `
.peg-ship-bar {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; font-family: Inter, sans-serif;
}
.peg-ship-bar.is-desktop { margin: 0 0 16px; }
.peg-ship-summary {
  display: inline-flex; align-items: center; flex-wrap: wrap; gap: 4px 6px; min-width: 0;
  padding: 6px 12px; border-radius: 100px; font-size: 12px; font-weight: 600;
  color: #7dd3fc; background: rgba(56,189,248,0.10); border: 1px solid rgba(56,189,248,0.30);
}
.peg-ship-summary svg { flex-shrink: 0; }
.peg-ship-sep { opacity: 0.55; }
.peg-ship-link { color: #e0f2fe; font-weight: 700; text-decoration: underline; text-underline-offset: 2px; }
.peg-ship-actions { display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.peg-ship-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; cursor: pointer;
  font: inherit; font-size: 11.5px; font-weight: 700; color: rgba(255,255,255,0.8);
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12);
}
.peg-ship-btn.is-primary {
  color: #fff; border-color: transparent; background: linear-gradient(90deg, #0284c7, #0369a1);
  box-shadow: 0 2px 8px rgba(2,132,199,0.3);
}
.peg-ship-btn.is-danger { color: #fca5a5; }
.peg-ship-btn:disabled { opacity: 0.6; cursor: wait; }
/* Téléphone : dans la carte héros, pleine largeur, cibles de 40px */
.peg-ship-bar.is-mobile { flex-direction: column; align-items: stretch; gap: 10px; }
.peg-ship-bar.is-mobile .peg-ship-summary { border-radius: 14px; padding: 10px 12px; font-size: 13px; }
.peg-ship-bar.is-mobile .peg-ship-btn { min-height: 40px; padding: 9px 14px; border-radius: 100px; font-size: 12.5px; }
.peg-ship-bar.is-mobile .peg-ship-btn.is-primary { justify-content: center; }
`;

const ProjectShippingBar = ({ project, variant = 'desktop' }: Props) => {
  const { available, shipping, canEdit, carriers, save, cancel } =
    useProjectShipping(project?.documentId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const closeDialog = useCallback(() => setDialogOpen(false), []);

  if (!available || !shipping) return null;
  if (!shipping.shipped && !canEdit) return null;

  const submit = async (
    req: MarkProjectShippedRequest
  ): Promise<string | null> => {
    try {
      savedToast(await save(req));
      setDialogOpen(false);
      return null;
    } catch (err: unknown) {
      toast.error(SAVE_FAILED);
      const message = (err as { response?: { data?: { message?: unknown } } })
        ?.response?.data?.message;
      return typeof message === 'string' && message ? message : SAVE_FAILED;
    }
  };

  const cancelShipping = async () => {
    if (
      !window.confirm(
        `Annuler l'expédition de « ${project.name} » ? Le client ne sera pas prévenu.`
      )
    )
      return;
    setBusy(true);
    try {
      await cancel();
      toast.success('Expédition annulée');
    } catch {
      toast.error("Impossible d'annuler l'expédition");
    } finally {
      setBusy(false);
    }
  };

  const link = safeUrl(shipping.trackingUrl);
  const Icon = shipping.pickup ? MdStorefront : MdLocalShipping;

  return (
    <div
      className={`peg-ship-bar is-${variant}`}
      data-testid="project-shipping"
    >
      <style>{CSS}</style>
      {shipping.shipped ? (
        <span className="peg-ship-summary">
          <Icon size={variant === 'mobile' ? 16 : 14} aria-hidden="true" />
          <span>{shipping.summary}</span>
          {link && (
            <>
              <span className="peg-ship-sep" aria-hidden="true">
                ·
              </span>
              <a
                className="peg-ship-link"
                href={link}
                target="_blank"
                rel="noopener noreferrer"
              >
                Suivre le colis
              </a>
            </>
          )}
        </span>
      ) : null}

      {canEdit && (
        <span className="peg-ship-actions">
          {shipping.shipped ? (
            <>
              <button
                type="button"
                className="peg-ship-btn peg-tap-target"
                onClick={() => setDialogOpen(true)}
                disabled={busy}
              >
                Modifier
              </button>
              <button
                type="button"
                className="peg-ship-btn is-danger peg-tap-target"
                onClick={cancelShipping}
                disabled={busy}
              >
                {"Annuler l'expédition"}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="peg-ship-btn is-primary peg-tap-target"
              onClick={() => setDialogOpen(true)}
            >
              <MdLocalShipping size={14} aria-hidden="true" />
              Marquer comme expédié
            </button>
          )}
        </span>
      )}

      {dialogOpen && (
        <ShipProjectDialog
          projectName={project.name}
          carriers={carriers}
          current={shipping.shipped ? shipping : null}
          onClose={closeDialog}
          onSubmit={submit}
        />
      )}
    </div>
  );
};

export default ProjectShippingBar;
