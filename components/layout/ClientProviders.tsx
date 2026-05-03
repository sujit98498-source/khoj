// components/layout/ClientProviders.tsx
// Client-side provider wrapper for the app root layout.
// Injects JobsContext (live badge counts) and Toaster (toast notifications).

'use client'

import { JobsProvider } from '@/lib/jobs-context'
import { useAuth } from '@/hooks/useAuth'
import { Toaster } from 'react-hot-toast'
import { ReactNode } from 'react'

interface ClientProvidersProps {
  children: ReactNode
}

function InnerProviders({ children }: ClientProvidersProps) {
  const { khojUser } = useAuth()
  return (
    <JobsProvider userId={khojUser?.uid ?? null}>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#e0e0e0',
            border: '1px solid #2a2a2a',
            fontSize: '13px',
            fontFamily: 'var(--font-body)',
          },
          success: {
            iconTheme: { primary: '#ff4d00', secondary: '#fff' },
          },
        }}
      />
    </JobsProvider>
  )
}

export function ClientProviders({ children }: ClientProvidersProps) {
  return <InnerProviders>{children}</InnerProviders>
}
