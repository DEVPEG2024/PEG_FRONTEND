/*
 * Onglet « Master Print » du projet (admin seulement) — ajout 19/11/2026.
 *
 * Master Print (imprimeur, API v1) exécute les projets PEG. Ici l'admin envoie le
 * projet (produit, coloris, tailles, marquages, fichiers, adresse), suit chaque
 * commande Master Print et, en bac à sable, la fait avancer pour essayer.
 * Le suivi est automatique (webhook + relecture toutes les 30 min côté serveur) :
 * à l'expédition, le projet est marqué expédié et le client prévenu comme d'habitude.
 *
 * Route absente (front déployé avant Strapi) → « Module indisponible ».
 */
import { useCallback, useEffect, useState } from 'react';
import { HiPaperAirplane } from 'react-icons/hi';
import type { MpOrderView, MpProjectDraft } from '@/@types/masterPrint';
import { apiGetMasterPrintProject } from '@/services/MasterPrintServices';
import {
  fmtEur,
  isMasterPrintMissing,
  masterPrintError,
} from '@/utils/masterPrint';
import { getProjectById, useAppDispatch, useAppSelector } from '../../store';
import MarginCard from './MarginCard';
import OrderCard from './OrderCard';
import SendForm from './SendForm';
import ServiceStatusBanner from '@/views/app/admin/masterPrint/ServiceStatusBanner';
import { Btn, LIVE_TONE, Pill, SANDBOX_TONE, card, muted } from './ui';

type Load = 'loading' | 'ready' | 'missing' | 'error';

