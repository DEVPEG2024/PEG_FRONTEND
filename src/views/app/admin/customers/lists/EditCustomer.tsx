import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { injectReducer, useAppDispatch, useAppSelector } from '@/store'
import reducer, { getCustomerForEditById, updateCustomer, createCustomer } from '../store'
import CustomerForm, { CustomerFormModel } from './CustomersForm/CustomerForm'
import { apiGetCustomerCategories } from '@/services/CustomerCategoryServices'

injectReducer('customers', reducer)

export type Options = { label: string; value: string }

const EditCustomer = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { documentId } = useParams<{ documentId: string }>()
  const isEdit = !!documentId

  const selectedCustomer = useAppSelector((state: any) => state.customers?.customer)
  const loading = useAppSelector((state: any) => state.customers?.loading)
  const [customerCategories, setCustomerCategories] = useState<Options[]>([])

  useEffect(() => {
    if (documentId) dispatch(getCustomerForEditById(documentId))
  }, [documentId])

  useEffect(() => {
    apiGetCustomerCategories().then((res: any) => {
      const nodes = res?.data?.data?.customerCategories_connection?.nodes ?? []
      setCustomerCategories(nodes.map((c: any) => ({ label: c.name, value: c.documentId })))
    }).catch(() => {})
  }, [])

  const handleSubmit = async (formData: CustomerFormModel) => {
    const { logoFile, ...data } = formData
    if (isEdit) {
      await dispatch(updateCustomer({ id: documentId!, data, logoFile: logoFile ?? null }))
    } else {
      await dispatch(createCustomer({ data, logoFile: logoFile ?? null }))
    }
    navigate('/admin/customers/list')
  }

  const handleDiscard = () => navigate('/admin/customers/list')

  if (isEdit && (loading || !selectedCustomer)) {
    return <div className="p-6">Chargement...</div>
  }

  return (
    <CustomerForm
      initialData={isEdit ? (selectedCustomer as any) : undefined}
      customerCategories={customerCategories}
      onFormSubmit={handleSubmit}
      onDiscard={handleDiscard}
    />
  )
}

export default EditCustomer