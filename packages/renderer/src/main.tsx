import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { VeilShell } from './components/shell/VeilShell'
import './styles/tokens.css'
import './styles/glass.css'
import './styles/animations.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VeilShell />
  </StrictMode>,
)
