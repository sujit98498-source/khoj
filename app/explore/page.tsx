// app/explore/page.tsx
// Redirects /explore → /arena

import { redirect } from 'next/navigation'

export default function ExplorePage() {
  redirect('/arena')
}