const MasterPrintTab = () => {
  const dispatch = useAppDispatch();
  const { project } = useAppSelector((state) => state.projectDetails.data);
  const documentId = project?.documentId as string | undefined;
  const [draft, setDraft] = useState<MpProjectDraft | null>(null);
  const [load, setLoad] = useState<Load>('loading');
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  // Une ouverture = un formulaire neuf (et sa clé d'envoi) ; les relectures automatiques ne le remettent pas à zéro.
  const [formSeq, setFormSeq] = useState(0);

  const fetchDraft = useCallback(
    async (quiet = false) => {
      if (!documentId) return;
      if (!quiet) setLoad('loading');
      try {
        const { data } = await apiGetMasterPrintProject(documentId);
        setDraft(data);
        setLoad('ready');
      } catch (e) {
        if (quiet) return;
        if (isMasterPrintMissing(e)) setLoad('missing');
        else {
          setError(
            masterPrintError(e, 'Master Print est momentanément indisponible.')
          );
          setLoad('error');
        }
      }
    },
    [documentId]
  );

  useEffect(() => {
    setFormOpen(false);
    fetchDraft();
  }, [fetchDraft]);

  // Fichiers en cours d'envoi : relecture toutes les 3 s jusqu'à la fin.
  const uploading = !!draft?.orders.some((o) => o.uploading);
  useEffect(() => {
    if (!uploading) return;
    const t = setTimeout(() => fetchDraft(true), 3000);
    return () => clearTimeout(t);
  }, [uploading, draft, fetchDraft]);

  const replaceOrder = (order: MpOrderView) => {
    setDraft((d) =>
      d
        ? {
            ...d,
            orders: d.orders.map((o) =>
              o.orderId === order.orderId ? order : o
            ),
          }
        : d
    );
    // Expédition, producteur et prix producteur ont pu changer côté serveur.
    if (documentId) dispatch(getProjectById(documentId));
  };

  const sent = () => {
    setFormOpen(false);
    fetchDraft(true);
    if (documentId) dispatch(getProjectById(documentId));
  };

  const wrap = (children: React.ReactNode) => (
    <div
      style={{
        padding: '20px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        fontFamily: 'Inter, sans-serif',
      }}
      data-testid="master-print-tab"
    >
      <ServiceStatusBanner />
      {children}
    </div>
  );

  if (load === 'loading' && !draft)
    return wrap(<p style={muted}>Chargement…</p>);
  if (load === 'missing')
    return wrap(
      <div style={card}>
        <p style={muted}>
          Module Master Print indisponible : le serveur n’est pas encore à jour.
        </p>
      </div>
    );
  if (load === 'error') {
    return wrap(
      <div style={card}>
        <p style={{ ...muted, color: '#fca5a5' }}>{error}</p>
        <div style={{ marginTop: '10px' }}>
          <Btn onClick={() => fetchDraft()}>Réessayer</Btn>
        </div>
      </div>
    );
  }
  if (!draft) return null;

  if (!draft.configured) {
    return wrap(
      <div style={card}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>
          Master Print n’est pas encore branché
        </h3>
        <p style={muted}>
          Ajoutez sur le serveur (Heroku → Settings → Config Vars){' '}
          <code>MASTER_PRINT_CLIENT_ID</code> (MP-000022) et{' '}
          <code>MASTER_PRINT_API_KEY</code> (clé <code>mp_test_…</code> pour
          essayer, <code>mp_live_…</code> pour produire).
        </p>
      </div>
    );
  }

  const sandbox = draft.environment === 'sandbox';
  const live = draft.orders.filter((o) => o.status !== 'cancelled');
  const cost = live.reduce(
    (a, o) => a + (o.totalWithShippingExclTax ?? o.totalExclTax ?? 0),
    0
  );

  return wrap(
    <>
      <div
        style={{
          ...card,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px 16px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              alignItems: 'center',
            }}
          >
            <strong style={{ fontSize: '15px' }}>Master Print</strong>
            <Pill tone={sandbox ? SANDBOX_TONE : LIVE_TONE}>
              {sandbox ? 'Bac à sable' : 'Production'}
            </Pill>
          </div>
          <p style={muted}>
            {sandbox
              ? 'Essai : les commandes sont simulées, rien n’est produit ni facturé.'
              : 'Les commandes envoyées sont fabriquées et facturées par Master Print.'}
            {!draft.appliesToProject &&
              ' Essai depuis l’app de production : ce projet n’est pas modifié.'}
          </p>
          {!!live.length && (
            <p style={muted}>
              {live.length} commande(s) · coût {fmtEur(cost)} HT · prix du
              projet {fmtEur(draft.project.price)}
            </p>
          )}
        </div>
        {!formOpen && (
          <Btn
            variant="primary"
            onClick={() => {
              setFormSeq((n) => n + 1);
              setFormOpen(true);
            }}
          >
            <HiPaperAirplane
              aria-hidden="true"
              style={{ transform: 'rotate(90deg)' }}
            />
            {draft.orders.length
              ? 'Nouvel envoi à Master Print'
              : 'Envoyer à Master Print'}
          </Btn>
        )}
      </div>

      {/* Achat / vente / marge du projet + facture(s) d'achat PDF */}
      <MarginCard
        price={draft.project.price}
        orders={draft.orders}
        environment={draft.environment}
      />

      {draft.offer && (
        <div
          style={{
            ...card,
            borderColor:
              draft.offer.autoStatus === 'failed'
                ? 'rgba(239,68,68,0.4)'
                : 'rgba(47,111,237,0.35)',
          }}
        >
          <p style={{ ...muted, margin: 0 }}>
            <strong style={{ color: '#fff' }}>
              Commande composée par le client
            </strong>{' '}
            dans le formulaire de l’offre : {draft.offer.summary}
            {Object.keys(draft.offer.files).length > 0 &&
              ` · ${Object.keys(draft.offer.files).length} visuel(s) joint(s)`}
            {draft.offer.pegPrice != null &&
              ` · prix client ${fmtEur(draft.offer.pegPrice)} HT`}
            {draft.offer.mpTotal != null &&
              ` (achat ${fmtEur(draft.offer.mpTotal)} HT)`}
          </p>
          <p
            style={{
              ...muted,
              margin: '6px 0 0',
              color:
                draft.offer.autoStatus === 'failed'
                  ? '#fca5a5'
                  : draft.offer.autoStatus === 'sent'
                    ? '#86efac'
                    : undefined,
            }}
          >
            {draft.offer.autoStatus === 'sent'
              ? 'Transmise automatiquement à Master Print au paiement.'
              : draft.offer.autoStatus === 'failed'
                ? `Envoi automatique impossible : ${draft.offer.autoError || 'erreur inconnue'} Envoyez-la ci-dessous (configuration et visuels du client déjà remplis).`
                : draft.offer.autoStatus === 'manual'
                  ? 'Envoi automatique désactivé pour cette offre : vérifiez puis envoyez ci-dessous.'
                  : 'Envoi automatique au paiement.'}
          </p>
        </div>
      )}

      {formOpen && (
        <SendForm
          key={formSeq}
          draft={draft}
          onSent={sent}
          onClose={() => setFormOpen(false)}
        />
      )}

      {draft.orders.map((o) => (
        <OrderCard
          key={o.orderId}
          order={o}
          files={draft.files}
          onUpdated={replaceOrder}
        />
      ))}

      {!draft.orders.length && !formOpen && (
        <p style={muted}>Aucune commande Master Print pour ce projet.</p>
      )}
    </>
  );
};

export default MasterPrintTab;
