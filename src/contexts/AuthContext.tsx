import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { trackLogin, trackLogout } from '@/utils/analytics'

// ログインボーナス処理のユーティリティ関数
const awardLoginBonus = async (userId: string) => {
  try {
    console.log("[AuthContext] Starting login bonus process for user:", userId);
    const today = new Date().toISOString().split('T')[0];
    
    // 今日既にログインボーナスを受け取っているかチェック
    const { data: userPoints, error: pointsError } = await supabase
      .from("user_points")
      .select("last_login_bonus_date, total_points")
      .eq("user_id", userId)
      .single();
      
    console.log("[AuthContext] Current user points:", { userPoints, pointsError });
      
    // 既に今日ログインボーナスを受け取っている場合は何もしない
    if (userPoints?.last_login_bonus_date === today) {
      console.log("[AuthContext] User already received login bonus today");
      return;
    }
    
    // ユーザーポイントレコードがない場合は作成
    let currentPoints = userPoints?.total_points || 0;
    if (!userPoints || pointsError?.code === 'PGRST116') {
      console.log("[AuthContext] Creating new user points record");
      const { data: newRecord, error: insertError } = await supabase
        .from("user_points")
        .insert({ 
          user_id: userId,
          total_points: 1,
          last_login_bonus_date: today
        });
      console.log("[AuthContext] New record insert result:", { newRecord, insertError });
      currentPoints = 1;
    } else {
      // ポイント残高とログインボーナス日時を更新
      currentPoints += 1;
      console.log("[AuthContext] Updating existing points to:", currentPoints);
      const { error: updateError } = await supabase
        .from("user_points")
        .update({ 
          total_points: currentPoints,
          last_login_bonus_date: today
        })
        .eq("user_id", userId);
      console.log("[AuthContext] Points update result:", updateError);
    }
    
    // ポイント履歴に記録
    console.log("[AuthContext] Creating point transaction record");
    const { error: transactionError } = await supabase
      .from("point_transactions")
      .insert({
        user_id: userId,
        points: 1,
        transaction_type: "login_bonus",
        description: "ログインボーナス"
      });
    console.log("[AuthContext] Transaction insert result:", transactionError);
      
    console.log("[AuthContext] Login bonus process completed successfully");
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