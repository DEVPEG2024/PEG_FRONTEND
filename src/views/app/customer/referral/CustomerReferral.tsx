/**
 * Espace Parrainage du client.
 *
 * Deux volets :
 *  1. « Mon parrain » — le lien avec la personne qui l'a parrainé, s'il y en a
 *     une (jusqu'ici invisible côté client) ;
 *  2. « Je parraine » — son propre code et son lien, ses filleuls, ses
 *     commissions et son solde.
 *
 * Écran en LECTURE SEULE : la validation et le versement des commissions
 * relèvent uniquement de l'administration PEG.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    TbUsers,
    TbChartBar,
    TbCoins,
    TbClock,
    TbWallet,
    TbShare3,
    TbLink,
    TbRefresh,
    TbHeartHandshake,
} from 'react-icons/tb';
import { apiGetCustomerReferralSpace, COMMISSION_STATUS_LABELS } from '@/services/GeneratorServices';
import type { CustomerReferralSpace } from '@/@types/generator';
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
} from '@/views/app/generator/components/GeneratorUI';

const pageStyle: React.CSSProperties = {
    padding: '24px',
    fontFamily: 'Inter, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
};

const FILTERS: { value: string; label: string }[] = [
    { value: 'all', label: 'Toutes' },
    { value: 'pending', label: COMMISSION_STATUS_LABELS.pending },
    { value: 'validated', label: COMMISSION_STATUS_LABELS.validated },
    { value: 'paid', label: COMMISSION_STATUS_LABELS.paid },
    { value: 'canceled', label: COMMISSION_STATUS_LABELS.canceled },
];

const CustomerReferral = () => {
    const [space, setSpace] = useState<CustomerReferralSpace | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState('all');

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setSpace(await apiGetCustomerReferralSpace());
        } catch (err: any) {
            console.error('[Parrainage] Échec chargement:', err);
            setError(
                err?.response?.data?.error?.message || 'Impossible de charger votre espace parrainage.'
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const commissions = space?.commissions ?? [];
    const filtered = useMemo(
        () => (filter === 'all' ? commissions : commissions.filter((c) => c.status === filter)),
        [commissions, filter]
    );

    if (loading) {
        return (
            <div style={{ ...pageStyle, alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
                    Chargement de votre espace parrainage…
                </p>
            </div>
        );
    }

    if (error || !space) {
        return (
            <div style={pageStyle}>
                <div style={{ ...panelStyle, textAlign: 'center' }}>
                    <p style={{ color: '#f87171', fontSize: '14px', margin: '0 0 14px' }}>
                        {error || 'Espace parrainage indisponible.'}
                    </p>
                    <button
                        onClick={load}
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

    const { sponsor, generator, stats, payouts = [], referrals = [] } = space;

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
                        Parrainage
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
                    Parrainez, gagnez
                </h1>
                {space.enabled && generator && generator.active !== false && (
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '6px 0 0' }}>
                        Vous percevez {generator.commissionRate}% de commission sur chaque commande payée
                        par une entreprise ou un particulier que vous avez parrainé, sans limite de durée.
                    </p>
                )}
            </div>

            {/* Mon parrain */}
            {sponsor && (
                <div
                    style={{
                        ...panelStyle,
                        borderColor: 'rgba(167,139,250,0.28)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        flexWrap: 'wrap',
                    }}
                >
                    <div
                        style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            flexShrink: 0,
                            background: 'rgba(167,139,250,0.14)',
                            border: '1px solid rgba(167,139,250,0.3)',
                            color: '#a78bfa',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <TbHeartHandshake size={21} />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <p
                            style={{
                                color: 'rgba(255,255,255,0.45)',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                letterSpacing: '0.09em',
                                textTransform: 'uppercase',
                                margin: '0 0 4px',
                            }}
                        >
                            Vous avez été parrainé par
                        </p>
                        <p style={{ color: '#fff', fontSize: '16px', fontWeight: 700, margin: 0 }}>
                            {sponsor.name || 'Un partenaire PEG'}
                        </p>
                        {sponsor.since && (
                            <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: '12px', margin: '4px 0 0' }}>
                                Depuis le {formatDate(sponsor.since)}
                                {sponsor.referralCode ? ` — code ${sponsor.referralCode}` : ''}
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* Parrainage entre clients fermé */}
            {!space.enabled && (
                <div style={panelStyle}>
                    <EmptyState message="Le parrainage entre clients n'est pas ouvert pour le moment. Contactez votre interlocuteur PEG pour en savoir plus." />
                </div>
            )}

            {/* Fiche suspendue par PEG : le code existe mais ne rattache plus
                personne — on ne l'affiche pas comme opérationnel, tout en
                conservant l'historique et les soldes déjà acquis. */}
            {space.enabled && generator && generator.active === false && (
                <div
                    style={{
                        ...panelStyle,
                        borderColor: 'rgba(251,146,60,0.3)',
                        background: 'rgba(251,146,60,0.06)',
                    }}
                >
                    <p style={{ color: '#fb923c', fontSize: '14px', fontWeight: 700, margin: '0 0 6px' }}>
                        Votre parrainage est suspendu
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: 0 }}>
                        Votre lien ne rattache plus de nouveaux filleuls. Vos commissions déjà acquises
                        restent dues — contactez votre interlocuteur PEG pour en savoir plus.
                    </p>
                </div>
            )}

            {space.enabled && generator && (
                <>
                    {/* Mon code et mon lien */}
                    {generator.active !== false && (
                    <div style={{ ...panelStyle, borderColor: 'rgba(47,111,237,0.28)' }}>
                        <SectionTitle
                            title="Votre lien de parrainage"
                            subtitle="Partagez-le : tout compte créé avec est rattaché à vous définitivement."
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
                                    Mon code
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
                                    Mon lien
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
                    )}

                    {/* Agrégats */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(215px, 1fr))',
                            gap: '14px',
                        }}
                    >
                        <StatCard
                            label="Mes filleuls"
                            value={String(stats?.referralsCount ?? 0)}
                            icon={<TbUsers size={19} />}
                            accent="#6b9eff"
                        />
                        <StatCard
                            label="CA généré"
                            value={formatEuros(stats?.revenueGenerated)}
                            hint={`${stats?.ordersCount ?? 0} commande(s) payée(s)`}
                            icon={<TbChartBar size={19} />}
                            accent="#a78bfa"
                        />
                        <StatCard
                            label="Commissions cumulées"
                            value={formatEuros(stats?.totalCommissions)}
                            icon={<TbCoins size={19} />}
                            accent="#fbbf24"
                        />
                        <StatCard
                            label="En attente"
                            value={formatEuros(stats?.pendingCommissions)}
                            hint="À valider par PEG"
                            icon={<TbClock size={19} />}
                            accent="#fb923c"
                        />
                        <StatCard
                            label="Solde disponible"
                            value={formatEuros(stats?.availableBalance)}
                            hint="Validé, en attente de versement"
                            icon={<TbWallet size={19} />}
                            accent="#4ade80"
                        />
                    </div>

                    {/* Mes filleuls */}
                    <div style={panelStyle}>
                        <SectionTitle
                            title="Mes filleuls"
                            subtitle={`${stats?.referralsCount ?? 0} compte(s) parrainé(s)`}
                        />
                        {referrals.length === 0 ? (
                            <EmptyState message="Aucun filleul pour le moment — partagez votre lien pour démarrer." />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {referrals.map((r) => (
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
                                        <span
                                            style={{
                                                color: '#fff',
                                                fontSize: '13.5px',
                                                fontWeight: 600,
                                                flex: 1,
                                            }}
                                        >
                                            {r.name}
                                        </span>
                                        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>
                                            Depuis le {formatDate(r.referredAt || r.createdAt)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Commissions */}
                    <div style={panelStyle}>
                        <SectionTitle
                            title="Mes commissions"
                            subtitle="Calculées uniquement sur les commandes réellement payées par vos filleuls"
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
                                                color:
                                                    filter === f.value ? '#6b9eff' : 'rgba(255,255,255,0.55)',
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

                    {/* Versements */}
                    <div style={panelStyle}>
                        <SectionTitle
                            title="Mes paiements"
                            subtitle={`Total versé : ${formatEuros(stats?.paidCommissions)}`}
                        />
                        <PayoutsTable payouts={payouts} />
                    </div>
                </>
            )}
        </div>
    );
};

export default CustomerReferral;
