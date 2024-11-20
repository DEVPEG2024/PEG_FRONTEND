import { useEffect, useRef } from 'react';
import { ReactFormBuilder } from 'react-form-builder2';
import 'react-form-builder2/dist/app.css';
import Frame from 'react-frame-component';

function CreateFormAlt3() {
  const iframeRef = useRef(null);

  useEffect(() => {
    const iframe = iframeRef.current;

    const onLoad = () => {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;;

      const link = iframeDoc.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://use.fontawesome.com/releases/v5.13.0/css/all.css';
    iframeDoc.head.appendChild(link);
    const link2 = iframeDoc.createElement('link');
    link2.rel = 'stylesheet';
    link2.href = 'https://stackpath.bootstrapcdn.com/bootstrap/4.4.1/css/bootstrap.min.css';
    link2.integrity = 'sha384-Vkoo8x4CGsO3+Hhxv8T/Q5PaXtkKtu6ug5TOeNV6gBiFeWPGFN9MuhOf23Q9Ifjh';
    link2.crossOrigin = 'anonymous';
    iframeDoc.head.appendChild(link2);

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
      <ReactFormBuilder />
    </Frame>
  )
}

export default CreateFormAlt3;
