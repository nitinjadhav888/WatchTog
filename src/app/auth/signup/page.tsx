'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserPlus, Mail, Github } from 'lucide-react'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const configured = !!supabase

  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : ''

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase) { setError('Auth not configured'); return }
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/auth/signin?error=Check your email to confirm your account')
      router.refresh()
    }
  }

  async function handleOAuthSignUp(provider: 'google' | 'github') {
    if (!supabase) { setError('Auth not configured'); return }
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    })
    if (error) setError(error.message)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#06060e] px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-gradient-gold">CineMesh</Link>
          <h1 className="text-2xl font-bold mt-6">Create account</h1>
          <p className="text-[#9090a8] mt-1">Join the watch party</p>
        </div>

        {configured ? (
          <>
            <div className="flex flex-col gap-3 mb-6">
              <Button variant="ghost" fullWidth onClick={() => handleOAuthSignUp('google')}>
                <Mail className="w-4 h-4" /> Sign up with Google
              </Button>
              <Button variant="ghost" fullWidth onClick={() => handleOAuthSignUp('github')}>
                <Github className="w-4 h-4" /> Sign up with GitHub
              </Button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.07]" /></div>
              <div className="relative flex justify-center"><span className="bg-[#06060e] px-3 text-xs text-[#5a5a72]">or</span></div>
            </div>

            <form onSubmit={handleEmailSignUp} className="flex flex-col gap-4">
              <Input label="Display Name" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" />
              <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
              <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button variant="primary" type="submit" loading={loading} fullWidth icon={UserPlus}>
                Create Account
              </Button>
            </form>
          </>
        ) : (
          <p className="text-center text-[#9090a8]">Supabase Auth is not configured. Add your environment variables to enable sign-up.</p>
        )}

        <p className="text-center text-sm text-[#5a5a72] mt-6">
          Already have an account?{' '}
          <Link href="/auth/signin" className="text-[#c9a84c] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
