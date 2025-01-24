import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { PersistGate } from 'redux-persist/integration/react';
import store, { persistor } from './store';
import Theme from '@/components/template/Theme';
import Layout from '@/components/layouts';
import './locales';
import { useEffect } from 'react';
import { PERSIST_STORE_NAME } from './constants/app.constant';

function App() {
  useEffect(() => {
    const pegItem: string = localStorage.getItem(PERSIST_STORE_NAME) ?? ""

    if (pegItem.includes('_id')) {
      console.log('Removing localstorage peg and token key')
      localStorage.removeItem(PERSIST_STORE_NAME);
      localStorage.removeItem('token');
    }
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter>
          <Theme>
            <Layout />
          </Theme>
        </BrowserRouter>
      </PersistGate>
    </Provider>
  );
}

export default App;
