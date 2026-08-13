/**
 * Tableau de bord du Générateur (apporteur d'affaires).
 *
 * Affiche son code et son lien de parrainage, ses agrégats (filleuls, CA généré,
 * commissions cumulées / en attente / disponibles) et les derniers mouvements.
 * Le détail complet (toutes les commissions, tous les versements) est dans
 * « Mon wallet ».
 */
import { Link } from 'react-router-dom';
import {
    TbUsers,
    TbChartBar,
    TbCoins,
    TbClock,
    TbWallet,
    TbShare3,
    TbLink,
    TbArrowRight,
    TbRefresh,
} from 'react-icons/tb';
import useGeneratorSpace from '../useGeneratorSpace';
import {
    CommissionsTable,
    CopyButton,
    EmptyState,
    PayoutsTable,
    SectionTitle,
    StatCard,
    formatDate,
    formatEuros,
    panelStyle,
} from '../components/GeneratorUI';

const pageStyle: React.CSSProperties = {
    padding: '24px',
    fontFamily: 'Inter, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
};

const DashboardGenerator = () => {
    const { space, loading, error, reload } = useGeneratorSpace();

    if (loading) {
        return (
            <div style={{ ...pageStyle, alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                    Chargement de votre espace Générateur…
                </p>
            </div>
        );
    }

    if (error || !space) {
        return (
            <div style={pageStyle}>
                <div style={{ ...panelStyle, textAlign: 'center' }}>
                    <p style={{ color: '#f87171', fontSize: '14px', margin: '0 0 14px' }}>
                        {error || 'Espace Générateur indisponible.'}
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

    const { generator, stats, commissions, payouts, referrals } = space;
    const lastCommissions = commissions.slice(0, 6);
    const lastReferrals = referrals.slice(0, 6);

    return (
        <div style={pageStyle}>
            {/* En-tête */}
            <div>
                <div
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '7px',
                        background: 'rgba(47,111,237,0.1)',
                        border: '1px solid rgba(47,111,237,0.22)',
                        borderRadius: '100px',
                        padding: '4px 13px',
                        marginBottom: '10px',
                    }}
                >
                    <TbShare3 size={13} style={{ color: '#6b9eff' }} />
                    <span
                        style={{
                            color: '#6b9eff',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                        }}
                    >
                        Espace Générateur
                    </span>
                </div>
                <h1
                    style={{
                        color: '#fff',
                        fontSize: '24px',
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                        margin: 0,
                    }}
                >
                    {generator.name || 'Mon parrainage'}
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '6px 0 0' }}>
                    Vous percevez {generator.commissionRate}% de commission sur chaque commande payée
                    par un filleul, sans limite de durée.
                </p>
            </div>

            {/* Code et lien de parrainage */}
            <div style={{ ...panelStyle, borderColor: 'rgba(47,111,237,0.28)' }}>
                <SectionTitle
                    title="Votre parrainage"
                    subtitle="Partagez votre code ou votre lien : tout compte créé avec est rattaché à vous définitivement."
                />
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '14px',
                    }}
                >
                    <div
                        style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '12px',
                            padding: '14px 16px',
                        }}
                    >
                        <p
                            style={{
                                color: 'rgba(255,255,255,0.45)',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                letterSpacing: '0.09em',
                                textTransform: 'uppercase',
                                margin: '0 0 8px',
                            }}
                        >
                            Code de parrainage
                        </p>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px',
                            }}
                        >
                            <span
                                style={{
                                    color: '#fff',
                                    fontSize: '20px',
                                    fontWeight: 800,
                                    letterSpacing: '0.06em',
                                    wordBreak: 'break-all',
                                }}
                            >
                                {generator.referralCode || '—'}
                            </span>
                            {generator.referralCode && (
                                <CopyButton value={generator.referralCode} label="le code" />
                            )}
                        </div>
                    </div>

                    <div
                        style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '12px',
                            padding: '14px 16px',
                        }}
                    >
                        <p
                            style={{
                                color: 'rgba(255,255,255,0.45)',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                letterSpacing: '0.09em',
                                textTransform: 'uppercase',
                                margin: '0 0 8px',
                            }}
                        >
                            Lien de parrainage
                        </p>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '10px',
                            }}
                        >
                            <span
                                style={{
                                    color: 'rgba(255,255,255,0.7)',
                                    fontSize: '12.5px',
                                    wordBreak: 'break-all',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <TbLink size={14} style={{ flexShrink: 0, color: '#6b9eff' }} />
                                {generator.referralLink}
                            </span>
                            {generator.referralLink && (
                                <CopyButton value={generator.referralLink} label="le lien" />
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Agrégats */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '14px',
                }}
            >
                <StatCard
                    label="Filleuls"
                    value={String(stats.referralsCount ?? 0)}
                    hint="Clients rattachés à votre code"
                    icon={<TbUsers size={19} />}
                    accent="#6b9eff"
                />
                <StatCard
                    label="CA généré"
                    value={formatEuros(stats.revenueGenerated)}
                    hint={`${stats.ordersCount} commande(s) payée(s)`}
                    icon={<TbChartBar size={19} />}
                    accent="#a78bfa"
                />
                <StatCard
                    label="Commissions cumulées"
                    value={formatEuros(stats.totalCommissions)}
                    hint="Depuis le début"
                    icon={<TbCoins size={19} />}
                    accent="#fbbf24"
                />
                <StatCard
                    label="En attente"
                    value={formatEuros(stats.pendingCommissions)}
                    hint="À valider par PEG"
                    icon={<TbClock size={19} />}
                    accent="#fb923c"
                />
                <StatCard
                    label="Solde disponible"
                    value={formatEuros(stats.availableBalance)}
                    hint="Validé, en attente de versement"
                    icon={<TbWallet size={19} />}
                    accent="#4ade80"
                />
            </div>

            {/* Derniers filleuls */}
            <div style={panelStyle}>
                <SectionTitle
                    title="Vos filleuls"
                    subtitle={`${stats.referralsCount ?? 0} client(s) parrainé(s)`}
                />
                {lastReferrals.length === 0 ? (
                    <EmptyState message="Aucun filleul pour le moment — partagez votre lien pour démarrer." />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {lastReferrals.map((r) => (
                            <div
                                key={r.documentId}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '11px',
                                    padding: '10px 14px',
                                }}
                            >
                                <div
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '9px',
                                        flexShrink: 0,
                                        background: 'rgba(47,111,237,0.14)',
                                        border: '1px solid rgba(47,111,237,0.28)',
                                        color: '#6b9eff',
                                        fontWeight: 800,
                                        fontSize: '13px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {(r.name || '?').charAt(0).toUpperCase()}
                                </div>
                                <span style={{ color: '#fff', fontSize: '13.5px', fontWeight: 600, flex: 1 }}>
                                    {r.name}
                                </span>
                                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>
                                    Depuis le {formatDate(r.referredAt || r.createdAt)}
                                </span>
                            </div>
                        ))}
                        {referrals.length > lastReferrals.length && (
                            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', margin: '4px 0 0' }}>
                                + {referrals.length - lastReferrals.length} autre(s) filleul(s)
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Dernières commissions */}
            <div style={panelStyle}>
                <SectionTitle
                    title="Dernières commandes et commissions"
                    subtitle="Commissions calculées uniquement sur les commandes réellement payées"
                    right={
                        <Link
                            to="/generator/wallet"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: '#6b9eff',
                                fontSize: '12.5px',
                                fontWeight: 600,
                                textDecoration: 'none',
                            }}
                        >
                            Voir tout <TbArrowRight size={14} />
                        </Link>
                    }
                />
                <CommissionsTable commissions={lastCommissions} />
            </div>

            {/* Derniers versements */}
            <div style={panelStyle}>
                <SectionTitle
                    title="Derniers paiements reçus"
                    subtitle={`Total versé : ${formatEuros(stats.paidCommissions)}`}
                />
                <PayoutsTable payouts={payouts.slice(0, 5)} />
            </div>
        </div>
    );
};

export default DashboardGenerator;
