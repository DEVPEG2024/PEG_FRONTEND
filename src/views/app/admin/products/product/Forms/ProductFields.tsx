import AdaptableCard from '@/components/shared/AdaptableCard';
import RichTextEditor from '@/components/app/RichTextEditor';
import Input from '@/components/ui/Input';
import { FormItem } from '@/components/ui/Form';
import {
  Controller,
  FieldErrors,
  UseFormWatch,
  UseFormSetValue,
} from 'react-hook-form';
import { Select, Switcher } from '@/components/ui';
import type { ProductFormModel } from './ProductForm';

type Options = {
  label: string;
  value: string;
};

type ProductFieldsProps = {
  errors: FieldErrors<ProductFormModel>;
  type: string;
  sizes: Options[];
  colors: Options[];
  customerCategories: Options[];
  categories: Options[];
  customers: Options[];
  forms: Options[];
  filterSizesListByProductCategory: (productCategoryDocumentId: string) => void;
  filterColorsListByProductCategory: (
    productCategoryDocumentId: string
  ) => void;
  control: any;
  watch: UseFormWatch<ProductFormModel>;
  setValue: UseFormSetValue<ProductFormModel>;
};

const ProductFields = (props: ProductFieldsProps) => {
  const {
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
    control,
    watch,
    setValue,
  } = props;
  const values = watch();

  return (
    <AdaptableCard bordered={false} divider className="mb-4">
      <h5>{type === 'edit' ? 'Modification du produit' : 'Nouveau produit'}</h5>
      <p className="mb-6">
        {type === 'edit'
          ? 'Remplissez les informations du produit à modifier'
          : 'Remplissez les informations du nouveau produit'}
      </p>
      <div className="grid grid-cols-4 gap-4">
        <FormItem
          label="Nom du produit"
          invalid={!!errors.name}
          errorMessage={errors.name?.message}
        >
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="text"
                autoComplete="off"
                placeholder="Donnez un nom au produit"
              />
            )}
          />
        </FormItem>
        <FormItem
          label="Prix"
          invalid={!!errors.price}
          errorMessage={errors.price?.message}
        >
          <Controller
            name="price"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                type="number"
                autoComplete="off"
                placeholder="Prix du produit"
              />
            )}
          />
        </FormItem>
        <FormItem
          label="Dans le catalogue"
          invalid={!!errors.inCatalogue}
          errorMessage={errors.inCatalogue?.message}
        >
          <Controller
            name="inCatalogue"
            control={control}
            render={({ field }) => (
              <Switcher
                checked={field.value}
                onChange={(val) => field.onChange(val)}
              />
            )}
          />
        </FormItem>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-1">
          <p className="font-bold mb-2">Catégorie client</p>
          <Controller
            name="customerCategories"
            control={control}
            render={({ field }) => (
              <Select
                isMulti
                value={customerCategories.filter((option) =>
                  field.value?.includes(option.value)
                )}
                placeholder="Choisir une ou plusieurs catégories"
                options={customerCategories}
                onChange={(selectedOptions) => {
                  const values = selectedOptions.map((option) => option.value);
                  field.onChange(values);
                }}
              />
            )}
          />
        </div>
        <div className="col-span-1">
          <p className="font-bold mb-2">Catégorie produit</p>
          <Controller
            name="productCategory"
            control={control}
            render={({ field }) => (
              <Select
                value={categories.find((option) => {
                  return field.value === option.value;
                })}
                placeholder="Choisir une catégorie de produit"
                options={categories}
                onChange={(selectedOption) => {
                  const value = selectedOption?.value || '';
                  field.onChange(value);
                  filterSizesListByProductCategory(value);
                  filterColorsListByProductCategory(value);
                }}
              />
            )}
          />
        </div>
        <div className="col-span-1">
          <p className="font-bold mb-2">Client</p>
          <Controller
            name="customers"
            control={control}
            render={({ field }) => (
              <Select
                isMulti
                value={customers.filter((option) =>
                  field.value?.includes(option.value)
                )}
                placeholder="Choisir un ou plusieurs client(s)"
                options={customers}
                onChange={(selectedOptions) => {
                  const values = selectedOptions.map((option) => option.value);
                  field.onChange(values);
                }}
              />
            )}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-1">
          <p className="font-bold mb-2">Tailles produit</p>
          <Controller
            name="sizes"
            control={control}
            render={({ field }) => (
              <Select
                isMulti
                value={sizes.filter((option) =>
                  field.value?.includes(option.value)
                )}
                placeholder="Choisir une ou plusieurs tailles"
                options={sizes}
                onChange={(selectedOptions) => {
                  const values = selectedOptions.map((option) => option.value);
                  field.onChange(values);
                }}
              />
            )}
          />
        </div>
        <div className="col-span-1">
          <p className="font-bold mb-2">Couleurs produit</p>
          <Controller
            name="colors"
            control={control}
            render={({ field }) => (
              <Select
                isMulti
                value={colors.filter((color) =>
                  field.value?.includes(color.value)
                )}
                placeholder="Choisir une ou plusieurs couleurs"
                options={colors}
                onChange={(selectedColors) => {
                  const values = selectedColors.map(
                    (selectedColor) => selectedColor.value
                  );
                  field.onChange(values);
                }}
              />
            )}
          />
        </div>
        <div className="col-span-1">
          <p className="font-bold mb-2">Formulaire</p>
          <Controller
            name="form"
            control={control}
            render={({ field }) => (
              <Select
                isClearable
                value={forms.find((option) => {
                  return field.value === option.value;
                })}
                placeholder="Choisir un formulaire"
                options={forms}
                onChange={(selectedOption) => {
                  const value = selectedOption?.value;
                  field.onChange(value);
                }}
              />
            )}
          />
        </div>
      </div>

      <FormItem
        label="Description"
        labelClass="justify-start!"
        invalid={!!errors.description}
        errorMessage={errors.description?.message}
      >
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <RichTextEditor
              value={field.value}
              onChange={(val) => field.onChange(val)}
            />
          )}
        />
      </FormItem>
    </AdaptableCard>
  );
};

export default ProductFields;
