import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { injectReducer, useAppDispatch, useAppSelector } from '@/store'
import reducer, { getCustomerForEditById, updateCustomer } from '../store'
import CustomerForm from './CustomersForm/CustomerForm'

injectReducer('customers', reducer)

const EditCustomer = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()

  const selectedCustomer = useAppSelector((state: any) => state.customers?.customer)
  const loading = useAppSelector((state: any) => state.customers?.loading)

  useEffect(() => {
    if (id) dispatch(getCustomerForEditById(id))
  }, [id])

  const handleSubmit = async ({ data, logoFile }: { data: any; logoFile?: File | null }) => {
    if (!id) return
    await dispatch(updateCustomer({ id, data, logoFile }))
    navigate('/admin/customers/list')
  }

  const handleDiscard = () => navigate('/admin/customers/list')

  if (loading || !selectedCustomer) {
    return <div className="p-6">Chargement...</div>
  }

  return (
    <CustomerForm
      initialData={selectedCustomer as any}
      customerCategories={[]}
      onFormSubmit={handleSubmit}
      onDiscard={handleDiscard}
    />
  )
}

export default EditCustomer