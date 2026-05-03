// components/tracks/LeaderboardPanel.tsx
// Track leaderboard — Top 10 learners ordered by XP, with podium for top 3.

'use client'

import { useEffect, useState } from 'react'
import {
  subscribeLeaderboard,
  subscribeRecentSubmissions,
  LeaderboardEntry,
  TrackSubmission,
  timeAgoTrack,
} from '@/services/trackService'

interface Props {
  trackId: string
  currentUserId?: string | null
}

const MEDAL = ['🥇', '🥈', '🥉']
const RANK_COLOR = ['text-yellow-400', 'text-zinc-400', 'text-orange-700']

export function LeaderboardPanel({ trackId, currentUserId }: Props) {
  const [entries,     setEntries]     = useState<LeaderboardEntry[]>([])
  const [submissions, setSubmissions] = useState<TrackSubmission[]>([])

  useEffect(() => {
    if (!trackId) return
    const u1 = subscribeLeaderboard(trackId, setEntries)
    const u2 = subscribeRecentSubmissions(trackId, setSubmissions)
    return () => { u1(); u2() }
  }, [trackId])

  const top3 = entries.slice(0, 3)
  const rest  = entries.slice(3)

  return (
    <div className="space-y-4">
      {/* ── Leaderboard card ── */}
      <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e2e]">
          <h3 className="font-bold text-sm text-white">Leaderboard</h3>
          <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">All Time</span>
        </div>

        {entries.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-3xl mb-2">🏆</p>
            <p className="text-zinc-500 text-xs">No learners yet.</p>
            <p className="text-zinc-600 text-xs mt-1">Enroll and be #1!</p>
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            {top3.length >= 1 && (
              <div className="px-4 py-4">
                <div className="flex items-end justify-center gap-3">
                  {/* 2nd place */}
                  {top3[1] && (
                    <div className="flex flex-col items-center gap-1.5 pb-2">
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-zinc-800 border-2 border-zinc-600">
                        {top3[1].userAvatar
                          ? <img src={top3[1].userAvatar} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-300">{top3[1].userName.charAt(0)}</div>
                        }
                        <span className="absolute -bottom-0.5 right-0 text-[10px]">🥈</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-semibold truncate w-16 text-center">{top3[1].userName.split(' ')[0]}</p>
                      <p className="text-xs text-zinc-400 font-bold">{top3[1].xp} XP</p>
                    </div>
                  )}
                  {/* 1st place — elevated */}
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="text-yellow-400 text-base">👑</div>
                    <div className="relative w-12 h-12 rounded-full overflow-hidden bg-zinc-800 border-2 border-yellow-400">
                      {top3[0].userAvatar
                        ? <img src={top3[0].userAvatar} alt="" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-sm font-bold text-yellow-400">{top3[0].userName.charAt(0)}</div>
                      }
                    </div>
                    <p className="text-[10px] text-yellow-400 font-bold truncate w-16 text-center">{top3[0].userName.split(' ')[0]}</p>
                    <p className="text-xs text-yellow-400 font-bold">{top3[0].xp} XP</p>
                  </div>
                  {/* 3rd place */}
                  {top3[2] && (
                    <div className="flex flex-col items-center gap-1.5 pb-2">
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-zinc-800 border-2 border-orange-800">
                        {top3[2].userAvatar
                          ? <img src={top3[2].userAvatar} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-orange-700">{top3[2].userName.charAt(0)}</div>
                        }
                        <span className="absolute -bottom-0.5 right-0 text-[10px]">🥉</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-semibold truncate w-16 text-center">{top3[2].userName.split(' ')[0]}</p>
                      <p className="text-xs text-zinc-500 font-bold">{top3[2].xp} XP</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ranks 4-10 */}
            {rest.length > 0 && (
              <div className="border-t border-[#1e1e2e] divide-y divide-[#1e1e2e]">
                {rest.map((e, i) => {
                  const isMe = e.userId === currentUserId
                  return (
                    <div
                      key={e.userId}
                      className={`flex items-center gap-2.5 px-4 py-2 ${isMe ? 'bg-[#ff5a00]/8' : ''}`}
                    >
                      <span className="text-xs font-bold w-4 text-zinc-600 text-center">{i + 4}</span>
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
                        {e.userAvatar
                          ? <img src={e.userAvatar} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-400">{e.userName.charAt(0)}</div>
                        }
                      </div>
                      <span className={`text-xs flex-1 truncate font-medium ${isMe ? 'text-[#ff5a00] font-bold' : 'text-zinc-300'}`}>
                        {e.userName}{isMe ? ' (You)' : ''}
                      </span>
                      <span className="text-xs text-[#ff5a00] font-bold whitespace-nowrap">{e.xp} XP</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Current user if not in top 10 */}
            {currentUserId && !entries.find((e) => e.userId === currentUserId) && (
              <div className="border-t border-[#1e1e2e] px-4 py-2 bg-[#ff5a00]/5">
                <p className="text-xs text-zinc-500 text-center">You're not ranked yet — complete lessons to earn XP!</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Recent Activity ── */}
      {submissions.length > 0 && (
        <div className="bg-[#111118] border border-[#1e1e2e] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e2e]">
            <h3 className="font-bold text-sm text-white">Recent Activity</h3>
          </div>
          <div className="divide-y divide-[#1e1e2e]">
            {submissions.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-start gap-2.5 px-4 py-3">
                <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0 mt-0.5">
                  {s.userPhoto
                    ? <img src={s.userPhoto} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-400">{s.userName.charAt(0)}</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-300">
                    <span className="font-semibold text-white">{s.userName}</span>
                    {' '}submitted a challenge
                  </p>
                  <p className="text-[10px] text-zinc-600 mt-0.5">{timeAgoTrack(s.submittedAt)}</p>
                </div>
                <span className="text-[10px] text-[#ff5a00] font-bold flex-shrink-0 mt-1">+XP</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
