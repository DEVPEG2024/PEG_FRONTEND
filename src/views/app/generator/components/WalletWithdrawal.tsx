/**
 * Retraits — panneau partagé par le wallet du Générateur et l'espace Parrainage
 * du client. Une seule implémentation pour les deux natures de parrain : le
 * périmètre est déduit du JWT côté serveur, l'écran ne transmet aucun identifiant.
 *
 * Deux destinations possibles :
 *  - virement bancaire : demande soumise à l'administration, qui verse ;
 *  - avoir sur commande : immédiat, réservé aux clients parrains (`allowStoreCredit`).
 *
 * Une commission ne se fractionne pas : le montant réellement retenu peut être
 * inférieur au montant demandé, et le serveur le signale (`adjusted`).
 */
import { useState } from 'react';
import {
    TbBuildingBank,
    TbCash,
    TbShoppingCartPlus,
    TbPencil,
    TbAlertTriangle,
    TbX,
} from 'react-icons/tb';
import type { BankDetails, PayoutMode, PayoutRequest, PayoutRequestState } from '@/@types/generator';
import {
    apiCancelPayoutRequest,
    apiRequestPayout,
    apiSetBankDetails,
    formatEuros,
    PAYOUT_REQUEST_STATUS_COLORS,
    PAYOUT_REQUEST_STATUS_LABELS,
} from '@/services/GeneratorServices';
import { EmptyState, SectionTitle, formatDate, panelStyle } from './GeneratorUI';

type Props = {
    bank: BankDetails;
    requestState: PayoutRequestState;
    requests: PayoutRequest[];
    /** Avoir déjà disponible au panier */
    creditBalance: number;
    /** Le parrain a-t-il un panier ? (clients parrains uniquement) */
    allowStoreCredit: boolean;
    /** Seuil de virement fixé par PEG (0 = aucun) */
    minPayoutAmount?: number;
    onChanged: () => void;
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px',
    padding: '10px 13px',
    color: '#fff',
    fontSize: '14px',
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '11.5px',
    fontWeight: 600,
    letterSpacing: '0.04em',
    marginBottom: '6px',
    display: 'block',
};

const primaryButton = (disabled: boolean): React.CSSProperties => ({
    background: disabled ? 'rgba(47,111,237,0.4)' : 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
    border: 'none',
    borderRadius: '10px',
    padding: '11px 18px',
    color: '#fff',
    fontSize: '13.5px',
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'Inter, sans-serif',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '7px',
});

const ghostButton: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px',
    padding: '9px 14px',
    color: 'rgba(255,255,255,0.8)',
    fontSize: '12.5px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'Inter, sans-serif',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
};

/** Coquille de modale, volontairement locale : aucune dépendance à une lib */
const Modal = ({
    title,
    children,
    onClose,
}: {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
}) => (
    <div
        style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
    >
        <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} />
        <div
            style={{
                position: 'relative',
                width: '100%',
                maxWidth: '460px',
                background: 'linear-gradient(145deg, #0f1623, #111827)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '26px',
                maxHeight: '90vh',
                overflowY: 'auto',
                fontFamily: 'Inter, sans-serif',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <h3 style={{ color: '#fff', fontSize: '17px', fontWeight: 700, margin: 0 }}>{title}</h3>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Fermer"
                    style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: 'rgba(255,255,255,0.6)',
                        cursor: 'pointer',
                        width: '30px',
                        height: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                    }}
                >
                    <TbX size={15} />
                </button>
            </div>
            {children}
        </div>
    </div>
);

const ErrorBox = ({ message }: { message: string }) =>
    message ? (
        <div
            style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '10px',
                padding: '10px 13px',
                color: '#f87171',
                fontSize: '12.5px',
                marginBottom: '14px',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
            }}
        >
            <TbAlertTriangle size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
            <span>{message}</span>
        </div>
    ) : null;

const errorMessage = (err: any, fallback: string) =>
    err?.response?.data?.error?.message || err?.message || fallback;

