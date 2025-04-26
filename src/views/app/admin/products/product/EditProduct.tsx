import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Color, Product, ProductCategory, Size } from '@/@types/product';
import { PegFile } from '@/@types/pegFile';
import ProductForm, {
  ProductFormModel,
  SetSubmitting,
} from './Forms/ProductForm';
import {
  apiGetCustomers,
  GetCustomersResponse,
} from '@/services/CustomerServices';
import { apiCreateProduct, apiUpdateProduct } from '@/services/ProductServices';
import { apiGetForms, GetFormsResponse } from '@/services/FormServices';
import { Form } from '@/@types/form';
import { apiLoadPegFilesAndFiles, apiUploadFile } from '@/services/FileServices';
import reducer, {
  getProductById,
  setProductToEdit,
  useAppDispatch,
  useAppSelector,
} from '../store';
import { unwrapData } from '@/utils/serviceHelper';
import { Customer, CustomerCategory } from '@/@types/customer';
import {
  apiGetCustomerCategories,
  GetCustomerCategoriesResponse,
} from '@/services/CustomerCategoryServices';
import {
  apiGetProductCategories,
  GetProductCategoriesResponse,
} from '@/services/ProductCategoryServices';
import { injectReducer } from '@/store';
import { apiGetProductCategorySizes } from '@/services/SizeServices';
import { apiGetProductCategoryColors } from '@/services/ColorServices';

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
  const { productToEdit: product } = useAppSelector(
    (state) => state.products.data
  );
  const [customers, setCustomers] = useState<Options[]>([]);
  const [customerCategories, setCustomerCategories] = useState<Options[]>([]);
  const [sizes, setSizes] = useState<Options[]>([]);
  const [colors, setColors] = useState<Options[]>([]);
  const [productCategories, setProductCategories] = useState<Options[]>([]);
  const [forms, setForms] = useState<Options[]>([]);
  const [images, setImages] = useState<PegFile[]>([]);
  const [imagesLoading, setImagesLoading] = useState<boolean>(false);
  const initialData: ProductFormModel = {
    documentId: documentId ?? '',
    name: product?.name || '',
    price: product?.price || 0,
    description: product?.description || '',
    sizes: product?.sizes?.map((size) => size.documentId) || [],
    colors: product?.colors?.map((color) => color.documentId) || [],
    customerCategories:
      product?.customerCategories?.map(
        (customerCategory) => customerCategory.documentId
      ) || [],
    productCategory: product?.productCategory?.documentId || null,
    customers: product?.customers?.map((customer) => customer.documentId) || [],
    form: product?.form?.documentId || null,
    active: product?.active || false,
    inCatalogue: product?.inCatalogue || false,
  };
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!product && onEdition) {
      dispatch(getProductById(documentId));
    }
    return () => {
      dispatch(setProductToEdit(null));
    };
  }, [dispatch]);

  useEffect(() => {
    fetchCustomers();
    fetchCustomerCategories();
    fetchProductCategories();
    fetchForms();
    fetchSizes();
    fetchColors();
  }, [product]);

  useEffect(() => {
    fetchFiles();
  }, [product]);

  const fetchFiles = async (): Promise<void> => {
    setImagesLoading(true);
    if (product?.images && product?.images?.length > 0) {
      const imagesLoaded: PegFile[] = await apiLoadPegFilesAndFiles(
        product?.images
      );

      setImages(imagesLoaded);
    }
    setImagesLoading(false);
  };

  const fetchForms = async () => {
    const { forms_connection }: { forms_connection: GetFormsResponse } =
      await unwrapData(apiGetForms());
    const formsList = forms_connection.nodes || [];
    const forms = formsList.map((form: Form) => ({
      value: form.documentId || '',
      label: form.name,
    }));
    setForms(forms);
  };

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

  const fetchCustomerCategories = async () => {
    const {
      customerCategories_connection,
    }: { customerCategories_connection: GetCustomerCategoriesResponse } =
      await unwrapData(apiGetCustomerCategories());
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
    const {
      productCategories_connection,
    }: { productCategories_connection: GetProductCategoriesResponse } =
      await unwrapData(apiGetProductCategories());
    const productCategoriesList = productCategories_connection.nodes || [];
    const productCategories = productCategoriesList.map(
      (productCategory: ProductCategory) => ({
        value: productCategory.documentId || '',
        label: productCategory.name || '',
      })
    );
    setProductCategories(productCategories);
  };

  const fetchSizes = async () => {
    updateSizesList(product?.productCategory?.documentId || '');
  };

  const filterSizesListByProductCategory = async (
    productCategoryDocumentId: string
  ) => {
    updateSizesList(productCategoryDocumentId);
  };

  const updateSizesList = async (productCategoryDocumentId: string) => {
    const { sizes }: { sizes: Size[] } = await unwrapData(
      apiGetProductCategorySizes(productCategoryDocumentId || '')
    );
    const productSizes = sizes.map((size: Size) => ({
      value: size.documentId || '',
      label: size.name || '',
    }));
    setSizes(productSizes);
  };

  const fetchColors = async () => {
    updateColorsList(product?.productCategory?.documentId || '');
  };

  const filterColorsListByProductCategory = async (
    productCategoryDocumentId: string
  ) => {
    updateColorsList(productCategoryDocumentId);
  };

  const updateColorsList = async (productCategoryDocumentId: string) => {
    const { colors }: { colors: Color[] } = await unwrapData(
      apiGetProductCategoryColors(productCategoryDocumentId || '')
    );
    const productColors = colors.map((color: Color) => ({
      value: color.documentId || '',
      label: color.name || '',
    }));
    setColors(productColors);
  };

  const updateOrCreateProduct = async (data: Product): Promise<Product> => {
    if (onEdition) {
      const { updateProduct }: { updateProduct: Product } = await unwrapData(
        apiUpdateProduct(data)
      );
      return updateProduct;
    }
    const { createProduct }: { createProduct: Product } = await unwrapData(
      apiCreateProduct(data)
    );
    return createProduct;
  };

  const handleFormSubmit = async (
    values: ProductFormModel,
    setSubmitting: SetSubmitting
  ) => {
    setSubmitting(true);
    const newImages: PegFile[] = [];
    for (const image of images) {
      if (image.id) {
        newImages.push(image);
      } else {
        const imageUploaded: PegFile = await apiUploadFile(image.file);
        newImages.push(imageUploaded);
      }
    }
    const data: Product = {
      ...values,
      images: newImages.map(({ id }) => id),
      active: true,
    };
    if (values.form === '' || !values.form) {
      data.form = null;
    }
    if (!onEdition) {
      delete data.documentId;
    }

    await updateOrCreateProduct(data);
    setSubmitting(false);
    navigate('/admin/products');
  };

  const handleDiscard = () => {
    navigate('/admin/products');
  };

  return (
    (!onEdition || product) && (
      <ProductForm
        type={onEdition ? 'edit' : 'new'}
        onFormSubmit={handleFormSubmit}
        onDiscard={handleDiscard}
        sizes={sizes}
        colors={colors}
        customers={customers}
        customerCategories={customerCategories}
        categories={productCategories}
        forms={forms}
        images={images}
        setImages={setImages}
        imagesLoading={imagesLoading}
        initialData={initialData}
        filterSizesListByProductCategory={filterSizesListByProductCategory}
        filterColorsListByProductCategory={filterColorsListByProductCategory}
      />
    )
  );
};

export default EditProduct;
