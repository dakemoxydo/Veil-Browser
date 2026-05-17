import React from 'react';
import ReactDOM from 'react-dom/client';
import { VeilShell } from './components/VeilShell';
import './styles/tokens.css';
import './styles/glass.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <VeilShell />
  </React.StrictMode>
);
