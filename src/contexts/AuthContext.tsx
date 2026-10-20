import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
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
        } else if (_event === 'SIGNED_OUT') {
          trackLogout(currentSession.user.id)
          rcLogout()
        }
      } else {
        setSession(null)
        setUser(null)
        rcLogout()
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