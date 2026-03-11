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
    phoneNumber: string;
    companyEmail: string;
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
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<CompanyFormModel>({
        defaultValues: {
            name: '',
            customerCategoryId: '',
            address: '',
            zipCode: '',
            city: '',
            phoneNumber: '',
            companyEmail: '',
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
                        reset({
                            name: customer.name || '',
                            customerCategoryId: customer.customerCategory?.documentId || '',
                            address: customer.companyInformations?.address || '',
                            zipCode: customer.companyInformations?.zipCode || '',
                            city: customer.companyInformations?.city || '',
                            phoneNumber: customer.companyInformations?.phoneNumber || '',
                            companyEmail: customer.companyInformations?.email || '',
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
                    phoneNumber: values.phoneNumber,
                    email: values.companyEmail,
                },
            });
            setSuccessMessage('Informations enregistrées avec succès.');
        } catch {
            setErrorMessage('Une erreur est survenue. Veuillez réessayer.');
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Array.from({ length: 5 }).map((_, i) => (
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

                <p style={sectionStyle}>Informations entreprise</p>

                <div>
                    <label style={labelStyle}>Nom de la société</label>
                    <Controller name="name" control={control} render={({ field }) => (
                        <input {...field} type="text" placeholder="Mon Entreprise SAS"
                            style={inputStyle}
                            onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; field.onBlur(); }}
                        />
                    )} />
                </div>

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

                <p style={{ ...sectionStyle, marginTop: '4px' }}>Adresse postale</p>

                <div>
                    <label style={labelStyle}>Adresse</label>
                    <Controller name="address" control={control} render={({ field }) => (
                        <input {...field} type="text" placeholder="12 rue de la Paix"
                            style={inputStyle}
                            onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; field.onBlur(); }}
                        />
                    )} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px' }}>
                    <div>
                        <label style={labelStyle}>Code postal</label>
                        <Controller name="zipCode" control={control} render={({ field }) => (
                            <input {...field} type="text" placeholder="75001"
                                style={inputStyle}
                                onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; field.onBlur(); }}
                            />
                        )} />
                    </div>
                    <div>
                        <label style={labelStyle}>Ville</label>
                        <Controller name="city" control={control} render={({ field }) => (
                            <input {...field} type="text" placeholder="Paris"
                                style={inputStyle}
                                onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)'; }}
                                onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; field.onBlur(); }}
                            />
                        )} />
                    </div>
                </div>

                <p style={{ ...sectionStyle, marginTop: '4px' }}>Contact professionnel</p>

                <div>
                    <label style={labelStyle}>Téléphone</label>
                    <Controller name="phoneNumber" control={control} render={({ field }) => (
                        <input {...field} type="tel" placeholder="+33 1 23 45 67 89"
                            style={inputStyle}
                            onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; field.onBlur(); }}
                        />
                    )} />
                </div>

                <div>
                    <label style={labelStyle}>Email professionnel</label>
                    <Controller name="companyEmail" control={control} render={({ field }) => (
                        <input {...field} type="email" placeholder="contact@monentreprise.fr"
                            style={inputStyle}
                            onFocus={(e) => { e.target.style.borderColor = 'rgba(47,111,237,0.5)'; }}
                            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.09)'; field.onBlur(); }}
                        />
                    )} />
                </div>

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
