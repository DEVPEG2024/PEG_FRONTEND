import { useEffect } from 'react';
import { Form as FormViewer } from '@formio/react';
import { JSONValue } from '@/@types/form';
import { FormAnswer } from '@/@types/formAnswer';
import fr from '../../../admin/forms/edit/fr.json';

function ShowForm({
  fields,
  formAnswer,
  readOnly,
  onSubmit,
}: {
  fields: JSONValue;
  formAnswer: Partial<FormAnswer> | null;
  readOnly: boolean;
  onSubmit: (submission: any) => void;
}) {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/css/bootstrap.min.css';
    document.head.appendChild(link);
    const link2 = document.createElement('link');
    link2.rel = 'stylesheet';
    link2.href =
      'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.css';
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

  if (!fields) {
    return <div>Aucun formulaire configuré.</div>;
  }

  // Sanitize components: ensure string fields expected by formio are never undefined
  const sanitizeComponents = (components: any[]): any[] =>
    components.map((comp: any) => {
      const cleaned = { ...comp };
      if (cleaned.defaultValue === undefined) cleaned.defaultValue = '';
      if (cleaned.placeholder === undefined) cleaned.placeholder = '';
      if (cleaned.customDefaultValue === undefined) delete cleaned.customDefaultValue;
      if (cleaned.calculateValue === undefined) delete cleaned.calculateValue;
      if (Array.isArray(cleaned.components)) {
        cleaned.components = sanitizeComponents(cleaned.components);
      }
      if (Array.isArray(cleaned.columns)) {
        cleaned.columns = cleaned.columns.map((col: any) => ({
          ...col,
          components: col.components ? sanitizeComponents(col.components) : [],
        }));
      }
      return cleaned;
    });

  const parsedFields = JSON.parse(JSON.stringify(fields));
  const components = Array.isArray(parsedFields) ? parsedFields : parsedFields.components || [];

  return (
    <div className="formio-scope">
      <FormViewer
        form={{
          type: 'form',
          display: 'form',
          components: sanitizeComponents(components),
        }}
        submission={formAnswer?.answer}
        options={{
          readOnly,
          language: 'fr',
          i18n: {
            fr,
          },
        }}
        onSubmit={onSubmit}
      />
    </div>
  );
}

export default ShowForm;
