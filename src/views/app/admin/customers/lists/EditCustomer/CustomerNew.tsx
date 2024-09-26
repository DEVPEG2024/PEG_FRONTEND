import CustomerForm, {
    FormModel,
    SetSubmitting,
} from '@/views/app/admin/customers/lists/CustomersForm'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { useLocation, useNavigate } from 'react-router-dom'
import { t } from 'i18next'
import { CUSTOMERS_LIST } from '@/constants/navigation.constant'
import useCategoryCustomer from '@/utils/hooks/customers/useCategoryCustomer'
import { ICategoryCustomer } from '@/services/CustomerServices'
import { useEffect, useState } from 'react'
import { editCustomer } from '@/utils/hooks/customers/useEditCustomer'

const CustomerNew = () => {
    const navigate = useNavigate()
    const location = useLocation();
    const customerData = location.state?.customerData;
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
        const res = await editCustomer(values)
        
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
    
    const initialData = {
        ...customerData,
        category: customerData.category._id,
    }
    console.log(initialData)
    return (
        <>
            <CustomerForm
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
