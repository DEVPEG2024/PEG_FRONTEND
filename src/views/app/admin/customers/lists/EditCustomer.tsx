// src/views/app/admin/customers/lists/EditCustomer.tsx
import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { injectReducer, useAppDispatch } from '@/store'
import reducer, { getCustomerForEditById, useAppSelector } from '../store'
import CustomerForm from './CustomersForm/CustomerForm'
import type { Customer } from '@/@types/customer'

// ⚠️ Garde le même "key" que partout ailleurs (CustomersList = 'customers')
injectReducer('customers', reducer)

type LocationState = {
  customerData?: Customer
}

const EditCustomer = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const state = (location.state as LocationState) || {}

  const selectedCustomer = useAppSelector((s) => s.customers?.selectedCustomer)
  const loading = useAppSelector((s) => s.customers?.data?.loading)

  // Si on a déjà le customer dans le state (depuis la liste), on peut l’utiliser
  const customerFromState = state.customerData

  useEffect(() => {
    if (!id) return
    // Si pas de customer en state, on charge depuis l'API
    if (!customerFromState) {
      dispatch(getCustomerForEditById(id))
    }
  }, [dispatch, id, customerFromState])

  const initialData = useMemo(() => {
    const c: any = customerFromState || selectedCustomer
    if (!c) return undefined

    // CustomerFormModel attend certains champs en string (dans ton code)
    return {
      ...c,
      customerCategory: c.customerCategory?.documentId ?? c.customerCategory ?? null,
      banner: c.banner ?? null,
      phoneNumber: c.phoneNumber ?? '',
      email: c.email ?? '',
      vatNumber: c.vatNumber ?? '',
      siretNumber: c.siretNumber ?? '',
      address: c.address ?? '',
      zipCode: c.zipCode ?? '',
      city: c.city ?? '',
      country: c.country ?? '',
      website: c.website ?? '',
    }
  }, [customerFromState, selectedCustomer])

  const handleDiscard = () => {
    navigate('/admin/customers/list')
  }

  const handleSubmit = async (formData: any) => {
    // ⚠️ Ici tu avais sûrement un updateCustomer existant.
    // Pour l’instant je te laisse juste un retour liste pour que ça compile.
    // Si tu veux, envoie-moi ton "CustomerServices.ts" côté update et je te le branche.
    console.log('EDIT submit', formData)
    navigate('/admin/customers/list')
  }

  // Tant que ça charge et qu’on n’a rien à afficher
  if (loading && !initialData) {
    return <div className="p-6">Chargement...</div>
  }

  return (
    <div className="p-4">
      <CustomerForm
        initialData={initialData}
        // ⚠️ Tu dois passer les catégories comme tu le fais ailleurs.
        // Si ton EditCustomer les chargeait, recopie ta logique ici.
        customerCategories={[]}
        onDiscard={handleDiscard}
        onFormSubmit={handleSubmit}
      />
    </div>
  )
}

export default EditCustomer