// components/community/CreatePostBox.tsx
// Post composer — type selector, circle picker, content textarea, submit

'use client'

import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { PostType, CircleId, CIRCLES, KhojUser } from '@/lib/types'
import { CreatePostInput, uploadCommunityImage } from '@/services/communityService'
import { Button } from '@/components/ui/Button'
import clsx from 'clsx'
import toast from 'react-hot-toast'

const POST_TYPES: { type: PostType; icon: string; desc: string }[] = [
  { type: 'Achievement', icon: '▲', desc: 'Celebrate a win' },
  { type: 'Discussion',  icon: '◉', desc: 'Start a conversation' },
  { type: 'Team-Up',     icon: '⬡', desc: 'Find collaborators' },
  { type: 'Showcase',    icon: '⬢', desc: 'Show your work' },
]

const TYPE_COLORS: Record<PostType, string> = {
  Story: 'border-khoj-gold/60 bg-khoj-gold/10 text-khoj-gold',
  Achievement: 'border-khoj-teal/60 bg-khoj-teal/10 text-khoj-teal',
  Discussion: 'border-blue-400/60 bg-blue-400/10 text-blue-400',
  'Team-Up': 'border-khoj-accent/60 bg-khoj-accent/10 text-khoj-accent',
  Showcase: 'border-purple-400/60 bg-purple-400/10 text-purple-400',
}

interface CreatePostBoxProps {
  user: KhojUser
  onSubmit: (input: CreatePostInput) => Promise<void>
  loading?: boolean
}

export function CreatePostBox({ user, onSubmit, loading = false }: CreatePostBoxProps) {
  const [expanded, setExpanded] = useState(false)
  const [postType, setPostType] = useState<PostType>('Discussion')
  const [circle, setCircle] = useState<CircleId>('coding')
  const [content, setContent] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [selectedFile])

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (!file) return

    const supportedTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!supportedTypes.includes(file.type)) {
      const message = 'Only PNG, JPG, JPEG, and WEBP images are supported.'
      setUploadError(message)
      toast.error(message)
      e.target.value = ''
      return
    }

    setUploadError(null)
    setSelectedFile(file)
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    let imageUrl: string | undefined

    try {
      setUploadError(null)

      if (selectedFile) {
        setUploadingImage(true)
        imageUrl = await uploadCommunityImage(selectedFile, user.uid)
      }

      await onSubmit({
        authorId: user.uid,
        authorName: user.name,
        authorXP: user.xp,
        authorSkills: user.skills.slice(0, 3),
        type: postType,
        circle,
        content: content.trim(),
        imageUrl,
      })

      setContent('')
      setSelectedFile(null)
      setExpanded(false)
      setPostType('Discussion')
      setCircle('coding')
      toast.success(selectedFile ? 'Post published with image' : 'Post published')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to publish post.'
      console.error('Community post submission error:', error)
      setUploadError(message)
      toast.error(message)
    } finally {
      setUploadingImage(false)
    }
  }

  const AVATAR_COLORS = ['#FF4D00', '#FFB800', '#00D4AA', '#6366f1', '#ec4899']
  const color = AVATAR_COLORS[user.name.charCodeAt(0) % AVATAR_COLORS.length]

  return (
    <div className="bg-khoj-card border border-khoj-border rounded-sm mb-6 transition-all duration-200">
      {!expanded ? (
        <div
          className="flex items-center gap-4 px-5 py-4 cursor-pointer group"
          onClick={() => setExpanded(true)}
        >
          <div
            className="w-9 h-9 rounded-sm flex-shrink-0 flex items-center justify-center font-display font-bold text-sm"
            style={{ backgroundColor: `${color}20`, border: `1px solid ${color}40`, color }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 px-4 py-2.5 bg-khoj-bg border border-khoj-border rounded-sm text-sm text-khoj-subtle font-body group-hover:border-khoj-accent/40 group-hover:text-khoj-text transition-colors cursor-text">
            What do you want to share today?
          </div>
          <div className="flex items-center gap-2 text-khoj-subtle">
            <span className="text-lg">📸</span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-khoj-subtle font-body mb-2">Post Type</p>
            <div className="flex gap-2 flex-wrap">
              {POST_TYPES.map(({ type, icon, desc }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setPostType(type)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-body font-semibold transition-all duration-150',
                    postType === type
                      ? TYPE_COLORS[type]
                      : 'border-khoj-border text-khoj-subtle hover:border-khoj-muted hover:text-khoj-text'
                  )}
                >
                  <span>{icon}</span>
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-khoj-subtle font-body mb-2">Circle</p>
            <div className="flex gap-2 flex-wrap">
              {CIRCLES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCircle(c.id)}
                  className={clsx(
                    'flex items-center gap-1 px-2.5 py-1 rounded-sm border text-xs font-body transition-all duration-150',
                    circle === c.id
                      ? `border-current bg-current/10 ${c.color}`
                      : 'border-khoj-border text-khoj-subtle hover:border-khoj-muted hover:text-khoj-text'
                  )}
                >
                  <span className="text-xs">{c.icon}</span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={handleFileSelect}
            />

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                postType === 'Team-Up'
                  ? 'Describe your project, skills you need, and commitment level...'
                  : postType === 'Achievement'
                  ? 'Share your win — what happened, how you got there, what it means...'
                  : postType === 'Discussion'
                  ? 'Start a conversation — a question, take, or open problem...'
                  : 'Share your story, showcase, or experience with the community...'
              }
              rows={5}
              maxLength={1000}
              className="w-full px-4 py-3 bg-khoj-bg border border-khoj-border rounded-sm text-sm text-khoj-text placeholder-khoj-subtle font-body focus:outline-none focus:border-khoj-accent resize-none transition-colors leading-relaxed"
            />
            <div className="flex justify-between mt-1">
              <p className="text-[10px] text-khoj-muted font-body">
                {POST_TYPES.find((p) => p.type === postType)?.desc}
              </p>
              <p className="text-[10px] text-khoj-muted font-mono">{content.length}/1000</p>
            </div>
          </div>

          {previewUrl && (
            <div className="border border-khoj-border rounded-sm overflow-hidden bg-khoj-bg">
              <img src={previewUrl} alt="Selected preview" className="w-full max-h-64 object-cover" />
              <div className="flex items-center justify-between px-3 py-2 border-t border-khoj-border">
                <p className="text-[11px] text-khoj-subtle font-body truncate">{selectedFile?.name}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null)
                    setUploadError(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="text-[11px] text-khoj-accent hover:underline font-body"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {uploadError && (
            <div className="px-3 py-2 rounded-sm border border-red-500/30 bg-red-500/10 text-xs text-red-300 font-body">
              {uploadError}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-1 border-t border-khoj-border">
            <button
              type="button"
              onClick={openFilePicker}
              className="flex items-center gap-2 text-khoj-subtle hover:text-khoj-text text-xs font-body transition"
            >
              <span>📸</span> {selectedFile ? 'Change image' : 'Add image'}
            </button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setExpanded(false)
                  setContent('')
                  setSelectedFile(null)
                  setUploadError(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                loading={loading || uploadingImage}
                disabled={!content.trim() || uploadingImage}
              >
                Post to Community
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}