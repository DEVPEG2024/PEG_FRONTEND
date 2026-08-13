/**
 * Briques d'interface partagées par l'espace Générateur (tableau de bord + wallet)
 * et réutilisées par l'écran d'administration des générateurs.
 */
import { useState } from 'react';
import { TbCopy, TbCheck } from 'react-icons/tb';
import type { Commission, GeneratorPayout } from '@/@types/generator';
import {
    COMMISSION_STATUS_COLORS,
    COMMISSION_STATUS_LABELS,
    PAYOUT_METHOD_LABELS,
    formatEuros,
} from '@/services/GeneratorServices';

export const panelStyle: React.CSSProperties = {
    background: 'linear-gradient(160deg, rgba(22,28,43,0.9), rgba(13,16,24,0.9))',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '20px',
    fontFamily: 'Inter, sans-serif',
};

export const formatDate = (iso?: string | null): string => {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    } catch {
        return '—';
    }
};

export const SectionTitle = ({
    title,
    subtitle,
    right,
}: {
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
}) => (
    <div
        style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '14px',
            flexWrap: 'wrap',
        }}
    >
        <div>
            <h2
                style={{
                    color: '#fff',
                    fontSize: '16px',
                    fontWeight: 700,
                    letterSpacing: '-0.01em',
                    margin: 0,
                }}
            >
                {title}
            </h2>
            {subtitle && (
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12.5px', margin: '4px 0 0' }}>
                    {subtitle}
                </p>
            )}
        </div>
        {right}
    </div>
);

export const StatCard = ({
    label,
    value,
    hint,
    icon,
    accent = '#2f6fed',
}: {
    label: string;
    value: string;
    hint?: string;
    icon?: React.ReactNode;
    accent?: string;
}) => (
    <div
        style={{
            ...panelStyle,
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
        }}
    >
        {icon && (
            <div
                style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '11px',
                    flexShrink: 0,
                    background: `${accent}22`,
                    border: `1px solid ${accent}55`,
                    color: accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {icon}
            </div>
        )}
        <div style={{ minWidth: 0 }}>
            <p
                style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase',
                    margin: '0 0 6px',
                }}
            >
                {label}
            </p>
            <p
                style={{
                    color: '#fff',
                    fontSize: '23px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                    margin: 0,
                }}
            >
                {value}
            </p>
            {hint && (
                <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: '11.5px', margin: '6px 0 0' }}>
                    {hint}
                </p>
            )}
        </div>
    </div>
);

export const StatusBadge = ({ status }: { status: string }) => {
    const c = COMMISSION_STATUS_COLORS[status] || COMMISSION_STATUS_COLORS.pending;
    return (
        <span
            style={{
                display: 'inline-block',
                background: c.bg,
                border: `1px solid ${c.border}`,
                color: c.color,
                borderRadius: '100px',
                padding: '2px 10px',
                fontSize: '11px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
            }}
        >
            {COMMISSION_STATUS_LABELS[status] || status}
        </span>
    );
};

export const EmptyState = ({ message }: { message: string }) => (
    <p
        style={{
            color: 'rgba(255,255,255,0.35)',
            fontSize: '13px',
            textAlign: 'center',
            padding: '26px 12px',
            margin: 0,
        }}
    >
        {message}
    </p>
);

/** Bouton « copier » générique avec retour visuel */
export const CopyButton = ({ value, label }: { value: string; label?: string }) => {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
        } catch {
            // Repli pour les navigateurs / contextes sans Clipboard API
            const input = document.createElement('textarea');
            input.value = value;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    return (
        <button
            type="button"
            onClick={copy}
            aria-label={label ? `Copier ${label}` : 'Copier'}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${copied ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.12)'}`,
                color: copied ? '#4ade80' : 'rgba(255,255,255,0.75)',
                borderRadius: '9px',
                padding: '7px 12px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                whiteSpace: 'nowrap',
            }}
        >
            {copied ? <TbCheck size={14} /> : <TbCopy size={14} />}
            {copied ? 'Copié' : label || 'Copier'}
        </button>
    );
};

