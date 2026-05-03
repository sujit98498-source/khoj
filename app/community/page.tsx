// app/community/page.tsx
// KHOJ Community — the social layer of the platform
// Two-column layout: feed + sidebar
// Real-time posts, reactions, comments, circles

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useCommunityFeed } from '@/hooks/useCommunityFeed'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { CreatePostBox } from '@/components/community/CreatePostBox'
import { PostCard } from '@/components/community/PostCard'
import { CirclesNav } from '@/components/community/CirclesNav'
import { CommunitySidebar } from '@/components/community/CommunitySidebar'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { CommunityPost } from '@/lib/types'
import { getSavedPosts, getUserPosts } from '@/services/communityService'
import clsx from 'clsx'

type CommunityTab = 'feed' | 'saved' | 'mine'

const TAB_COPY: Record<CommunityTab, { title: string; subtitle: string; icon: string }> = {
  feed: {
    title: 'Community Feed',
    subtitle: 'Share your journey, celebrate progress, and connect with ambitious builders.',
    icon: '◈',
  },
  saved: {
    title: 'Saved Posts',
    subtitle: 'Everything you bookmarked for later, all in one place.',
    icon: '☆',
  },
  mine: {
    title: 'My Posts',
    subtitle: 'A clean view of everything you have shared with the KHOJ community.',
    icon: '▲',
  },
}

export default function CommunityPage() {
  const { khojUser } = useAuth()
  const { posts, loading, submitting, submitPost, activeCircle, setActiveCircle } = useCommunityFeed()
  const [activeTab, setActiveTab] = useState<CommunityTab>('feed')
  const [savedPosts, setSavedPosts] = useState<CommunityPost[]>([])
  const [myPosts, setMyPosts] = useState<CommunityPost[]>([])
  const [savedLoading, setSavedLoading] = useState(false)
  const [myPostsLoading, setMyPostsLoading] = useState(false)

  useEffect(() => {
    if (!khojUser?.uid || activeTab !== 'saved') return

    setSavedLoading(true)
    getSavedPosts(khojUser.uid)
      .then((items) => setSavedPosts(items))
      .finally(() => setSavedLoading(false))
  }, [activeTab, khojUser?.uid])

  useEffect(() => {
    if (!khojUser?.uid || activeTab !== 'mine') return

    setMyPostsLoading(true)
    getUserPosts(khojUser.uid)
      .then((items) => setMyPosts(items))
      .finally(() => setMyPostsLoading(false))
  }, [activeTab, khojUser?.uid])

  const mergedMyPosts = useMemo(() => {
    if (!khojUser?.uid) return []

    const map = new Map<string, CommunityPost>()
    ;[...myPosts, ...posts.filter((post) => post.authorId === khojUser.uid)].forEach((post) => {
      map.set(post.id, post)
    })

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [myPosts, posts, khojUser?.uid])

  const tabMeta = TAB_COPY[activeTab]

  const renderPostList = (items: CommunityPost[], empty: { icon: string; title: string; description: string; action?: React.ReactNode }, onSaveChange?: (saved: boolean, post: CommunityPost) => void) => {
    if (items.length === 0) {
      return (
        <EmptyState
          icon={empty.icon}
          title={empty.title}
          description={empty.description}
          action={empty.action}
        />
      )
    }

    return (
      <div className="space-y-4 stagger-children animate-fade-in">
        {items.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={khojUser?.uid ?? null}
            currentUserName={khojUser?.name}
            currentUserXP={khojUser?.xp}
            featured={Boolean(post.pinned)}
            onSaveChange={onSaveChange}
          />
        ))}
      </div>
    )
  }

  return (
    <AppShell>
      <div className="animate-slide-up">
        <PageHeader
          eyebrow="Community"
          title="KHOJ Community"
          subtitle="Build in public, save the best ideas, and keep track of your own voice."
          action={
            <Link href="/community/saved">
              <Button variant="secondary" size="sm">Open Saved Page</Button>
            </Link>
          }
        />

        <div className="mb-6 flex flex-wrap gap-2 rounded-sm border border-khoj-border bg-khoj-card p-2">
          {([
            { id: 'feed', label: 'Feed', icon: '◈' },
            { id: 'saved', label: 'Saved', icon: '☆' },
            { id: 'mine', label: 'My Posts', icon: '▲' },
          ] as Array<{ id: CommunityTab; label: string; icon: string }>).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 rounded-sm px-4 py-2 text-sm font-body font-semibold transition-all duration-150',
                activeTab === tab.id
                  ? 'bg-khoj-accent text-white shadow-[0_0_18px_rgba(255,77,0,0.18)]'
                  : 'text-khoj-subtle hover:bg-khoj-bg hover:text-khoj-text'
              )}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-sm border border-khoj-border bg-khoj-card px-5 py-4 animate-fade-in">
              <p className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent font-body font-semibold">
                {tabMeta.icon} {activeTab === 'mine' ? 'Your Space' : activeTab === 'saved' ? 'Bookmarks' : 'Live Feed'}
              </p>
              <h2 className="mt-1 text-xl font-display font-bold text-khoj-text">{tabMeta.title}</h2>
              <p className="mt-1 text-sm text-khoj-subtle font-body">{tabMeta.subtitle}</p>
            </div>

            {activeTab === 'feed' && (
              <>
                {khojUser && (
                  <CreatePostBox
                    user={khojUser}
                    onSubmit={submitPost}
                    loading={submitting}
                  />
                )}

                <CirclesNav active={activeCircle} onChange={setActiveCircle} />

                {loading ? (
                  <div className="py-20">
                    <LoadingSpinner />
                  </div>
                ) : renderPostList(posts, {
                  icon: '◈',
                  title: 'Nothing here yet',
                  description: 'Be the first to post in this circle.',
                })}
              </>
            )}

            {activeTab === 'saved' && (
              savedLoading ? (
                <div className="py-20">
                  <LoadingSpinner />
                </div>
              ) : renderPostList(
                savedPosts,
                {
                  icon: '☆',
                  title: 'No saved posts yet',
                  description: 'Save a post from the feed and it will appear here.',
                  action: (
                    <Button size="sm" onClick={() => setActiveTab('feed')}>
                      Browse Feed
                    </Button>
                  ),
                },
                (saved, post) => {
                  if (!saved) {
                    setSavedPosts((prev) => prev.filter((item) => item.id !== post.id))
                  }
                }
              )
            )}

            {activeTab === 'mine' && (
              myPostsLoading ? (
                <div className="py-20">
                  <LoadingSpinner />
                </div>
              ) : renderPostList(
                mergedMyPosts,
                {
                  icon: '▲',
                  title: 'You have not posted yet',
                  description: 'Share your first update, win, or idea with the KHOJ community.',
                  action: (
                    <Button size="sm" onClick={() => setActiveTab('feed')}>
                      Create a Post
                    </Button>
                  ),
                }
              )
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <CommunitySidebar />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}