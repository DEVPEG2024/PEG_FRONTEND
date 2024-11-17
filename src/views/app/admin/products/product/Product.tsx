import { useLocation, useNavigate } from 'react-router-dom';
import { Notification, toast } from '@/components/ui';
import { useEffect, useState } from 'react';
import { IProduct, OptionsFields } from '@/@types/product';
import SaisieForm, { FormModel, SetSubmitting } from './Forms/Form';
import { ICategoryCustomer } from '@/services/CustomerServices';
import { ICategory, IUser } from '@/@types/user';
import useCustomer from '@/utils/hooks/customers/useCustomer';
import useCategoryCustomer from '@/utils/hooks/customers/useCategoryCustomer';
import useCategoryProduct from '@/utils/hooks/products/useCategoryCustomer';
import { apiNewProduct, apiUpdateProduct } from '@/services/ProductServices';
import { apiGetForms, GetFormsResponse } from '@/services/FormServices';
import { Form, IForm } from '@/@types/form';
import { apiDeleteFile, apiGetFile } from '@/services/FileServices';
import { useAppSelector } from '../store';
import { FileItem } from '@/@types/formAnswer';
import { unwrapData } from '@/utils/serviceHelper';

interface Options {
  value: string;
  label: string;
}

export type FileNameBackFront = {
  fileNameBack: string;
  fileNameFront: string;
};

const Product = () => {
  const navigate = useNavigate();
  const onEdition: boolean =
    useLocation().pathname.split('/').slice(-2).shift() === 'edit';
  const { product } = useAppSelector((state) => state.products.data);
  const [sizeSelected, setSizeSelected] = useState(
    product?.sizes?.status || false
  );
  const [sizeField, setSizeField] = useState<OptionsFields[]>(
    product?.sizes?.options || []
  );
  const [field_text, setField_text] = useState(product?.field_text || false);
  const [customers, setCustomers] = useState<Options[]>([]);
  const [customersCategories, setCustomersCategories] = useState<Options[]>([]);
  const [categories, setCategories] = useState<Options[]>([]);
  const [selectedCustomersCategories, setSelectedCustomersCategories] =
    useState<string[]>(product?.customersCategories || []);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    product?.category || []
  );
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>(
    product?.customers || []
  );
  const [forms, setForms] = useState<Options[]>([]);
  const [selectedForm, setSelectedForm] = useState<string>(
    product?.form?._id || ''
  );
  const [imagesName, setImagesName] = useState<FileNameBackFront[]>(
    product?.images || []
  );
  const [isFirstRender, setFirstRender] = useState<boolean>(true);
  const [isSubmitted, setSubmitted] = useState<boolean>(false);
  const [images, setImages] = useState<FileItem[]>([]);

  const { getCustomers } = useCustomer();
  const { getCategoriesCustomers } = useCategoryCustomer();
  const { getCategoriesProduct } = useCategoryProduct();

  useEffect(() => {
    if (isFirstRender) {
      setFirstRender(false);
    }
    return () => {
      if (!isFirstRender && !isSubmitted) {
        removeAllFilesFromDisk();
      }
    };
  }, [isFirstRender]);

  useEffect(() => {
    fetchCustomers();
    fetchCustomersCategories();
    fetchCategories();
    fetchForms();
    fetchFiles();
  }, []);

  const fetchFiles = async (): Promise<void> => {
    const filesToLoad: FileNameBackFront[] = product?.images ?? [];

    if (filesToLoad.length > 0) {
      const filesLoaded: FileItem[] = await loadFiles(filesToLoad);
      setImages(filesLoaded);
    }
  };

  const loadFile = async (
    fileName: FileNameBackFront
  ): Promise<File | null> => {
    try {
      return await apiGetFile(fileName.fileNameBack, fileName.fileNameFront);
    } catch (error) {
      console.error('Erreur lors de la récupération du fichier :', error);
    }
    return null;
  };

  const loadFiles = async (
    fileNames: FileNameBackFront[]
  ): Promise<FileItem[]> => {
    const files: FileItem[] = [];
    for (const fileName of fileNames) {
      const file = await loadFile(fileName);
      if (file) {
        files.push({ fileName: fileName.fileNameFront, file });
      }
    }
    return files;
  };
  const fetchForms = async () => {
    const {forms_connection} : {forms_connection: GetFormsResponse}= await unwrapData(apiGetForms());
    const formsList = forms_connection.nodes || [];
    const forms = formsList.map((form: Form) => ({
      value: form.documentId || '',
      label: form.name,
    }));
    setForms(forms);
  };
  const fetchCustomers = async () => {
    const response = await getCustomers(1, 1000, '');
    const customersList = response.data || [];
    const customers = customersList.map((customer: IUser) => ({
      value: customer._id || '',
      label: customer.firstName + ' ' + customer.lastName,
    }));
    setCustomers(customers);
  };

  const fetchCustomersCategories = async () => {
    const response = await getCategoriesCustomers(1, 1000, '');
    const customersCategoriesList = response.data || [];
    const customersCategories = customersCategoriesList.map(
      (customerCategory: ICategoryCustomer) => ({
        value: customerCategory._id || '',
        label: customerCategory.label || '',
      })
    );
    setCustomersCategories(customersCategories);
  };

  const fetchCategories = async () => {
    const response = await getCategoriesProduct(1, 1000, '');
    const categoriesList = response.data || [];
    const categories = categoriesList.map((category: ICategory) => ({
      value: category._id || '',
      label: category.title || '',
    }));
    setCategories(categories);
  };

  const removeAllFilesFromDisk = async (): Promise<void> => {
    try {
      for (const file of imagesName) {
        await apiDeleteFile(file.fileNameBack);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du fichier :', error);
    }
  };

  const handleFormSubmit = async (
    values: FormModel,
    setSubmitting: SetSubmitting
  ) => {
    setSubmitting(true);
    const data = {
      ...values,
      field_text: field_text,
      sizes: {
        status: sizeSelected,
        options: sizeField,
      },
      customersCategories: selectedCustomersCategories,
      category: selectedCategories,
      customers: selectedCustomers,
      images: imagesName,
    };
    if (values.form === '') {
      delete data.form;
    }
    const response = onEdition
      ? await apiUpdateProduct(data)
      : await apiNewProduct(data);
    if (response.status === 200) {
      toast.push(
        <Notification type="success" title="Succès">
          Le produit a bien été {onEdition ? 'modifié' : 'ajouté'}
        </Notification>
      );
      setSubmitted(true);
      navigate('/admin/store/lists');
    } else {
      toast.push(
        <Notification type="danger" title="Erreur">
          Une erreur est survenue lors de $
          {onEdition ? 'la modification' : "l'ajout"} du produit
        </Notification>
      );
    }
    setSubmitting(false);
  };
  const handleDiscard = () => {
    navigate('/admin/store/lists');
  };
  return (
    <>
      <SaisieForm
        type={onEdition ? 'edit' : 'new'}
        onFormSubmit={handleFormSubmit}
        onDiscard={handleDiscard}
        sizeSelected={sizeSelected}
        setSizeSelected={setSizeSelected}
        sizeField={sizeField}
        setSizeField={setSizeField}
        field_text={field_text}
        setField_text={setField_text}
        customers={customers}
        customersCategories={customersCategories}
        categories={categories}
        forms={forms}
        setSelectedForm={setSelectedForm}
        setSelectedCustomersCategories={setSelectedCustomersCategories}
        setSelectedCategories={setSelectedCategories}
        setSelectedCustomers={setSelectedCustomers}
        imagesName={imagesName}
        setImagesName={setImagesName}
        images={images}
      />
    </>
  );
};

export default Product;
