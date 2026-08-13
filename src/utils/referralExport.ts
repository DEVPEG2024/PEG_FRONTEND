/**
 * Export des commissions et des versements au format CSV.
 *
 * Volontairement un RELEVÉ, pas une facture : aucune mention légale, aucune
 * TVA, aucun numéro de pièce. Produire une facture engagerait des choix
 * fiscaux (statut du parrain, auto-facturation, TVA) qui relèvent de PEG et de
 * son comptable, pas de l'application.
 *
 * Généré dans le navigateur à partir des données déjà affichées : ce qu'on
 * exporte est exactement ce que l'utilisateur voit à l'écran, filtres compris.
 */
import type { Commission, GeneratorPayout } from '@/@types/generator';
import { COMMISSION_STATUS_LABELS, PAYOUT_METHOD_LABELS } from '@/services/GeneratorServices';

/** Séparateur `;` et décimale `,` : c'est ce qu'attend Excel en configuration française. */
const SEP = ';';

const cell = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const text = String(value);
    // Une valeur contenant le séparateur, un guillemet ou un saut de ligne doit
    // être encadrée, et ses guillemets doublés.
    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const money = (n: number | undefined | null): string =>
    (Number(n) || 0).toFixed(2).replace('.', ',');

const day = (iso?: string | null): string => {
    if (!iso) return '';
    try {
        return new Date(iso).toLocaleDateString('fr-FR');
    } catch {
        return '';
    }
};

/** Déclenche le téléchargement d'un CSV encodé UTF-8 avec BOM (accents corrects dans Excel). */
function download(filename: string, rows: string[][]): void {
    const csv = rows.map((r) => r.map(cell).join(SEP)).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

const stamp = (): string => new Date().toISOString().slice(0, 10);

/** Nom de fichier sûr, dérivé du nom du parrain */
const slug = (name?: string): string =>
    (name || 'parrain')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();

/**
 * Relevé des commissions. Exporte la liste telle qu'elle est affichée —
 * si un filtre de statut est actif, il s'applique à l'export.
 */
export function exportCommissionsCsv(
    commissions: Commission[],
    sponsorName?: string,
    options: { withCustomer?: boolean } = {}
): void {
    const withCustomer = options.withCustomer !== false;
    const header = [
        'Date',
        'Commande',
        ...(withCustomer ? ['Filleul'] : []),
        'CA HT (EUR)',
        'Taux (%)',
        'Commission (EUR)',
        'Statut',
        'Validée le',
        'Payée le',
    ];
    const rows = commissions.map((c) => [
        day(c.date),
        c.reference || c.invoice?.name || '',
        ...(withCustomer ? [c.customer?.name || ''] : []),
        money(c.baseAmount),
        String(c.rate ?? ''),
        money(c.amount),
        COMMISSION_STATUS_LABELS[c.status] || c.status,
        day(c.validatedAt),
        day(c.paidAt),
    ]);
    download(`commissions-${slug(sponsorName)}-${stamp()}.csv`, [header, ...rows]);
}

/** Relevé des versements reçus (montant, moyen, référence, justificatif). */
export function exportPayoutsCsv(payouts: GeneratorPayout[], sponsorName?: string): void {
    const header = ['Date', 'Moyen', 'Référence', 'Commissions soldées', 'Montant (EUR)', 'Justificatif'];
    const rows = payouts.map((p) => [
        day(p.date),
        PAYOUT_METHOD_LABELS[p.method] || p.method,
        p.reference || '',
        String(p.commissionsCount ?? ''),
        money(p.amount),
        p.proofUrl ? p.proofName || 'joint' : '',
    ]);
    download(`versements-${slug(sponsorName)}-${stamp()}.csv`, [header, ...rows]);
}
