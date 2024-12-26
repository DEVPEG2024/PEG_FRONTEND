import { useEffect, useState } from 'react';
import { FormBuilder  } from '@formio/react';
import { JSONValue } from '@/@types/form';
import classNames from 'classnames';
import { Input } from '@/components/ui';

// TODO SUITE : valeur par défaut pour url et provider pour fichier --> https://github.com/formio/formio.js/issues/2625

function EditForm({onValidate, onCancel, fields, name} : {onValidate: (name: string, components: any) => void, onCancel: () => void, fields: JSONValue, name: string}) {
  const [newName, setNewName] = useState<string>(name),
    [components, setComponents] = useState<any>(JSON.parse(JSON.stringify(fields)))

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/css/bootstrap.min.css';
    document.head.appendChild(link);
    const link2 = document.createElement('link');
    link2.rel = 'stylesheet';
    link2.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.css';
    document.head.appendChild(link2);
    const link3 = document.createElement('link');
    link3.rel = 'stylesheet';
    link3.href = 'https://cdn.form.io/formiojs/formio.full.min.css';
    document.head.appendChild(link3);
    const link4 = document.createElement('link');
    link4.rel = 'stylesheet';
    link4.href = '/EditForm.css';
    document.head.appendChild(link4);
    const script = document.createElement('script');
    script.src = 'https://cdn.form.io/js/formio.full.min.js';
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(link); // Supprime les styles après le démontage du composant
      document.head.removeChild(link2); // Supprime les styles après le démontage du composant
      document.head.removeChild(link3); // Supprime les styles après le démontage du composant
      document.head.removeChild(link4); // Supprime les styles après le démontage du composant
      document.head.removeChild(script); // Supprime les styles après le démontage du composant
    };
  }, []);

  const onNameChange = (e: any) => {
    setNewName(e.target.value)
  }

  const onComponentsChange = (e: any) => {
    setComponents(e.components)
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
            placeholder={'Nom du formulaire'}
            value={newName}
            onChange={onNameChange}
          />
      <FormBuilder
        form={{
          display: 'form',
          components
        }}
        onChange={onComponentsChange}
      />
      <div className="flex flex-row gap-2 justify-end">
        <button className={classNames('btn', 'btn-primary', 'btn-md')} onClick={() => onValidate(newName, components)}>Valider</button>
        <button className={classNames('btn', 'btn-primary', 'btn-md')} onClick={onCancel}>Annuler</button>
      </div>
    </div>
  )
}

export default EditForm;
