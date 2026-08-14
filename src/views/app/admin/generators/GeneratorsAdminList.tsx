/**
 * Administration du programme « Générateur » (apporteurs d'affaires).
 *
 * Permet à l'administrateur de :
 *  - définir / modifier le taux de commission (global et par générateur) ;
 *  - créer un Générateur et son compte d'accès ;
 *  - consulter les filleuls rattachés à chaque Générateur ;
 *  - modifier exceptionnellement un rattachement (rattacher / détacher) ;
 *  - valider les commissions et enregistrer les versements ;
 *  - annuler une commission (remboursement ou annulation de commande).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
    TbShare3,
    TbPlus,
    TbRefresh,
    TbCheck,
    TbX,
    TbChevronDown,
    TbChevronRight,
    TbCash,
    TbUsers,
    TbSearch,
    TbLink,
    TbKey,
    TbHourglassLow,
    TbDownload,
    TbCamera,
    TbPaperclip,
} from 'react-icons/tb';
import type {
    GeneratorAdminDetail,
    GeneratorAdminRow,
    PayoutRequestAdminRow,
    ReferralCustomer,
    ReferralSettings,
} from '@/@types/generator';
import {
    apiCreateGenerator,
    apiCreateGeneratorPayout,
    apiGetGeneratorDetail,
    apiGetGenerators,
    apiGetPayoutRequests,
    apiProcessPayoutRequest,
    apiSearchReferralCustomers,
    apiSetCommissionStatus,
    apiSetCustomerGenerator,
    apiSetGeneratorAccount,
    apiUpdateGenerator,
    apiUpdateReferralSettings,
    formatEuros,
} from '@/services/GeneratorServices';
import { apiUploadFile } from '@/services/FileServices';
import { exportCommissionsCsv, exportPayoutsCsv } from '@/utils/referralExport';
import {
    CommissionsTable,
    CopyButton,
    EmptyState,
    PayoutsTable,
    SectionTitle,
    StatCard,
    formatDate,
    panelStyle,
} from '@/views/app/generator/components/GeneratorUI';

// ───────────────────────────── Styles partagés ───────────────────────────────

const pageStyle: React.CSSProperties = {
    padding: '24px',
    fontFamily: 'Inter, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '9px',
    padding: '9px 12px',
    color: '#fff',
    fontSize: '13px',
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.04em',
    marginBottom: '5px',
    display: 'block',
};

const buttonStyle = (variant: 'primary' | 'ghost' | 'danger' | 'success'): React.CSSProperties => {
    const palette = {
        primary: { bg: 'linear-gradient(90deg, #2f6fed, #1f4bb6)', border: 'none', color: '#fff' },
        ghost: {
            bg: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.75)',
        },
        danger: {
            bg: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#f87171',
        },
        success: {
            bg: 'rgba(34,197,94,0.14)',
            border: '1px solid rgba(34,197,94,0.32)',
            color: '#4ade80',
        },
    }[variant];
    return {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        background: palette.bg,
        border: palette.border,
        color: palette.color,
        borderRadius: '9px',
        padding: '8px 13px',
        fontSize: '12.5px',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'Inter, sans-serif',
        whiteSpace: 'nowrap',
    };
};

// ──────────────────────────────── Modale ─────────────────────────────────────

const Modal = ({
    title,
    onClose,
    children,
    width = 460,
}: {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    width?: number;
}) => (
    <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
        }}
    >
        <div
            onClick={onClose}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        />
        <div
            style={{
                position: 'relative',
                width: '100%',
                maxWidth: `${width}px`,
                background: 'linear-gradient(145deg, #0f1623, #111827)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '16px',
                padding: '24px',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                maxHeight: '88vh',
                overflowY: 'auto',
                fontFamily: 'Inter, sans-serif',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '18px',
                }}
            >
                <h3 style={{ color: '#fff', fontSize: '17px', fontWeight: 700, margin: 0 }}>{title}</h3>
                <button
                    onClick={onClose}
                    aria-label="Fermer"
                    style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '8px',
                        color: 'rgba(255,255,255,0.5)',
                        cursor: 'pointer',
                        width: '30px',
                        height: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <TbX size={15} />
                </button>
            </div>
            {children}
        </div>
    </div>
);

// ─────────────────────────────── Écran ───────────────────────────────────────


/**
 * Ouvre un sélecteur de fichier et renvoie le justificatif choisi, ou `null`
 * si l'admin passe l'étape. Volontairement facultatif : ne jamais empêcher
 * d'enregistrer un versement réellement effectué.
 */
function pickProofFile(): Promise<File | null> {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,application/pdf';
        input.onchange = () => resolve(input.files?.[0] ?? null);
        input.oncancel = () => resolve(null);
        input.click();
    });
}

const emptyCreateForm = {
    name: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    commissionRate: '',
    phoneNumber: '',
    city: '',
    payoutDetails: '',
    notes: '',
};

