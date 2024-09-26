import AdaptableCard from "@/components/shared/AdaptableCard";
import RichTextEditor from "@/components/shared/RichTextEditor";
import Input from "@/components/ui/Input";
import { FormItem } from "@/components/ui/Form";
import { Field, FormikErrors, FormikTouched, FieldProps } from "formik";
import { Select } from "@/components/ui";
import { IOffer } from "@/@types/offer";

type Options = {
  label: string;
  value: string;
}

type FormFieldsName = IOffer

type BasicInformationFields = {
  touched: FormikTouched<FormFieldsName>;
  errors: FormikErrors<FormFieldsName>;
  type: string;
  customers: Options[];
  setSelectedCustomers: (value: string) => void;
  forms: Options[];
  setForms: (value: string) => void;
};

const BasicInformationFields = (props: BasicInformationFields) => {
  const {
    touched,
    forms,
    setForms,
    errors,
    type,
    customers,
    setSelectedCustomers
  } = props;
  

  return (
    <AdaptableCard divider className="mb-4">
      <h5>{type === "edit" ? "Modification de l'offre" : "Nouvelle offre"}</h5>
      <p className="mb-6">
        {type === "edit"
          ? "Remplissez les informations de l'offre à modifier"
          : "Remplissez les informations de la nouvelle offre"}
      </p>
      <div className="grid grid-cols-4 gap-4">
        <FormItem
          label="Titre de l'offre"
          invalid={(errors.title && touched.title) as boolean}
          errorMessage={errors.title}
        >
          <Field
            type="text"
            autoComplete="off"
            name="title"
            placeholder="Donnez un titre à l'offre"
            component={Input}
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
            placeholder="Prix de l'offre HT"
            component={Input}
          />
        </FormItem>

        <FormItem
          label="Référence"
          invalid={(errors.ref && touched.ref) as boolean}
          errorMessage={errors.ref}
        >
          <Field
            type="text"
            autoComplete="off"
            name="ref"
            placeholder="Donnez une référence à l'offre"
            component={Input}
          />
        </FormItem>
        </div>
        <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="col-span-2">
          <p className="font-bold mb-2">Formulaire</p>
          <Select
            placeholder="Choisir un formulaire"
            options={forms}
            onChange={(e) =>
              setForms(e?.value as string)
            }
          />
        </div>
        <div className="col-span-2">
          <p className="font-bold mb-2">Client</p>
          <Select
            placeholder="Choisir un client"
            options={customers}
            onChange={(e) =>
              setSelectedCustomers(e?.value as string)
            }
          />
        </div>
        </div>

      <FormItem label="Description de l'offre" labelClass="!justify-start">
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