const thStyle: React.CSSProperties = {
    textAlign: 'left',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '10.5px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding: '0 12px 10px',
    whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.8)',
    fontSize: '13px',
    padding: '11px 12px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    verticalAlign: 'middle',
};

/**
 * Historique des commandes et commissions.
 * `renderActions` permet à l'écran admin d'ajouter ses boutons (valider/annuler)
 * sans dupliquer le tableau côté générateur (lecture seule).
 */
export const CommissionsTable = ({
    commissions,
    showCustomer = true,
    renderActions,
    emptyMessage = 'Aucune commission pour le moment.',
}: {
    commissions: Commission[];
    showCustomer?: boolean;
    renderActions?: (c: Commission) => React.ReactNode;
    emptyMessage?: string;
}) => {
    if (!commissions.length) return <EmptyState message={emptyMessage} />;

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '640px' }}>
                <thead>
                    <tr>
                        <th style={thStyle}>Date</th>
                        <th style={thStyle}>Commande</th>
                        {showCustomer && <th style={thStyle}>Filleul</th>}
                        <th style={{ ...thStyle, textAlign: 'right' }}>CA HT</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Taux</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Commission</th>
                        <th style={thStyle}>Statut</th>
                        {renderActions && <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {commissions.map((c) => (
                        <tr key={c.documentId}>
                            <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(c.date)}</td>
                            <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.6)' }}>
                                {c.reference || c.invoice?.name || '—'}
                            </td>
                            {showCustomer && (
                                <td style={tdStyle}>{c.customer?.name || '—'}</td>
                            )}
                            <td style={{ ...tdStyle, textAlign: 'right' }}>{formatEuros(c.baseAmount)}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', color: 'rgba(255,255,255,0.55)' }}>
                                {c.rate}%
                            </td>
                            <td
                                style={{
                                    ...tdStyle,
                                    textAlign: 'right',
                                    fontWeight: 700,
                                    color: c.status === 'canceled' ? 'rgba(255,255,255,0.35)' : '#fff',
                                    textDecoration: c.status === 'canceled' ? 'line-through' : 'none',
                                }}
                            >
                                {formatEuros(c.amount)}
                            </td>
                            <td style={tdStyle}>
                                <StatusBadge status={c.status} />
                                {c.status === 'canceled' && c.cancelReason && (
                                    <div
                                        style={{
                                            color: 'rgba(255,255,255,0.3)',
                                            fontSize: '11px',
                                            marginTop: '3px',
                                        }}
                                    >
                                        {c.cancelReason}
                                    </div>
                                )}
                            </td>
                            {renderActions && (
                                <td style={{ ...tdStyle, textAlign: 'right' }}>{renderActions(c)}</td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

/** Historique des versements reçus par le générateur */
export const PayoutsTable = ({
    payouts,
    emptyMessage = 'Aucun versement pour le moment.',
}: {
    payouts: GeneratorPayout[];
    emptyMessage?: string;
}) => {
    if (!payouts.length) return <EmptyState message={emptyMessage} />;

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px' }}>
                <thead>
                    <tr>
                        <th style={thStyle}>Date</th>
                        <th style={thStyle}>Moyen</th>
                        <th style={thStyle}>Référence</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Commissions</th>
                        <th style={{ ...thStyle, textAlign: 'right' }}>Montant</th>
                    </tr>
                </thead>
                <tbody>
                    {payouts.map((p) => (
                        <tr key={p.documentId}>
                            <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>{formatDate(p.date)}</td>
                            <td style={tdStyle}>{PAYOUT_METHOD_LABELS[p.method] || p.method}</td>
                            <td style={{ ...tdStyle, color: 'rgba(255,255,255,0.55)' }}>
                                {p.reference || '—'}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', color: 'rgba(255,255,255,0.55)' }}>
                                {p.commissionsCount ?? '—'}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: '#4ade80' }}>
                                {formatEuros(p.amount)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export { formatEuros };
