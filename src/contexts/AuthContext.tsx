import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({ user: null, session: null, loading: true })

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    // Initialize session
    const initializeSession = async () => {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Error fetching session:', sessionError)
          throw sessionError
        }

        if (initialSession) {
          setSession(initialSession)
          setUser(initialSession.user)
        }
      } catch (error) {
        console.error('Session initialization error:', error)
        toast({
          variant: "destructive",
          title: "セッションエラー",
          description: "セッションの初期化に失敗しました。再度ログインしてください。",
        })
        // Clear any existing session data
        await supabase.auth.signOut()
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }

    initializeSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (currentSession) {
        setSession(currentSession)
        setUser(currentSession.user)
      } else {
        setSession(null)
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [toast, navigate])

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}