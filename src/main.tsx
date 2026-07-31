import React from 'react'
import ReactDOM from 'react-dom/client'
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import App from './App'
import EnterpriseErrorBoundary from '@/platform/observability/EnterpriseErrorBoundary'

import './index.css'
import './styles/index.css'

const savedTheme =
  localStorage.getItem('pmocorex-theme') || 'light'

document.documentElement.classList.remove(
  'dark',
  'light'
)
document.documentElement.classList.add(savedTheme)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

ReactDOM.createRoot(
  document.getElementById('root')!
).render(
  <React.StrictMode>
    <EnterpriseErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </EnterpriseErrorBoundary>
  </React.StrictMode>
)
