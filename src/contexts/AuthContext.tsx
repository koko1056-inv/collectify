import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { trackLogin, trackLogout } from '@/utils/analytics'

// ログインボーナス処理のユーティリティ関数（連続ログイン対応）
const awardLoginBonus = async (userId: string) => {
  try {
    console.log("[AuthContext] Starting login bonus process for user:", userId);
    
    // Use server-side function for login bonus
    const { data: claimed, error } = await supabase
      .rpc('claim_login_bonus', { _user_id: userId });
    
    if (error) {
      console.error("[AuthContext] Login bonus error:", error);
      return;
    }
    
    if (!claimed) {
      console.log("[AuthContext] User already received login bonus today");
      return;
    }
    
    console.log("[AuthContext] Login bonus awarded successfully");
    // Note: streak bonus logic is now handled server-side
          description: `7日連続ログインボーナス！`
        });
    }
      
    console.log("[AuthContext] Login bonus process completed:", { totalBonus, newStreak, streakBonus });
  } catch (error) {
    console.error("[AuthContext] ログインボーナス付与エラー:", error);
  }
};

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({ user: null, session: null, loading: true })

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        if (initialSession) {
          setSession(initialSession)
          setUser(initialSession.user)
          trackLogin(initialSession.user.id)
        }
      } catch (error) {
        console.error('Session initialization error:', error)
        await supabase.auth.signOut()
      } finally {
        setLoading(false)
      }
    }

    initializeSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (currentSession) {
        setSession(currentSession)
        setUser(currentSession.user)
        if (_event === 'SIGNED_IN') {
          trackLogin(currentSession.user.id)
          // ログインボーナスを付与（非同期で実行）
          setTimeout(() => {
            awardLoginBonus(currentSession.user.id)
          }, 0)
        } else if (_event === 'SIGNED_OUT') {
          trackLogout(currentSession.user.id)
        }
      } else {
        setSession(null)
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

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