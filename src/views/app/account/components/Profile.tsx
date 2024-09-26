import classNames from 'classnames'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { FormContainer } from '@/components/ui/Form'
import FormDesription from './FormDesription'
import FormRow from './FormRow'
import { Field, FieldProps, Form, Formik } from 'formik'

import * as Yup from 'yup'
import { setUser, useAppDispatch, useAppSelector } from '@/store'
import { Avatar, Upload } from '@/components/ui'
import { HiOutlineUser } from 'react-icons/hi'
import { API_BASE_URL, API_URL_IMAGE } from '@/configs/api.config'
import { apiUpdateUser } from '@/services/AccountServices'

type UserInformations = {
    avatar: string
    firstName: string
    lastName: string
    email: string
    phone: string
    address: string
    companyName: string
    city: string
    zip: string
}

const validationSchema = Yup.object().shape({
    firstName: Yup.string().required('Nom Requis'),
    lastName: Yup.string().required('Prénom Requis'),
    email: Yup.string().email('Email invalide').required('Email Requis'),
    phone: Yup.string().required('Téléphone Requis'),
    address: Yup.string().required('Adresse Requis'),
    city: Yup.string().required('Ville Requis'),
    zip: Yup.string().required('Code postal Requis'),
    companyName: Yup.string().required('Nom de l\'entreprise Requis'),
})

const Profil = ({ data }: { data?: UserInformations[] }) => {
    const dispatch = useAppDispatch()
    const userData = useAppSelector((state) => state.auth.user)
    const onFormSubmit = async (
        values: UserInformations,
        setSubmitting: (isSubmitting: boolean) => void
    ) => {
      const data = {
        ...values,
        _id: userData._id
      }
      const response = await apiUpdateUser(data)
      if(response.data.result){
        toast.push(<Notification title={'Informations personnelles mises à jour'} type="success" />, {
            placement: 'top-center',
        })
        dispatch(setUser(response.data.user))
        setSubmitting(false)
      } else {
        toast.push(<Notification title={'Erreur lors de la mise à jour des informations personnelles'} type="danger" />, {
            placement: 'top-center',
        })
        setSubmitting(false)
      }
      
    }

    const onFileUpload = async (
        files: File[],
        setFieldValue: (
          field: string,
          value: any,
          shouldValidate?: boolean,
        ) => void,
        field: string,
      ) => {
        const formData = new FormData();
        formData.append("file", files[0]);
        try {
          const response = await fetch(API_BASE_URL + "/upload/avatar/" + userData._id, {
            method: "POST",
            body: formData,
          });
          const data = await response.json();
          const fileUrl = data.fileName
          setFieldValue(field, fileUrl);
        } catch (error) {
          console.error("Erreur lors de l'upload du fichier :", error);
        }
      };

    return (
      <>
        <Formik
          initialValues={{
            avatar: userData.avatar || "",
            firstName: userData.firstName || "",
            lastName: userData.lastName || "",
            email: userData.email || "",
            phone: userData.phone || "",
            address: userData.address || "",
            companyName: userData.companyName || "",
            city: userData.city || "",
            zip: userData.zip || "",
          }}
          validationSchema={validationSchema}
          onSubmit={(values, { setSubmitting }) => {
            setSubmitting(true);
            setTimeout(() => {
              onFormSubmit(values, setSubmitting);
            }, 1000);
          }}
        >
          {({ touched, errors, isSubmitting, resetForm }) => {
            const validatorProps = { touched, errors };
            return (
              <Form>
                <FormContainer>
                  <FormDesription
                    title="Informations personnelles"
                    desc="Vos informations personnelles"
                  />
                  <FormRow
                    name="avatar"
                    label="Image de profil"
                    {...validatorProps}
                  >
                    <Field name="avatar">
                      {({ field, form }: FieldProps) => {
                        const avatarProps = field.value
                          ? { src: API_URL_IMAGE + field.value }
                          : {};
                        return (
                          <div className="flex justify-center">
                            <Upload
                              className="cursor-pointer"
                              showList={false}
                              uploadLimit={1}
                              onChange={(files) =>
                                onFileUpload(
                                  files,
                                  form.setFieldValue,
                                  field.name
                                )
                              }
                              onFileRemove={(files) =>
                                form.setFieldValue(
                                  field.name,
                                  URL.createObjectURL(files[0])
                                )
                              }
                            >
                              <Avatar
                                className="border-2 border-white dark:border-gray-800 shadow-lg"
                                size={100}
                                shape="circle"
                                icon={<HiOutlineUser />}
                                {...avatarProps}
                              />
                            </Upload>
                          </div>
                        );
                      }}
                    </Field>
                  </FormRow>
                  <FormRow name="companyName" label="Nom de l'entreprise" {...validatorProps}>
                    <Field
                      type="text"
                      autoComplete="off"
                      name="companyName"
                      placeholder="Nom de l'entreprise"
                      component={Input}
                    />
                  </FormRow>
                  <FormRow name="lastName" label="Nom" {...validatorProps}>
                    <Field
                      type="text"
                      autoComplete="off"
                      name="lastName"
                      placeholder="Nom"
                      component={Input}
                    />
                  </FormRow>
                  <FormRow name="firstName" label="Prénom" {...validatorProps}>
                    <Field
                      type="text"
                      autoComplete="off"
                      name="firstName"
                      placeholder="Prénom"
                      component={Input}
                    />
                  </FormRow>
                  <FormRow name="email" label="Email" {...validatorProps}>
                    <Field
                      type="email"
                      autoComplete="off"
                      name="email"
                      placeholder="Email"
                      component={Input}
                    />
                  </FormRow>
                  <FormRow name="phone" label="Téléphone" {...validatorProps}>
                    <Field
                      type="text"
                      autoComplete="off"
                      name="phone"
                      placeholder="Téléphone"
                      component={Input}
                    />
                  </FormRow>
                  <FormRow name="address" label="Adresse" {...validatorProps}>
                    <Field
                      type="text"
                      autoComplete="off"
                      name="address"
                      placeholder="Adresse"
                      component={Input}
                    />
                  </FormRow>
                  <FormRow name="zip" label="Code postal" {...validatorProps}>
                    <Field
                      type="text"
                      autoComplete="off"
                      name="zip"
                      placeholder="Code postal"
                      component={Input}
                    />
                  </FormRow>
                  <FormRow name="city" label="Ville" {...validatorProps}>
                    <Field
                      type="text"
                      autoComplete="off"
                      name="city"
                      placeholder="Ville"
                      component={Input}
                    />
                  </FormRow>

                  <div className="mt-4 ltr:text-right">
                    <Button
                      className="ltr:mr-2 rtl:ml-2"
                      type="button"
                      onClick={() => resetForm()}
                    >
                      Reset
                    </Button>
                    <Button
                      variant="solid"
                      loading={isSubmitting}
                      type="submit"
                    >
                      {isSubmitting ? "Modification..." : "Modifier"}
                    </Button>
                  </div>
                </FormContainer>
              </Form>
            );
          }}
        </Formik>
      </>
    );
}

export default Profil
