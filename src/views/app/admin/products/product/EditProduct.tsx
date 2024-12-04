import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Notification, toast } from '@/components/ui';
import { useEffect, useState } from 'react';
import { Product, ProductCategory, Size } from '@/@types/product';
import ProductForm, { FormModel, SetSubmitting } from './Forms/ProductForm';
import { apiGetCustomers, GetCustomersResponse } from '@/services/CustomerServices';
import { apiCreateProduct, apiGetProductSizes, apiUpdateProduct } from '@/services/ProductServices';
import { apiGetForms, GetFormsResponse } from '@/services/FormServices';
import { Form } from '@/@types/form';
import { apiDeleteFile, apiGetFile } from '@/services/FileServices';
import reducer, { getProductById, useAppDispatch, useAppSelector } from '../store';
import { FileItem } from '@/@types/formAnswer';
import { unwrapData } from '@/utils/serviceHelper';
import { Customer, CustomerCategory } from '@/@types/customer';
import { apiGetCustomerCategories, GetCustomerCategoriesResponse } from '@/services/CustomerCategoryServices';
import { apiGetProductCategories, GetProductCategoriesResponse } from '@/services/ProductCategoryServices';
import { injectReducer } from '@/store';

injectReducer('products', reducer);

interface Options {
  value: string;
  label: string;
}

export type FileNameBackFront = {
  fileNameBack: string;
  fileNameFront: string;
};

type EditProductParams = {
  documentId: string;
};

const EditProduct = () => {
  const navigate = useNavigate();
  const onEdition: boolean =
    useLocation().pathname.split('/').slice(-2).shift() === 'edit';
  const { documentId } = useParams<EditProductParams>() as EditProductParams;
  const { product } = useAppSelector((state) => state.products.data);
  const [customers, setCustomers] = useState<Options[]>([]);
  const [customerCategories, setCustomerCategories] = useState<Options[]>([]);
  const [sizes, setSizes] = useState<Options[]>([]);
  const [productCategories, setProductCategories] = useState<Options[]>([]);
  const [selectedCustomerCategories, setSelectedCustomerCategories] =
    useState<string[]>(product?.customerCategories.map((customerCategory: CustomerCategory) => customerCategory.name) || []);
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>(
    product?.productCategory?.name ?? ''
  );
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>(
    product?.customers.map((customer: Customer) => customer.name) || []
  );
  const [selectedSizes, setSelectedSizes] = useState<string[]>(
    product?.sizes.map((size: Size) => size.name) || []
  );
  const [forms, setForms] = useState<Options[]>([]);
  const [selectedForm, setSelectedForm] = useState<string>(
    product?.form?.documentId || ''
  );
  const [imagesName, setImagesName] = useState<FileNameBackFront[]>(
    product?.images || []
  );
  const [isFirstRender, setFirstRender] = useState<boolean>(true);
  const [isSubmitted, setSubmitted] = useState<boolean>(false);
  const [images, setImages] = useState<FileItem[]>([]);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!product && onEdition) {
      dispatch(getProductById(documentId));
    }
  }, [dispatch]);

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
    fetchCustomerCategories();
    fetchProductCategories();
    fetchForms();
    fetchFiles();
    fetchProductSizes();
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
    const {customers_connection} : {customers_connection: GetCustomersResponse}= await unwrapData(apiGetCustomers());
    const customersList = customers_connection.nodes || [];
    const customers = customersList.map((customer: Customer) => ({
      value: customer.documentId || '',
      label: customer.name,
    }));
    setCustomers(customers);
  };

  const fetchCustomerCategories = async () => {
    const {customerCategories_connection} : {customerCategories_connection: GetCustomerCategoriesResponse}= await unwrapData(apiGetCustomerCategories());
    const customerCategoriesList = customerCategories_connection.nodes || [];
    const customerCategories = customerCategoriesList.map(
      (customerCategory: CustomerCategory) => ({
        value: customerCategory.documentId || '',
        label: customerCategory.name || '',
      })
    );
    setCustomerCategories(customerCategories);
  };

  const fetchProductCategories = async () => {
    const {productCategories_connection} : {productCategories_connection: GetProductCategoriesResponse}= await unwrapData(apiGetProductCategories());
    const productCategoriesList = productCategories_connection.nodes || [];
    const productCategories = productCategoriesList.map((productCategory: ProductCategory) => ({
      value: productCategory.documentId || '',
      label: productCategory.name || '',
    }));
    setProductCategories(productCategories);
  };

  const fetchProductSizes = async () => {
    const {sizes} : {sizes: Size[]}= await unwrapData(apiGetProductSizes());
    const productSizes = sizes.map((size: Size) => ({
      value: size.documentId || '',
      label: size.name || '',
    }));
    setSizes(productSizes);
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
    const data: Product = {
      ...values,
      sizes: selectedSizes,
      customerCategories: selectedCustomerCategories,
      productCategory: selectedProductCategory,
      customers: selectedCustomers,
      images: imagesName,
    };
    if (values.form === '') {
      delete data.form;
    }
    if (!onEdition) {
      delete data.documentId
    }
    const response = onEdition
      ? await apiUpdateProduct(data)
      : await apiCreateProduct(data);
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
      <ProductForm
        type={onEdition ? 'edit' : 'new'}
        onFormSubmit={handleFormSubmit}
        onDiscard={handleDiscard}
        sizes={sizes}
        customers={customers}
        customerCategories={customerCategories}
        categories={productCategories}
        forms={forms}
        setSelectedSizes={setSelectedSizes}
        setSelectedForm={setSelectedForm}
        setSelectedCustomerCategories={setSelectedCustomerCategories}
        setSelectedProductCategory={setSelectedProductCategory}
        setSelectedCustomers={setSelectedCustomers}
        imagesName={imagesName}
        setImagesName={setImagesName}
        images={images}
      />
    </>
  );
};

export default EditProduct;
