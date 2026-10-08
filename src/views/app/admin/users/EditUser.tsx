import UserForm, {
  SetSubmitting,
} from '@/views/app/admin/users/UserForms/UserForm';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import reducer, {
  getCustomersIdTable,
  getProducersIdTable,
  getRolesIdTable,
  getUserById,
  getUsersIdTable,
  setUser,
  useAppDispatch,
  useAppSelector,
} from './store';
import { Role, User } from '@/@types/user';
import {
  apiGetCustomers,
  GetCustomersResponse,
} from '@/services/CustomerServices';
import { unwrapData } from '@/utils/serviceHelper';
import { Customer } from '@/@types/customer';
import {
  apiGetProducers,
  GetProducersResponse,
} from '@/services/ProducerServices';
import { Producer } from '@/@types/producer';
import {
  apiCreateUser,
  apiFindUserByEmail,
  apiGetUsersPermissionsRoles,
  apiUpdateUser,
} from '@/services/UserService';
import { apiResendEmailCode } from '@/services/AuthService';
import { injectReducer } from '@/store';
import { toast } from 'react-toastify';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  producer: 'Producteur',
  customer: 'Client',
  generator: 'Générateur',
};

/** Message du serveur (Strapi) plutôt que « Request failed with status code 400 ». */
const serverMessage = (error: any): string =>
  error?.response?.data?.error?.message ||
  error?.response?.data?.message ||
  error?.message ||
  "Erreur lors de la sauvegarde de l'utilisateur";

const Notice = ({ children, actions }: { children: ReactNode; actions?: ReactNode }) => (
  <div
    role="alert"
    style={{
      background: 'rgba(234,179,8,0.08)',
      border: '1px solid rgba(234,179,8,0.35)',
      borderRadius: '12px',
      padding: '14px 16px',
      margin: '16px 0',
      color: 'rgba(255,255,255,0.85)',
      fontSize: '13px',
      lineHeight: 1.5,
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
    }}
  >
    <div style={{ flex: '1 1 280px' }}>{children}</div>
    {actions && <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>{actions}</div>}
  </div>
);

