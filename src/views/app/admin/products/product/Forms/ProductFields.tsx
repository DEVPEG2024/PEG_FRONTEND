import AdaptableCard from '@/components/shared/AdaptableCard';
import RichTextEditor from '@/components/shared/RichTextEditor';
import Input from '@/components/ui/Input';
import { FormItem } from '@/components/ui/Form';
import { Field, FormikErrors, FormikTouched, FieldProps } from 'formik';
import { Select, Switcher } from '@/components/ui';
import { Product } from '@/@types/product';

type Options = {
  label: string;
  value: string;
};

type ProductFields = {
  touched: FormikTouched<Product>;
  errors: FormikErrors<Product>;
  type: string;
  values: Product;
  sizes: Options[];
  colors: Options[];
  customerCategories: Options[];
  categories: Options[];
  customers: Options[];
  forms: Options[];
  filterSizesListByProductCategory: (productCategoryDocumentId: string) => void;
  filterColorsListByProductCategory: (productCategoryDocumentId: string) => void;
};

const ProductFields = (props: ProductFields) => {
  const {
    touched,
    errors,
    type,
    sizes,
    colors,
    customerCategories,
    categories,
    customers,
    forms,
    filterSizesListByProductCategory,
    filterColorsListByProductCategory,
  } = props;

  return (
    <AdaptableCard divider className="mb-4">
      <h5>{type === 'edit' ? 'Modification du produit' : 'Nouveau produit'}</h5>
      <p className="mb-6">
        {type === 'edit'
          ? 'Remplissez les informations du produit à modifier'
          : 'Remplissez les informations du nouveau produit'}
      </p>
      <div className="grid grid-cols-4 gap-4">
        <FormItem
          label="Nom du produit"
          invalid={(errors.name && touched.name) as boolean}
          errorMessage={errors.name}
        >
          <Field
            type="text"
            autoComplete="off"
            name="name"
            placeholder="Donnez un nom au produit"
            component={Input}
            value={props.values.name}
          />
        </FormItem>
        <FormItem
          label="Prix"
          invalid={(errors.price && touched.price) as boolean}
          errorMessage={errors.price}
        >
          <Field
            type="number"
            autoComplete="off"
            name="price"
            placeholder="Prix du produit"
            component={Input}
          />
        </FormItem>
        <FormItem
          label="Dans le catalogue"
          invalid={(errors.inCatalogue && touched.inCatalogue) as boolean}
          errorMessage={errors.inCatalogue}
        >
          <Field name="inCatalogue">
            {({ field, form }: FieldProps) => (
              <Switcher
                checked={props.values.inCatalogue}
                onChange={() => form.setFieldValue(field.name, !field.value)}
              />
            )}
          </Field>
        </FormItem>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-1">
          <p className="font-bold mb-2">Catégorie client</p>
          <Field name="customerCategories">
            {({ field, form }: FieldProps) => (
              <Select
                isMulti
                value={customerCategories.filter((option) =>
                  field.value?.includes(option.value)
                )}
                placeholder="Choisir une ou plusieurs catégories"
                options={customerCategories}
                onChange={(selectedOptions) => {
                  const values = selectedOptions.map((option) => option.value);
                  form.setFieldValue(field.name, values);
                }}
              />
            )}
          </Field>
        </div>
        <div className="col-span-1">
          <p className="font-bold mb-2">Catégorie produit</p>
          <Field name="productCategory">
            {({ field, form }: FieldProps) => (
              <Select
                value={categories.find((option) => {
                  return field.value === option.value;
                })}
                placeholder="Choisir une catégorie de produit"
                options={categories}
                onChange={(selectedOption) => {
                  const value = selectedOption?.value;
                  form.setFieldValue(field.name, value);
                  filterSizesListByProductCategory(value);
                  filterColorsListByProductCategory(value);
                }}
              />
            )}
          </Field>
        </div>
        <div className="col-span-1">
          <p className="font-bold mb-2">Client</p>
          <Field name="customers">
            {({ field, form }: FieldProps) => (
              <Select
                isMulti
                value={customers.filter((option) =>
                  field.value?.includes(option.value)
                )}
                placeholder="Choisir un ou plusieurs client(s)"
                options={customers}
                onChange={(selectedOptions) => {
                  const values = selectedOptions.map((option) => option.value);
                  form.setFieldValue(field.name, values);
                }}
              />
            )}
          </Field>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-1">
          <p className="font-bold mb-2">Tailles produit</p>
          <Field name="sizes">
            {({ field, form }: FieldProps) => (
              <Select
                isMulti
                value={sizes.filter((option) =>
                  field.value?.includes(option.value)
                )}
                placeholder="Choisir une ou plusieurs tailles"
                options={sizes}
                onChange={(selectedOptions) => {
                  const values = selectedOptions.map((option) => option.value);
                  form.setFieldValue(field.name, values);
                }}
              />
            )}
          </Field>
        </div>
        <div className="col-span-1">
          <p className="font-bold mb-2">Couleurs produit</p>
          <Field name="colors">
            {({ field, form }: FieldProps) => (
              <Select
                isMulti
                value={colors.filter((color) =>
                  field.value?.includes(color.value)
                )}
                placeholder="Choisir une ou plusieurs couleurs"
                options={colors}
                onChange={(selectedColors) => {
                  const values = selectedColors.map((selectedColor) => selectedColor.value);
                  form.setFieldValue(field.name, values);
                }}
              />
            )}
          </Field>
        </div>
        <div className="col-span-1">
          <p className="font-bold mb-2">Formulaire</p>
          <Field name="form">
            {({ field, form }: FieldProps) => (
              <Select
                isClearable
                value={forms.find((option) => {
                  return field.value === option.value;
                })}
                placeholder="Choisir un formulaire"
                options={forms}
                onChange={(selectedOption) => {
                  const value = selectedOption?.value;
                  form.setFieldValue(field.name, value);
                }}
              />
            )}
          </Field>
        </div>
      </div>

      <FormItem
        label="Description"
        labelClass="!justify-start"
        invalid={(errors.description && touched.description) as boolean}
        errorMessage={errors.description}
      >
        <Field name="description">
          {({ field, form }: FieldProps) => (
            <RichTextEditor
              value={field.value}
              onChange={(val) => form.setFieldValue(field.name, val)}
            />
          )}
        </Field>
      </FormItem>
    </AdaptableCard>
  );
};

export default ProductFields;
