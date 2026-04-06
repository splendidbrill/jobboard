"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the code from the URL (Supabase PKCE flow)
        const params = new URLSearchParams(window.location.search)
        const code = params.get('code')
        const error = params.get('error')
        const errorDescription = params.get('error_description')

        if (error) {
          console.error('OAuth error:', error, errorDescription)
          toast.error(errorDescription || 'Authentication failed')
          router.push('/')
          return
        }

        if (code) {
          // Exchange the code for a session — this is REQUIRED for PKCE OAuth
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError)
            toast.error('Authentication failed: ' + exchangeError.message)
            router.push('/')
            return
          }

          if (data.session) {
            // Session is now stored — AuthContext will detect it via onAuthStateChange
            router.push('/')
            return
          }
        }

        // Fallback: check if session already exists (implicit flow)
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData.session) {
          router.push('/')
        } else {
          console.error('No session and no code found in callback URL')
          toast.error('Authentication failed. Please try again.')
          router.push('/')
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        toast.error('Authentication failed')
        router.push('/')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Completing sign in...</p>
      </div>
    </div>
  )
}
