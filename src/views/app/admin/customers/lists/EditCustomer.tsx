import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { injectReducer, useAppDispatch } from '@/store'
import reducer, {
    getCustomerForEditById,
    useAppSelector,
} from '../store'
import CustomerForm from './CustomersForm/CustomerForm'

injectReducer('customers', reducer)

const EditCustomer = () => {

    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { id } = useParams()

    const { selectedCustomer } = useAppSelector((state: any) => state.customers)

    useEffect(() => {
        if (id) {
            dispatch(getCustomerForEditById(id))
        }
    }, [id])

    const handleSubmit = (data: any) => {
        console.log('UPDATE CUSTOMER', data)
        navigate('/admin/customers/list')
    }

    const handleDiscard = () => {
        navigate('/admin/customers/list')
    }

    if (!selectedCustomer) {
        return <div className="p-6">Chargement...</div>
    }

    return (
        <CustomerForm
            initialData={selectedCustomer}
            customerCategories={[]}
            onFormSubmit={handleSubmit}
            onDiscard={handleDiscard}
        />
    )
}

export default EditCustomer