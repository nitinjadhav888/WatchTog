'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LogIn, Mail, Github } from 'lucide-react'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const configured = !!supabase

  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : ''

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) { setError('Auth not configured'); return }
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  async function handleOAuthSignIn(provider: 'google' | 'github') {
    if (!supabase) { setError('Auth not configured'); return }
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    })
    if (error) setError(error.message)
  }

  const urlError = searchParams.get('error')

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#06060e] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-gradient-gold">CineMesh</Link>
          <h1 className="text-2xl font-bold mt-6">Welcome back</h1>
          <p className="text-[#9090a8] mt-1">Sign in to your account</p>
        </div>

        {configured ? (
          <>
            <div className="flex flex-col gap-3 mb-6">
              <Button variant="ghost" fullWidth onClick={() => handleOAuthSignIn('google')}>
                <Mail className="w-4 h-4" /> Continue with Google
              </Button>
              <Button variant="ghost" fullWidth onClick={() => handleOAuthSignIn('github')}>
                <Github className="w-4 h-4" /> Continue with GitHub
              </Button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.07]" /></div>
              <div className="relative flex justify-center"><span className="bg-[#06060e] px-3 text-xs text-[#5a5a72]">or</span></div>
            </div>

            <form onSubmit={handleEmailSignIn} className="flex flex-col gap-4">
              <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
              <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
              {(error || urlError) && <p className="text-sm text-red-400">{error ?? urlError}</p>}
              <Button variant="primary" type="submit" loading={loading} fullWidth icon={LogIn}>
                Sign In
              </Button>
            </form>
          </>
        ) : (
          <p className="text-center text-[#9090a8]">Supabase Auth is not configured. Add your environment variables to enable sign-in.</p>
        )}

        <p className="text-center text-sm text-[#5a5a72] mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-[#c9a84c] hover:underline">Sign up</Link>
        </p>
      </div>
    </div>
  )
}