const GeneratorsAdminList = () => {
    const [rows, setRows] = useState<GeneratorAdminRow[]>([]);
    const [settings, setSettings] = useState<ReferralSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    const [globalRateDraft, setGlobalRateDraft] = useState('');
    const [customerRateDraft, setCustomerRateDraft] = useState('');
    const [kindFilter, setKindFilter] = useState<'all' | 'partner' | 'customer'>('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [detail, setDetail] = useState<GeneratorAdminDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ ...emptyCreateForm });

    const [payoutFor, setPayoutFor] = useState<GeneratorAdminRow | null>(null);
    const [payoutForm, setPayoutForm] = useState({ method: 'transfer', reference: '', note: '' });
    /** Justificatif choisi mais pas encore téléversé : l'envoi a lieu à la validation */
    const [proofFile, setProofFile] = useState<File | null>(null);

    const [accountFor, setAccountFor] = useState<GeneratorAdminRow | null>(null);
    const [accountForm, setAccountForm] = useState({ email: '', password: '', firstName: '', lastName: '' });

    const [cancelTarget, setCancelTarget] = useState<{ documentId: string; reference: string } | null>(null);
    const [cancelReason, setCancelReason] = useState('');

    const [customerQuery, setCustomerQuery] = useState('');
    const [customerResults, setCustomerResults] = useState<ReferralCustomer[]>([]);
    const [searching, setSearching] = useState(false);

    const [pendingRequests, setPendingRequests] = useState<PayoutRequestAdminRow[]>([]);

    // ── Chargement ──
    const loadRequests = useCallback(async () => {
        try {
            setPendingRequests(await apiGetPayoutRequests('pending'));
        } catch (err) {
            // Le backend peut ne pas encore exposer la route : l'écran doit
            // rester utilisable pour tout le reste.
            console.error('[Generators] Échec chargement des demandes de retrait:', err);
        }
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await apiGetGenerators();
            setRows(data.generators);
            setSettings(data.settings);
            setGlobalRateDraft(String(data.settings.defaultCommissionRate));
            setCustomerRateDraft(String(data.settings.customerCommissionRate));
            await loadRequests();
        } catch (err) {
            console.error('[Generators] Échec chargement:', err);
            toast.error('Erreur lors du chargement des générateurs');
        } finally {
            setLoading(false);
        }
    }, [loadRequests]);

    /** Verse ou refuse une demande de retrait */
    const processRequest = async (row: PayoutRequestAdminRow, action: 'approve' | 'reject') => {
        if (action === 'reject') {
            const reason = window.prompt('Motif du refus (communiqué au parrain, facultatif) :') ?? '';
            setBusy(true);
            try {
                await apiProcessPayoutRequest(row.documentId, { action, rejectReason: reason });
                toast.success('Demande refusée — les commissions sont de nouveau disponibles.');
                await load();
            } catch (err: any) {
                toast.error(err?.response?.data?.error?.message || 'Traitement impossible');
            } finally {
                setBusy(false);
            }
            return;
        }

        const reference = window.prompt('Référence du virement (facultatif) :') ?? '';
        // Justificatif : sans lui, un versement ne laisse qu'une ligne de texte.
        // Le parrain le retrouve dans son wallet, et la comptabilité aussi.
        let proofFile: string | number | null = null;
        try {
            const picked = await pickProofFile();
            if (picked) {
                const uploaded: any = await apiUploadFile(picked);
                proofFile = uploaded?.id ?? null;
            }
        } catch {
            toast.error("Le justificatif n'a pas pu être envoyé — le versement est enregistré sans.");
        }
        setBusy(true);
        try {
            const res = await apiProcessPayoutRequest(row.documentId, {
                action,
                method: 'transfer',
                reference,
                proofFile,
            });
            toast.success(`Versement de ${formatEuros(res.amount)} enregistré.`);
            await load();
        } catch (err: any) {
            toast.error(err?.response?.data?.error?.message || 'Traitement impossible');
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => {
        load();
    }, [load]);

    // Dernier détail demandé : en dépliant deux parrains coup sur coup, la
    // réponse la plus lente pouvait écraser la plus récente — on affichait alors
    // (et on modifiait) le détail d'un AUTRE parrain sous la ligne dépliée.
    const lastDetailRequest = useRef<string | null>(null);

    const loadDetail = useCallback(async (documentId: string) => {
        lastDetailRequest.current = documentId;
        setDetailLoading(true);
        try {
            const data = await apiGetGeneratorDetail(documentId);
            if (lastDetailRequest.current !== documentId) return; // réponse périmée
            setDetail(data);
        } catch (err) {
            console.error('[Generators] Échec chargement du détail:', err);
            if (lastDetailRequest.current === documentId) {
                toast.error('Erreur lors du chargement du détail');
            }
        } finally {
            if (lastDetailRequest.current === documentId) setDetailLoading(false);
        }
    }, []);

    const toggleExpand = (documentId: string) => {
        if (expandedId === documentId) {
            setExpandedId(null);
            setDetail(null);
            lastDetailRequest.current = null;
            return;
        }
        setExpandedId(documentId);
        setDetail(null);
        setCustomerQuery('');
        setCustomerResults([]);
        loadDetail(documentId);
    };

    const refreshAll = async (documentId?: string) => {
        await load();
        if (documentId) await loadDetail(documentId);
    };

    // ── Réglages globaux ──
    const saveGlobalRate = async () => {
        const rate = Number(globalRateDraft.replace(',', '.'));
        if (isNaN(rate) || rate < 0 || rate > 100) {
            toast.error('Taux invalide (0 à 100)');
            return;
        }
        setBusy(true);
        try {
            const updated = await apiUpdateReferralSettings({ defaultCommissionRate: rate });
            setSettings(updated);
            toast.success(`Taux de commission par défaut : ${rate}%`);
            await load();
        } catch {
            toast.error('Erreur lors de la mise à jour du taux');
        } finally {
            setBusy(false);
        }
    };

    const saveCustomerRate = async () => {
        const rate = Number(customerRateDraft.replace(',', '.'));
        if (isNaN(rate) || rate < 0 || rate > 100) {
            toast.error('Taux invalide (0 à 100)');
            return;
        }
        setBusy(true);
        try {
            const updated = await apiUpdateReferralSettings({ customerCommissionRate: rate });
            setSettings(updated);
            toast.success(`Taux des clients parrains : ${rate}%`);
            await load();
        } catch {
            toast.error('Erreur lors de la mise à jour du taux client');
        } finally {
            setBusy(false);
        }
    };

    const toggleCustomerReferral = async () => {
        if (!settings) return;
        setBusy(true);
        try {
            const updated = await apiUpdateReferralSettings({
                customerReferralEnabled: !settings.customerReferralEnabled,
            });
            setSettings(updated);
            toast.success(
                updated.customerReferralEnabled
                    ? 'Le parrainage entre clients est ouvert'
                    : 'Le parrainage entre clients est fermé'
            );
        } catch {
            toast.error('Erreur lors de la mise à jour');
        } finally {
            setBusy(false);
        }
    };

    const toggleAutoValidate = async () => {
        if (!settings) return;
        setBusy(true);
        try {
            const updated = await apiUpdateReferralSettings({ autoValidate: !settings.autoValidate });
            setSettings(updated);
            toast.success(
                updated.autoValidate
                    ? 'Les nouvelles commissions seront validées automatiquement'
                    : 'Les nouvelles commissions devront être validées manuellement'
            );
        } catch {
            toast.error('Erreur lors de la mise à jour');
        } finally {
            setBusy(false);
        }
    };

    // ── Générateurs ──
    const createGenerator = async () => {
        if (!createForm.name.trim()) {
            toast.error('Le nom est obligatoire');
            return;
        }
        setBusy(true);
        try {
            const created = await apiCreateGenerator({
                ...createForm,
                commissionRate: createForm.commissionRate === '' ? null : createForm.commissionRate,
            });
            toast.success(
                `Générateur créé — code ${created.referralCode}${
                    created.userCreated ? ' (compte d\'accès créé)' : ''
                }`
            );
            setShowCreate(false);
            setCreateForm({ ...emptyCreateForm });
            await load();
        } catch (err: any) {
            toast.error(err?.response?.data?.error?.message || 'Erreur lors de la création');
        } finally {
            setBusy(false);
        }
    };

    const saveGeneratorRate = async (row: GeneratorAdminRow, raw: string) => {
        const trimmed = raw.trim();
        const value = trimmed === '' ? null : Number(trimmed.replace(',', '.'));
        if (value !== null && (isNaN(value) || value < 0 || value > 100)) {
            toast.error('Taux invalide (0 à 100)');
            return;
        }
        setBusy(true);
        try {
            await apiUpdateGenerator(row.documentId, { commissionRate: value });
            toast.success(
                value === null
                    ? `${row.name} suit désormais le taux global`
                    : `Taux de ${row.name} : ${value}%`
            );
            await refreshAll(expandedId === row.documentId ? row.documentId : undefined);
        } catch {
            toast.error('Erreur lors de la mise à jour du taux');
        } finally {
            setBusy(false);
        }
    };

    const toggleVat = async (row: GeneratorAdminRow) => {
        setBusy(true);
        try {
            await apiUpdateGenerator(row.documentId, { vatRegistered: !row.vatRegistered });
            toast.success(
                row.vatRegistered
                    ? `${row.name} : non assujetti — montants nets, sans TVA`
                    : `${row.name} : assujetti — HT, TVA et TTC détaillés`
            );
            await refreshAll(expandedId === row.documentId ? row.documentId : undefined);
        } catch {
            toast.error('Erreur lors de la mise à jour');
        } finally {
            setBusy(false);
        }
    };

    const toggleActive = async (row: GeneratorAdminRow) => {
        setBusy(true);
        try {
            await apiUpdateGenerator(row.documentId, { active: !row.active });
            toast.success(row.active ? `${row.name} désactivé` : `${row.name} réactivé`);
            await refreshAll(expandedId === row.documentId ? row.documentId : undefined);
        } catch {
            toast.error('Erreur lors de la mise à jour');
        } finally {
            setBusy(false);
        }
    };

    const submitAccount = async () => {
        if (!accountFor) return;
        setBusy(true);
        try {
            const res = await apiSetGeneratorAccount(accountFor.documentId, accountForm);
            toast.success(
                res.created
                    ? `Compte d'accès créé — ${res.email} peut désormais se connecter`
                    : `Compte mis à jour — ${res.email}`
            );
            setAccountFor(null);
            setAccountForm({ email: '', password: '', firstName: '', lastName: '' });
            await load();
        } catch (err: any) {
            toast.error(err?.response?.data?.error?.message || 'Erreur sur le compte d\'accès');
        } finally {
            setBusy(false);
        }
    };

    // ── Commissions ──
    const validateCommission = async (documentId: string) => {
        setBusy(true);
        try {
            await apiSetCommissionStatus(documentId, 'validated');
            toast.success('Commission validée — elle passe dans le solde disponible');
            await refreshAll(expandedId || undefined);
        } catch (err: any) {
            toast.error(err?.response?.data?.error?.message || 'Erreur lors de la validation');
        } finally {
            setBusy(false);
        }
    };

    const confirmCancelCommission = async () => {
        if (!cancelTarget) return;
        setBusy(true);
        try {
            await apiSetCommissionStatus(cancelTarget.documentId, 'canceled', cancelReason || undefined);
            toast.success('Commission annulée');
            setCancelTarget(null);
            setCancelReason('');
            await refreshAll(expandedId || undefined);
        } catch (err: any) {
            toast.error(err?.response?.data?.error?.message || "Erreur lors de l'annulation");
        } finally {
            setBusy(false);
        }
    };

    // ── Versements ──
    const submitPayout = async () => {
        if (!payoutFor) return;
        setBusy(true);
        try {
            // Le justificatif part d'abord : son échec ne doit pas empêcher
            // d'enregistrer un versement réellement effectué.
            let proofId: string | number | null = null;
            if (proofFile) {
                try {
                    const uploaded: any = await apiUploadFile(proofFile);
                    proofId = uploaded?.id ?? null;
                } catch {
                    toast.warning("Le justificatif n'a pas pu être envoyé — versement enregistré sans.");
                }
            }

            const res = await apiCreateGeneratorPayout({
                generatorDocumentId: payoutFor.documentId,
                method: payoutForm.method as any,
                reference: payoutForm.reference,
                note: payoutForm.note,
                proofFile: proofId,
            });
            toast.success(
                `Versement de ${formatEuros(res.amount)} enregistré (${res.commissionsPaid} commission(s))`
            );
            setPayoutFor(null);
            setPayoutForm({ method: 'transfer', reference: '', note: '' });
            setProofFile(null);
            await refreshAll(expandedId || undefined);
        } catch (err: any) {
            toast.error(err?.response?.data?.error?.message || 'Erreur lors du versement');
        } finally {
            setBusy(false);
        }
    };

    // ── Rattachements ──
    const searchCustomers = async () => {
        setSearching(true);
        try {
            setCustomerResults(await apiSearchReferralCustomers(customerQuery));
        } catch {
            toast.error('Erreur lors de la recherche');
        } finally {
            setSearching(false);
        }
    };

    const attachCustomer = async (customer: ReferralCustomer, generatorDocumentId: string | null) => {
        setBusy(true);
        try {
            await apiSetCustomerGenerator(customer.documentId, generatorDocumentId);
            toast.success(
                generatorDocumentId
                    ? `${customer.name} rattaché au générateur`
                    : `${customer.name} détaché de son générateur`
            );
            setCustomerResults((prev) =>
                prev.map((c) =>
                    c.documentId === customer.documentId
                        ? {
                              ...c,
                              generator: generatorDocumentId
                                  ? { documentId: generatorDocumentId, name: detail?.generator.name || '' }
                                  : null,
                          }
                        : c
                )
            );
            await refreshAll(expandedId || undefined);
        } catch (err: any) {
            toast.error(err?.response?.data?.error?.message || 'Erreur lors du rattachement');
        } finally {
            setBusy(false);
        }
    };

    // ── Dérivés : répartition par nature et lignes visibles ──
    const partnerCount = useMemo(() => rows.filter((r) => r.kind !== 'customer').length, [rows]);
    const customerCount = useMemo(() => rows.filter((r) => r.kind === 'customer').length, [rows]);
    const visibleRows = useMemo(
        () =>
            kindFilter === 'all'
                ? rows
                : rows.filter((r) => (kindFilter === 'customer' ? r.kind === 'customer' : r.kind !== 'customer')),
        [rows, kindFilter]
    );

    // ── Totaux d'en-tête ──
    const totals = useMemo(
        () =>
            rows.reduce(
                (acc, r) => ({
                    referrals: acc.referrals + r.referralsCount,
                    revenue: acc.revenue + r.stats.revenueGenerated,
                    pending: acc.pending + r.stats.pendingCommissions,
                    available: acc.available + r.stats.availableBalance,
                    awaiting: acc.awaiting + (r.stats.awaitingCommission || 0),
                    awaitingCount: acc.awaitingCount + (r.stats.awaitingCount || 0),
                }),
                { referrals: 0, revenue: 0, pending: 0, available: 0, awaiting: 0, awaitingCount: 0 }
            ),
        [rows]
    );

    if (loading) {
        return (
            <div style={{ ...pageStyle, alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>Chargement des générateurs…</p>
            </div>
        );
    }

    return (
        <div style={pageStyle}>
            {/* En-tête */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '14px',
                    flexWrap: 'wrap',
                }}
            >
                <div>
                    <h1
                        style={{
                            color: '#fff',
                            fontSize: '24px',
                            fontWeight: 700,
                            letterSpacing: '-0.02em',
                            margin: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '9px',
                        }}
                    >
                        <TbShare3 size={22} style={{ color: '#6b9eff' }} /> Générateurs
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '6px 0 0' }}>
                        Apporteurs d&apos;affaires : parrainage de clients et commissions sur les commandes
                        payées.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => load()} style={buttonStyle('ghost')} disabled={busy}>
                        <TbRefresh size={14} /> Actualiser
                    </button>
                    <button onClick={() => setShowCreate(true)} style={buttonStyle('primary')} disabled={busy}>
                        <TbPlus size={14} /> Nouveau générateur
                    </button>
                </div>
            </div>

            {/* Réglages du programme */}
            <div style={{ ...panelStyle, borderColor: 'rgba(47,111,237,0.24)' }}>
                <SectionTitle
                    title="Réglages du programme"
                    subtitle="Le taux par défaut s'applique à tout générateur sans taux personnalisé. Les commissions déjà créées conservent leur taux d'origine."
                />
                <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ maxWidth: '190px' }}>
                        <label style={labelStyle}>Taux de commission par défaut (%)</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={globalRateDraft}
                                onChange={(e) => setGlobalRateDraft(e.target.value)}
                                style={inputStyle}
                            />
                            <button onClick={saveGlobalRate} style={buttonStyle('primary')} disabled={busy}>
                                <TbCheck size={14} />
                            </button>
                        </div>
                    </div>

                    <div style={{ maxWidth: '190px' }}>
                        <label style={labelStyle}>Taux des clients parrains (%)</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={customerRateDraft}
                                onChange={(e) => setCustomerRateDraft(e.target.value)}
                                style={inputStyle}
                            />
                            <button onClick={saveCustomerRate} style={buttonStyle('primary')} disabled={busy}>
                                <TbCheck size={14} />
                            </button>
                        </div>
                    </div>

                    <button onClick={toggleAutoValidate} style={buttonStyle('ghost')} disabled={busy}>
                        {settings?.autoValidate ? '✅' : '⏸'} Validation automatique{' '}
                        {settings?.autoValidate ? 'activée' : 'désactivée'}
                    </button>

                    <button onClick={toggleCustomerReferral} style={buttonStyle('ghost')} disabled={busy}>
                        {settings?.customerReferralEnabled ? '✅' : '⏸'} Parrainage entre clients{' '}
                        {settings?.customerReferralEnabled ? 'ouvert' : 'fermé'}
                    </button>
                </div>
            </div>

            {/* Totaux */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                    gap: '14px',
                }}
            >
                <StatCard
                    label="Parrains"
                    value={String(rows.length)}
                    hint={`${partnerCount} apporteur(s), ${customerCount} client(s)`}
                    icon={<TbShare3 size={19} />}
                    accent="#6b9eff"
                />
                <StatCard
                    label="Filleuls"
                    value={String(totals.referrals)}
                    icon={<TbUsers size={19} />}
                    accent="#a78bfa"
                />
                <StatCard
                    label="CA généré"
                    value={formatEuros(totals.revenue)}
                    icon={<TbCash size={19} />}
                    accent="#fbbf24"
                />
                <StatCard
                    label="Commissions à valider"
                    value={formatEuros(totals.pending)}
                    hint={`${formatEuros(totals.available)} prêt(s) à être versé(s)`}
                    icon={<TbCheck size={19} />}
                    accent="#4ade80"
                />
                <StatCard
                    label="En attente d'encaissement"
                    value={formatEuros(totals.awaiting)}
                    hint={`${totals.awaitingCount} commande(s) facturée(s) non payée(s) — estimation`}
                    icon={<TbHourglassLow size={19} />}
                    accent="#94a3b8"
                />
            </div>

            {/* Demandes de retrait en attente */}
            {pendingRequests.length > 0 && (
                <div style={{ ...panelStyle, borderColor: 'rgba(251,146,60,0.28)' }}>
                    <SectionTitle
                        title={`Demandes de retrait (${pendingRequests.length})`}
                        subtitle="Approuver crée le versement et solde les commissions engagées. Refuser les remet à disposition du parrain."
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {pendingRequests.map((r) => (
                            <div
                                key={r.documentId}
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '12px',
                                    padding: '14px 16px',
                                    display: 'flex',
                                    gap: '14px',
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                }}
                            >
                                <div style={{ flex: 1, minWidth: '240px' }}>
                                    <p style={{ color: '#fff', fontSize: '14px', fontWeight: 700, margin: 0 }}>
                                        {r.generator?.name || '—'}
                                        <span style={{ color: '#fb923c', marginLeft: '10px' }}>
                                            {formatEuros(r.amount)}
                                        </span>
                                    </p>
                                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', margin: '4px 0 0' }}>
                                        {formatDate(r.requestedAt)} · {r.commissionsCount ?? 0} commission(s)
                                        {r.generator?.kind === 'customer' ? ' · client parrain' : ''}
                                    </p>
                                    {/* Coordonnées à créditer — visibles des seuls admins */}
                                    <p
                                        style={{
                                            color: 'rgba(255,255,255,0.65)',
                                            fontSize: '12.5px',
                                            margin: '8px 0 0',
                                            fontFamily: 'monospace',
                                            wordBreak: 'break-all',
                                        }}
                                    >
                                        {r.generator?.bankHolder || '—'}
                                        {r.generator?.bankIban ? ` · ${r.generator.bankIban}` : ''}
                                        {r.generator?.bankBic ? ` · ${r.generator.bankBic}` : ''}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {r.generator?.bankIban && (
                                        <CopyButton value={r.generator.bankIban} label="IBAN" />
                                    )}
                                    <button
                                        onClick={() => processRequest(r, 'approve')}
                                        style={buttonStyle('success')}
                                        disabled={busy}
                                    >
                                        <TbCheck size={14} /> Verser
                                    </button>
                                    <button
                                        onClick={() => processRequest(r, 'reject')}
                                        style={buttonStyle('danger')}
                                        disabled={busy}
                                    >
                                        <TbX size={14} /> Refuser
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Filtre par nature de parrain */}
            <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                {([
                    { value: 'all', label: `Tous (${rows.length})` },
                    { value: 'partner', label: `Apporteurs d'affaires (${partnerCount})` },
                    { value: 'customer', label: `Clients parrains (${customerCount})` },
                ] as const).map((f) => (
                    <button
                        key={f.value}
                        onClick={() => setKindFilter(f.value)}
                        style={{
                            background:
                                kindFilter === f.value ? 'rgba(47,111,237,0.18)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${
                                kindFilter === f.value ? 'rgba(47,111,237,0.4)' : 'rgba(255,255,255,0.09)'
                            }`,
                            color: kindFilter === f.value ? '#6b9eff' : 'rgba(255,255,255,0.55)',
                            borderRadius: '100px',
                            padding: '6px 14px',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontFamily: 'Inter, sans-serif',
                        }}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Liste */}
            {visibleRows.length === 0 ? (
                <div style={panelStyle}>
                    <EmptyState
                        message={
                            rows.length === 0
                                ? "Aucun parrain pour le moment — créez le premier apporteur d'affaires."
                                : 'Aucun parrain dans cette catégorie.'
                        }
                    />
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {visibleRows.map((row) => {
                        const expanded = expandedId === row.documentId;
                        return (
                            <div
                                key={row.documentId}
                                style={{
                                    ...panelStyle,
                                    padding: 0,
                                    borderColor: row.active
                                        ? 'rgba(255,255,255,0.08)'
                                        : 'rgba(239,68,68,0.22)',
                                }}
                            >
                                {/* Ligne principale */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '14px',
                                        padding: '16px 18px',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <button
                                        onClick={() => toggleExpand(row.documentId)}
                                        aria-label={expanded ? 'Replier' : 'Déplier'}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'rgba(255,255,255,0.5)',
                                            cursor: 'pointer',
                                            padding: 0,
                                            display: 'flex',
                                        }}
                                    >
                                        {expanded ? <TbChevronDown size={18} /> : <TbChevronRight size={18} />}
                                    </button>

                                    <div style={{ flex: 1, minWidth: '190px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap' }}>
                                            <span style={{ color: '#fff', fontSize: '15px', fontWeight: 700 }}>
                                                {row.name}
                                            </span>
                                            <span
                                                style={{
                                                    background: 'rgba(47,111,237,0.12)',
                                                    border: '1px solid rgba(47,111,237,0.3)',
                                                    color: '#6b9eff',
                                                    borderRadius: '100px',
                                                    padding: '2px 9px',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    letterSpacing: '0.04em',
                                                }}
                                            >
                                                {row.referralCode}
                                            </span>
                                            <span
                                                style={{
                                                    background:
                                                        row.kind === 'customer'
                                                            ? 'rgba(167,139,250,0.12)'
                                                            : 'rgba(255,255,255,0.05)',
                                                    border: `1px solid ${
                                                        row.kind === 'customer'
                                                            ? 'rgba(167,139,250,0.32)'
                                                            : 'rgba(255,255,255,0.12)'
                                                    }`,
                                                    color:
                                                        row.kind === 'customer'
                                                            ? '#a78bfa'
                                                            : 'rgba(255,255,255,0.55)',
                                                    borderRadius: '100px',
                                                    padding: '2px 9px',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {row.kind === 'customer' ? 'Client parrain' : "Apporteur d'affaires"}
                                            </span>
                                            {!row.active && (
                                                <span
                                                    style={{
                                                        background: 'rgba(239,68,68,0.12)',
                                                        border: '1px solid rgba(239,68,68,0.3)',
                                                        color: '#f87171',
                                                        borderRadius: '100px',
                                                        padding: '2px 9px',
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                    }}
                                                >
                                                    Désactivé
                                                </span>
                                            )}
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: '14px',
                                                flexWrap: 'wrap',
                                                marginTop: '5px',
                                                color: 'rgba(255,255,255,0.42)',
                                                fontSize: '12px',
                                            }}
                                        >
                                            {row.email && <span>{row.email}</span>}
                                            {row.kind !== 'customer' && !row.userDocumentId && (
                                                <span style={{ color: '#fb923c', fontWeight: 600 }}>
                                                    Aucun compte de connexion
                                                </span>
                                            )}
                                            <span>{row.referralsCount} filleul(s)</span>
                                            <span>CA {formatEuros(row.stats.revenueGenerated)}</span>
                                            <span>Cumul {formatEuros(row.stats.totalCommissions)}</span>
                                        </div>
                                    </div>

                                    {/* Taux */}
                                    <div style={{ width: '150px' }}>
                                        <label style={labelStyle}>Taux (%)</label>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            defaultValue={row.commissionRate ?? ''}
                                            placeholder={`${row.effectiveRate} (${
                                                row.kind === 'customer' ? 'taux client' : 'taux global'
                                            })`}
                                            onBlur={(e) => {
                                                const raw = e.target.value;
                                                const current = row.commissionRate === null ? '' : String(row.commissionRate);
                                                if (raw.trim() !== current) saveGeneratorRate(row, raw);
                                            }}
                                            style={inputStyle}
                                        />
                                    </div>

                                    {/* Soldes */}
                                    <div style={{ textAlign: 'right', minWidth: '150px' }}>
                                        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
                                            En attente {formatEuros(row.stats.pendingCommissions)}
                                        </div>
                                        <div style={{ color: '#4ade80', fontSize: '15px', fontWeight: 700 }}>
                                            {formatEuros(row.stats.availableBalance)}
                                        </div>
                                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>
                                            disponible
                                        </div>
                                        {(row.stats.awaitingCount || 0) > 0 && (
                                            <div
                                                style={{ color: '#94a3b8', fontSize: '11px', marginTop: '3px' }}
                                                title="Commandes facturées mais pas encore encaissées — estimation, aucune commission n'existe encore"
                                            >
                                                + {formatEuros(row.stats.awaitingCommission)} à encaisser
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                                        <CopyButton value={row.referralLink} label="Lien" />
                                        {row.kind !== 'customer' && (
                                            <button
                                                onClick={() => {
                                                    setAccountFor(row);
                                                    setAccountForm({
                                                        email: row.email || '',
                                                        password: '',
                                                        firstName: '',
                                                        lastName: '',
                                                    });
                                                }}
                                                style={buttonStyle(row.userDocumentId ? 'ghost' : 'primary')}
                                                disabled={busy}
                                                title={
                                                    row.userDocumentId
                                                        ? "Modifier l'email ou réinitialiser le mot de passe"
                                                        : "Aucun compte de connexion — en créer un"
                                                }
                                            >
                                                <TbKey size={14} /> {row.userDocumentId ? 'Accès' : 'Créer l\'accès'}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setPayoutFor(row)}
                                            style={buttonStyle('success')}
                                            disabled={busy || row.stats.availableBalance <= 0}
                                            title={
                                                row.stats.availableBalance <= 0
                                                    ? 'Aucune commission validée à verser'
                                                    : 'Enregistrer le versement du solde disponible'
                                            }
                                        >
                                            <TbCash size={14} /> Payer
                                        </button>
                                        <button
                                            onClick={() => toggleVat(row)}
                                            style={buttonStyle('ghost')}
                                            disabled={busy}
                                            title="Un parrain assujetti facture la TVA à PEG : son espace détaille HT, TVA et TTC. Un particulier en franchise ne voit qu'un montant net."
                                        >
                                            {row.vatRegistered ? 'Assujetti TVA' : 'Non assujetti'}
                                        </button>
                                        <button
                                            onClick={() => toggleActive(row)}
                                            style={buttonStyle(row.active ? 'danger' : 'ghost')}
                                            disabled={busy}
                                        >
                                            {row.active ? 'Désactiver' : 'Réactiver'}
                                        </button>
                                    </div>
                                </div>

                                {/* Détail */}
                                {expanded && (
                                    <div
                                        style={{
                                            borderTop: '1px solid rgba(255,255,255,0.07)',
                                            padding: '18px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '18px',
                                        }}
                                    >
                                        {detailLoading || !detail || detail.generator.documentId !== row.documentId ? (
                                            <EmptyState message="Chargement du détail…" />
                                        ) : (
                                            <>
                                                {/* Filleuls */}
                                                <div>
                                                    <SectionTitle
                                                        title="Filleuls rattachés"
                                                        subtitle="Le rattachement est permanent : ne le modifiez qu'en cas d'erreur."
                                                    />
                                                    {detail.referrals.length === 0 ? (
                                                        <EmptyState message="Aucun filleul rattaché." />
                                                    ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                                                            {detail.referrals.map((r) => (
                                                                <div
                                                                    key={r.documentId}
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '12px',
                                                                        background: 'rgba(255,255,255,0.03)',
                                                                        border: '1px solid rgba(255,255,255,0.06)',
                                                                        borderRadius: '10px',
                                                                        padding: '9px 13px',
                                                                    }}
                                                                >
                                                                    <span
                                                                        style={{
                                                                            color: '#fff',
                                                                            fontSize: '13px',
                                                                            fontWeight: 600,
                                                                            flex: 1,
                                                                        }}
                                                                    >
                                                                        {r.name}
                                                                    </span>
                                                                    <span
                                                                        style={{
                                                                            color: 'rgba(255,255,255,0.35)',
                                                                            fontSize: '12px',
                                                                        }}
                                                                    >
                                                                        Depuis le {formatDate(r.referredAt || r.createdAt)}
                                                                    </span>
                                                                    <button
                                                                        onClick={() =>
                                                                            attachCustomer(
                                                                                { documentId: r.documentId, name: r.name },
                                                                                null
                                                                            )
                                                                        }
                                                                        style={buttonStyle('danger')}
                                                                        disabled={busy}
                                                                    >
                                                                        Détacher
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Rattachement manuel */}
                                                    <div style={{ marginTop: '14px' }}>
                                                        <label style={labelStyle}>
                                                            Rattacher un client existant à {detail.generator.name}
                                                        </label>
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <input
                                                                type="text"
                                                                value={customerQuery}
                                                                onChange={(e) => setCustomerQuery(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') searchCustomers();
                                                                }}
                                                                placeholder="Nom du client…"
                                                                style={{ ...inputStyle, maxWidth: '320px' }}
                                                            />
                                                            <button
                                                                onClick={searchCustomers}
                                                                style={buttonStyle('ghost')}
                                                                disabled={searching}
                                                            >
                                                                <TbSearch size={14} /> Rechercher
                                                            </button>
                                                        </div>
                                                        {customerResults.length > 0 && (
                                                            <div
                                                                style={{
                                                                    marginTop: '10px',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '6px',
                                                                    maxHeight: '260px',
                                                                    overflowY: 'auto',
                                                                }}
                                                            >
                                                                {customerResults.map((c) => {
                                                                    const alreadyHere =
                                                                        c.generator?.documentId === detail.generator.documentId;
                                                                    return (
                                                                        <div
                                                                            key={c.documentId}
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '10px',
                                                                                background: 'rgba(255,255,255,0.03)',
                                                                                border: '1px solid rgba(255,255,255,0.06)',
                                                                                borderRadius: '10px',
                                                                                padding: '8px 12px',
                                                                            }}
                                                                        >
                                                                            <span
                                                                                style={{
                                                                                    color: '#fff',
                                                                                    fontSize: '13px',
                                                                                    flex: 1,
                                                                                }}
                                                                            >
                                                                                {c.name}
                                                                            </span>
                                                                            <span
                                                                                style={{
                                                                                    color: 'rgba(255,255,255,0.35)',
                                                                                    fontSize: '12px',
                                                                                }}
                                                                            >
                                                                                {c.generator
                                                                                    ? `Parrain : ${c.generator.name}`
                                                                                    : 'Sans parrain'}
                                                                            </span>
                                                                            <button
                                                                                onClick={() =>
                                                                                    attachCustomer(c, detail.generator.documentId)
                                                                                }
                                                                                style={buttonStyle('ghost')}
                                                                                disabled={busy || alreadyHere}
                                                                            >
                                                                                <TbLink size={13} />{' '}
                                                                                {alreadyHere ? 'Déjà rattaché' : 'Rattacher'}
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Commissions */}
                                                <div>
                                                    <SectionTitle
                                                        title="Commissions"
                                                        subtitle="Valider une commission la rend disponible au paiement. L'annulation sert aux remboursements et commandes annulées."
                                                        right={
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    exportCommissionsCsv(
                                                                        detail.commissions,
                                                                        detail.generator.name,
                                                                        { vatRegistered: detail.generator.vatRegistered }
                                                                    )
                                                                }
                                                                style={buttonStyle('ghost')}
                                                                title="Relevé CSV — pour la comptabilité"
                                                            >
                                                                <TbDownload size={14} /> Exporter
                                                            </button>
                                                        }
                                                    />
                                                    <CommissionsTable
                                                        commissions={detail.commissions}
                                                        vatRegistered={detail.generator.vatRegistered}
                                                        renderActions={(c) => (
                                                            <div
                                                                style={{
                                                                    display: 'inline-flex',
                                                                    gap: '6px',
                                                                    justifyContent: 'flex-end',
                                                                }}
                                                            >
                                                                {c.status === 'pending' && (
                                                                    <button
                                                                        onClick={() => validateCommission(c.documentId)}
                                                                        style={buttonStyle('success')}
                                                                        disabled={busy}
                                                                    >
                                                                        <TbCheck size={13} /> Valider
                                                                    </button>
                                                                )}
                                                                {(c.status === 'pending' || c.status === 'validated') && (
                                                                    <button
                                                                        onClick={() =>
                                                                            setCancelTarget({
                                                                                documentId: c.documentId,
                                                                                reference: c.reference || '',
                                                                            })
                                                                        }
                                                                        style={buttonStyle('danger')}
                                                                        disabled={busy}
                                                                    >
                                                                        <TbX size={13} /> Annuler
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    />
                                                </div>

                                                {/* Versements */}
                                                <div>
                                                    <SectionTitle
                                                        title="Versements"
                                                        subtitle={`Total versé : ${formatEuros(detail.stats.paidCommissions)}`}
                                                        right={
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    exportPayoutsCsv(
                                                                        detail.payouts,
                                                                        detail.generator.name
                                                                    )
                                                                }
                                                                style={buttonStyle('ghost')}
                                                                title="Relevé CSV des versements"
                                                            >
                                                                <TbDownload size={14} /> Exporter
                                                            </button>
                                                        }
                                                    />
                                                    <PayoutsTable payouts={detail.payouts} />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modale : création */}
            {showCreate && (
                <Modal title="Nouveau Générateur" onClose={() => setShowCreate(false)} width={520}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                        <div>
                            <label style={labelStyle}>
                                Nom du Générateur <span style={{ color: '#f87171' }}>*</span>
                            </label>
                            <input
                                style={inputStyle}
                                value={createForm.name}
                                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                placeholder="Jean Dupont / Société ABC"
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <label style={labelStyle}>Prénom</label>
                                <input
                                    style={inputStyle}
                                    value={createForm.firstName}
                                    onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Nom</label>
                                <input
                                    style={inputStyle}
                                    value={createForm.lastName}
                                    onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Email de connexion</label>
                            <input
                                style={inputStyle}
                                value={createForm.email}
                                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                placeholder="Laisser vide pour créer la fiche sans compte d'accès"
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <label style={labelStyle}>Mot de passe</label>
                                <input
                                    style={inputStyle}
                                    type="password"
                                    value={createForm.password}
                                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                    placeholder="Généré si vide"
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Taux personnalisé (%)</label>
                                <input
                                    style={inputStyle}
                                    inputMode="decimal"
                                    value={createForm.commissionRate}
                                    onChange={(e) =>
                                        setCreateForm({ ...createForm, commissionRate: e.target.value })
                                    }
                                    placeholder={`${settings?.defaultCommissionRate ?? 5} (global)`}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <label style={labelStyle}>Téléphone</label>
                                <input
                                    style={inputStyle}
                                    value={createForm.phoneNumber}
                                    onChange={(e) => setCreateForm({ ...createForm, phoneNumber: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Ville</label>
                                <input
                                    style={inputStyle}
                                    value={createForm.city}
                                    onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Coordonnées de paiement (IBAN, notes)</label>
                            <textarea
                                style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
                                value={createForm.payoutDetails}
                                onChange={(e) => setCreateForm({ ...createForm, payoutDetails: e.target.value })}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                            <button onClick={() => setShowCreate(false)} style={buttonStyle('ghost')}>
                                Annuler
                            </button>
                            <button onClick={createGenerator} style={buttonStyle('primary')} disabled={busy}>
                                <TbPlus size={14} /> Créer le Générateur
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modale : compte d'accès */}
            {accountFor && (
                <Modal
                    title={
                        accountFor.userDocumentId
                            ? `Compte d'accès — ${accountFor.name}`
                            : `Créer l'accès de ${accountFor.name}`
                    }
                    onClose={() => setAccountFor(null)}
                >
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', margin: '0 0 16px' }}>
                        {accountFor.userDocumentId
                            ? "Modifiez l'email de connexion et/ou définissez un nouveau mot de passe. Laissez un champ vide pour ne pas y toucher."
                            : "Cette fiche n'a aucun compte de connexion : le Générateur ne peut pas accéder à son espace. Renseignez un email et un mot de passe pour le créer."}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                        <div>
                            <label style={labelStyle}>
                                Email de connexion
                                {!accountFor.userDocumentId && <span style={{ color: '#f87171' }}> *</span>}
                            </label>
                            <input
                                style={inputStyle}
                                value={accountForm.email}
                                onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                                placeholder="generateur@exemple.com"
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>
                                Mot de passe
                                {!accountFor.userDocumentId && <span style={{ color: '#f87171' }}> *</span>}
                            </label>
                            <input
                                style={inputStyle}
                                type="text"
                                value={accountForm.password}
                                onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                                placeholder={
                                    accountFor.userDocumentId
                                        ? 'Laisser vide pour conserver le mot de passe actuel'
                                        : '6 caractères minimum'
                                }
                            />
                            <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: '11.5px', margin: '5px 0 0' }}>
                                Le mot de passe est affiché en clair : notez-le, il ne sera plus consultable.
                            </p>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <label style={labelStyle}>Prénom</label>
                                <input
                                    style={inputStyle}
                                    value={accountForm.firstName}
                                    onChange={(e) => setAccountForm({ ...accountForm, firstName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Nom</label>
                                <input
                                    style={inputStyle}
                                    value={accountForm.lastName}
                                    onChange={(e) => setAccountForm({ ...accountForm, lastName: e.target.value })}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => setAccountFor(null)} style={buttonStyle('ghost')}>
                                Annuler
                            </button>
                            <button onClick={submitAccount} style={buttonStyle('primary')} disabled={busy}>
                                <TbKey size={14} />{' '}
                                {accountFor.userDocumentId ? 'Enregistrer' : "Créer le compte"}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modale : versement */}
            {payoutFor && (
                <Modal
                    title={`Verser à ${payoutFor.name}`}
                    onClose={() => {
                        setPayoutFor(null);
                        setProofFile(null);
                    }}
                >
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', margin: '0 0 16px' }}>
                        Toutes les commissions disponibles ({formatEuros(payoutFor.stats.availableBalance)})
                        seront marquées comme payées et regroupées dans ce versement.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                        <div>
                            <label style={labelStyle}>Moyen de paiement</label>
                            <select
                                style={{ ...inputStyle, cursor: 'pointer' }}
                                value={payoutForm.method}
                                onChange={(e) => setPayoutForm({ ...payoutForm, method: e.target.value })}
                            >
                                <option value="transfer" style={{ background: '#111827' }}>Virement</option>
                                <option value="cheque" style={{ background: '#111827' }}>Chèque</option>
                                <option value="cash" style={{ background: '#111827' }}>Espèces</option>
                                <option value="other" style={{ background: '#111827' }}>Autre</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Référence</label>
                            <input
                                style={inputStyle}
                                value={payoutForm.reference}
                                onChange={(e) => setPayoutForm({ ...payoutForm, reference: e.target.value })}
                                placeholder="N° de virement, de chèque…"
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Note interne</label>
                            <textarea
                                style={{ ...inputStyle, minHeight: '64px', resize: 'vertical' }}
                                value={payoutForm.note}
                                onChange={(e) => setPayoutForm({ ...payoutForm, note: e.target.value })}
                            />
                        </div>

                        {/* Justificatif : photo du virement, capture ou PDF. Facultatif —
                            ne jamais empêcher d'enregistrer un versement réellement fait. */}
                        <div>
                            <label style={labelStyle}>Justificatif (photo ou PDF)</label>
                            {proofFile ? (
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        background: 'rgba(34,197,94,0.08)',
                                        border: '1px solid rgba(34,197,94,0.25)',
                                        borderRadius: '9px',
                                        padding: '9px 12px',
                                    }}
                                >
                                    <TbPaperclip size={15} color="#4ade80" style={{ flexShrink: 0 }} />
                                    <span
                                        style={{
                                            flex: 1,
                                            minWidth: 0,
                                            color: 'rgba(255,255,255,0.8)',
                                            fontSize: '12.5px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {proofFile.name}
                                    </span>
                                    <button
                                        onClick={() => setProofFile(null)}
                                        aria-label="Retirer le justificatif"
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'rgba(255,255,255,0.5)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            padding: 0,
                                        }}
                                    >
                                        <TbX size={14} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={async () => setProofFile(await pickProofFile())}
                                    style={{ ...buttonStyle('ghost'), width: '100%', justifyContent: 'center' }}
                                >
                                    <TbCamera size={15} /> Joindre une photo du virement
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => {
                                    setPayoutFor(null);
                                    setProofFile(null);
                                }}
                                style={buttonStyle('ghost')}
                            >
                                Annuler
                            </button>
                            <button onClick={submitPayout} style={buttonStyle('success')} disabled={busy}>
                                <TbCash size={14} /> Enregistrer le versement
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Modale : annulation de commission */}
            {cancelTarget && (
                <Modal
                    title="Annuler la commission"
                    onClose={() => {
                        setCancelTarget(null);
                        setCancelReason('');
                    }}
                >
                    <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '13px', margin: '0 0 14px' }}>
                        Commande {cancelTarget.reference || '—'}. L&apos;annulation retire cette commission des
                        totaux du Générateur (remboursement ou commande annulée).
                    </p>
                    <label style={labelStyle}>Motif</label>
                    <input
                        style={inputStyle}
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        placeholder="Remboursement client, commande annulée…"
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                        <button
                            onClick={() => {
                                setCancelTarget(null);
                                setCancelReason('');
                            }}
                            style={buttonStyle('ghost')}
                        >
                            Retour
                        </button>
                        <button onClick={confirmCancelCommission} style={buttonStyle('danger')} disabled={busy}>
                            <TbX size={14} /> Annuler la commission
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default GeneratorsAdminList;
