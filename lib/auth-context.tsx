"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { supabase, type Profile } from "./supabase"
import { useAppStore } from "./store"

// Interfaz para el contexto de autenticación
interface AuthContextType {
  user: SupabaseUser | null
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
  const setUser = useAppStore(state => state.setUser)
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ?? null;
        setSupabaseUser(currentUser);
        setLoading(false);

        if (currentUser) {
          // Fetch profile
          const { data: profileData, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();
          
          if (profileData && !error) {
            setProfile(profileData);
            
            // Update app store with user data
            setUser({
              id: currentUser.id,
              phone: profileData.phone || '',
              name: profileData.full_name || '',
              type: (profileData.user_type || 'buyer') as 'buyer' | 'seller',
              email: currentUser.email || '',
              balance: 0,
              avatar: profileData.avatar_url || '',
              latitude: profileData.latitude || 0,
              longitude: profileData.longitude || 0,
              address: profileData.address || ''
            });
          }
        } else {
          // Clear user from app store on sign out
          setUser(null as any);
          setProfile(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setSupabaseUser(currentUser);
        setLoading(false);

        if (currentUser) {
          try {
            // Fetch profile
            const { data: profileData, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', currentUser.id)
              .single();
            
            if (profileData && !error) {
              setProfile(profileData);
              
              // Update app store with user data
              setUser({
                id: currentUser.id,
                phone: profileData.phone || '',
                name: profileData.full_name || '',
                type: (profileData.user_type || 'buyer') as 'buyer' | 'seller',
                email: currentUser.email || '',
                balance: 0,
                avatar: profileData.avatar_url || '',
                latitude: profileData.latitude || 0,
                longitude: profileData.longitude || 0,
                address: profileData.address || ''
              });
            }
          } catch (error) {
            console.error('Error updating profile on auth change:', error);
          }
        } else {
          // Clear user from app store on sign out
          setUser(null as any);
          setProfile(null);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [setUser]);

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
    console.log("[verifyOtp] Iniciando verificación OTP con:", { 
      phone, 
      token: token ? '***' : 'undefined', 
      userData 
    });

    // 1. Verificar el código OTP
    const { data, error } = await supabase.auth.verifyOtp({
      phone: `+591${phone}`,
      token,
      type: "sms",
    });

    console.log("[verifyOtp] Respuesta de verifyOtp:", { data, error });

    if (error) {
      console.error("[verifyOtp] Error en verifyOtp:", error);
      return { error };
    }

    if (!data.user) {
      const err = new Error("No se pudo obtener el usuario después de la verificación");
      console.error("[verifyOtp]", err);
      return { error: err };
    }

    console.log("[verifyOtp] Usuario verificado, creando/actualizando perfil con:", {
      userId: data.user.id,
      phone,
      fullName: userData.full_name,
      userType: userData.user_type
    });

    // 2. Crear o actualizar el perfil con el tipo de usuario
    const { data: rpcData, error: profileError } = await supabase.rpc("verify_phone_and_create_profile", {
      p_phone: phone,
      p_full_name: userData.full_name,
      p_user_type: userData.user_type,
    }).select();

    console.log("[verifyOtp] Respuesta de verify_phone_and_create_profile:", { rpcData, profileError });

    if (profileError) {
      console.error("[verifyOtp] Error creando/actualizando perfil:", profileError);
      return { error: profileError };
    }

    // 3. Verificar que el perfil se creó/actualizó correctamente
    const { data: profileData, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    console.log("[verifyOtp] Perfil después de la creación/actualización:", { profileData, fetchError });

    if (fetchError || !profileData) {
      console.error("[verifyOtp] Error obteniendo perfil después de la creación:", fetchError);
      return { error: fetchError || new Error("No se pudo obtener el perfil después de la creación") };
    }

    // 4. Actualizar el estado global con el usuario de la aplicación
    setUser({
      id: data.user.id,
      phone: phone,
      name: userData.full_name,
      type: userData.user_type,
      email: data.user.email || '',
      balance: 0,  // Valor por defecto
      avatar: '',   // Valor por defecto
      latitude: 0,  // Valor por defecto
      longitude: 0, // Valor por defecto
      address: ''   // Valor por defecto
    });
    
    // Actualizar el estado local con el usuario de Supabase
    setSupabaseUser(data.user);

    // 5. Actualizar el estado de autenticación
    setProfile(profileData);
    setLoading(false);

    console.log("[verifyOtp] Proceso completado exitosamente");
    return { error: null };
  }

  const signOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setSupabaseUser(null)
      setProfile(null)
      setUser(null as any) // Clear user from app store - using any to bypass type checking
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!supabaseUser) return { error: new Error("Not authenticated") }

    const { data, error } = await supabase.from("profiles").update(updates).eq("id", supabaseUser.id).select().single()

    if (!error && data) {
      setProfile(data)
    }

    return { error }
  }

  const value = {
    user: supabaseUser,
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
