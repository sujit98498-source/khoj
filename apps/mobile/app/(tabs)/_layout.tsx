import React from 'react'
import { Tabs } from 'expo-router'
import { View, Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../../hooks/useAuth'
import { useConversations } from '../../hooks/useConversations'
import { colors, radius } from '../../lib/theme'

// ── Unread badge shown on the Messages tab ────────────────────────────────────
function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <View style={badge.container}>
      <Text style={badge.text}>{count > 99 ? '99+' : String(count)}</Text>
    </View>
  )
}

const badge = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -2,
    right: -6,
    backgroundColor: colors.purple,
    borderRadius: 10,
    minWidth: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  text: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
})

// ── Tab icon helpers ──────────────────────────────────────────────────────────
function TabIcon({ label, icon, color }: { label: string; icon: string; color: string }) {
  return (
    <View style={icon_s.container}>
      <Text style={[icon_s.icon, { color }]}>{icon}</Text>
      <Text style={[icon_s.label, { color }]}>{label}</Text>
    </View>
  )
}

function MessagesTabIcon({ color }: { color: string }) {
  const { user } = useAuth()
  const { totalUnread } = useConversations(user?.uid ?? null)
  return (
    <View style={icon_s.container}>
      <View>
        <Text style={[icon_s.icon, { color }]}>✉</Text>
        <UnreadBadge count={totalUnread} />
      </View>
      <Text style={[icon_s.label, { color }]}>Messages</Text>
    </View>
  )
}

const icon_s = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  icon: {
    fontSize: 20,
    lineHeight: 22,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
})

// ── Tabs layout ───────────────────────────────────────────────────────────────
export default function TabsLayout() {
  const insets = useSafeAreaInsets()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: colors.purple,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => <TabIcon label="Home" icon="⬡" color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          tabBarIcon: ({ color }) => <TabIcon label="Feed" icon="◎" color={color} />,
        }}
      />
      <Tabs.Screen
        name="tournaments"
        options={{
          tabBarIcon: ({ color }) => <TabIcon label="Events" icon="◈" color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          tabBarIcon: ({ color }) => <MessagesTabIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color }) => <TabIcon label="Profile" icon="◎" color={color} />,
        }}
      />
    </Tabs>
  )
}
