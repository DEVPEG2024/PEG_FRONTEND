/**
 * Wallet du Générateur : solde, historique complet des commissions
 * (filtrable par statut) et historique des paiements reçus.
 *
 * Écran en LECTURE SEULE — la validation et le versement des commissions sont
 * des actions strictement réservées à l'administration PEG.
 */
import { useMemo, useState } from 'react';
import { TbWallet, TbClock, TbCoins, TbCash, TbRefresh } from 'react-icons/tb';
import useGeneratorSpace from '../useGeneratorSpace';
import {
    CommissionsTable,
    PayoutsTable,
    SectionTitle,
    StatCard,
    formatEuros,
    panelStyle,
} from '../components/GeneratorUI';
import { COMMISSION_STATUS_LABELS } from '@/services/GeneratorServices';

const FILTERS: { value: string; label: string }[] = [
    { value: 'all', label: 'Toutes' },
    { value: 'pending', label: COMMISSION_STATUS_LABELS.pending },
    { value: 'validated', label: COMMISSION_STATUS_LABELS.validated },
    { value: 'paid', label: COMMISSION_STATUS_LABELS.paid },
    { value: 'canceled', label: COMMISSION_STATUS_LABELS.canceled },
];

const pageStyle: React.CSSProperties = {
    padding: '24px',
    fontFamily: 'Inter, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
};

const GeneratorWallet = () => {
    const { space, loading, error, reload } = useGeneratorSpace();
    const [filter, setFilter] = useState('all');

    const filtered = useMemo(() => {
        if (!space) return [];
        if (filter === 'all') return space.commissions;
        return space.commissions.filter((c) => c.status === filter);
    }, [space, filter]);

    if (loading) {
        return (
            <div style={{ ...pageStyle, alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Chargement de votre wallet…</p>
            </div>
        );
    }

    if (error || !space) {
        return (
            <div style={pageStyle}>
                <div style={{ ...panelStyle, textAlign: 'center' }}>
                    <p style={{ color: '#f87171', fontSize: '14px', margin: '0 0 14px' }}>
                        {error || 'Wallet indisponible.'}
                    </p>
                    <button
                        onClick={reload}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: 'rgba(255,255,255,0.8)',
                            borderRadius: '9px',
                            padding: '8px 14px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        <TbRefresh size={14} /> Réessayer
                    </button>
                </div>
            </div>
        );
    }

    const { stats, payouts } = space;

    return (
        <div style={pageStyle}>
            <div>
                <h1
                    style={{
                        color: '#fff',
                        fontSize: '24px',
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                        margin: 0,
                    }}
                >
                    Mon wallet
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '6px 0 0' }}>
                    Vos commissions deviennent disponibles une fois validées par PEG, puis versées
                    lors d&apos;un paiement.
                </p>
            </div>

            {/* Solde */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '14px',
                }}
            >
                <StatCard
                    label="Solde disponible"
                    value={formatEuros(stats.availableBalance)}
                    hint="Validé, en attente de versement"
                    icon={<TbWallet size={19} />}
                    accent="#4ade80"
                />
                <StatCard
                    label="En attente"
                    value={formatEuros(stats.pendingCommissions)}
                    hint="À valider par PEG"
                    icon={<TbClock size={19} />}
                    accent="#fb923c"
                />
                <StatCard
                    label="Déjà versé"
                    value={formatEuros(stats.paidCommissions)}
                    hint={`${payouts.length} versement(s)`}
                    icon={<TbCash size={19} />}
                    accent="#6b9eff"
                />
                <StatCard
                    label="Commissions cumulées"
                    value={formatEuros(stats.totalCommissions)}
                    hint={`CA généré : ${formatEuros(stats.revenueGenerated)}`}
                    icon={<TbCoins size={19} />}
                    accent="#fbbf24"
                />
            </div>

            {/* Historique des commissions */}
            <div style={panelStyle}>
                <SectionTitle
                    title="Historique des commandes et commissions"
                    subtitle="Une commission par commande payée par un filleul"
                    right={
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {FILTERS.map((f) => (
                                <button
                                    key={f.value}
                                    onClick={() => setFilter(f.value)}
                                    style={{
                                        background:
                                            filter === f.value
                                                ? 'rgba(47,111,237,0.18)'
                                                : 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${
                                            filter === f.value
                                                ? 'rgba(47,111,237,0.4)'
                                                : 'rgba(255,255,255,0.09)'
                                        }`,
                                        color: filter === f.value ? '#6b9eff' : 'rgba(255,255,255,0.55)',
                                        borderRadius: '100px',
                                        padding: '5px 13px',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        fontFamily: 'Inter, sans-serif',
                                    }}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    }
                />
                <CommissionsTable
                    commissions={filtered}
                    emptyMessage={
                        filter === 'all'
                            ? 'Aucune commission pour le moment.'
                            : 'Aucune commission dans cette catégorie.'
                    }
                />
            </div>

            {/* Historique des paiements */}
            <div style={panelStyle}>
                <SectionTitle
                    title="Historique des paiements"
                    subtitle={`Total versé : ${formatEuros(stats.paidCommissions)}`}
                />
                <PayoutsTable payouts={payouts} />
            </div>
        </div>
    );
};

export default GeneratorWallet;
