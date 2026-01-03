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
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    // 現在のユーザーポイント情報を取得
    const { data: userPoints, error: pointsError } = await supabase
      .from("user_points")
      .select("last_login_bonus_date, total_points, login_streak, last_login_date")
      .eq("user_id", userId)
      .single();
      
    console.log("[AuthContext] Current user points:", { userPoints, pointsError });
      
    // 既に今日ログインボーナスを受け取っている場合は何もしない
    if (userPoints?.last_login_bonus_date === today) {
      console.log("[AuthContext] User already received login bonus today");
      return;
    }
    
    // 基本ログインボーナス（3pt）
    const baseBonus = 3;
    
    // 連続ログイン計算
    let newStreak = 1;
    const lastLoginDate = userPoints?.last_login_date;
    
    if (lastLoginDate === yesterday) {
      // 昨日もログインしていたら連続日数を増やす
      newStreak = (userPoints?.login_streak || 0) + 1;
    } else if (lastLoginDate === today) {
      // 今日既にログイン済み
      newStreak = userPoints?.login_streak || 1;
    }
    // それ以外は連続日数リセット（1日目から）
    
    // 7日連続ボーナス
    let streakBonus = 0;
    if (newStreak > 0 && newStreak % 7 === 0) {
      streakBonus = 50;
    }
    
    const totalBonus = baseBonus + streakBonus;
    let currentPoints = userPoints?.total_points || 0;
    
    // ユーザーポイントレコードがない場合は作成
    if (!userPoints || pointsError?.code === 'PGRST116') {
      console.log("[AuthContext] Creating new user points record");
      await supabase
        .from("user_points")
        .insert({ 
          user_id: userId,
          total_points: totalBonus,
          last_login_bonus_date: today,
          login_streak: 1,
          last_login_date: today
        });
      currentPoints = totalBonus;
    } else {
      // ポイント残高とログイン情報を更新
      currentPoints += totalBonus;
      console.log("[AuthContext] Updating existing points to:", currentPoints, "streak:", newStreak);
      await supabase
        .from("user_points")
        .update({ 
          total_points: currentPoints,
          last_login_bonus_date: today,
          login_streak: newStreak,
          last_login_date: today
        })
        .eq("user_id", userId);
    }
    
    // ポイント履歴に記録（基本ボーナス）
    await supabase
      .from("point_transactions")
      .insert({
        user_id: userId,
        points: baseBonus,
        transaction_type: "login_bonus",
        description: `ログインボーナス（${newStreak}日目）`
      });
    
    // 7日連続ボーナスがあれば別途記録
    if (streakBonus > 0) {
      await supabase
        .from("point_transactions")
        .insert({
          user_id: userId,
          points: streakBonus,
          transaction_type: "streak_bonus",
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