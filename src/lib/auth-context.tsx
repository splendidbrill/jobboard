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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

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
    } catch (error) {
      // User doesn't exist in backend yet, create from session
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // Try to create user in backend
        try {
          const metadata = session.user.user_metadata || {}
          const role = metadata.role || 'JOB_SEEKER'
          await api.post('/users', {
            email: session.user.email,
            name: metadata.full_name || metadata.name || session.user.email?.split('@')[0],
            role
          })
          // Fetch profile again
          const profile = await api.get('/users/me')
          setUser(profile)
        } catch (createError) {
          console.error('Failed to create user:', createError)
        }
      }
    } finally {
      setLoading(false)
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

      if (error) return { error }

      // Create user in backend
      if (data.user) {
        try {
          await api.post('/users', {
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
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
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
      refreshProfile
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
