import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import { FormContainer } from '@/components/ui/Form'
import FormDesription from './FormDesription'
import FormRow from './FormRow'
import { Field,Form, Formik } from 'formik'

import * as Yup from 'yup'
import {  useAppSelector } from '@/store'
import { useState } from 'react'
import { Alert } from '@/components/ui'
import { HiFire } from 'react-icons/hi'
import { apiUpdatePassword } from '@/services/AccountServices'

type UserInformations = {
    oldPassword: string
    newPassword: string
}

const validationSchema = Yup.object().shape({
    oldPassword: Yup.string().required('Ancien mot de passe Requis'),
    newPassword: Yup.string().required('Nouveau mot de passe Requis'),
})

const Password = () => {
    const [message, setMessage] = useState<{
        type: 'success' | 'danger' | null
        message: string | null
    }>({
        type: null,
        message: null
    })
    const userData = useAppSelector((state) => state.auth.user)
    const onFormSubmit = async (
        values: UserInformations,
        setSubmitting: (isSubmitting: boolean) => void
    ) => {
      const data = {
        ...values,
        _id: userData._id
      }
      const response = await apiUpdatePassword(data)
      if(response.data.result){
        toast.push(<Notification title={'Mot de passe mises à jour'} type="success" />, {
            placement: 'top-center',
        })
        setMessage({
            type: 'success',
            message: response.data.message
        })
        setSubmitting(false)
      } else {
        toast.push(<Notification title={'Erreur lors de la mise à jour du mot de passe'} type="danger" />, {
            placement: 'top-center',
        })
        setMessage({
          type: 'danger',
          message: response.data.message
      })
        setSubmitting(false)
      }
    }



    return (
      <>
        {message.message && (
          <div className="mb-4">
            <Alert
              showIcon
              type={message.type ?? "success"}
              customIcon={<HiFire />}
            >
              {message.message}
            </Alert>
          </div>
        )}
        <Formik
          initialValues={{
            oldPassword: "",
            newPassword: "",
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
                    title="Mot de passe"
                    desc="Modifier votre mot de passe"
                  />

                  <FormRow
                    name="oldPassword"
                    label="Votre ancien mot de passe"
                    {...validatorProps}
                  >
                    <Field
                      type="text"
                      autoComplete="off"
                      name="oldPassword"
                      placeholder="Votre ancien mot de passe"
                      component={Input}
                    />
                  </FormRow>
                  <FormRow
                    name="newPassword"
                    label="Nouveau mot de passe"
                    {...validatorProps}
                  >
                    <Field
                      type="text"
                      autoComplete="off"
                      name="newPassword"
                      placeholder="Nouveau mot de passe"
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

export default Password
