import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Backend API URL
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Helper to get auth headers
export const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  }
  return {
    'Content-Type': 'application/json'
  }
}

// API helper functions
export const api = {
  async get(endpoint: string, params?: Record<string, string>) {
    const headers = await getAuthHeaders()
    const url = new URL(`${API_URL}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.append(key, value)
      })
    }
    const res = await fetch(url.toString(), { headers })
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`)
    return res.json()
  },
  
  async post(endpoint: string, data: any) {
    const headers = await getAuthHeaders()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      if (!res.ok) {
        const error = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(error.detail || res.statusText)
      }
      return res.json()
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        throw new Error('Request timed out - backend may be unresponsive')
      }
      throw error
    }
  },
  
  async put(endpoint: string, data: any) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(error.detail || res.statusText)
    }
    return res.json()
  },
  
  async delete(endpoint: string) {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers
    })
    if (!res.ok) throw new Error(`API Error: ${res.statusText}`)
    return res.json()
  }
}
