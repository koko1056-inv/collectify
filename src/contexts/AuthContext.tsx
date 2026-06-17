import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Capacitor } from '@capacitor/core'
import { Purchases } from '@revenuecat/purchases-capacitor'

import { trackLogin, trackLogout } from '@/utils/analytics'

// Identify the user in RevenueCat so purchases attach to the correct app user.
const rcLogin = (userId: string) => {
  if (!Capacitor.isNativePlatform()) return
  Purchases.logIn({ appUserID: userId }).catch((err) => {
    console.error('[RevenueCat] logIn failed', err)
  })
}

const rcLogout = () => {
  if (!Capacitor.isNativePlatform()) return
  Purchases.logOut().catch((err) => {
    console.error('[RevenueCat] logOut failed', err)
  })
}

// ログインボーナス処理のユーティリティ関数（連続ログイン対応）
const awardLoginBonus = async (userId: string) => {
  try {
    // Use server-side function for login bonus
    const { data: claimed, error } = await supabase
      .rpc('claim_login_bonus', { _user_id: userId });

    if (error) {
      console.error("[AuthContext] Login bonus error:", error);
      return;
    }
    // claimed が false の場合は本日付与済み（正常系なので何も出力しない）
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
  // ログインボーナスは同セッション中1回だけ
  const bonusAwardedForRef = useRef<string | null>(null)

  useEffect(() => {
    const initializeSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        if (initialSession) {
          setSession(initialSession)
          setUser(initialSession.user)
          trackLogin(initialSession.user.id)
          rcLogin(initialSession.user.id)
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
          rcLogin(currentSession.user.id)
          // ログインボーナスは同セッションで1度だけ
          if (bonusAwardedForRef.current !== currentSession.user.id) {
            bonusAwardedForRef.current = currentSession.user.id
            setTimeout(() => {
              awardLoginBonus(currentSession.user.id)
            }, 0)
          }
        } else if (_event === 'SIGNED_OUT') {
          trackLogout(currentSession.user.id)
          rcLogout()
          bonusAwardedForRef.current = null
        }
      } else {
        setSession(null)
        setUser(null)
        rcLogout()
        bonusAwardedForRef.current = null
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