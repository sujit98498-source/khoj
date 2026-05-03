// app/page.tsx
// Root route — redirects based on auth state

import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function RootPage() {
  // Middleware handles auth-based routing
  // This catches any edge cases
  redirect('/dashboard')
}
