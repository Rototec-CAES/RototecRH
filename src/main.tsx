import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { addCollection, type IconifyJSON } from '@iconify/react'
import App from './App'
import iconos from './lib/iconos.generated.json'
import './index.css'

// Íconos empaquetados con la app (scripts/generar-iconos.mjs): se ven aunque no haya internet.
for (const coleccion of iconos as unknown as IconifyJSON[]) addCollection(coleccion)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
