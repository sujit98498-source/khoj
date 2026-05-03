'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { PostCard } from '@/components/community/PostCard'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { CommunityPost } from '@/lib/types'
import { getSavedPosts } from '@/services/communityService'

export default function SavedPostsPage() {
  const { khojUser } = useAuth()
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    if (!khojUser?.uid) {
      setLoading(false)
      return
    }

    getSavedPosts(khojUser.uid)
      .then((savedPosts) => {
        if (isActive) {
          setPosts(savedPosts)
        }
      })
      .finally(() => {
        if (isActive) {
          setLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [khojUser?.uid])

  return (
    <AppShell>
      <div className="animate-slide-up space-y-6">
        <PageHeader
          eyebrow="Community"
          title="Saved Posts"
          subtitle="Posts you bookmarked to revisit later."
          action={
            <Link href="/community">
              <Button variant="secondary" size="sm">Back to Community</Button>
            </Link>
          }
        />

        {loading ? (
          <LoadingSpinner />
        ) : posts.length === 0 ? (
          <EmptyState
            icon="☆"
            title="No saved posts yet"
            description="Save a post from the Community feed and it will appear here."
            action={
              <Link href="/community">
                <Button size="sm">Browse Community</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-4 stagger-children">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={khojUser?.uid ?? null}
                currentUserName={khojUser?.name}
                currentUserXP={khojUser?.xp}
                featured={Boolean(post.pinned)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}