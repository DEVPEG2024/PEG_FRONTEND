import { useState, useEffect } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { HiEye, HiEyeOff, HiX, HiOutlineOfficeBuilding, HiOutlineCash, HiOutlineDuplicate, HiCheck } from 'react-icons/hi';
import { apiSignUp, apiSignUpGenerator, apiVerifyEmailCode, apiResendEmailCode } from '@/services/AuthService';
import { apiCheckReferralCode } from '@/services/GeneratorServices';
import { API_BASE_URL } from '@/configs/api.config';

const PEG_BACKEND_URL = import.meta.env.DEV ? 'http://localhost:3000' : 'https://peg-backend.vercel.app';

interface SignUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Code de parrainage issu du lien /sign-in?ref=CODE (pré-rempli et vérifié). */
    initialReferralCode?: string;
    /** Nature de compte présélectionnée (l'utilisateur peut en changer). */
    initialAccountType?: AccountType;
}

/**
 * Deux natures de compte s'auto-inscrivent :
 *  - `customer`  : client PEG (catalogue, projets, commandes) ;
 *  - `generator` : apporteur d'affaires — code de parrainage + commissions.
 * Un Générateur n'est pas un client : ni secteur d'activité, ni parrainage.
 */
export type AccountType = 'customer' | 'generator';

type CustomerCategory = { documentId: string; name: string };

type SignUpFormSchema = {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
    jobTitle?: string;
    companyName?: string;
    customerCategoryId?: string;
    phoneNumber?: string;
    address?: string;
    zipCode?: string;
    city?: string;
    referralCode?: string;
};

const validationSchema = Yup.object().shape({
    firstName: Yup.string().required('Veuillez entrer votre prénom'),
    lastName: Yup.string().required('Veuillez entrer votre nom'),
    email: Yup.string().email('Adresse email invalide').required('Veuillez entrer votre adresse email'),
    password: Yup.string()
        .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
        .matches(/[A-Za-z]/, 'Le mot de passe doit contenir au moins une lettre')
        .matches(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
        .required('Veuillez entrer un mot de passe'),
    confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], 'Les mots de passe ne correspondent pas')
        .required('Veuillez confirmer votre mot de passe'),
    jobTitle: Yup.string(),
    companyName: Yup.string(),
    customerCategoryId: Yup.string(),
    phoneNumber: Yup.string(),
    address: Yup.string(),
    zipCode: Yup.string(),
    city: Yup.string(),
    referralCode: Yup.string(),
});

const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '11px 14px',
    color: '#fff',
    fontSize: '14px',
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.5)',
    fontSize: '12px',
    fontWeight: 600,
    letterSpacing: '0.04em',
    marginBottom: '6px',
    display: 'block',
    fontFamily: 'Inter, sans-serif',
};

const errorStyle: React.CSSProperties = {
    color: '#f87171',
    fontSize: '11px',
    marginTop: '4px',
    fontFamily: 'Inter, sans-serif',
};

const sectionTitleStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.25)',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: '12px',
    marginTop: '4px',
    fontFamily: 'Inter, sans-serif',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '8px',
};

/** Carte de sélection de la nature du compte à créer */
const AccountTypeCard = ({
    active, title, subtitle, icon, onClick,
}: {
    active: boolean;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    onClick: () => void;
}) => (
    <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        style={{
            flex: 1, textAlign: 'left', cursor: 'pointer',
            background: active ? 'rgba(47,111,237,0.12)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${active ? 'rgba(47,111,237,0.55)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '12px', padding: '13px 14px',
            display: 'flex', alignItems: 'flex-start', gap: '10px',
            transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
        }}
    >
        <span style={{ color: active ? '#6b9eff' : 'rgba(255,255,255,0.4)', display: 'flex', flexShrink: 0, marginTop: '1px' }}>
            {icon}
        </span>
        <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', color: active ? '#fff' : 'rgba(255,255,255,0.75)', fontSize: '13px', fontWeight: 700 }}>
                {title}
            </span>
            <span style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: '11.5px', lineHeight: 1.4, marginTop: '2px' }}>
                {subtitle}
            </span>
        </span>
    </button>
);

