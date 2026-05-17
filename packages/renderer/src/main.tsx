import React from 'react';
import ReactDOM from 'react-dom/client';
import { VeilShell } from './components/VeilShell';
import { initVeilStore } from './store/useVeilStore';
import './styles/tokens.css';
import './styles/glass.css';

initVeilStore();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <VeilShell />
  </React.StrictMode>
);
