import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { Capacitor } from '@capacitor/core'
import { Purchases } from '@revenuecat/purchases-capacitor'

import { trackLogin, trackLogout, trackSignup } from '@/utils/analytics'
import { LINE_AUTH_PROVIDER } from '@/config/lineAuth'

// LINEログイン（Supabaseのカスタムプロバイダ）で入ってきたユーザーを line_user_links に紐付ける。
// LINEログインチャネルとMessaging APIチャネルが同じプロバイダー配下なら、identityのprovider_idは
// LIFFで取れるLINE userIdと同じ値になる（LiffAutoLinkの紐付けと同じ行を指す）。
// line_user_links は別マイグレーションで作成するため、型生成前は any で呼ぶ。
const linkLineIdentity = (user: User) => {
  const identity = user.identities?.find((i) => i.provider === LINE_AUTH_PROVIDER)
  const lineUserId = (identity?.identity_data as Record<string, unknown> | undefined)?.sub as string | undefined
    ?? identity?.id
  if (!lineUserId) return
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- line_user_links は型生成前（別マイグレーションで作成）
  ;(supabase as any)
    .from('line_user_links')
    .upsert({ line_user_id: lineUserId, user_id: user.id }, { onConflict: 'line_user_id', ignoreDuplicates: true })
    .then(({ error }: { error: { message: string } | null }) => {
      if (error) console.warn('[AuthContext] LINE identity link skipped:', error.message)
    })
}

// username@example.com方式のサインアップは handleUserSignup (src/utils/auth.ts) が
// trackSignup・招待コードredeemを直接呼ぶ。OAuth（LINE/Apple）はsignInWithOAuthの戻り先が
// このSIGNED_INイベントしかないため、ここで同じ2つを行う（provider!=='email'かつ初回ログインのときだけ）。
const handleOauthFirstSignIn = (user: User) => {
  const provider = user.app_metadata?.provider
  if (!provider || provider === 'email') return
  // created_at と last_sign_in_at が（ほぼ）同じ＝そのユーザーの初回ログイン。
  const createdAt = new Date(user.created_at).getTime()
  const lastSignInAt = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : NaN
  if (!Number.isFinite(createdAt) || !Number.isFinite(lastSignInAt) || Math.abs(lastSignInAt - createdAt) > 15_000) return

  trackSignup(user.id, provider)

  const pendingInvite = sessionStorage.getItem('pending_invite_code')
  if (pendingInvite) {
    ;(async () => {
      try {
        const { error } = await supabase.rpc('redeem_invite_code', { _code: pendingInvite.toUpperCase() })
        if (error) console.error('Invite redemption failed:', error.message)
      } catch (err) {
        console.error('Invite redemption failed:', err)
      } finally {
        sessionStorage.removeItem('pending_invite_code')
      }
    })()
  }
}

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
          linkLineIdentity(currentSession.user)
          handleOauthFirstSignIn(currentSession.user)
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