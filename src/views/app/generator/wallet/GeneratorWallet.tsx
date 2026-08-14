/**
 * Wallet du Générateur : solde, retraits, historique complet des commissions
 * (filtrable par statut) et historique des paiements reçus.
 *
 * Le Générateur peut demander un retrait de ses commissions VALIDÉES ; la
 * validation des commissions et l'exécution du versement restent des actions
 * strictement réservées à l'administration PEG.
 */
import { useMemo, useState } from 'react';
import { TbWallet, TbClock, TbCoins, TbCash, TbRefresh, TbHourglassLow, TbDownload } from 'react-icons/tb';
import useGeneratorSpace from '../useGeneratorSpace';
import {
    CommissionsTable,
    PayoutsTable,
    SectionTitle,
    StatCard,
    formatEuros,
    panelStyle,
} from '../components/GeneratorUI';
import WalletWithdrawal from '../components/WalletWithdrawal';
import { COMMISSION_STATUS_LABELS, commissionAmounts } from '@/services/GeneratorServices';
import { exportCommissionsCsv, exportPayoutsCsv } from '@/utils/referralExport';

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

    const { generator, stats, payouts } = space;

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
                    lors d&apos;un paiement.{' '}
                    {generator?.vatRegistered
                        ? 'Les montants sont indiqués hors taxes ; la TVA est détaillée dans le tableau.'
                        : 'Les montants sont nets : vous n\'êtes pas assujetti à la TVA.'}
                </p>
            </div>

            {generator.active === false && (
                <div
                    style={{
                        ...panelStyle,
                        borderColor: 'rgba(251,146,60,0.3)',
                        background: 'rgba(251,146,60,0.06)',
                    }}
                >
                    <p style={{ color: '#fb923c', fontSize: '14px', fontWeight: 700, margin: '0 0 6px' }}>
                        Votre compte Générateur est suspendu
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: 0 }}>
                        Votre lien ne rattache plus de nouveaux filleuls et aucune nouvelle commission
                        n'est générée. Vos commissions déjà acquises restent dues — contactez PEG.
                    </p>
                </div>
            )}

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
                    hint={
                        generator?.vatRegistered
                            ? `Soit ${formatEuros(commissionAmounts(stats.availableBalance, true).ttc)} TTC`
                            : 'Validé, en attente de versement'
                    }
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
                <StatCard
                    label="En attente d'encaissement"
                    value={formatEuros(stats.awaitingCommission)}
                    hint={`Estimation sur ${stats.awaitingCount ?? 0} commande(s) non encore payée(s)`}
                    icon={<TbHourglassLow size={19} />}
                    accent="#94a3b8"
                />
            </div>

            {/* Retraits — coordonnées bancaires et demandes */}
            <WalletWithdrawal
                bank={space.bank}
                requestState={space.requestState}
                requests={space.payoutRequests}
                creditBalance={space.creditBalance}
                // Un apporteur d'affaires n'a pas de panier : le virement est sa
                // seule destination possible.
                allowStoreCredit={false}
                minPayoutAmount={space.minPayoutAmount}
                onChanged={reload}
            />

            {/* Historique des commissions */}
            <div style={panelStyle}>
                <SectionTitle
                    title="Historique des commandes et commissions"
                    subtitle="Une commission par commande payée par un filleul"
                    right={
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                            type="button"
                            onClick={() => exportCommissionsCsv(filtered, generator?.name, { vatRegistered: generator?.vatRegistered })}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                color: 'rgba(255,255,255,0.75)',
                                borderRadius: '9px', padding: '6px 12px',
                                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                fontFamily: 'Inter, sans-serif',
                            }}
                            title="Relevé CSV — pour votre comptabilité"
                        >
                            <TbDownload size={14} /> Exporter
                        </button>
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
                    vatRegistered={generator?.vatRegistered}
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
                    right={<button
                            type="button"
                            onClick={() => exportPayoutsCsv(payouts, generator?.name)}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                color: 'rgba(255,255,255,0.75)',
                                borderRadius: '9px', padding: '6px 12px',
                                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                fontFamily: 'Inter, sans-serif',
                            }}
                            title="Relevé CSV — pour votre comptabilité"
                        >
                            <TbDownload size={14} /> Exporter
                        </button>}
                />
                <PayoutsTable payouts={payouts} />
            </div>
        </div>
    );
};

export default GeneratorWallet;
