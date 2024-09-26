import ProducerForm, {
    FormModel,
    SetSubmitting,
} from '@/views/app/admin/producers/lists/ProducerForm'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { useLocation, useNavigate } from 'react-router-dom'
import { t } from 'i18next'
import {  PRODUCERS_LIST } from '@/constants/navigation.constant'

import { useEffect, useState } from 'react'
import { editProducer } from '@/utils/hooks/producers/useEditProducer'
import useCategoryProducer from '@/utils/hooks/producers/useCategoryProducer'
import { ICategoryProducer } from '@/services/ProducerServices'

const CustomerNew = () => {
    const navigate = useNavigate()
    const location = useLocation();
    const producerData = location.state?.producerData;
    const { getCategoriesProducers } = useCategoryProducer()
    const [categories, setCategories] = useState<ICategoryProducer[]>([])
    useEffect(() => {
        const fetchCategories = async () => {
            const res = await getCategoriesProducers(1, 200, '')
            setCategories(res.data || [])
        }
        fetchCategories()
    }, [])
 
    const handleFormSubmit = async (
        values: FormModel,
        
        setSubmitting: SetSubmitting
    ) => {
        setSubmitting(true)
        console.log(values)
        const res = await editProducer(values)
        
        if (res.status === 'success') {
            toast.push(
              <Notification
                title={t("p.added")}
                type="success"
                duration={2500}
              >
                {res.message}
              </Notification>,
              {
                placement: "top-center",
              }
            );
            navigate(PRODUCERS_LIST)
            setSubmitting(false)
        } else {
            toast.push(
                <Notification
                  title={t("p.error.add")}
                  type="danger"
                  duration={2500}
                >
                  {res.message}
                </Notification>,    
            )
            setSubmitting(false)
        }
    }

    const handleDiscard = () => {
        navigate(PRODUCERS_LIST)
    }
    
    const initialData = {
        ...producerData,
        category: producerData.category._id,
    }

    return (
        <>
            <ProducerForm
                type="edit"
                initialData={initialData}
                categories={categories}
                onFormSubmit={handleFormSubmit}
                onDiscard={handleDiscard}
            />
        </>
    )
}

export default CustomerNew
