import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ConfirmProvider } from './components/ConfirmProvider';
import { VkBridgeProvider } from './context/VkBridgeContext';
import { SessionProvider } from './context/SessionContext';
import './styles/theme.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/zakaz">
      <VkBridgeProvider>
        <SessionProvider>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </SessionProvider>
      </VkBridgeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