const WalletWithdrawal = ({
    bank,
    requestState,
    requests,
    creditBalance,
    allowStoreCredit,
    minPayoutAmount = 0,
    onChanged,
}: Props) => {
    const [bankOpen, setBankOpen] = useState(false);
    const [withdrawOpen, setWithdrawOpen] = useState(false);

    // Coordonnées bancaires
    const [holder, setHolder] = useState(bank.holder || '');
    const [iban, setIban] = useState('');
    const [bic, setBic] = useState(bank.bic || '');
    const [bankError, setBankError] = useState('');
    const [savingBank, setSavingBank] = useState(false);

    // Demande de retrait
    const [mode, setMode] = useState<PayoutMode>(allowStoreCredit ? 'store_credit' : 'bank_transfer');
    const [full, setFull] = useState(true);
    const [amount, setAmount] = useState('');
    const [requestError, setRequestError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [feedback, setFeedback] = useState('');

    const canWithdraw = requestState.requestable > 0;

    const saveBank = async () => {
        setBankError('');
        if (!holder.trim()) return setBankError('Indiquez le titulaire du compte.');
        if (!iban.trim()) return setBankError("Saisissez l'IBAN.");
        setSavingBank(true);
        try {
            await apiSetBankDetails({ holder: holder.trim(), iban: iban.trim(), bic: bic.trim() });
            setIban('');
            setBankOpen(false);
            onChanged();
        } catch (err: any) {
            setBankError(errorMessage(err, "Enregistrement impossible."));
        } finally {
            setSavingBank(false);
        }
    };

    const submitRequest = async () => {
        setRequestError('');
        const parsed = full ? undefined : Number(String(amount).replace(',', '.'));
        if (!full && (isNaN(parsed as number) || (parsed as number) <= 0)) {
            return setRequestError('Montant invalide.');
        }
        setSubmitting(true);
        try {
            const res = await apiRequestPayout({ amount: parsed, mode });
            setWithdrawOpen(false);
            setAmount('');
            setFull(true);
            setFeedback(
                mode === 'store_credit'
                    ? `${formatEuros(res.amount)} ajoutés à votre avoir — utilisable dès votre prochaine commande.`
                    : `Demande de virement de ${formatEuros(res.amount)} envoyée à PEG.` +
                          (res.adjusted ? ' Montant ajusté aux commissions entières disponibles.' : '')
            );
            onChanged();
        } catch (err: any) {
            setRequestError(errorMessage(err, 'Demande impossible.'));
        } finally {
            setSubmitting(false);
        }
    };

    const cancelRequest = async (documentId: string) => {
        try {
            await apiCancelPayoutRequest(documentId);
            onChanged();
        } catch (err: any) {
            setFeedback(errorMessage(err, 'Annulation impossible.'));
        }
    };

    return (
        <div style={panelStyle}>
            <SectionTitle
                title="Retirer mes gains"
                subtitle={
                    allowStoreCredit
                        ? 'Sur votre compte bancaire, ou en avoir déduit de votre prochaine commande'
                        : 'Sur votre compte bancaire, après traitement par PEG'
                }
                right={
                    <button
                        type="button"
                        onClick={() => {
                            setRequestError('');
                            setFeedback('');
                            setWithdrawOpen(true);
                        }}
                        disabled={!canWithdraw}
                        style={primaryButton(!canWithdraw)}
                    >
                        <TbCash size={16} />
                        Demander un retrait
                    </button>
                }
            />

            {/* Soldes */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px',
                    marginBottom: '18px',
                }}
            >
                <div>
                    <p style={labelStyle}>Retirable maintenant</p>
                    <p style={{ color: '#4ade80', fontSize: '20px', fontWeight: 700, margin: 0 }}>
                        {formatEuros(requestState.requestable)}
                    </p>
                </div>
                {requestState.pendingRequested > 0 && (
                    <div>
                        <p style={labelStyle}>Engagé dans une demande</p>
                        <p style={{ color: '#fb923c', fontSize: '20px', fontWeight: 700, margin: 0 }}>
                            {formatEuros(requestState.pendingRequested)}
                        </p>
                    </div>
                )}
                {allowStoreCredit && (
                    <div>
                        <p style={labelStyle}>Avoir disponible au panier</p>
                        <p style={{ color: '#6b9eff', fontSize: '20px', fontWeight: 700, margin: 0 }}>
                            {formatEuros(creditBalance)}
                        </p>
                    </div>
                )}
            </div>

            {feedback && (
                <div
                    style={{
                        background: 'rgba(34,197,94,0.1)',
                        border: '1px solid rgba(34,197,94,0.25)',
                        borderRadius: '10px',
                        padding: '10px 13px',
                        color: '#4ade80',
                        fontSize: '12.5px',
                        marginBottom: '14px',
                    }}
                >
                    {feedback}
                </div>
            )}

            {/* Coordonnées bancaires */}
            <div
                style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap',
                    marginBottom: '18px',
                }}
            >
                <TbBuildingBank size={20} color="#6b9eff" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: '180px' }}>
                    <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600, margin: 0 }}>
                        {bank.filled ? bank.holder : 'Coordonnées bancaires'}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: '12px', margin: '3px 0 0' }}>
                        {bank.filled
                            ? `${bank.ibanMasked}${bank.bic ? ` · ${bank.bic}` : ''}`
                            : 'À renseigner pour recevoir un virement.'}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setBankError('');
                        setHolder(bank.holder || '');
                        setBic(bank.bic || '');
                        setIban('');
                        setBankOpen(true);
                    }}
                    style={ghostButton}
                >
                    <TbPencil size={14} />
                    {bank.filled ? 'Modifier' : 'Renseigner'}
                </button>
            </div>

            {/* Historique des demandes */}
            <SectionTitle title="Mes demandes" />
            {!requests.length ? (
                <EmptyState message="Aucune demande de retrait pour le moment." />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {requests.map((r) => {
                        const c = PAYOUT_REQUEST_STATUS_COLORS[r.status] || PAYOUT_REQUEST_STATUS_COLORS.pending;
                        return (
                            <div
                                key={r.documentId}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    flexWrap: 'wrap',
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    borderRadius: '10px',
                                    padding: '11px 14px',
                                }}
                            >
                                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 700, minWidth: '90px' }}>
                                    {formatEuros(r.amount)}
                                </span>
                                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '12.5px', flex: 1, minWidth: '150px' }}>
                                    {r.mode === 'store_credit' ? 'Avoir sur commande' : 'Virement bancaire'}
                                    {' · '}
                                    {formatDate(r.requestedAt)}
                                    {r.status === 'rejected' && r.rejectReason ? ` · ${r.rejectReason}` : ''}
                                </span>
                                <span
                                    style={{
                                        background: c.bg,
                                        border: `1px solid ${c.border}`,
                                        color: c.color,
                                        borderRadius: '100px',
                                        padding: '2px 10px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                    }}
                                >
                                    {PAYOUT_REQUEST_STATUS_LABELS[r.status] || r.status}
                                </span>
                                {r.status === 'pending' && (
                                    <button
                                        type="button"
                                        onClick={() => cancelRequest(r.documentId)}
                                        style={{ ...ghostButton, padding: '5px 10px', fontSize: '12px' }}
                                    >
                                        Annuler
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Modale : coordonnées bancaires ── */}
            {bankOpen && (
                <Modal title="Coordonnées bancaires" onClose={() => setBankOpen(false)}>
                    <ErrorBox message={bankError} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <label style={labelStyle}>Titulaire du compte</label>
                            <input
                                style={inputStyle}
                                value={holder}
                                onChange={(e) => setHolder(e.target.value)}
                                placeholder="Jean Dupont"
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>IBAN</label>
                            <input
                                style={{ ...inputStyle, letterSpacing: '0.04em' }}
                                value={iban}
                                onChange={(e) => setIban(e.target.value.toUpperCase())}
                                placeholder={bank.filled ? `Actuel : ${bank.ibanMasked}` : 'FR76 3000 1007 9412 3456 7890 185'}
                                autoComplete="off"
                            />
                            <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: '11.5px', margin: '6px 0 0' }}>
                                Pour votre sécurité, l&apos;IBAN enregistré n&apos;est jamais réaffiché en entier.
                                Une nouvelle saisie remplace l&apos;ancien.
                            </p>
                        </div>
                        <div>
                            <label style={labelStyle}>BIC (facultatif)</label>
                            <input
                                style={inputStyle}
                                value={bic}
                                onChange={(e) => setBic(e.target.value.toUpperCase())}
                                placeholder="BNPAFRPP"
                            />
                        </div>
                        <button type="button" onClick={saveBank} disabled={savingBank} style={primaryButton(savingBank)}>
                            {savingBank ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                    </div>
                </Modal>
            )}

            {/* ── Modale : demande de retrait ── */}
            {withdrawOpen && (
                <Modal title="Demander un retrait" onClose={() => setWithdrawOpen(false)}>
                    <ErrorBox message={requestError} />

                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12.5px', margin: '0 0 16px' }}>
                        Disponible : <strong style={{ color: '#4ade80' }}>{formatEuros(requestState.requestable)}</strong>
                    </p>

                    {/* Destination */}
                    {allowStoreCredit && (
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
                            {(
                                [
                                    {
                                        value: 'store_credit' as PayoutMode,
                                        icon: <TbShoppingCartPlus size={17} />,
                                        title: 'Avoir sur commande',
                                        sub: 'Immédiat, déduit de votre panier',
                                    },
                                    {
                                        value: 'bank_transfer' as PayoutMode,
                                        icon: <TbBuildingBank size={17} />,
                                        title: 'Virement bancaire',
                                        sub: 'Traité par PEG sous quelques jours',
                                    },
                                ]
                            ).map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setMode(opt.value)}
                                    style={{
                                        flex: 1,
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        background: mode === opt.value ? 'rgba(47,111,237,0.14)' : 'rgba(255,255,255,0.04)',
                                        border: `1px solid ${mode === opt.value ? 'rgba(47,111,237,0.5)' : 'rgba(255,255,255,0.1)'}`,
                                        borderRadius: '12px',
                                        padding: '12px',
                                        color: '#fff',
                                        fontFamily: 'Inter, sans-serif',
                                    }}
                                >
                                    <span style={{ color: mode === opt.value ? '#6b9eff' : 'rgba(255,255,255,0.45)', display: 'block', marginBottom: '6px' }}>
                                        {opt.icon}
                                    </span>
                                    <span style={{ display: 'block', fontSize: '12.5px', fontWeight: 700 }}>{opt.title}</span>
                                    <span style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', lineHeight: 1.4 }}>
                                        {opt.sub}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {mode === 'bank_transfer' && !bank.filled && (
                        <div
                            style={{
                                background: 'rgba(251,146,60,0.1)',
                                border: '1px solid rgba(251,146,60,0.3)',
                                borderRadius: '10px',
                                padding: '11px 13px',
                                color: '#fb923c',
                                fontSize: '12.5px',
                                marginBottom: '16px',
                            }}
                        >
                            Renseignez d&apos;abord vos coordonnées bancaires.
                        </div>
                    )}

                    {mode === 'bank_transfer' && minPayoutAmount > 0 && (
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', margin: '0 0 14px' }}>
                            Le virement démarre à {formatEuros(minPayoutAmount)}.
                        </p>
                    )}

                    {/* Montant */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                        <button
                            type="button"
                            onClick={() => setFull(true)}
                            style={{
                                ...ghostButton,
                                flex: 1,
                                justifyContent: 'center',
                                background: full ? 'rgba(47,111,237,0.16)' : 'rgba(255,255,255,0.04)',
                                borderColor: full ? 'rgba(47,111,237,0.45)' : 'rgba(255,255,255,0.1)',
                                color: full ? '#6b9eff' : 'rgba(255,255,255,0.7)',
                            }}
                        >
                            Tout retirer
                        </button>
                        <button
                            type="button"
                            onClick={() => setFull(false)}
                            style={{
                                ...ghostButton,
                                flex: 1,
                                justifyContent: 'center',
                                background: !full ? 'rgba(47,111,237,0.16)' : 'rgba(255,255,255,0.04)',
                                borderColor: !full ? 'rgba(47,111,237,0.45)' : 'rgba(255,255,255,0.1)',
                                color: !full ? '#6b9eff' : 'rgba(255,255,255,0.7)',
                            }}
                        >
                            Montant précis
                        </button>
                    </div>

                    {!full && (
                        <div style={{ marginBottom: '14px' }}>
                            <label style={labelStyle}>Montant à retirer (€)</label>
                            <input
                                style={inputStyle}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                inputMode="decimal"
                                placeholder={String(requestState.requestable)}
                            />
                            <p style={{ color: 'rgba(255,255,255,0.32)', fontSize: '11.5px', margin: '6px 0 0' }}>
                                Le retrait porte sur des commissions entières : le montant retenu sera le plus
                                proche possible sans dépasser votre demande
                                {requestState.smallestFree > 0
                                    ? ` (la plus petite commission disponible est de ${formatEuros(requestState.smallestFree)})`
                                    : ''}
                                .
                            </p>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={submitRequest}
                        disabled={submitting || (mode === 'bank_transfer' && !bank.filled)}
                        style={{
                            ...primaryButton(submitting || (mode === 'bank_transfer' && !bank.filled)),
                            width: '100%',
                            justifyContent: 'center',
                        }}
                    >
                        {submitting
                            ? 'Envoi…'
                            : mode === 'store_credit'
                            ? 'Convertir en avoir'
                            : 'Envoyer la demande'}
                    </button>
                </Modal>
            )}
        </div>
    );
};

export default WalletWithdrawal;
