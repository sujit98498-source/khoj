export interface SafeFirebaseAuthError {
  code: string
  message: string
}

export function getSafeFirebaseAuthError(error: unknown): SafeFirebaseAuthError {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as { code?: unknown; message?: unknown }

    return {
      code: typeof maybeError.code === 'string' ? maybeError.code : 'unknown',
      message: typeof maybeError.message === 'string' ? maybeError.message : 'Unknown Firebase Auth error',
    }
  }

  return {
    code: 'unknown',
    message: error instanceof Error ? error.message : 'Unknown Firebase Auth error',
  }
}

export function logFirebaseAuthError(action: string, error: unknown): SafeFirebaseAuthError {
  const details = getSafeFirebaseAuthError(error)

  console.error(`${action} Firebase Auth error`, {
    code: details.code,
    message: details.message,
  })

  return details
}

export function getLoginErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
      return 'Invalid email or password.'
    case 'auth/user-not-found':
      return 'No account found with this email.'
    case 'auth/wrong-password':
      return 'Wrong password.'
    case 'auth/invalid-api-key':
      return 'Firebase API key is invalid. Check Vercel environment variables.'
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase. Add the Vercel domain in Firebase Authorized Domains.'
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in Firebase Authentication.'
    case 'auth/network-request-failed':
      return 'Network error. Try again.'
    case 'firebase/not-configured':
      return 'Firebase is not configured. Check Vercel environment variables.'
    default:
      return 'Login failed. Please try again.'
  }
}

export function getGoogleSignInErrorMessage(code: string): string {
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Google sign-in popup was closed.'
    case 'auth/popup-blocked':
      return 'Popup was blocked by browser.'
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase. Add the Vercel domain in Firebase Authorized Domains.'
    case 'auth/invalid-api-key':
      return 'Firebase API key is invalid. Check Vercel environment variables.'
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in Firebase Authentication.'
    case 'auth/network-request-failed':
      return 'Network error. Try again.'
    case 'firebase/not-configured':
      return 'Firebase is not configured. Check Vercel environment variables.'
    default:
      return 'Google sign-in failed. Please try again.'
  }
}

export function getSignupErrorMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.'
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in Firebase Authentication.'
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase. Add the Vercel domain in Firebase Authorized Domains.'
    case 'auth/invalid-api-key':
      return 'Firebase API key is invalid. Check Vercel environment variables.'
    case 'auth/network-request-failed':
      return 'Network error. Try again.'
    case 'firebase/not-configured':
      return 'Firebase is not configured. Check Vercel environment variables.'
    default:
      return 'Signup failed. Please try again.'
  }
}

export function getPasswordResetErrorMessage(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
      return 'No account found with this email.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase. Add the Vercel domain in Firebase Authorized Domains.'
    case 'auth/invalid-api-key':
      return 'Firebase API key is invalid. Check Vercel environment variables.'
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in Firebase Authentication.'
    case 'auth/network-request-failed':
      return 'Network error. Try again.'
    case 'firebase/not-configured':
      return 'Firebase is not configured. Check Vercel environment variables.'
    default:
      return 'Failed to send reset email. Please try again.'
  }
}