const noticeButton: CSSProperties = {
  background: 'rgba(47,111,237,0.15)',
  border: '1px solid rgba(47,111,237,0.4)',
  borderRadius: '10px',
  padding: '8px 14px',
  color: '#6b9eff',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

injectReducer('users', reducer);

export interface Options {
  label: string;
  value: string;
}

type EditUserParams = {
  documentId: string;
};

export type UserFormModel = Omit<
  User,
  | 'id'
  | 'documentId'
  | 'role'
  | 'customer'
  | 'producer'
  | 'authority'
  | 'avatar'
> & {
  documentId?: string;
  role: string | null;
  customer: string | null;
  producer: string | null;
};

const EditUser = () => {
  const navigate = useNavigate();
  const onEdition: boolean =
    useLocation().pathname.split('/').slice(-2).shift() === 'edit';
  const { documentId } = useParams<EditUserParams>() as EditUserParams;
  const { user, usersId, rolesId, customersId, producersId } = useAppSelector(
    (state) => state.users.data
  );
  const [customers, setCustomers] = useState<Options[]>([]);
  const [producers, setProducers] = useState<Options[]>([]);
  const [roles, setRoles] = useState<Options[]>([]);
  // Compte qui occupe déjà l'adresse saisie (création refusée par le serveur).
  const [existing, setExisting] = useState<User | null>(null);
  const [resending, setResending] = useState(false);
  const initialData: UserFormModel = {
    documentId: documentId ?? '',
    blocked: user?.blocked || false,
    email: user?.email || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    role: user?.role?.documentId || '',
    username: user?.username || '',
    customer: user?.customer?.documentId || '',
    producer: user?.producer?.documentId || '',
  };
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!user && onEdition) {
      dispatch(getUserById(documentId));
    }
    dispatch(getUsersIdTable());
    dispatch(getRolesIdTable());
    dispatch(getCustomersIdTable());
    dispatch(getProducersIdTable());
    return () => {
      dispatch(setUser(null));
    };
    // documentId : « Ouvrir ce compte » passe de /add à /edit/:id sans démonter l'écran.
  }, [dispatch, documentId, onEdition]);

  useEffect(() => {
    fetchCustomers();
    fetchProducers();
    fetchRoles();
  }, []);

  const fetchCustomers = async () => {
    const {
      customers_connection,
    }: { customers_connection: GetCustomersResponse } =
      await unwrapData(apiGetCustomers());
    const customersList = customers_connection.nodes || [];
    const customers = customersList.map((customer: Customer) => ({
      value: customer.documentId || '',
      label: customer.name,
    }));
    setCustomers(customers);
  };

  const fetchProducers = async () => {
    const {
      producers_connection,
    }: { producers_connection: GetProducersResponse } =
      await unwrapData(apiGetProducers());
    const producersList = producers_connection.nodes || [];
    const producers = producersList.map((producer: Producer) => ({
      value: producer.documentId || '',
      label: producer.name,
    }));
    setProducers(producers);
  };

  const fetchRoles = async () => {
    const { usersPermissionsRoles }: { usersPermissionsRoles: Role[] } =
      await unwrapData(apiGetUsersPermissionsRoles());
    const roles = usersPermissionsRoles
      .filter((role: Role) => !['Public', 'Authenticated'].includes(role.name))
      .map((role: Role) => ({
        value: role.documentId || '',
        label: role.name,
      }));
    setRoles(roles);
  };

  const updateOrCreateUser = async (
    data: Partial<User>
  ): Promise<User | { id: number; documentId: string; email: string }> => {
    if (onEdition) {
      const numericId = usersId.find(({ documentId: dId }) => dId === data.documentId)?.id;
      const response: any = await apiUpdateUser(data, String(numericId));
      return response.data;
    }
    const created = await apiCreateUser(data as any);
    return created.data;
  };

  const handleFormSubmit = async (values: UserFormModel) => {
    // Les relations sont envoyées au backend en id numérique (ou documentId
    // string en fallback) ; le type User attend les objets Role/Customer/Producer
    // → cast frontière vers Partial<User>.
    const data: Partial<User> = {
      ...values,
      role: (rolesId.find(({ documentId: dId }) => dId === values.role)?.id ?? values.role) as unknown as User['role'],
      customer: (customersId.find(({ documentId: dId }) => dId === values.customer)?.id ?? values.customer) as unknown as User['customer'],
      producer: (producersId.find(({ documentId: dId }) => dId === values.producer)?.id ?? values.producer) as unknown as User['producer'],
    };
    if (!onEdition) {
      delete data.documentId;
      // Une adresse ne peut porter qu'un compte : on nomme celui qui l'occupe
      // déjà (souvent une inscription par le formulaire public, non confirmée)
      // au lieu de laisser le serveur répondre un « 400 » muet.
      const found = values.email ? await apiFindUserByEmail(values.email).catch(() => null) : null;
      if (found) {
        setExisting(found);
        return;
      }
    }
    setExisting(null);

    try {
      await updateOrCreateUser(data);
      navigate('/admin/users');
    } catch (error: any) {
      toast.error(serverMessage(error));
    }
  };

  const resendCode = async (email: string) => {
    setResending(true);
    try {
      await apiResendEmailCode({ email });
      toast.success(`Nouveau code envoyé à ${email}`);
    } catch (error: any) {
      toast.error(serverMessage(error));
    } finally {
      setResending(false);
    }
  };

  const describe = (u: User) => {
    const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.username;
    const states = [
      ROLE_LABELS[u.role?.name ?? ''] ?? u.role?.name,
      u.customer?.name ? `fiche client « ${u.customer.name} »` : null,
      u.confirmed === false ? 'inscription non confirmée' : null,
      u.blocked ? 'bloqué' : null,
    ].filter(Boolean);
    return `${name}${states.length ? ` (${states.join(', ')})` : ''}`;
  };

  const handleDiscard = () => {
    navigate('/admin/users');
  };

  return (
    (!onEdition || user) && (
      <UserForm
        notice={
          <>
            {!onEdition && existing && (
              <Notice
                actions={
                  <button
                    type="button"
                    style={noticeButton}
                    onClick={() => {
                      const id = existing.documentId;
                      setExisting(null);
                      navigate(`/admin/users/edit/${id}`);
                    }}
                  >
                    Ouvrir ce compte
                  </button>
                }
              >
                <strong>Cette adresse est déjà utilisée</strong> par le compte de {describe(existing)}.
                {existing.confirmed === false &&
                  ' Cette personne s’est inscrite elle-même mais n’a pas encore saisi le code reçu par e-mail : elle ne peut pas se connecter tant que ce n’est pas fait.'}
              </Notice>
            )}
            {onEdition && user?.confirmed === false && (
              <Notice
                actions={
                  <button type="button" style={noticeButton} disabled={resending} onClick={() => resendCode(user.email)}>
                    {resending ? 'Envoi…' : 'Renvoyer le code'}
                  </button>
                }
              >
                <strong>Inscription non confirmée.</strong> Ce compte a été créé par le formulaire d’inscription et le code
                reçu par e-mail n’a pas été saisi : la personne ne peut pas encore se connecter.
              </Notice>
            )}
          </>
        }
        onEdition={onEdition}
        initialData={initialData}
        onFormSubmit={handleFormSubmit}
        onDiscard={handleDiscard}
        customers={customers}
        producers={producers}
        roles={roles}
      />
    )
  );
};

export default EditUser;
