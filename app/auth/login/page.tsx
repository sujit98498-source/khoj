import { LoginForm } from '@/components/auth/LoginForm'

export const metadata = { title: 'Sign In — KHOJ' }

export default function LoginPage() {
  return (
    <>
      <div className="mb-7">
        <h1 className="text-2xl font-display font-bold text-khoj-text">Welcome back</h1>
        <p className="text-sm text-khoj-subtle font-body mt-1">
          Sign in to continue your journey
        </p>
      </div>
      <LoginForm />
    </>
  )
}
