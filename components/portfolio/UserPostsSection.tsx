// components/portfolio/UserPostsSection.tsx
// Shows the user's community posts/stories with type badge, content preview,
// reaction summary, and link to the full community feed.

import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { CommunityPost, PostType } from '@/lib/types'
import clsx from 'clsx'

const POST_TYPE_CONFIG: Record<PostType, { label: string; color: string; bg: string }> = {
  Story: { label: 'Story', color: 'text-khoj-gold', bg: 'bg-khoj-gold/10 border-khoj-gold/30' },
  Achievement: { label: 'Achievement', color: 'text-khoj-teal', bg: 'bg-khoj-teal/10 border-khoj-teal/30' },
  Discussion: { label: 'Discussion', color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/30' },
  'Team-Up': { label: 'Team-Up', color: 'text-khoj-accent', bg: 'bg-khoj-accent/10 border-khoj-accent/30' },
  Showcase: { label: 'Showcase', color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/30' },
}

function timeAgoShort(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

interface UserPostsSectionProps {
  posts: CommunityPost[]
  /** Max posts to show before "View all" link */
  limit?: number
}

export function UserPostsSection({ posts, limit = 5 }: UserPostsSectionProps) {
  const shown = posts.slice(0, limit)
  const hasMore = posts.length > limit

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] uppercase tracking-[0.15em] text-khoj-subtle font-body">
          Posts &amp; Stories · {posts.length}
        </p>
        {hasMore && (
          <Link
            href="/community"
            className="text-[10px] text-khoj-accent hover:underline font-body uppercase tracking-wider"
          >
            View all →
          </Link>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-khoj-subtle font-body italic text-center py-4">
          No posts yet. Start sharing in the community!
        </p>
      ) : (
        <div className="space-y-3">
          {shown.map((post) => {
            const typeConfig = POST_TYPE_CONFIG[post.type]
            const totalReactions = Object.values(post.reactions).reduce((a, b) => a + b, 0)

            return (
              <div
                key={post.id}
                className="p-4 rounded-sm border border-khoj-border/50 bg-khoj-muted/5 hover:border-khoj-border transition-colors duration-150"
              >
                {/* Header row */}
                <div className="flex items-center gap-2 mb-2.5">
                  <span
                    className={clsx(
                      'text-[9px] uppercase tracking-wider font-body font-bold px-2 py-0.5 border rounded-sm',
                      typeConfig.bg,
                      typeConfig.color
                    )}
                  >
                    {typeConfig.label}
                  </span>
                  <span className="text-[10px] text-khoj-muted font-body ml-auto">
                    {timeAgoShort(post.createdAt)}
                  </span>
                </div>

                {/* Content preview */}
                <p className="text-sm text-khoj-text font-body leading-relaxed line-clamp-3">
                  {post.content}
                </p>

                {/* Footer: reactions + comments */}
                <div className="flex items-center gap-4 mt-2.5 pt-2.5 border-t border-khoj-border/30">
                  <span className="text-[10px] text-khoj-subtle font-body">
                    ♥ {totalReactions.toLocaleString()} reactions
                  </span>
                  <span className="text-[10px] text-khoj-subtle font-body">
                    💬 {post.commentCount} comment{post.commentCount !== 1 ? 's' : ''}
                  </span>
                  <span className="text-[10px] text-khoj-subtle font-body">
                    ★ {post.saveCount} saves
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
