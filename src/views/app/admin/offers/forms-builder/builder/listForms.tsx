import { Button, Input } from '@/components/ui'
import { Form } from '../constants/type';

function ListForm({forms, handleFormsSelected}: {forms: Form[], handleFormsSelected: (form: Form) => void}) {
 
  return (
    <div>
      <div className="flex flex-col gap-2">
        {forms.map((form: Form) => (
          <div
            key={form.id}
            className="flex justify-between items-center gap-4 py-1 px-4 bg-gray-800 rounded-md"
          >
            <div className="flex items-center gap-2">
              <form.icon className="text-white text-lg h-6 w-6" />
              <p className="text-white text-md">{form.label}</p>
            </div>
            <Button
              variant="twoTone"
              size="md"
              color="green"
              onClick={() => handleFormsSelected(form)}
            >
              <p className='text-white text-xl'>+</p>
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ListForm
