
import { useNavigate } from 'react-router-dom'
import { Notification, toast } from '@/components/ui'
import { useEffect, useState } from 'react'
import SaisieForm, { FormModel, SetSubmitting } from './Forms/Form'

import {IUser } from '@/@types/user'
import useCustomer from '@/utils/hooks/customers/useCustomer'
import { apiGetForms } from '@/services/FormServices'
import { IFormList } from '@/@types/forms'
import { apiNewOffer } from '@/services/OfferServices'
import { IOffer } from '@/@types/offer'

interface Options {
    value: string
    label: string
}

const NewOffre = () => {
    const navigate = useNavigate()
    const [customers, setCustomers] = useState<Options[]>([])
    const [selectedCustomers, setSelectedCustomers] = useState<string>("")
    const [forms, setForms] = useState<Options[]>([])
    const [selectedForms, setSelectedForms] = useState<string>("")

    const { getCustomers } = useCustomer()

    useEffect(() => {
        fetchCustomers()
        fetchForms()
    }, [])

    const fetchCustomers = async () => {
        const response = await getCustomers(1, 1000, "")
        const customersList = response.data || []
            const customers = customersList.map((customer: IUser) => ({
                value: customer._id || "",
                label: customer.firstName + " " + customer.lastName
            }))
            setCustomers(customers)

    }

    const fetchForms = async () => {
        const response = await apiGetForms(1, 1000, "")
        const formsList = response.data.forms || []
        const forms = formsList.map((form: IFormList) => ({
            value: form._id || "",
            label: form.title
        }))
        setForms(forms)
    }



    const handleFormSubmit = async (
        values: FormModel,
        
        setSubmitting: SetSubmitting
    ) => {
        setSubmitting(true)
            const data ={
                ...values,
                customer: selectedCustomers,
                form: selectedForms,
            }
            const response = await apiNewOffer(data as unknown as IOffer)
            console.log(response.data)
            if (response.data.result) {
              toast.push(
                <Notification type="success" title="Succès">
                  L'offre a bien été ajouté
                </Notification>
              );
              navigate("/admin/offers/list");
            } else {
              toast.push(
                <Notification type="danger" title="Erreur">
                  Une erreur est survenue lors de l'ajout de l'offre
                </Notification>
              );
              setSubmitting(false)
            }
     
    }
    const handleDiscard = () => {
        navigate('/admin/offers/list')
    }
    return (
        <>
            <SaisieForm
                type="new"
                onFormSubmit={handleFormSubmit}
                onDiscard={handleDiscard}
                forms={forms}
                setForms={setSelectedForms}
                customers={customers}
                setSelectedCustomers={setSelectedCustomers}
            />
        </>
    )
}

export default NewOffre
