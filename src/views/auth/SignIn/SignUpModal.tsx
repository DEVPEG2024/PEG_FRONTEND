import { useState, useEffect } from 'react';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as Yup from 'yup';
import { HiEye, HiEyeOff, HiX } from 'react-icons/hi';
import { apiSignUp } from '@/services/AuthService';
import { API_BASE_URL } from '@/configs/api.config';

interface SignUpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

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
    address?: string;
    zipCode?: string;
    city?: string;
};

const validationSchema = Yup.object().shape({
    firstName: Yup.string().required('Veuillez entrer votre prénom'),
    lastName: Yup.string().required('Veuillez entrer votre nom'),
    email: Yup.string().email('Adresse email invalide').required('Veuillez entrer votre adresse email'),
    password: Yup.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').required('Veuillez entrer un mot de passe'),
    confirmPassword: Yup.string()
        .oneOf([Yup.ref('password')], 'Les mots de passe ne correspondent pas')
        .required('Veuillez confirmer votre mot de passe'),
    jobTitle: Yup.string(),
    companyName: Yup.string(),
    customerCategoryId: Yup.string(),
    address: Yup.string(),
    zipCode: Yup.string(),
    city: Yup.string(),
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

const SignUpModal = ({ isOpen, onClose }: SignUpModalProps) => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [categories, setCategories] = useState<CustomerCategory[]>([]);

    useEffect(() => {
        fetch(`${API_BASE_URL}/auth/customer-categories`)
            .then((r) => r.json())
            .then((data) => { if (Array.isArray(data)) setCategories(data); })
            .catch(() => {});
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
            jobTitle: '', companyName: '', customerCategoryId: '', address: '', zipCode: '', city: '',
        },
    });

    const handleClose = () => {
        reset();
        setSuccessMessage('');
        setErrorMessage('');
        onClose();
    };

    const onSubmit = async (values: SignUpFormSchema) => {
        setErrorMessage('');
        try {
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
            });
            setSuccessMessage('Votre compte a été créé avec succès ! Vous pouvez maintenant vous connecter.');
            reset();
        } catch (err: any) {
            const msg = err?.response?.data?.error?.message || 'Une erreur est survenue. Veuillez réessayer.';
            setErrorMessage(msg);
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
                        Créer un compte client
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '13px', lineHeight: 1.65, margin: 0 }}>
                        Rejoignez la plateforme PEG en quelques secondes
                    </p>
                </div>

                {/* Success */}
                {successMessage && (
                    <div style={{
                        background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
                        borderRadius: '10px', padding: '12px 14px', marginBottom: '20px',
                        color: '#4ade80', fontSize: '13px', fontFamily: 'Inter, sans-serif', textAlign: 'center',
                    }}>
                        {successMessage}
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

                {!successMessage && (
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            {/* Section : Identité */}
                            <p style={sectionTitleStyle}>Informations personnelles</p>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {renderField('firstName', 'Prénom', 'Jean', 'text', true)}
                                {renderField('lastName', 'Nom', 'Dupont', 'text', true)}
                            </div>

                            {renderField('email', 'Adresse email', 'vous@exemple.com', 'email', true)}
                            {renderField('jobTitle', "Rôle dans l'entreprise", 'Directeur commercial, CEO...', 'text')}

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
                                            color: 'rgba(255,255,255,0.3)', padding: 0, display: 'flex',
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
                                            color: 'rgba(255,255,255,0.3)', padding: 0, display: 'flex',
                                        }}>
                                            {showConfirm ? <HiEyeOff size={16} /> : <HiEye size={16} />}
                                        </button>
                                    </div>
                                )} />
                                {errors.confirmPassword && <p style={errorStyle}>{errors.confirmPassword.message}</p>}
                            </div>

                            {/* Section : Entreprise */}
                            <p style={{ ...sectionTitleStyle, marginTop: '8px' }}>Informations entreprise</p>

                            {renderField('companyName', 'Nom de la société', 'Mon Entreprise SAS', 'text')}

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

                            {/* Section : Adresse */}
                            <p style={{ ...sectionTitleStyle, marginTop: '8px' }}>Adresse postale</p>

                            {renderField('address', 'Adresse', '12 rue de la Paix', 'text')}
                            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px' }}>
                                {renderField('zipCode', 'Code postal', '75001', 'text')}
                                {renderField('city', 'Ville', 'Paris', 'text')}
                            </div>

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
                                {isSubmitting ? 'Création en cours...' : 'Créer mon compte'}
                            </button>

                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default SignUpModal;
