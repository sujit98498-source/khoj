// components/ui/LoadingSpinner.tsx

export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className="flex items-center justify-center py-12">
      <div
        className={`${sizes[size]} border-2 border-khoj-border border-t-khoj-accent rounded-full animate-spin`}
      />
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="min-h-screen bg-khoj-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-khoj-border border-t-khoj-accent rounded-full animate-spin" />
        <span className="text-xs uppercase tracking-[0.2em] text-khoj-subtle font-body">
          Loading
        </span>
      </div>
    </div>
  )
}
