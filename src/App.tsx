import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { PersistGate } from 'redux-persist/integration/react';
import store, { persistor } from './store';
import Theme from '@/components/template/Theme';
import Layout from '@/components/layouts';
import './locales';
import { useEffect } from 'react';
import { PERSIST_STORE_NAME } from './constants/app.constant';
import { ToastContainer } from 'react-toastify';
import ErrorBoundary from '@/components/ErrorBoundary';

function App() {
  useEffect(() => {
    const pegItem: string = localStorage.getItem(PERSIST_STORE_NAME) ?? ""

    if (pegItem.includes('_id')) {
      localStorage.removeItem(PERSIST_STORE_NAME);
      sessionStorage.removeItem('token');
    }
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter>
          <ErrorBoundary>
            <Theme>
              <Layout />
              <ToastContainer position="bottom-right" />
            </Theme>
          </ErrorBoundary>
        </BrowserRouter>
      </PersistGate>
    </Provider>
  );
}

export default App;
