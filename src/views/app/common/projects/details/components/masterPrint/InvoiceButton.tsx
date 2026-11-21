/*
 * Bouton « Facture d'achat (PDF) » d'une commande Master Print (admin) — ajout
 * 20/11/2026. Le PDF est relayé par le serveur (requête avec le jeton de
 * l'admin), puis ouvert dans un nouvel onglet (téléchargé si l'onglet est bloqué).
 * Utilisé par la page « Commandes Master Print » et la carte « Marge » du projet.
 */
import { useState } from 'react';
import { toast } from 'react-toastify';
import { HiDocumentDownload } from 'react-icons/hi';
import { apiGetMasterPrintInvoice } from '@/services/MasterPrintOrdersServices';
import { masterPrintError } from '@/utils/masterPrint';
import { errorFromText } from '@/utils/masterPrintOrders';
import { Btn } from './ui';

const FALLBACK = 'Facture indisponible pour le moment.';

/** Réponse en échec demandée en blob : le message JSON du serveur est dans le blob. */
async function messageOf(e: unknown): Promise<string> {
  const data = (e as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    const text = await data.text().catch(() => '');
    return errorFromText(text, FALLBACK);
  }
  return masterPrintError(e, FALLBACK);
}

export async function openInvoice(orderId: string): Promise<void> {
  // Onglet ouvert PENDANT le clic : ouvert après l'attente, Safari le bloquerait.
  const win = window.open('', '_blank');
  if (win) {
    try {
      win.opener = null;
      win.document.title = 'Facture d’achat';
      win.document.body.textContent = 'Chargement de la facture…';
    } catch {
      /* onglet d'une autre origine : rien à écrire */
    }
  }
  try {
    const { data } = await apiGetMasterPrintInvoice(orderId);
    const url = URL.createObjectURL(
      new Blob([data], { type: 'application/pdf' })
    );
    if (win && !win.closed) {
      win.location.href = url;
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture-achat-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch (e) {
    win?.close();
    throw new Error(await messageOf(e));
  }
}

const InvoiceButton = ({
  orderId,
  label = 'Facture d’achat (PDF)',
}: {
  orderId: string;
  label?: string;
}) => {
  const [busy, setBusy] = useState(false);
  const open = async () => {
    setBusy(true);
    try {
      await openInvoice(orderId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : FALLBACK);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Btn
      onClick={open}
      disabled={busy}
      title={`Facture Master Print de la commande ${orderId}`}
    >
      <HiDocumentDownload aria-hidden="true" />
      {busy ? 'Ouverture…' : label}
    </Btn>
  );
};

export default InvoiceButton;
