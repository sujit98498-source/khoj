// hooks/useCommunityFeed.ts
// Real-time community feed with optimistic post creation

'use client'

import { useState, useEffect, useCallback } from 'react'
import { subscribeToFeed, createPost, CreatePostInput } from '@/services/communityService'
import { CommunityPost, CircleId } from '@/lib/types'

interface UseCommunityFeedReturn {
  posts: CommunityPost[]
  loading: boolean
  submitting: boolean
  submitPost: (input: CreatePostInput) => Promise<void>
  activeCircle: CircleId | undefined
  setActiveCircle: (circle: CircleId | undefined) => void
}

export function useCommunityFeed(): UseCommunityFeedReturn {
  const [posts, setPosts] = useState<CommunityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeCircle, setActiveCircle] = useState<CircleId | undefined>(undefined)

  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeToFeed(
      (incoming) => {
        setPosts(incoming)
        setLoading(false)
      },
      activeCircle,
      30
    )
    return () => unsubscribe()
  }, [activeCircle])

  const submitPost = useCallback(async (input: CreatePostInput) => {
    setSubmitting(true)
    try {
      const id = await createPost(input)
      const optimistic: CommunityPost = {
        ...input,
        id,
        reactions: { like: 0, fire: 0, clap: 0, insightful: 0, support: 0 },
        commentCount: 0,
        saveCount: 0,
        shareCount: 0,
        createdAt: new Date().toISOString(),
      }
      setPosts((prev) => [optimistic, ...prev])
    } finally {
      setSubmitting(false)
    }
  }, [])

  return { posts, loading, submitting, submitPost, activeCircle, setActiveCircle }
}