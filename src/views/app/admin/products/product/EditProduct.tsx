import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Product, ProductCategory, Size } from '@/@types/product';
import { Image } from '@/@types/image';
import ProductForm, { ProductFormModel, SetSubmitting } from './Forms/ProductForm';
import { apiGetCustomers, GetCustomersResponse } from '@/services/CustomerServices';
import { apiCreateProduct, apiGetProductSizes, apiUpdateProduct } from '@/services/ProductServices';
import { apiGetForms, GetFormsResponse } from '@/services/FormServices';
import { Form } from '@/@types/form';
import { apiLoadImagesAndFiles, apiUploadFile } from '@/services/FileServices';
import reducer, { getProductById, setProductToEdit, useAppDispatch, useAppSelector } from '../store';
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

type EditProductParams = {
  documentId: string;
};

const EditProduct = () => {
  const navigate = useNavigate();
  const onEdition: boolean =
    useLocation().pathname.split('/').slice(-2).shift() === 'edit';
  const { documentId } = useParams<EditProductParams>() as EditProductParams;
  const { productToEdit: product } = useAppSelector((state) => state.products.data);
  const [customers, setCustomers] = useState<Options[]>([]);
  const [customerCategories, setCustomerCategories] = useState<Options[]>([]);
  const [sizes, setSizes] = useState<Options[]>([]);
  const [productCategories, setProductCategories] = useState<Options[]>([]);
  const [forms, setForms] = useState<Options[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const initialData: ProductFormModel = {
    documentId: documentId ?? '',
    name: product?.name || '',
    price: product?.price || 0,
    description: product?.description || '',
    sizes: product?.sizes.map((size) => size.documentId) || [],
    customerCategories: product?.customerCategories.map((customerCategory) => customerCategory.documentId) || [],
    productCategory: product?.productCategory?.documentId || null,
    customers: product?.customers.map((customer) => customer.documentId) || [],
    form: product?.form?.documentId || null,
    active: product?.active || false
  }
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!product && onEdition) {
      dispatch(getProductById(documentId));
    } else {
      
    }
    return () => {
      dispatch(setProductToEdit(null))
    }
  }, [dispatch]);

  useEffect(() => {
    fetchCustomers();
    fetchCustomerCategories();
    fetchProductCategories();
    fetchForms();
    fetchProductSizes();
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [product]);

  const fetchFiles = async (): Promise<void> => {
    if (product?.images && product?.images?.length > 0){
      const imagesLoaded: Image[] = await apiLoadImagesAndFiles(product?.images)

      setImages(imagesLoaded);
    }
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

  const updateOrCreateProduct = async (data: Product) : Promise<Product> => {
    if (onEdition) {
      const {updateProduct} : {updateProduct: Product} = await unwrapData(apiUpdateProduct(data));
      return updateProduct
    }
    const {createProduct} : {createProduct: Product} = await unwrapData(apiCreateProduct(data));
    return createProduct
  }

  const handleFormSubmit = async (
    values: ProductFormModel,
    setSubmitting: SetSubmitting
  ) => {
    setSubmitting(true);
    const newImages: Image[] = []
    for (const image of images) {
      if (image.id) {
        newImages.push(image)
      } else {
        const imageUploaded: Image = await apiUploadFile(image.file)
        newImages.push(imageUploaded)
      }
    }
    const data: Product = {
      ...values,
      images: newImages.map(({id}) => id),
      active: true
    };
    if (values.form === '') {
      delete data.form;
    }
    if (!onEdition) {
      delete data.documentId
    }

    await updateOrCreateProduct(data)
    setSubmitting(false);
    navigate('/admin/products');
  };

  const handleDiscard = () => {
    navigate('/admin/products');
  };

  return (!onEdition || product) && (
    <ProductForm
      type={onEdition ? 'edit' : 'new'}
      onFormSubmit={handleFormSubmit}
      onDiscard={handleDiscard}
      sizes={sizes}
      customers={customers}
      customerCategories={customerCategories}
      categories={productCategories}
      forms={forms}
      images={images}
      setImages={setImages}
      initialData={initialData}
    />
  );
};

export default EditProduct;
