/**
 * @file main.tsx
 * @brief Renderer entry point that mounts the React application.
 * @author Y. Sasiwat <y.sasiwat@gmail.com>
 */

import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
