import React from 'react';
import ReactDOM from 'react-dom/client';
import { VeilShell } from './components/VeilShell';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initVeilStore } from './store/useVeilStore';
import './styles/tokens.css';
import './styles/glass.css';

const renderApp = () => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ErrorBoundary name="App">
        <VeilShell />
      </ErrorBoundary>
    </React.StrictMode>
  );
};

initVeilStore().then(renderApp).catch((err) => {
  console.error('[VeilBrowser] Store init failed, rendering with defaults:', err);
  renderApp();
});
