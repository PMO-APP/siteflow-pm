import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import App from './App'

import './index.css'
import './styles/index.css'

const savedTheme =
  localStorage.getItem('pmocorex-theme') || 'dark'

document.documentElement.classList.remove(
  'dark',
  'light'
)
document.documentElement.classList.add(savedTheme)

const queryClient = new QueryClient()

ReactDOM.createRoot(
  document.getElementById('root')!
).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
)
