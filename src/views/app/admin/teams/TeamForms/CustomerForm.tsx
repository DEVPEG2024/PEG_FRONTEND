import { forwardRef, useEffect } from 'react'
import { FormContainer } from '@/components/ui/Form'
import Button from '@/components/ui/Button'
import hooks from '@/components/ui/hooks'
import StickyFooter from '@/components/shared/StickyFooter'
import { Form, Formik, FormikProps } from 'formik'
import BasicInformationFields from './BasicInformationFields'
import OrganizationFields from './OrganizationFields'
import cloneDeep from 'lodash/cloneDeep'
import { AiOutlineSave } from 'react-icons/ai'
import * as Yup from 'yup'
import { t } from 'i18next'
import { IUser } from '@/@types/user'
import { countries } from '@/constants/countries.constant'
import { OptionsRole } from '../NewTeam/NewTeam'
import { ROLES_OPTIONS } from '@/constants/roles.constant'

type FormikRef = FormikProps<any>

type InitialData = IUser

export type FormModel = Omit<InitialData, 'tags' | 'category'> & {
    tags: { label: string; value: string }[] | string[]
    authority: { label: string; value: string }[] | string[]
}

export type SetSubmitting = (isSubmitting: boolean) => void



type ProducerForm = {
    initialData?: InitialData
    type: 'edit' | 'new'
    categories: OptionsRole[]
    onDiscard?: () => void
    onFormSubmit: (formData: FormModel, setSubmitting: SetSubmitting) => void
}

const { useUniqueId } = hooks

const validationSchema = Yup.object().shape({
    lastName: Yup.string().required(t('cust.error.lastName')),
    firstName: Yup.string().required(t('cust.error.firstName')),
    phone: Yup.string().required(t('cust.error.phone')),
    address: Yup.string().required(t('cust.error.address')),
    zip: Yup.string().required(t('cust.error.zip')),
    city: Yup.string().required(t('cust.error.city')),
    country: Yup.string().required(t('cust.error.country')),
    email: Yup.string().required(t('cust.error.email')),
    authority: Yup.string().required(t('cust.error.category')),
})



const ProducerForm = forwardRef<FormikRef, ProducerForm>((props, ref) => {
    const newId = useUniqueId('producer-')
    const {
        type,
        initialData = {
            lastName: '',
            firstName: '',
            phone: '',
            address: '',
            zip: '',
            city: '',
            country: '',
            authority : '',
            qrCode: newId,
            email: '',
            tags: [],
        },
        onFormSubmit,
        onDiscard,
        categories,
    } = props

   

    return (
        <>
            <Formik
                innerRef={ref}
                initialValues={{
                    ...initialData,
                    tags: initialData?.tags
                        ? initialData.tags.map((value) => ({
                              label: value,
                              value,
                          }))
                        : [],
                }}
                validationSchema={validationSchema}
                onSubmit={(values: FormModel, { setSubmitting }) => {
                    const formData = cloneDeep(values)
                    formData.tags = formData.tags.map((tag) => {
                        if (typeof tag !== 'string') {
                            return tag.value
                        }
                        return tag
                    })
                    onFormSubmit?.(formData, setSubmitting)
                }}
            >
                {({ values, touched, errors, isSubmitting }) => (
                    <Form>
                        <FormContainer>
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                                <div className="lg:col-span-2">
                                    <BasicInformationFields
                                        touched={touched}
                                        errors={errors}
                                        countries={countries}
                                        type={type}
                                    />
                                </div>
                                <div className="lg:col-span-2">
                                <OrganizationFields
                                        touched={touched}
                                        errors={errors}
                                        values={values}
                                        type={type}
                                        categories={categories}
                                    />
                                </div>
                            </div>
                            <StickyFooter
                                className="-mx-8 px-8 flex items-center justify-end py-4"
                                stickyClass="border-t bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                            >
                                <div className="md:flex items-end">
                                    <Button
                                        size="sm"
                                        className="ltr:mr-3 rtl:ml-3"
                                        type="button"
                                        onClick={() => onDiscard?.()}
                                    >
                                        {t('cancel')}
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="solid"
                                        loading={isSubmitting}
                                        icon={<AiOutlineSave />}
                                        type="submit"
                                    >
                                        {t('save')}
                                    </Button>
                                </div>
                            </StickyFooter>
                        </FormContainer>
                    </Form>
                )}
            </Formik>
        </>
    )
})

ProducerForm.displayName = 'ProducerForm'

export default ProducerForm
