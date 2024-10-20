import { forwardRef } from 'react'
import { FormContainer, FormItem } from '@/components/ui/Form'
import Button from '@/components/ui/Button'
import StickyFooter from '@/components/shared/StickyFooter'
import { Field, Form, Formik, FormikProps } from 'formik'
import BasicInformationFields from './Fields'
import cloneDeep from 'lodash/cloneDeep'
import { AiOutlineSave } from 'react-icons/ai'
import * as Yup from 'yup'
import { Upload } from '@/components/ui'
import { useAppSelector } from '../../../store'
import { OptionsFields, IProduct } from '@/@types/product'
import { apiDeleteFile, apiUploadFile } from '@/services/FileServices'
import { FileNameBackFront } from '../NewProduct'

interface Options {
  value: string
  label: string
}
// eslint-disable-next-line  @typescript-eslint/no-explicit-any
type FormikRef = FormikProps<any>

type InitialData = IProduct;

export type FormModel = Omit<InitialData, 'type'> & {
  type: string
}

export type SetSubmitting = (isSubmitting: boolean) => void

export type OnDeleteCallback = React.Dispatch<React.SetStateAction<boolean>>

type OnDelete = (callback: OnDeleteCallback) => void

type ProductForm = {
  initialData?: InitialData
  type: 'edit' | 'new'
  onDiscard?: () => void
  onDelete?: OnDelete
  onFormSubmit: (formData: FormModel, setSubmitting: SetSubmitting) => void
  sizeSelected: boolean
  setSizeSelected: (value: boolean) => void
  sizeField: OptionsFields[]
  setSizeField: (value: OptionsFields[]) => void
  field_text: boolean
  setField_text: (value: boolean) => void
  customersCategories: Options[]
  categories: Options[]
  customers: Options[]
  setSelectedCustomersCategories: (value: string[]) => void
  setSelectedCategories: (value: string[]) => void
  setSelectedCustomers: (value: string[]) => void
  forms: Options[]
  setSelectedForms: (value: string[]) => void
  imagesName: FileNameBackFront[]
  setImagesName: (value: FileNameBackFront[]) => void
}

const validationSchema = Yup.object().shape({
  title: Yup.string().required('Nom de la saisie requis'),
  amount: Yup.number().moreThan(0, 'Le montant doit être supérieur à 0').required('Montant requis'),
  reference: Yup.string().required('Référence requise'),
  description: Yup.string().required('Description requise'),
})

const SaisieForm = forwardRef<FormikRef, ProductForm>((props, ref) => {
  const { product } = useAppSelector((state) => state.products.data)

  const {
    type,
    sizeField,
    setSizeField,
    field_text,
    setField_text,
    sizeSelected,
    setSizeSelected,
    forms,
    setSelectedForms,
    initialData = {
      _id: product?._id || "",
      title: product?.title || "",
      amount: product?.amount || 0,
      stock: product?.stock || 0,
      images: product?.images || [],
      reference: product?.reference || "",
      description: product?.description || "",
    },
    onFormSubmit,
    onDiscard,
    customersCategories,
    categories,
    customers,

    setSelectedCustomersCategories,
    setSelectedCategories,
    setSelectedCustomers,
    imagesName,
    setImagesName
  } = props;

  const onFileAdd = async (
    file: File,
    setFieldValue: (
      field: string,
      value: any,
      shouldValidate?: boolean,
    ) => void,
    field: string,
  ) => {
    try {
      const data = await apiUploadFile(file),
        newFileNames = [...imagesName, { fileNameFront: file.name, fileNameBack: data.fileName }]

      setFieldValue(field, newFileNames.map(({ fileNameBack }) => fileNameBack))
      setImagesName(newFileNames)
    } catch (error) {
      console.error("Erreur lors de l'upload du fichier :", error);
    }
  };

  const onFileRemove = async (
    file: string,
    setFieldValue: (
      field: string,
      value: any,
      shouldValidate?: boolean,
    ) => void,
    field: string,
  ) => {
    try {
      const fileNameBack: string = imagesName.find(({ fileNameFront }) => fileNameFront === file)?.fileNameBack ?? ""
      await apiDeleteFile(fileNameBack)
      const newFileNames = imagesName.filter(({ fileNameFront }) => fileNameFront !== file)

      setFieldValue(field, newFileNames.map(({ fileNameBack }) => fileNameBack))
      setImagesName(newFileNames)
    } catch (error) {
      console.error("Erreur lors de la suppression du fichier :", error);
    }
  };

  const beforeUpload = (files: FileList | null) => {
    let valid: string | boolean = true

    const allowedFileType = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
      "application/pdf",
      "application/x-pdf",
      "application/pdf",
      "application/x-pdf",
      "application/pdf",
      "application/x-pdf",
      "application/pdf",
      "application/x-pdf",
      "application/pdf",
      "application/x-pdf",

    ];
    if (files) {
      for (const file of files) {
        if (!allowedFileType.includes(file.type)) {
          valid = 'Veuillez télécharger un fichier .jpeg ou .png!'
        }
      }
    }

    return valid
  }


  return (
    <>
      <Formik
        innerRef={ref}
        initialValues={{
          ...initialData,
          type: type,
        }}
        validationSchema={validationSchema}
        onSubmit={(values: FormModel, { setSubmitting }) => {
          console.log("Form submitted with values:", values);
          const formData = cloneDeep(values);
          onFormSubmit?.(formData, setSubmitting);
        }}
      >
        {({ values, setFieldValue, touched, errors, isSubmitting }) => (
          <Form>
            <FormContainer>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <BasicInformationFields
                    touched={touched}
                    errors={errors}
                    values={values}
                    type={type}
                    forms={forms}
                    setSelectedForms={setSelectedForms}
                    sizeSelected={sizeSelected}
                    setSizeSelected={setSizeSelected}
                    sizeField={sizeField}
                    setSizeField={setSizeField}
                    field_text={field_text}
                    setField_text={setField_text}
                    customersCategories={customersCategories as Options[]}
                    categories={categories as Options[]}
                    customers={customers as Options[]}
                    setSelectedCustomersCategories={setSelectedCustomersCategories as (value: string[]) => void}
                    setSelectedCategories={setSelectedCategories as (value: string[]) => void}
                    setSelectedCustomers={setSelectedCustomers as (value: string[]) => void}
                  />
                </div>
                <div className="lg:col-span-1">
                  <h5 className="mb-4">Images du produits</h5>
                  <Upload
                    multiple
                    showList
                    draggable
                    uploadLimit={4}
                    beforeUpload={beforeUpload}
                    onFileAdd={(file) =>
                      onFileAdd(file, setFieldValue, "images")
                    }
                    onFileRemove={(file) => onFileRemove(file, setFieldValue, "images")}
                    field={{ name: "images" }}
                  />
                </div>
              </div>
              <StickyFooter
                className="-mx-8 px-8 flex items-center justify-end py-4"
                stickyClass="border-t bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
              >

                <Button
                  size="sm"
                  className="ltr:mr-3 rtl:ml-3"
                  type="button"
                  onClick={() => onDiscard?.()}
                >
                  Annuler
                </Button>

                <Button
                  size="sm"
                  variant="solid"
                  loading={isSubmitting}
                  icon={<AiOutlineSave />}
                  type="submit"
                >
                  Enregistrer
                </Button>
              </StickyFooter>
            </FormContainer>
          </Form>
        )}
      </Formik>
    </>
  );
})

SaisieForm.displayName = 'SaisieForm'

export default SaisieForm
