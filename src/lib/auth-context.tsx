'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase, api } from '@/lib/supabase'
import { Session, User } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  email: string
  name: string
  phone?: string
  role: 'JOB_SEEKER' | 'COMPANY' | 'SUPER_ADMIN'
  profile_picture?: string
  headline?: string
  country?: string
  city?: string
}

interface AuthContextType {
  user: UserProfile | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, name: string, role: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signInWithGoogle: () => Promise<{ error: any }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  requireRoleSelection: boolean
  requireEmailConfirmation: boolean
  completeOnboarding: (role: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [requireRoleSelection, setRequireRoleSelection] = useState(false)
  const [requireEmailConfirmation, setRequireEmailConfirmation] = useState(false)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchProfile()
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        if (session) {
          await fetchProfile()
        } else {
          setUser(null)
          setRequireRoleSelection(false)
          setRequireEmailConfirmation(false)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async () => {
    try {
      const profile = await api.get('/users/me')
      setUser(profile)
      setRequireRoleSelection(false)
      setRequireEmailConfirmation(false)
    } catch (error) {
      // User doesn't exist in backend yet, check session
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // Check if email is confirmed
        if (!session.user.email_confirmed_at) {
          setRequireEmailConfirmation(true)
        } else {
          // Trigger onboarding to select role instead of auto-creating
          setRequireRoleSelection(true)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const completeOnboarding = async (role: string) => {
    try {
      // Use the session already in state — getSession() can be empty
      // before Supabase hydrates from localStorage on the onboarding page
      let activeSession = session

      // If state session is empty, try one getSession() call as fallback
      if (!activeSession) {
        const { data } = await supabase.auth.getSession()
        activeSession = data.session
      }

      if (!activeSession?.user || !activeSession.access_token) {
        return { error: new Error('No active session. Please sign out and try again.') }
      }

      const metadata = activeSession.user.user_metadata || {}
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

      // Make the request directly with the token we KNOW we have
      const res = await fetch(`${API_URL}/users/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeSession.access_token}`
        },
        body: JSON.stringify({
          email: activeSession.user.email,
          name: metadata.full_name || metadata.name || activeSession.user.email?.split('@')[0],
          role
        })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || res.statusText)
      }

      const newUser = await res.json()
      setUser(newUser)
      setRequireRoleSelection(false)
      setRequireEmailConfirmation(false)
      return { error: null }
    } catch (error: any) {
      console.error('Failed to complete onboarding:', error)
      return { error }
    }
  }

  const refreshProfile = async () => {
    if (session) {
      await fetchProfile()
    }
  }

  const signUp = async (email: string, password: string, name: string, role: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: role
          }
        }
      })

      if (error) {
        // If user already exists, try to sign them in instead
        if (error.message.toLowerCase().includes('already') || error.message.toLowerCase().includes('exists') || error.message.toLowerCase().includes('registered')) {
          return await signIn(email, password)
        }
        return { error }
      }

      // Create user in backend
      if (data.user) {
        try {
          await api.post('/users/', {
            email,
            name,
            role
          })
        } catch (backendError: any) {
          console.error('Backend user creation failed:', backendError)
          // Don't return error - user can still login
        }
      }

      return { error: null }
    } catch (error: any) {
      return { error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      return { error }
    } catch (error: any) {
      return { error }
    }
  }

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      return { error }
    } catch (error: any) {
      return { error }
    }
  }

  const signOut = async () => {
    // Immediately clear local auth state — don't wait on the network call
    setUser(null)
    setSession(null)

    // Wipe all Supabase session keys from localStorage so the session is
    // gone even if the network signOut call is slow or fails
    if (typeof window !== 'undefined') {
      Object.keys(localStorage)
        .filter(k => k.startsWith('sb-'))
        .forEach(k => localStorage.removeItem(k))
      
      // Fire and forget — we don't need to await this
      supabase.auth.signOut().catch(() => {})

      window.location.href = '/'
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      refreshProfile,
      requireRoleSelection,
      requireEmailConfirmation,
      completeOnboarding
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
