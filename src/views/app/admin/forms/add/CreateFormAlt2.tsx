import { useEffect } from 'react';
import { Formio } from '@formio/js';

function CreateFormAlt2() {

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.form.io/js/formio.full.min.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://cdn.form.io/js/formio.full.min.js';
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(link); // Supprime les styles après le démontage du composant
      document.head.removeChild(script); // Supprime les styles après le démontage du composant
    };
  }, []);

  Formio.builder(document.getElementById('builder'), {}, {
    builder: {
      basic: false,
      advanced: false,
      data: false,
      customBasic: {
        title: 'Basic Components',
        default: true,
        weight: 0,
        components: {
          textfield: true,
          textarea: true,
          email: true,
          phoneNumber: true
        }
      },
      custom: {
        title: 'User Fields',
        weight: 10,
        components: {
          firstName: {
            title: 'First Name',
            key: 'firstName',
            icon: 'terminal',
            schema: {
              label: 'First Name',
              type: 'textfield',
              key: 'firstName',
              input: true
            }
          },
          lastName: {
            title: 'Last Name',
            key: 'lastName',
            icon: 'terminal',
            schema: {
              label: 'Last Name',
              type: 'textfield',
              key: 'lastName',
              input: true
            }
          },
          email: {
            title: 'Email',
            key: 'email',
            icon: 'at',
            schema: {
              label: 'Email',
              type: 'email',
              key: 'email',
              input: true
            }
          },
          phoneNumber: {
            title: 'Mobile Phone',
            key: 'mobilePhone',
            icon: 'phone-square',
            schema: {
              label: 'Mobile Phone',
              type: 'phoneNumber',
              key: 'mobilePhone',
              input: true
            }
          }
        }
      },
      layout: {
        components: {
          table: false
        }
      }
    },
    editForm: {
      textfield: [
        {
          key: 'api',
          ignore: true
        }        
      ]
    }
  }).then(function(builder) {
    builder.on('saveComponent', function() {
      console.log(builder.schema);
    });
  });

  
  return (
    <div id="builder"></div>
  )
}

export default CreateFormAlt2;
