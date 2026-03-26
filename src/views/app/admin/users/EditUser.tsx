import UserForm, {
  SetSubmitting,
} from '@/views/app/admin/users/UserForms/UserForm';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { useEffect, useState } from 'react';
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
  apiGetUsersPermissionsRoles,
  apiUpdateUser,
} from '@/services/UserService';
import { injectReducer } from '@/store';
import { toast } from 'react-toastify';

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
  const initialData: UserFormModel = {
    documentId: documentId ?? '',
    blocked: user?.blocked || false,
    email: user?.email || '',
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    role: user?.role.documentId || '',
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
  }, [dispatch]);

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

  const updateOrCreateUser = async (data: User): Promise<User> => {
    if (onEdition) {
      const numericId = usersId.find(({ documentId: dId }) => dId === data.documentId)?.id;
      const response: any = await apiUpdateUser(data, String(numericId));
      return response.data;
    }
    const created = await apiCreateUser(data);
    const userId = (created.data as any).user?.id ?? (created.data as any).id;
    const response: any = await apiUpdateUser(data, String(userId));
    return response.data;
  };

  const handleFormSubmit = async (values: UserFormModel) => {
    const data: User = {
      ...values,
      role: rolesId.find(({ documentId: dId }) => dId === values.role)?.id ?? values.role,
      customer: customersId.find(({ documentId: dId }) => dId === values.customer)?.id ?? values.customer,
      producer: producersId.find(({ documentId: dId }) => dId === values.producer)?.id ?? values.producer,
    };
    if (!onEdition) {
      delete data.documentId;
    }

    try {
      await updateOrCreateUser(data);
      navigate('/admin/users');
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de la sauvegarde de l'utilisateur");
    }
  };

  const handleDiscard = () => {
    navigate('/admin/users');
  };

  return (
    (!onEdition || user) && (
      <UserForm
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
