import AdaptableCard from "@/components/shared/AdaptableCard";
import RichTextEditor from "@/components/shared/RichTextEditor";
import Input from "@/components/ui/Input";
import { FormItem } from "@/components/ui/Form";
import { Field, FormikErrors, FormikTouched, FieldProps } from "formik";
import { Select, Switcher } from "@/components/ui";
import { OptionsFields, IProduct } from "@/@types/product";
import {  SIZE_OPTIONS } from "@/utils/forms";

type Options = {
  label: string;
  value: string;
}

type FormFieldsName = IProduct

type BasicInformationFields = {
  touched: FormikTouched<FormFieldsName>;
  errors: FormikErrors<FormFieldsName>;
  type: string;
  values: IProduct;
  sizeField: OptionsFields[];
  setSizeField: (value: OptionsFields[]) => void;
  field_text: boolean;
  setField_text: (value: boolean) => void;
  sizeSelected: boolean;
  setSizeSelected: (value: boolean) => void;
  customersCategories: Options[];
  categories: Options[];
  customers: Options[];
  setSelectedCustomersCategories: (value: string[]) => void;
  setSelectedCategories: (value: string[]) => void;
  setSelectedCustomers: (value: string[]) => void;
  forms: Options[];
  setSelectedForms: (value: string) => void;
};

const BasicInformationFields = (props: BasicInformationFields) => {
  const {
    touched,
    errors,
    type,
    sizeField,
    setSizeField,
    forms,
    setSelectedForms,
    sizeSelected,
    setSizeSelected,
    customersCategories,
    categories,
    customers,
    setSelectedCustomersCategories,
    setSelectedCategories,
    setSelectedCustomers
  } = props;

  return (
    <AdaptableCard divider className="mb-4">
      <h5>{type === "edit" ? "Modification du produit" : "Nouveau produit"}</h5>
      <p className="mb-6">
        {type === "edit"
          ? "Remplissez les informations du produit à modifier"
          : "Remplissez les informations du nouveau produit"}
      </p>
      <div className="grid grid-cols-4 gap-4">
        <FormItem
          label="Nom du produit"
          invalid={(errors.title && touched.title) as boolean}
          errorMessage={errors.title}
        >
          <Field
            type="text"
            autoComplete="off"
            name="title"
            placeholder="Donnez un titre au produit"
            component={Input}
          />
        </FormItem>
        <FormItem
          label="Prix"
          invalid={(errors.amount && touched.amount) as boolean}
          errorMessage={errors.amount}
        >
          <Field
            type="number"
            autoComplete="off"
            name="amount"
            placeholder="Prix du produit"
            component={Input}
          />
        </FormItem>

        <FormItem
          label="Référence"
          invalid={(errors.reference && touched.reference) as boolean}
          errorMessage={errors.reference}
        >
          <Field
            type="text"
            autoComplete="off"
            name="reference"
            placeholder="Donnez une référence au produit"
            component={Input}
          />
        </FormItem>
        <FormItem
          label="Stock total"
          invalid={(errors.stock && touched.stock) as boolean}
          errorMessage={errors.stock}
        >
          <Field
            type="number"
            autoComplete="off"
            name="stock"
            placeholder="Stock total du produit"
            component={Input}
          />
        </FormItem>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="col-span-1">
          <p className="font-bold mb-2">Catégorie client</p>
          <Field name="customersCategories">
            {({ field, form }: FieldProps) => (
              <Select
                isMulti
                value={customersCategories.filter(option => 
                  field.value?.includes(option.value)
                )}
                placeholder="Choisir une ou plusieurs catégories"
                options={customersCategories}
                onChange={(selectedOptions) => {
                  const values = selectedOptions.map(option => option.value);
                  form.setFieldValue(field.name, values);
                  setSelectedCustomersCategories(values);
                }}
              />
            )}
          </Field>
        </div>
        
        <div className="col-span-1">
          <p className="font-bold mb-2">Catégorie produit</p>
          <Field name="category">
            {({ field, form }: FieldProps) => (
              <Select
                isMulti
                value={categories.filter(option => 
                  field.value?.includes(option.value)
                )}
                placeholder="Choisir une ou plusieurs catégories"
                options={categories}
                onChange={(selectedOptions) => {
                  const values = selectedOptions.map(option => option.value);
                  form.setFieldValue(field.name, values);
                  setSelectedCategories(values);
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
                value={customers.filter(option => 
                  field.value?.includes(option.value)
                )}
                placeholder="Choisir un ou plusieurs client(s)"
                options={customers}
                onChange={(selectedOptions) => {
                  const values = selectedOptions.map(option => option.value);
                  form.setFieldValue(field.name, values);
                  setSelectedCustomers(values);
                }}
              />
            )}
          </Field>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
        <Switcher
            checked={sizeSelected}
            onChange={() => setSizeSelected(!sizeSelected)}
          />
          <span>Activer le choix des tailles</span>
        </div>

        <div className="col-span-1">
          <p className="font-bold mb-2">Formulaires</p>
          <Field name="form">
            {({ field, form }: FieldProps) => (
              <Select
                value={forms.find(option =>{
                  return field.value._id === option.value
                })}
                placeholder="Choisir un formulaire"
                options={forms}
                onChange={(selectedOptions) => {
                  const values = selectedOptions?.value ;
                  form.setFieldValue(field.name, values);
                  setSelectedForms(values as string);
                }}
              />
            )}
          </Field>
        </div>
      </div>

      {sizeSelected && (
        <div>
          <p className="font-bold text-yellow-500 mb-4">Stocks tailles</p>
          <div className="grid grid-cols-7 gap-4 mb-6">
            {SIZE_OPTIONS.options.map((option) => (
              <div key={option.value} className="grid gap-4">
                <span>{option.label}</span>
                <Field
                  name={option.value}
                  type="number"
                  autoComplete="off"
                  value={sizeField.find((field) => field.value === option.value)?.stock}
                  component={Input}
                  onChange={(e : any) => {
                    // Trouver l'index de l'option actuelle dans le tableau sizeField
                    const index = sizeField.findIndex(
                      (field) => field.value === option.value
                    );
                    const newField = {
                      label: option.label,
                      value: option.value,
                      stock: parseInt(e.target.value),
                    };
                    // Si l'option existe déjà, la mettre à jour, sinon l'ajouter
                    if (index > -1) {
                      const newSizeField = [...sizeField];
                      newSizeField[index] = newField;
                      setSizeField(newSizeField);
                    } else {
                      setSizeField([...sizeField, newField]);
                    }
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <FormItem label="Description" labelClass="!justify-start">
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

export default BasicInformationFields;
