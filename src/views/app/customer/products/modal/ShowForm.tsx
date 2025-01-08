import { useEffect } from 'react';
import { Form as FormViewer  } from '@formio/react';
import { JSONValue } from '@/@types/form';
import { FormAnswer } from '@/@types/formAnswer';

function ShowForm({ fields, formAnswer, readOnly, onSubmit } : {fields: JSONValue, formAnswer: Partial<FormAnswer> | null, readOnly: boolean, onSubmit: (submission: any) => void}) {
  
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
    const script = document.createElement('script');
    script.src = 'https://cdn.form.io/js/formio.full.min.js';
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(link); // Supprime les styles après le démontage du composant
      document.head.removeChild(link2); // Supprime les styles après le démontage du composant
      document.head.removeChild(link3); // Supprime les styles après le démontage du composant
      document.head.removeChild(script); // Supprime les styles après le démontage du composant
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <FormViewer form={{
        type: 'form',
        display: 'form',
        components: JSON.parse(JSON.stringify(fields))}}
        submission={formAnswer?.answer}
        options={{
          readOnly,
        }}
        onSubmit={onSubmit} />
    </div>
  )
}

export default ShowForm;
