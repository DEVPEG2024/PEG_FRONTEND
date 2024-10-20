import AdaptableCard from "@/components/shared/AdaptableCard";
import RichTextEditor from "@/components/shared/RichTextEditor";
import Input from "@/components/ui/Input";
import { FormItem } from "@/components/ui/Form";
import { Field, FormikErrors, FormikTouched, FieldProps } from "formik";
import { Select, Switcher } from "@/components/ui";
import { OptionsFields, IProduct } from "@/@types/product";
import { SIZE_OPTIONS } from "@/utils/forms";
import { useAppSelector } from "../../../store";

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
  setSelectedForms: (value: string[]) => void;
};

const BasicInformationFields = (props: BasicInformationFields) => {
  const {
    touched,
    errors,
    type,
    sizeField,
    setSizeField,

    sizeSelected,
    setSizeSelected,
    customersCategories,
    categories,
    customers,
    forms,
    setSelectedForms,
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
          <Select
            isMulti
            placeholder="Choisir une ou plusieurs catégories"
            options={customersCategories}
            onChange={(e) =>
              setSelectedCustomersCategories(e.map((option) => option.value))
            }
          />
        </div>
        <div className="col-span-1">
          <p className="font-bold mb-2">Catégorie produit</p>
          <Select
            isMulti
            placeholder="Choisir une ou plusieurs catégories"
            options={categories}
            onChange={(e) =>
              setSelectedCategories(e.map((option) => option.value))
            }
          />
        </div>
        <div className="col-span-1">
          <p className="font-bold mb-2">Client</p>
          <Select
            isMulti
            placeholder="Choisir un ou plusieurs client(s)"
            options={customers}
            onChange={(e) =>
              setSelectedCustomers(e.map((option) => option.value))
            }
          />
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
        <div className="flex flex-col gap-2">
          <p className="font-bold mb-2">Formulaires</p>
          <Select
            placeholder="Choisir un ou plusieurs formulaire(s)"
            options={forms}
            onChange={(e) =>
              setSelectedForms(e?.value as string[])
            }
          />
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
                  component={Input}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    // Trouver l'index de l'option actuelle dans le tableau adultFields
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

      <FormItem label="Description" labelClass="!justify-start" invalid={(errors.description && touched.description) as boolean} errorMessage={errors.description}>
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
