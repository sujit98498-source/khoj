// app/studio/tracks/page.tsx
// KHOJ Studio — Tracks management for creators

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import {
  subscribeCreatorTracks,
  TrackDoc,
  levelColor,
  levelBg,
  timeAgoTrack,
} from '@/services/trackService'

export default function StudioTracksPage() {
  const { khojUser } = useAuth()
  const [tracks, setTracks] = useState<TrackDoc[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!khojUser?.uid) return
    const unsub = subscribeCreatorTracks(khojUser.uid, (data) => {
      setTracks(data)
      setLoading(false)
    })
    return unsub
  }, [khojUser?.uid])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-khoj-accent font-semibold">
            Studio
          </p>
          <h1 className="text-2xl font-display font-bold text-khoj-text mt-1">My Tracks</h1>
          <p className="text-sm text-khoj-subtle mt-1">
            Manage your learning tracks and monitor enrollments
          </p>
        </div>
        <Link
          href="/tracks/create"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-khoj-accent hover:bg-orange-500 text-white text-sm font-semibold transition-colors"
        >
          <span>+</span>
          <span>New Track</span>
        </Link>
      </div>

      {/* Stats strip */}
      {tracks.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-khoj-card border border-khoj-border rounded-xl p-4 text-center">
            <p className="text-2xl font-display font-bold text-khoj-text">{tracks.length}</p>
            <p className="text-xs text-khoj-subtle mt-1">Total Tracks</p>
          </div>
          <div className="bg-khoj-card border border-khoj-border rounded-xl p-4 text-center">
            <p className="text-2xl font-display font-bold text-khoj-text">
              {tracks.filter((t) => t.status === 'published').length}
            </p>
            <p className="text-xs text-khoj-subtle mt-1">Published</p>
          </div>
          <div className="bg-khoj-card border border-khoj-border rounded-xl p-4 text-center">
            <p className="text-2xl font-display font-bold text-orange-400">
              {tracks.reduce((s, t) => s + (t.enrolledCount ?? 0), 0)}
            </p>
            <p className="text-xs text-khoj-subtle mt-1">Total Enrolled</p>
          </div>
          <div className="bg-khoj-card border border-khoj-border rounded-xl p-4 text-center">
            <p className="text-2xl font-display font-bold text-green-400">
              {tracks.reduce((s, t) => s + (t.completedCount ?? 0), 0)}
            </p>
            <p className="text-xs text-khoj-subtle mt-1">Completions</p>
          </div>
        </div>
      )}

      {/* Track list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-khoj-card border border-khoj-border rounded-xl p-5 animate-pulse"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-zinc-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-zinc-800 rounded w-1/3" />
                  <div className="h-3 bg-zinc-800 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : tracks.length === 0 ? (
        <div className="bg-khoj-card border border-khoj-border rounded-2xl p-12 text-center space-y-4">
          <p className="text-5xl">📚</p>
          <h2 className="text-xl font-display font-bold text-khoj-text">No tracks yet</h2>
          <p className="text-sm text-khoj-subtle max-w-sm mx-auto">
            Create a track to package your knowledge into a structured learning experience.
          </p>
          <Link
            href="/tracks/create"
            className="inline-flex items-center gap-2 mt-2 px-6 py-2.5 rounded-lg bg-khoj-accent hover:bg-orange-500 text-white text-sm font-semibold transition-colors"
          >
            + Create First Track
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {tracks.map((track) => (
            <div
              key={track.id}
              className="bg-khoj-card border border-khoj-border rounded-xl p-4 hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-center gap-4">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-zinc-900 flex-shrink-0">
                  {track.thumbnailUrl ? (
                    <img
                      src={track.thumbnailUrl}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">📚</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-khoj-text font-semibold text-sm truncate">{track.title}</h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${levelBg(track.level)} ${levelColor(track.level)}`}
                    >
                      {track.level}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        track.status === 'published'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-zinc-700 text-zinc-400'
                      }`}
                    >
                      {track.status}
                    </span>
                    {track.visibility === 'private' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 font-semibold">
                        Private
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-khoj-subtle">
                    <span>{track.lessonCount ?? 0} lessons</span>
                    <span>{track.challengeCount ?? 0} challenges</span>
                    <span className="text-orange-400 font-semibold">
                      {track.enrolledCount ?? 0} enrolled
                    </span>
                    <span>{track.completedCount ?? 0} completed</span>
                    <span>Updated {timeAgoTrack(track.updatedAt)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/tracks/${track.id}`}
                    className="px-3 py-1.5 rounded-lg text-xs text-khoj-subtle border border-khoj-border hover:border-zinc-500 hover:text-khoj-text transition-colors"
                  >
                    View
                  </Link>
                  <Link
                    href={`/tracks/${track.id}/manage`}
                    className="px-3 py-1.5 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-khoj-text transition-colors font-semibold"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
