import type { Metadata } from 'next'
import './globals.css'
import { ClientProviders } from '@/components/layout/ClientProviders'
import { ClientLayout } from '@/components/layout/ClientLayout'

export const metadata: Metadata = {
  title: 'KHOJ - Compete. Win. Grow.',
  description: 'Compete in coding tournaments, earn XP, unlock jobs, and build your tech career.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-khoj-bg text-khoj-text font-body">
        <ClientProviders>
          <ClientLayout>{children}</ClientLayout>
        </ClientProviders>
      </body>
    </html>
  )
}
