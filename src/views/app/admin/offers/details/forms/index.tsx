import { IForm, IFormList } from '@/@types/forms'
import InputSection from './fields/input'
import TextAreaSection from './fields/textArea'
import CheckBoxSection from './fields/checkBox'
import SelectSection from './fields/select'
import DateSection from './fields/date'
import UploadSection from './fields/uplaodSection'
import ColorSection from './fields/color'
import RadioSection from './fields/radio'
import { Alert, Button } from '@/components/ui'

function FormOffer({
  fields,
  isAccepted,
  isRejected,
  isAvailable,
}: {
  fields: IFormList;
  isAccepted: boolean;
  isRejected: boolean;
  isAvailable: boolean;
}) {

    const renderAlert = () => {
        if(!isAccepted && !isRejected) {
            return (
              <Alert showIcon className="mb-4" type="danger">
                Vous devez d'abord accepter ou refuser l'offre avant de pouvoir remplir le formulaire
              </Alert>
            );
        }
    }

    const handleSubmit = () => {
        console.log('submit')
    }

  return (
    <div>
      <h3>{fields.title}</h3>
      {fields.fields.map((field) => (
        <div key={field.id}>{renderField(field)}</div>
      ))}
      
      {renderAlert()}
     {isAccepted && <Button className="mt-4" variant="twoTone" size="sm" color="green" onClick={handleSubmit}>
        Envoyer ma demande
      </Button>}
    </div>
  );
}

const renderField = (field: IForm) => {
    const optionsSelect = field.options?.map((option) => ({
        label: option,
        value: option
    }))
    switch (field.type) {
        case 'input':
            return <InputSection {...field} className="mb-4" />
        case 'textarea':
            return <TextAreaSection {...field} className="mb-4" />
        case 'checkbox':
            return <CheckBoxSection {...field} className="mb-4" options={field.options} />
        case 'select':
            return <SelectSection {...field} className="mb-4" options={optionsSelect} />
        case 'date':
            return <DateSection {...field} className="mb-4" />
        case 'file':
            return <UploadSection {...field} className="mb-4" acceptedFileTypes={field.acceptedFileTypes || ''} />
        case 'color':
            return <ColorSection {...field} className="mb-4" />
        case 'radio':
            return <RadioSection {...field} className="mb-4" options={field.options} />
        default:
            return null
    }
}

export default FormOffer
