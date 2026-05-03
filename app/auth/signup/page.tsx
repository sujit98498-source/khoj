import { SignupForm } from '@/components/auth/SignupForm'

export const metadata = { title: 'Create Account — KHOJ' }

export default function SignupPage() {
  return (
    <>
      <div className="mb-7">
        <h1 className="text-2xl font-display font-bold text-khoj-text">Join KHOJ</h1>
        <p className="text-sm text-khoj-subtle font-body mt-1">
          Build your performance portfolio
        </p>
      </div>
      <SignupForm />
    </>
  )
}
