import CustomerForm, {
  CustomerFormModel,
  SetSubmitting,
} from '@/views/app/admin/customers/lists/CustomersForm';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CUSTOMERS_LIST } from '@/constants/navigation.constant';
import { useEffect, useState } from 'react';
import { injectReducer, useAppDispatch } from '@/store';
import reducer, { getCustomerById, setCustomer, useAppSelector } from '../store';
import { apiGetCustomerCategories, GetCustomerCategoriesResponse } from '@/services/CustomerCategoryServices';
import { unwrapData } from '@/utils/serviceHelper';
import { Customer, CustomerCategory } from '@/@types/customer';
import { apiCreateCustomer, apiUpdateCustomer } from '@/services/CustomerServices';

injectReducer('customers', reducer);

export interface Options {
  value: string;
  label: string;
}

type EditCustomerParams = {
  documentId: string;
};

const EditCustomer = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const onEdition: boolean =
    useLocation().pathname.split('/').slice(-2).shift() === 'edit';
  const { documentId } = useParams<EditCustomerParams>() as EditCustomerParams;
  const { customer } = useAppSelector((state) => state.customers.data);
  const [customerCategories, setCustomerCategories] = useState<Options[]>([]);
  const initialData: CustomerFormModel = {
    documentId: documentId ?? '',
    name: customer?.name || '',
    banner: customer?.banner?.documentId || null,
    customerCategory: customer?.customerCategory?.documentId || null,
    email: customer?.companyInformations.email || '',
    phoneNumber: customer?.companyInformations.phoneNumber || '',
    vatNumber: customer?.companyInformations.vatNumber || '',
    siretNumber: customer?.companyInformations.siretNumber || '',
    address: customer?.companyInformations.address || '',
    zipCode: customer?.companyInformations.zipCode || '',
    city: customer?.companyInformations.city || '',
    country: customer?.companyInformations.country || '',
    website: customer?.companyInformations.website || '',
  }

  useEffect(() => {
    if (!customer && onEdition) {
      dispatch(getCustomerById(documentId));
    } else {
      
    }
    return () => {
      dispatch(setCustomer(null))
    }
  }, [dispatch]);
  
  useEffect(() => {
    fetchCustomerCategories();
  }, []);

  const fetchCustomerCategories = async () => {
    const {customerCategories_connection} : {customerCategories_connection: GetCustomerCategoriesResponse}= await unwrapData(apiGetCustomerCategories());
    const customerCategoriesList: CustomerCategory[] = customerCategories_connection.nodes || [];
    const customerCategories = customerCategoriesList.map(
      (customerCategory: CustomerCategory) => ({
        value: customerCategory.documentId || '',
        label: customerCategory.name || '',
      })
    );
    setCustomerCategories(customerCategories);
  };

  const updateOrCreateCustomer = async (data: CustomerFormModel) : Promise<Customer> => {
    const customer: Omit<Customer, 'documentId'> = {
      banner: data.banner,
      companyInformations: {
        address: data.address,
        city: data.city,
        country: data.country,
        email: data.email,
        phoneNumber: data.phoneNumber,
        siretNumber: data.siretNumber,
        vatNumber: data.vatNumber,
        website: data.website,
        zipCode: data.zipCode
      },
      customerCategory: data.customerCategory,
      name: data.name,
    }
    if (onEdition) {
      const {updateCustomer} : {updateCustomer: Customer} = await unwrapData(apiUpdateCustomer({documentId: data.documentId, ...customer}));
      return updateCustomer
    }
    const {createCustomer} : {createCustomer: Customer} = await unwrapData(apiCreateCustomer(customer));
    return createCustomer
  }

  const handleFormSubmit = async (
    values: CustomerFormModel,
    setSubmitting: SetSubmitting
  ) => {
    setSubmitting(true);
    await updateOrCreateCustomer(values)
    setSubmitting(false);
    navigate(CUSTOMERS_LIST);
  };

  const handleDiscard = () => {
    navigate(CUSTOMERS_LIST);
  };
  return (!onEdition || customer) && (
    <>
      <CustomerForm
        initialData={initialData}
        customerCategories={customerCategories}
        onFormSubmit={handleFormSubmit}
        onDiscard={handleDiscard}
      />
    </>
  );
};

export default EditCustomer;
