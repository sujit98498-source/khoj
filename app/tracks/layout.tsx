import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

export default function HiddenTracksLayout({ children: _children }: { children: ReactNode }) {
  redirect('/dashboard')
}
