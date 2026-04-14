import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { injectReducer, useAppDispatch, useAppSelector } from '@/store'
import reducer, { getCustomerForEditById, updateCustomer, createCustomer } from '../store'
import CustomerForm, { CustomerFormModel } from './CustomersForm/CustomerForm'
import { apiGetCustomerCategories } from '@/services/CustomerCategoryServices'
import ClientFilesPanel from '@/components/shared/ClientFiles/ClientFilesPanel'

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

  const flattenCustomer = (customer: any): CustomerFormModel | undefined => {
    if (!customer) return undefined
    const ci = customer.companyInformations ?? {}
    return {
      ...customer,
      customerCategory: customer.customerCategory?.documentId ?? customer.customerCategory ?? null,
      email: ci.email ?? '',
      phoneNumber: ci.phoneNumber ?? '',
      vatNumber: ci.vatNumber ?? '',
      siretNumber: ci.siretNumber ?? '',
      address: ci.address ?? '',
      zipCode: ci.zipCode ?? '',
      city: ci.city ?? '',
      country: ci.country ?? '',
      website: ci.website ?? '',
      bannerImageUrl: customer.banner?.image?.url ?? null,
      bannerDocumentId: customer.banner?.documentId ?? null,
    }
  }

  const nestCustomer = (formData: CustomerFormModel) => {
    const { logoFile, bannerFile, bannerImageUrl: _biu, bannerDocumentId,
      email, phoneNumber, vatNumber, siretNumber, address, zipCode, city, country, website,
      documentId: _docId, logo: _logo, banner: _banner, companyInformations: _ci,
      ...rest } = formData as any
    return {
      data: {
        name: rest.name,
        customerCategory: rest.customerCategory || null,
        deferredPayment: rest.deferredPayment ?? false,
        catalogAccess: rest.catalogAccess ?? true,
        companyInformations: { email: email || '', phoneNumber: phoneNumber || '', vatNumber: vatNumber || '', siretNumber: siretNumber || '', address: address || '', zipCode: zipCode || '', city: city || '', country: country || '', website: website || '' },
      },
      logoFile: logoFile ?? null,
      bannerFile: bannerFile ?? null,
      bannerDocumentId: bannerDocumentId ?? null,
    }
  }

  const handleSubmit = async (formData: CustomerFormModel) => {
    const { data, logoFile, bannerFile, bannerDocumentId } = nestCustomer(formData)
    if (isEdit) {
      await dispatch(updateCustomer({ id: documentId!, data, logoFile, bannerFile, bannerDocumentId }))
    } else {
      await dispatch(createCustomer({ data, logoFile, bannerFile }))
    }
    navigate('/admin/customers/list')
  }

  const handleDiscard = () => navigate('/admin/customers/list')

  if (isEdit && (loading || !selectedCustomer)) {
    return <div className="p-6">Chargement...</div>
  }

  return (
    <CustomerForm
      initialData={isEdit ? flattenCustomer(selectedCustomer) : undefined}
      customerCategories={customerCategories}
      onFormSubmit={handleSubmit}
      onDiscard={handleDiscard}
      extraContent={isEdit && documentId ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <ClientFilesPanel customerDocumentId={documentId} mode="admin" />
        </div>
      ) : undefined}
    />
  )
}

export default EditCustomer