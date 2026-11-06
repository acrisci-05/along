import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { StoreProvider } from './store/store'
import { RealStoreProvider } from './store/real'
import { backendConfigured } from './lib/supabase'

// with Supabase configured (.env.local) the app is real; otherwise it's the local demo
const Provider = backendConfigured ? RealStoreProvider : StoreProvider

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider>
      <App />
    </Provider>
  </StrictMode>,
)
