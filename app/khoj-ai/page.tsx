'use client'

import { AppShell } from '@/components/layout/AppShell'
import { KhojAssistantChat } from '@/components/ai/KhojAssistantChat'

export default function KhojAIPage() {
  return (
    <AppShell>
      <div className="animate-slide-up pb-8">
        <KhojAssistantChat
          title="KHOJ AI"
          subtitle="Your startup coach and learning assistant for Proof Tracks, Startup Rooms, Opportunity Market, and practical execution."
          initialMode="startup"
        />
      </div>
    </AppShell>
  )
}
