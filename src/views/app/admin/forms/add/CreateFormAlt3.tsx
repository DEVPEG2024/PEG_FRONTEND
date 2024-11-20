import { useEffect, useRef } from 'react';
import { FormBuilder, Form  } from '@formio/react';
import Frame from 'react-frame-component';

function CreateFormAlt3() {
  const iframeRef = useRef(null);

  useEffect(() => {
    const iframe = iframeRef.current;

    const onLoad = () => {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;;

      const link = iframeDoc.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/css/bootstrap.min.css';
      iframeDoc.head.appendChild(link);
      const link2 = iframeDoc.createElement('link');
      link2.rel = 'stylesheet';
      link2.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.css';
      iframeDoc.head.appendChild(link2);
      const link3 = iframeDoc.createElement('link');
      link3.rel = 'stylesheet';
      link3.href = 'https://cdn.form.io/formiojs/formio.full.min.css';
      iframeDoc.head.appendChild(link3);
      const script = iframeDoc.createElement('script');
      script.src = 'https://cdn.form.io/js/formio.full.min.js';
      iframeDoc.head.appendChild(script);

      /*iframeDoc.body.innerHTML = `
          <div class="container">
              <FormBuilder form={{display: 'form'}} />
          </div>
      `;*/
    }

    iframe.addEventListener('load', onLoad);

    return () => {
      /*iframeDoc.head.removeChild(link); // Supprime les styles après le démontage du composant
      iframeDoc.head.removeChild(link2); // Supprime les styles après le démontage du composant
      iframeDoc.head.removeChild(link3); // Supprime les styles après le démontage du composant
      iframeDoc.head.removeChild(script); // Supprime les styles après le démontage du composant*/
    };
  }, []);

  return (
    <Frame ref={iframeRef}>
      <FormBuilder form={{display: 'form'}} />
    </Frame>
  )
}

export default CreateFormAlt3;
