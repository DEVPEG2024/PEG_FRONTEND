import { ReactFormBuilder } from 'react-form-builder2';
import 'react-form-builder2/dist/app.css';
import { useEffect } from 'react';

function CreateFormAlt() {

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://use.fontawesome.com/releases/v5.13.0/css/all.css';
    document.head.appendChild(link);
    const link2 = document.createElement('link');
    link2.rel = 'stylesheet';
    link2.href = 'https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css';
    link2.integrity = 'sha384-Vkoo8x4CGsO3+Hhxv8T/Q5PaXtkKtu6ug5TOeNV6gBiFeWPGFN9MuhOf23Q9Ifjh';
    link2.crossOrigin = 'anonymous';
    document.head.appendChild(link2);

    return () => {
      document.head.removeChild(link); // Supprime les styles après le démontage du composant
      document.head.removeChild(link2); // Supprime les styles après le démontage du composant
    };
  }, []);

  return (
    <ReactFormBuilder />
  )
}

export default CreateFormAlt;