const SignUpModal = ({
    isOpen,
    onClose,
    initialReferralCode = '',
    initialAccountType = 'customer',
}: SignUpModalProps) => {
    const [accountType, setAccountType] = useState<AccountType>(initialAccountType);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [categories, setCategories] = useState<CustomerCategory[]>([]);
    // Code de parrainage attribué au Générateur — affiché après validation
    const [grantedReferral, setGrantedReferral] = useState<{ code: string; link: string } | null>(null);
    const [copied, setCopied] = useState(false);

    const isGenerator = accountType === 'generator';
    // Étape de validation par code email
    const [awaitingCode, setAwaitingCode] = useState(false);
    const [pendingEmail, setPendingEmail] = useState('');
    const [pendingFirstName, setPendingFirstName] = useState('');
    const [code, setCode] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [codeError, setCodeError] = useState('');
    const [resendInfo, setResendInfo] = useState('');
    // Parrainage : vérification du code auprès du backend (nom du parrain)
    const [referralStatus, setReferralStatus] = useState<{
        state: 'idle' | 'checking' | 'valid' | 'invalid';
        name?: string;
    }>({ state: 'idle' });

    useEffect(() => {
        fetch(`${API_BASE_URL}/auth/customer-categories`)
            .then((r) => r.json())
            .then((data) => { if (Array.isArray(data)) setCategories(data); })
            .catch((err) => console.error('[SignUp] Échec chargement catégories:', err));
    }, []);

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<SignUpFormSchema>({
        resolver: yupResolver(validationSchema) as Resolver<SignUpFormSchema>,
        defaultValues: {
            firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
            jobTitle: '', companyName: '', customerCategoryId: '', phoneNumber: '',
            address: '', zipCode: '', city: '',
            referralCode: initialReferralCode.toUpperCase(),
        },
    });

    const checkReferral = async (raw: string) => {
        const code = (raw || '').trim().toUpperCase();
        if (!code) {
            setReferralStatus({ state: 'idle' });
            return;
        }
        setReferralStatus({ state: 'checking' });
        const res = await apiCheckReferralCode(code);
        setReferralStatus(
            res.valid ? { state: 'valid', name: res.name } : { state: 'invalid' }
        );
    };

    // Code arrivé par le lien de parrainage → vérification immédiate à l'ouverture
    useEffect(() => {
        if (!isOpen || !initialReferralCode) return;
        let canceled = false;
        setReferralStatus({ state: 'checking' });
        apiCheckReferralCode(initialReferralCode).then((res) => {
            if (canceled) return;
            setReferralStatus(res.valid ? { state: 'valid', name: res.name } : { state: 'invalid' });
        });
        return () => { canceled = true; };
    }, [isOpen, initialReferralCode]);

    // Le type demandé à l'ouverture prime tant que l'utilisateur n'a rien changé
    useEffect(() => {
        if (isOpen) setAccountType(initialAccountType);
    }, [isOpen, initialAccountType]);

    const handleClose = () => {
        reset();
        setSuccessMessage('');
        setErrorMessage('');
        setAwaitingCode(false);
        setPendingEmail('');
        setPendingFirstName('');
        setCode('');
        setCodeError('');
        setResendInfo('');
        setReferralStatus({ state: 'idle' });
        setGrantedReferral(null);
        setCopied(false);
        onClose();
    };

    /** Bascule client ↔ générateur : on repart d'un formulaire propre */
    const switchAccountType = (type: AccountType) => {
        if (type === accountType) return;
        setAccountType(type);
        setErrorMessage('');
        if (type === 'generator') setReferralStatus({ state: 'idle' });
    };

    const copyReferralLink = async () => {
        if (!grantedReferral) return;
        try {
            await navigator.clipboard.writeText(grantedReferral.link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('[SignUp] Copie du lien de parrainage impossible:', err);
        }
    };

    const onSubmit = async (values: SignUpFormSchema) => {
        setErrorMessage('');
        try {
            if (accountType === 'generator') {
                const { data } = await apiSignUpGenerator({
                    firstName: values.firstName,
                    lastName: values.lastName,
                    email: values.email,
                    password: values.password,
                    companyName: values.companyName,
                    phoneNumber: values.phoneNumber,
                    address: values.address,
                    zipCode: values.zipCode,
                    city: values.city,
                });
                setGrantedReferral({ code: data?.referralCode || '', link: data?.referralLink || '' });
            } else {
                await apiSignUp({
                    firstName: values.firstName,
                    lastName: values.lastName,
                    email: values.email,
                    password: values.password,
                    jobTitle: values.jobTitle,
                    companyName: values.companyName,
                    customerCategoryId: values.customerCategoryId,
                    address: values.address,
                    zipCode: values.zipCode,
                    city: values.city,
                    referralCode: values.referralCode,
                });
            }
            // Compte créé mais non confirmé : on passe à l'étape de saisie du code
            // envoyé par email. L'email de bienvenue est envoyé après validation.
            setPendingEmail(values.email);
            setPendingFirstName(values.firstName);
            setAwaitingCode(true);
            setCode('');
            setCodeError('');
            setResendInfo('');
        } catch (err: any) {
            const msg = err?.response?.data?.error?.message || 'Une erreur est survenue. Veuillez réessayer.';
            setErrorMessage(msg);
        }
    };

    const onVerifyCode = async () => {
        setCodeError('');
        const trimmed = code.trim();
        if (!/^\d{6}$/.test(trimmed)) {
            setCodeError('Entrez le code à 6 chiffres reçu par email.');
            return;
        }
        setVerifying(true);
        try {
            await apiVerifyEmailCode({ email: pendingEmail, code: trimmed });
            // Email de bienvenue (non bloquant) une fois le compte validé.
            // Réservé aux clients : il renvoie vers le catalogue, qui n'existe
            // pas pour un Générateur.
            if (accountType === 'customer') {
                fetch(`${PEG_BACKEND_URL}/mails/welcome`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ to: pendingEmail, firstName: pendingFirstName }),
                }).catch((err) => console.error('[SignUp] Échec envoi email de bienvenue:', err));
            }
            setAwaitingCode(false);
            setSuccessMessage(
                accountType === 'generator'
                    ? 'Votre email est validé et votre compte Générateur est actif ! Vous pouvez maintenant vous connecter.'
                    : 'Votre email est validé et votre compte est actif ! Vous pouvez maintenant vous connecter.'
            );
            reset();
        } catch (err: any) {
            const msg = err?.response?.data?.error?.message || 'Code invalide ou expiré.';
            setCodeError(msg);
        } finally {
            setVerifying(false);
        }
    };

    const onResendCode = async () => {
        setCodeError('');
        setResendInfo('');
        try {
            await apiResendEmailCode({ email: pendingEmail });
            setResendInfo('Un nouveau code vient de vous être envoyé par email.');
        } catch {
            setResendInfo('Un nouveau code vient de vous être envoyé par email.');
        }
    };

    const renderField = (
        name: keyof SignUpFormSchema,
        label: string,
        placeholder: string,
        type: string = 'text',
        required: boolean = false
    ) => (
        <div>
            <label style={labelStyle}>
                {label}{required && <span style={{ color: '#f87171' }}> *</span>}
            </label>
            <Controller
                name={name}
                control={control}
                render={({ field }) => (
                    <input
                        {...field}
                        type={type}
                        placeholder={placeholder}
                        style={{
                            ...inputStyle,
                            borderColor: errors[name] ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.6)'; }}
                        onBlur={(e) => {
                            e.target.style.borderColor = errors[name] ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)';
                            field.onBlur();
                        }}
                    />
                )}
            />
            {errors[name] && <p style={errorStyle}>{errors[name]?.message as string}</p>}
        </div>
    );

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }}>
            {/* Backdrop */}
            <div onClick={handleClose} style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            }} />

            {/* Modal */}
            <div style={{
                position: 'relative', width: '100%', maxWidth: '520px',
                background: 'linear-gradient(145deg, #0f1623, #111827)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '18px', padding: '32px',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                maxHeight: '90vh', overflowY: 'auto',
            }}>
                {/* Close */}
                <button onClick={handleClose} style={{
                    position: 'absolute', top: '16px', right: '16px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '32px', height: '32px', padding: 0,
                }}>
                    <HiX size={16} />
                </button>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '7px',
                        background: 'rgba(47,111,237,0.1)', border: '1px solid rgba(47,111,237,0.22)',
                        borderRadius: '100px', padding: '4px 13px', marginBottom: '16px',
                    }}>
                        <div style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: '#2f6fed', boxShadow: '0 0 6px rgba(47,111,237,0.8)',
                        }} />
                        <span style={{ color: '#6b9eff', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                            Nouveau compte
                        </span>
                    </div>
                    <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
                        {awaitingCode
                            ? 'Vérifiez votre email'
                            : isGenerator
                            ? "Devenir apporteur d'affaires"
                            : 'Créer un compte client'}
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '13px', lineHeight: 1.65, margin: 0 }}>
                        {awaitingCode
                            ? `Un code à 6 chiffres a été envoyé à ${pendingEmail}`
                            : isGenerator
                            ? 'Recommandez PEG et percevez une commission sur les commandes de vos filleuls'
                            : 'Rejoignez la plateforme PEG en quelques secondes'}
                    </p>
                </div>

                {/* Choix de la nature du compte */}
                {!successMessage && !awaitingCode && (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                        <AccountTypeCard
                            active={!isGenerator}
                            title="Client"
                            subtitle="Commander, suivre vos projets et vos BAT"
                            icon={<HiOutlineOfficeBuilding size={18} />}
                            onClick={() => switchAccountType('customer')}
                        />
                        <AccountTypeCard
                            active={isGenerator}
                            title="Générateur"
                            subtitle="Apporter des clients et toucher une commission"
                            icon={<HiOutlineCash size={18} />}
                            onClick={() => switchAccountType('generator')}
                        />
                    </div>
                )}

                {/* Success */}
                {successMessage && (
                    <div style={{
                        background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
                        borderRadius: '10px', padding: '12px 14px', marginBottom: '20px',
                        color: '#4ade80', fontSize: '13px', fontFamily: 'Inter, sans-serif', textAlign: 'center',
                    }}>
                        {successMessage}

                        {/* Générateur : son code de parrainage, disponible immédiatement */}
                        {isGenerator && grantedReferral?.code && (
                            <div style={{
                                marginTop: '14px', background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                                padding: '14px', textAlign: 'left',
                            }}>
                                <p style={{ ...labelStyle, marginBottom: '8px' }}>Votre code de parrainage</p>
                                <p style={{
                                    color: '#fff', fontSize: '20px', fontWeight: 800,
                                    letterSpacing: '0.1em', margin: '0 0 10px',
                                }}>
                                    {grantedReferral.code}
                                </p>
                                <p style={{
                                    color: 'rgba(255,255,255,0.45)', fontSize: '11.5px',
                                    margin: '0 0 10px', wordBreak: 'break-all', lineHeight: 1.5,
                                }}>
                                    {grantedReferral.link}
                                </p>
                                <button type="button" onClick={copyReferralLink} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                                    background: 'rgba(47,111,237,0.15)', border: '1px solid rgba(47,111,237,0.35)',
                                    borderRadius: '8px', color: '#6b9eff', fontSize: '12.5px', fontWeight: 600,
                                    cursor: 'pointer', padding: '7px 12px', fontFamily: 'Inter, sans-serif',
                                }}>
                                    {copied ? <HiCheck size={14} /> : <HiOutlineDuplicate size={14} />}
                                    {copied ? 'Lien copié' : 'Copier mon lien de parrainage'}
                                </button>
                            </div>
                        )}

                        <div style={{ marginTop: '12px' }}>
                            <button onClick={handleClose} style={{
                                background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.3)',
                                borderRadius: '8px', color: '#4ade80', fontSize: '13px', fontWeight: 600,
                                cursor: 'pointer', padding: '8px 20px', fontFamily: 'Inter, sans-serif',
                            }}>
                                Se connecter
                            </button>
                        </div>
                    </div>
                )}

                {/* Error */}
                {errorMessage && (
                    <div style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: '10px', padding: '12px 14px', marginBottom: '20px',
                        color: '#f87171', fontSize: '13px', fontFamily: 'Inter, sans-serif',
                    }}>
                        {errorMessage}
                    </div>
                )}

                {/* Étape : saisie du code de validation */}
                {!successMessage && awaitingCode && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={labelStyle}>Code de validation <span style={{ color: '#f87171' }}>*</span></label>
                            <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                onKeyDown={(e) => { if (e.key === 'Enter') onVerifyCode(); }}
                                placeholder="123456"
                                autoFocus
                                style={{
                                    ...inputStyle,
                                    textAlign: 'center',
                                    fontSize: '26px',
                                    fontWeight: 700,
                                    letterSpacing: '10px',
                                    borderColor: codeError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)',
                                }}
                            />
                            {codeError && <p style={errorStyle}>{codeError}</p>}
                            {resendInfo && <p style={{ ...errorStyle, color: '#4ade80' }}>{resendInfo}</p>}
                        </div>

                        <button type="button" onClick={onVerifyCode} disabled={verifying} style={{
                            width: '100%',
                            background: verifying ? 'rgba(47,111,237,0.5)' : 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
                            border: 'none', borderRadius: '10px', padding: '13px',
                            color: '#fff', fontSize: '14px', fontWeight: 700,
                            cursor: verifying ? 'not-allowed' : 'pointer',
                            boxShadow: verifying ? 'none' : '0 4px 16px rgba(47,111,237,0.4)',
                            transition: 'all 0.15s', fontFamily: 'Inter, sans-serif',
                        }}>
                            {verifying ? 'Validation...' : 'Valider mon compte'}
                        </button>

                        <div style={{ textAlign: 'center' }}>
                            <button type="button" onClick={onResendCode} style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'rgba(255,255,255,0.55)', fontSize: '12.5px', fontFamily: 'Inter, sans-serif',
                                textDecoration: 'underline',
                            }}>
                                Je n'ai pas reçu le code — le renvoyer
                            </button>
                        </div>
                    </div>
                )}

                {!successMessage && !awaitingCode && (
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            {/* Générateur : rappel du fonctionnement avant de saisir quoi que ce soit */}
                            {isGenerator && (
                                <div style={{
                                    background: 'rgba(47,111,237,0.08)', border: '1px solid rgba(47,111,237,0.2)',
                                    borderRadius: '10px', padding: '12px 14px',
                                    color: 'rgba(255,255,255,0.6)', fontSize: '12.5px', lineHeight: 1.6,
                                    fontFamily: 'Inter, sans-serif',
                                }}>
                                    Une fois votre email validé, vous recevez un <strong style={{ color: '#fff' }}>code
                                    de parrainage unique</strong> et un lien à partager. Chaque commande payée par un
                                    client inscrit avec votre code vous rapporte une commission, suivie dans votre wallet.
                                </div>
                            )}

                            {/* Section : Identité */}
                            <p style={sectionTitleStyle}>Informations personnelles</p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {renderField('firstName', 'Prénom', 'Jean', 'text', true)}
                                {renderField('lastName', 'Nom', 'Dupont', 'text', true)}
                            </div>

                            {renderField('email', 'Adresse email', 'vous@exemple.com', 'email', true)}
                            {isGenerator
                                ? renderField('phoneNumber', 'Téléphone', '06 12 34 56 78', 'tel')
                                : renderField('jobTitle', "Rôle dans l'entreprise", 'Directeur commercial, CEO...', 'text')}

                            {/* Mot de passe */}
                            <div>
                                <label style={labelStyle}>Mot de passe <span style={{ color: '#f87171' }}>*</span></label>
                                <Controller name="password" control={control} render={({ field }) => (
                                    <div style={{ position: 'relative' }}>
                                        <input {...field} type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                                            style={{ ...inputStyle, paddingRight: '42px', borderColor: errors.password ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)' }}
                                            onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.6)'; }}
                                            onBlur={(e) => { e.target.style.borderColor = errors.password ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'; field.onBlur(); }}
                                        />
                                        <button type="button" onClick={() => setShowPassword(v => !v)} style={{
                                            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            color: 'rgba(255,255,255,0.55)', padding: 0, display: 'flex',
                                        }}>
                                            {showPassword ? <HiEyeOff size={16} /> : <HiEye size={16} />}
                                        </button>
                                    </div>
                                )} />
                                {errors.password && <p style={errorStyle}>{errors.password.message}</p>}
                            </div>

                            <div>
                                <label style={labelStyle}>Confirmer le mot de passe <span style={{ color: '#f87171' }}>*</span></label>
                                <Controller name="confirmPassword" control={control} render={({ field }) => (
                                    <div style={{ position: 'relative' }}>
                                        <input {...field} type={showConfirm ? 'text' : 'password'} placeholder="••••••••"
                                            style={{ ...inputStyle, paddingRight: '42px', borderColor: errors.confirmPassword ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)' }}
                                            onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.6)'; }}
                                            onBlur={(e) => { e.target.style.borderColor = errors.confirmPassword ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.1)'; field.onBlur(); }}
                                        />
                                        <button type="button" onClick={() => setShowConfirm(v => !v)} style={{
                                            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            color: 'rgba(255,255,255,0.55)', padding: 0, display: 'flex',
                                        }}>
                                            {showConfirm ? <HiEyeOff size={16} /> : <HiEye size={16} />}
                                        </button>
                                    </div>
                                )} />
                                {errors.confirmPassword && <p style={errorStyle}>{errors.confirmPassword.message}</p>}
                            </div>

                            {/* Section : Entreprise */}
                            <p style={{ ...sectionTitleStyle, marginTop: '8px' }}>
                                {isGenerator ? 'Votre structure (facultatif)' : 'Informations entreprise'}
                            </p>

                            {renderField(
                                'companyName',
                                isGenerator ? 'Société / structure' : 'Nom de la société',
                                'Mon Entreprise SAS',
                                'text'
                            )}

                            {!isGenerator && (
                                <div>
                                    <label style={labelStyle}>Secteur d'activité</label>
                                    <Controller
                                        name="customerCategoryId"
                                        control={control}
                                        render={({ field }) => (
                                            <select
                                                {...field}
                                                style={{
                                                    ...inputStyle,
                                                    cursor: 'pointer',
                                                    appearance: 'none',
                                                }}
                                            >
                                                <option value="" style={{ background: '#111827' }}>— Choisir un secteur —</option>
                                                {categories.map((cat) => (
                                                    <option key={cat.documentId} value={cat.documentId} style={{ background: '#111827' }}>
                                                        {cat.name}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    />
                                </div>
                            )}

                            {/* Section : Adresse */}
                            <p style={{ ...sectionTitleStyle, marginTop: '8px' }}>Adresse postale</p>

                            {renderField('address', 'Adresse', '12 rue de la Paix', 'text')}
                            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px' }}>
                                {renderField('zipCode', 'Code postal', '75001', 'text')}
                                {renderField('city', 'Ville', 'Paris', 'text')}
                            </div>

                            {/* Section : Parrainage — un Générateur parraine, il n'est pas parrainé */}
                            {!isGenerator && (
                              <>
                                <p style={{ ...sectionTitleStyle, marginTop: '8px' }}>Parrainage (facultatif)</p>

                                <div>
                                    <label style={labelStyle}>Code de parrainage</label>
                                    <Controller
                                        name="referralCode"
                                        control={control}
                                        render={({ field }) => (
                                            <input
                                                {...field}
                                                type="text"
                                                placeholder="Ex : DUPONT-A7K2"
                                                autoCapitalize="characters"
                                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                                onBlur={(e) => {
                                                    field.onBlur();
                                                    checkReferral(e.target.value);
                                                }}
                                                style={{
                                                    ...inputStyle,
                                                    letterSpacing: '0.06em',
                                                    borderColor:
                                                        referralStatus.state === 'valid'
                                                            ? 'rgba(34,197,94,0.5)'
                                                            : referralStatus.state === 'invalid'
                                                            ? 'rgba(239,68,68,0.5)'
                                                            : 'rgba(255,255,255,0.1)',
                                                }}
                                            />
                                        )}
                                    />
                                    {referralStatus.state === 'checking' && (
                                        <p style={{ ...errorStyle, color: 'rgba(255,255,255,0.45)' }}>
                                            Vérification du code…
                                        </p>
                                    )}
                                    {referralStatus.state === 'valid' && (
                                        <p style={{ ...errorStyle, color: '#4ade80' }}>
                                            Code valide — vous serez parrainé par{' '}
                                            {referralStatus.name || 'un Générateur PEG'}.
                                        </p>
                                    )}
                                    {referralStatus.state === 'invalid' && (
                                        <p style={errorStyle}>
                                            Code inconnu — vous pouvez continuer sans parrainage.
                                        </p>
                                    )}
                                </div>
                              </>
                            )}

                            {/* Submit */}
                            <button type="submit" disabled={isSubmitting} style={{
                                width: '100%', marginTop: '8px',
                                background: isSubmitting ? 'rgba(47,111,237,0.5)' : 'linear-gradient(90deg, #2f6fed, #1f4bb6)',
                                border: 'none', borderRadius: '10px', padding: '13px',
                                color: '#fff', fontSize: '14px', fontWeight: 700,
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                boxShadow: isSubmitting ? 'none' : '0 4px 16px rgba(47,111,237,0.4)',
                                transition: 'all 0.15s', fontFamily: 'Inter, sans-serif', letterSpacing: '0.01em',
                            }}>
                                {isSubmitting
                                    ? 'Création en cours...'
                                    : isGenerator
                                    ? 'Créer mon compte Générateur'
                                    : 'Créer mon compte'}
                            </button>

                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default SignUpModal;
