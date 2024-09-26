import ProducerForm, {
    FormModel,
    SetSubmitting,
} from '@/views/app/admin/teams/TeamForms'
import toast from '@/components/ui/toast'
import Notification from '@/components/ui/Notification'
import { useLocation, useNavigate } from 'react-router-dom'
import { t } from 'i18next'

import { useEffect, useState } from 'react'
import { editProducer } from '@/utils/hooks/producers/useEditProducer'
import { ROLES_OPTIONS } from '@/constants/roles.constant'
import { apiUpdateTeam } from '@/services/TeamServices'

interface option {
    label: string
    value: string
}

const CustomerNew = () => {
    const navigate = useNavigate()
    const location = useLocation();
    const teamData = location.state?.teamData;
    const [categories, setCategories] = useState<option[]>([])
    useEffect(() => {
       setCategories(ROLES_OPTIONS)
    }, [])
 
    const handleFormSubmit = async (
        values: FormModel,
        
        setSubmitting: SetSubmitting
    ) => {
        setSubmitting(true)
        console.log(values)
        const res = await apiUpdateTeam(values)
        
        if (res.data.result) {
            toast.push(
              <Notification
                title={t("p.added")}
                type="success"
                duration={2500}
              >
                {res.data.message}
              </Notification>,
              {
                placement: "top-center",
              }
            );
            navigate("/admin/teams")
            setSubmitting(false)
        } else {
            toast.push(
                <Notification
                  title={t("p.error.add")}
                  type="danger"
                  duration={2500}
                >
                  {res.data.message}
                </Notification>,    
            )
            setSubmitting(false)
        }
    }

    const handleDiscard = () => {
        navigate("/admin/teams")
    }
    
    const initialData = {
        ...teamData,
        authority:teamData.authority[0],
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
