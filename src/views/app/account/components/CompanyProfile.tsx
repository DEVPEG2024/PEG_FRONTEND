import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useAppSelector } from '@/store';
import { User } from '@/@types/user';
import { apiUpdateCustomerByDocumentId, apiGetCustomerForEditByDocumentId } from '@/services/CustomerServices';
import { API_BASE_URL } from '@/configs/api.config';
import { AiOutlineSave } from 'react-icons/ai';
import { useNavigate } from 'react-router-dom';

type CustomerCategory = { documentId: string; name: string };

type CompanyFormModel = {
    name: string;
    customerCategoryId: string;
    address: string;
    zipCode: string;
    city: string;
    country: string;
    phoneNumber: string;
    companyEmail: string;
    vatNumber: string;
    siretNumber: string;
    website: string;
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: '#fff',
    fontSize: '13px',
    fontFamily: 'Inter, sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    color: 'rgba(255,255,255,0.55)',
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '6px',
};

const sectionStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.25)',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '8px',
    marginBottom: '14px',
    marginTop: '8px',
};

const CompanyProfile = () => {
    const navigate = useNavigate();
    const { user }: { user: User } = useAppSelector((state) => state.auth.user);
    const [categories, setCategories] = useState<CustomerCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [deferredPayment, setDeferredPayment] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<CompanyFormModel>({
        defaultValues: {
            name: '',
            customerCategoryId: '',
            address: '',
            zipCode: '',
            city: '',
            country: '',
            phoneNumber: '',
            companyEmail: '',
            vatNumber: '',
            siretNumber: '',
            website: '',
        },
    });

    useEffect(() => {
        fetch(`${API_BASE_URL}/auth/customer-categories`)
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setCategories(data); })
            .catch(() => {});

        if (user.customer?.documentId) {
            apiGetCustomerForEditByDocumentId(user.customer.documentId)
                .then((res: any) => {
                    const arr = res?.data?.data ?? res?.data ?? [];
                    const customer = Array.isArray(arr) ? arr[0] : arr;
                    if (customer) {
                        setDeferredPayment(!!customer.deferredPayment);
                        reset({
                            name: customer.name || '',
                            customerCategoryId: customer.customerCategory?.documentId || '',
                            address: customer.companyInformations?.address || '',
                            zipCode: customer.companyInformations?.zipCode || '',
                            city: customer.companyInformations?.city || '',
                            country: customer.companyInformations?.country || '',
                            phoneNumber: customer.companyInformations?.phoneNumber || '',
                            companyEmail: customer.companyInformations?.email || '',
                            vatNumber: customer.companyInformations?.vatNumber || '',
                            siretNumber: customer.companyInformations?.siretNumber || '',
                            website: customer.companyInformations?.website || '',
                        });
                    }
                })
                .catch(() => {})
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const onSubmit = async (values: CompanyFormModel) => {
        setErrorMessage('');
        setSuccessMessage('');
        if (!user.customer?.documentId) return;
        try {
            await apiUpdateCustomerByDocumentId(user.customer.documentId, {
                name: values.name,
                ...(values.customerCategoryId ? { customerCategory: values.customerCategoryId } : {}),
                companyInformations: {
                    address: values.address,
                    zipCode: values.zipCode,
                    city: values.city,
                    country: values.country,
                    phoneNumber: values.phoneNumber,
                    email: values.companyEmail,
                    vatNumber: values.vatNumber,
                    siretNumber: values.siretNumber,
                    website: values.website,
                },
            });
            setSuccessMessage('Informations enregistrées avec succès.');
        } catch {
            setErrorMessage('Une erreur est survenue. Veuillez réessayer.');
        }
    };

    const renderField = (
        name: keyof CompanyFormModel,
        label: string,
        placeholder: string,
        type: string = 'text'
    ) => (
        <div>
            <label style={labelStyle}>{label}</label>
            <Controller name={name} control={control} render={({ field }) => (
                <input
                    {...field}
                    type={type}
                    placeholder={placeholder}
                    style={inputStyle}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; field.onBlur(); }}
                />
            )} />
        </div>
    );

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} style={{ height: '44px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }} />
                ))}
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} style={{ fontFamily: 'Inter, sans-serif' }}>

            {successMessage && (
                <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '10px', padding: '10px 14px', marginBottom: '18px', color: '#4ade80', fontSize: '13px' }}>
                    {successMessage}
                </div>
            )}
            {errorMessage && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', padding: '10px 14px', marginBottom: '18px', color: '#f87171', fontSize: '13px' }}>
                    {errorMessage}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {/* Informations entreprise */}
                <p style={sectionStyle}>Informations entreprise</p>

                {renderField('name', 'Nom de la société', 'Mon Entreprise SAS')}

                <div>
                    <label style={labelStyle}>Secteur d'activité</label>
                    <Controller name="customerCategoryId" control={control} render={({ field }) => (
                        <select
                            {...field}
                            style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}
                        >
                            <option value="" style={{ background: '#111827' }}>— Choisir un secteur —</option>
                            {categories.map((cat) => (
                                <option key={cat.documentId} value={cat.documentId} style={{ background: '#111827' }}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                    )} />
                </div>

                {/* Paiement différé — lecture seule */}
                <div>
                    <label style={labelStyle}>Paiement différé</label>
                    <div style={{
                        ...inputStyle,
                        background: 'rgba(255,255,255,0.02)',
                        color: 'rgba(255,255,255,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'not-allowed',
                    }}>
                        <div style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: deferredPayment ? '#4ade80' : 'rgba(255,255,255,0.2)',
                            boxShadow: deferredPayment ? '0 0 6px rgba(74,222,128,0.6)' : 'none',
                            flexShrink: 0,
                        }} />
                        <span style={{ fontSize: '13px', color: deferredPayment ? '#4ade80' : 'rgba(255,255,255,0.4)' }}>
                            {deferredPayment ? 'Activé' : 'Non activé'}
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
                            Géré par l'administrateur
                        </span>
                    </div>
                </div>

                {/* Identifiants légaux */}
                <p style={{ ...sectionStyle, marginTop: '4px' }}>Identifiants légaux</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {renderField('vatNumber', 'N° TVA intracommunautaire', 'FR12345678901')}
                    {renderField('siretNumber', 'N° SIRET', '12345678900012')}
                </div>

                {/* Adresse */}
                <p style={{ ...sectionStyle, marginTop: '4px' }}>Adresse postale</p>

                {renderField('address', 'Adresse', '12 rue de la Paix')}

                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px' }}>
                    {renderField('zipCode', 'Code postal', '75001')}
                    {renderField('city', 'Ville', 'Paris')}
                </div>

                {renderField('country', 'Pays', 'France')}

                {/* Contact */}
                <p style={{ ...sectionStyle, marginTop: '4px' }}>Contact professionnel</p>

                {renderField('phoneNumber', 'Téléphone', '+33 1 23 45 67 89', 'tel')}
                {renderField('companyEmail', 'Email professionnel', 'contact@monentreprise.fr', 'email')}
                {renderField('website', 'Site internet', 'https://monentreprise.fr', 'url')}

            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '28px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => navigate('/home')}
                    style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.55)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
                >
                    Annuler
                </button>
                <button type="submit" disabled={isSubmitting}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: isSubmitting ? 'rgba(47,111,237,0.5)' : 'linear-gradient(90deg, #2f6fed, #1f4bb6)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', boxShadow: isSubmitting ? 'none' : '0 4px 14px rgba(47,111,237,0.4)', fontFamily: 'Inter, sans-serif' }}
                >
                    <AiOutlineSave size={15} />
                    {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
                </button>
            </div>

        </form>
    );
};

export default CompanyProfile;
