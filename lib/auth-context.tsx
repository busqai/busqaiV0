"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase, type Profile } from "./supabase"

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signInWithPhone: (phone: string) => Promise<{ error: any }>
  verifyOtp: (
    phone: string,
    token: string,
    userData: { full_name: string; user_type: "buyer" | "seller" },
  ) => Promise<{ error: any }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

      if (error) {
        console.error("Error fetching profile:", error)
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const signInWithPhone = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone: `+591${phone}`,
      options: {
        channel: "sms",
      },
    })
    return { error }
  }

  const verifyOtp = async (
    phone: string,
    token: string,
    userData: { full_name: string; user_type: "buyer" | "seller" },
  ) => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: `+591${phone}`,
      token,
      type: "sms",
    })

    if (!error && data.user) {
      // Create profile after successful verification
      const { error: profileError } = await supabase.rpc("verify_phone_and_create_profile", {
        p_phone: phone,
        p_full_name: userData.full_name,
        p_user_type: userData.user_type,
      })

      if (profileError) {
        console.error("Error creating profile:", profileError)
        return { error: profileError }
      }
    }

    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error("Not authenticated") }

    const { data, error } = await supabase.from("profiles").update(updates).eq("id", user.id).select().single()

    if (!error && data) {
      setProfile(data)
    }

    return { error }
  }

  const value = {
    user,
    profile,
    loading,
    signInWithPhone,
    verifyOtp,
    signOut,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
