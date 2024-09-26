
import { useNavigate } from 'react-router-dom'
import { Notification, toast } from '@/components/ui'
import { useEffect, useState } from 'react'
import { IProduct, OptionsFields } from '@/@types/product'
import SaisieForm, { FormModel, SetSubmitting } from './Forms/Form'
import { ICategoryCustomer } from '@/services/CustomerServices'
import { ICategory, IUser } from '@/@types/user'
import useCustomer from '@/utils/hooks/customers/useCustomer'
import useCategoryCustomer from '@/utils/hooks/customers/useCategoryCustomer'
import useCategoryProduct from '@/utils/hooks/products/useCategoryCustomer'
import { apiNewProduct } from '@/services/ProductServices'
import { apiGetForms } from '@/services/FormServices'
import { IFormList } from '@/@types/forms'

interface Options {
    value: string
    label: string
}

const NewSaisie = () => {
    const navigate = useNavigate()
    const [sizeSelected, setSizeSelected] = useState(false);
    const [sizeField, setSizeField] = useState<OptionsFields[]>([])
    const [field_text, setField_text] = useState(false)    
    const [customers, setCustomers] = useState<Options[]>([])
    const [customersCategories, setCustomersCategories] = useState<Options[]>([])
    const [categories, setCategories] = useState<Options[]>([])
    const [selectedCustomersCategories, setSelectedCustomersCategories] = useState<string[]>([])
    const [selectedCategories, setSelectedCategories] = useState<string[]>([])
    const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
    const [forms, setForms] = useState<Options[]>([])
    const [selectedForms, setSelectedForms] = useState<string>("")

    const { getCustomers } = useCustomer()
    const { getCategoriesCustomers } = useCategoryCustomer()
    const { getCategoriesProduct } = useCategoryProduct()

    useEffect(() => {
        fetchCustomers()
        fetchCustomersCategories()
        fetchCategories()
        fetchForms()
    }, [])
   const fetchForms = async () => {
        const response = await apiGetForms(1, 1000, "")
        const formsList = response.data.forms || []
        const forms = formsList.map((form: IFormList) => ({
            value: form._id || "",
            label: form.title
        }))
        setForms(forms)
    }
    const fetchCustomers = async () => {
        const response = await getCustomers(1, 1000, "")
        const customersList = response.data || []
            const customers = customersList.map((customer: IUser) => ({
                value: customer._id || "",
                label: customer.firstName + " " + customer.lastName
            }))
            setCustomers(customers)

    }

    const fetchCustomersCategories = async () => {
        const response = await getCategoriesCustomers(1, 1000, "")
        const customersCategoriesList = response.data || []
            const customersCategories = customersCategoriesList.map((customerCategory: ICategoryCustomer) => ({
                value: customerCategory._id || "",
                label: customerCategory.label || ""
            }))
            setCustomersCategories(customersCategories)
    }

    const fetchCategories = async () => {
        const response = await getCategoriesProduct(1, 1000, "")
        const categoriesList = response.data || []
            const categories = categoriesList.map((category: ICategory) => ({
                value: category._id || "",
                label: category.title || ""
            }))
            setCategories(categories)
    }

    const handleFormSubmit = async (
        values: FormModel,
        
        setSubmitting: SetSubmitting
    ) => {
        setSubmitting(true)
            const data ={
                ...values,
                field_text: field_text,
                sizes: {
                    status : sizeSelected,
                    options: sizeField
                },
                form: selectedForms,
                customersCategories: selectedCustomersCategories,
                category: selectedCategories,
                customers: selectedCustomers,
            }
            const response = await apiNewProduct(data)
            if (response.status === 200) {
              toast.push(
                <Notification type="success" title="Succès">
                  Le produit a bien été ajouté
                </Notification>
              );
              navigate("/admin/store/lists");
            } else {
              toast.push(
                <Notification type="danger" title="Erreur">
                  Une erreur est survenue lors de l'ajout du produit
                </Notification>
              );
            }
                setSubmitting(false)
     
    }
    const handleDiscard = () => {
        navigate('/admin/store/lists')
    }
    return (
        <>
            <SaisieForm
                type="new"
                onFormSubmit={handleFormSubmit}
                onDiscard={handleDiscard}
                sizeSelected={sizeSelected}
                setSizeSelected={setSizeSelected}
                sizeField={sizeField}
                setSizeField={setSizeField}
                field_text={field_text}
                setField_text={setField_text}
                customers={customers}
                customersCategories={customersCategories}
                categories={categories}
                forms={forms}
                setSelectedForms={setSelectedForms}
                setSelectedCustomersCategories={setSelectedCustomersCategories}
                setSelectedCategories={setSelectedCategories}
                setSelectedCustomers={setSelectedCustomers}
               
            />
        </>
    )
}

export default NewSaisie
