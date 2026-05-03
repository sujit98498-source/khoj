'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { useState } from 'react'
import { TopNav } from './TopNav'

export function Navbar() {
  const { khojUser, isAuthenticated } = useAuth()
  const { unreadCount } = useNotifications(khojUser?.uid || null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 w-full bg-khoj-bg border-b border-khoj-border z-50">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="font-display font-bold text-xl text-khoj-accent">
          KHOJ
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          {isAuthenticated ? (
            <>
              <TopNav className="max-w-[calc(100vw-22rem)]" />
              <Link href="/profile" className="flex items-center gap-2 hover:text-khoj-accent transition-colors">
                <span className="w-8 h-8 bg-khoj-accent rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {khojUser?.name.charAt(0).toUpperCase()}
                </span>
              </Link>
              {unreadCount > 0 && (
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              )}
            </>
          ) : (
            <>
              <Link href="/auth/login" className="hover:text-khoj-accent transition-colors">
                Login
              </Link>
              <Link href="/auth/signup" className="px-4 py-2 bg-khoj-accent text-white rounded-sm hover:bg-orange-500 transition-colors">
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-khoj-text"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          ☰
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-khoj-border bg-khoj-bg">
          <div className="container mx-auto px-6 py-4 space-y-4">
            {isAuthenticated ? (
              <>
                <TopNav />
                <Link href="/profile" className="block hover:text-khoj-accent">
                  Profile
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="block hover:text-khoj-accent">
                  Login
                </Link>
                <Link href="/auth/signup" className="block hover:text-khoj-accent">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
