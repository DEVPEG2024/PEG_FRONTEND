import CustomerForm, {
    FormModel,
    SetSubmitting,
} from '@/views/app/admin/customers/lists/CustomersForm'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { useNavigate } from 'react-router-dom'
import { t } from 'i18next'
import { CUSTOMERS_LIST } from '@/constants/navigation.constant'
import useCategoryCustomer from '@/utils/hooks/customers/useCategoryCustomer'
import { ICategoryCustomer } from '@/services/CustomerServices'
import { useEffect, useState } from 'react'
import { createCustomer } from '@/utils/hooks/customers/useCreateCustomer'

const CustomerNew = () => {
    const navigate = useNavigate()
    const { getCategoriesCustomers } = useCategoryCustomer()
    const [categories, setCategories] = useState<ICategoryCustomer[]>([])
    useEffect(() => {
        const fetchCategories = async () => {
            const res = await getCategoriesCustomers(1, 200, '')
            setCategories(res.data || [])
        }
        fetchCategories()
    }, [])

    const handleFormSubmit = async (
        values: FormModel,
        
        setSubmitting: SetSubmitting
    ) => {
        setSubmitting(true)
        const res = await createCustomer(values)
        
        if (res.status === 'success') {
            toast.push(
              <Notification
                title={t("cust.added")}
                type="success"
                duration={2500}
              >
                {res.message}
              </Notification>,
              {
                placement: "top-center",
              }
            );
            navigate(CUSTOMERS_LIST)
            setSubmitting(false)
        } else {
            toast.push(
                <Notification
                  title={t("cust.error.add")}
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
        navigate(CUSTOMERS_LIST)
    }

    return (
        <>
            <CustomerForm
                type="new"
                categories={categories}
                onFormSubmit={handleFormSubmit}
                onDiscard={handleDiscard}
            />
        </>
    )
}

export default CustomerNew
