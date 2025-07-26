"use client"

import { useEffect, useState } from "react"
import { SplashScreen } from "@/components/splash-screen"
import { LocationPermission } from "@/components/location-permission"
import { AuthScreen } from "@/components/auth-screen"
import { UserTypeSelection } from "@/components/user-type-selection"
import { BuyerDashboard } from "@/components/buyer-dashboard"
import { SellerDashboard } from "@/components/seller-dashboard"
import { ProductDetail } from "@/components/product-detail"
import { AddProduct } from "@/components/add-product"
import { Wallet } from "@/components/wallet"
import { useAppStore } from "@/lib/store"
import { supabase } from "@/lib/supabase"
import { BottomNavigation } from "@/components/bottom-navigation"
import { ShoppingList } from "@/components/shopping-list"
import { Profile } from "@/components/profile"
import { Inventory } from "@/components/inventory"
import { NegotiationChat } from "@/components/negotiation-chat"

// Definir un tipo para las pestañas
type TabType = "buscar" | "lista" | "perfil" | "vender" | "inventario" | "billetera"

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState("splash")
  const { user, selectedProduct: originalSelectedProduct, setUser } = useAppStore()
  const [userType, setUserType] = useState<"buyer" | "seller" | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>("buscar")
  const [pendingUserType, setPendingUserType] = useState<"buyer" | "seller" | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Ensure selectedProduct has a string seller
  const selectedProduct = originalSelectedProduct ? {
    ...originalSelectedProduct,
    seller: typeof originalSelectedProduct.seller === 'object' && originalSelectedProduct.seller !== null
      ? (originalSelectedProduct.seller as any).full_name || 'Vendedor'
      : String(originalSelectedProduct.seller || 'Vendedor')
  } : null

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Error getting session:', sessionError)
          throw sessionError
        }

        if (session?.user) {
          try {
            // User is logged in, fetch profile
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()
            
            if (profileError) {
              console.error('Error fetching profile:', profileError)
              // If we can't get the profile, sign out to clear any invalid session
              await supabase.auth.signOut()
              throw profileError
            }
            
            if (profile) {
              setUser({
                id: session.user.id,
                email: session.user.email || '',
                user_metadata: session.user.user_metadata || {},
                ...profile
              })
              setUserType(profile.user_type as 'buyer' | 'seller')
              setActiveTab(profile.user_type === 'buyer' ? 'buscar' : 'vender')
              setCurrentScreen('main')
              return
            }
          } catch (error) {
            console.error('Profile fetch error:', error)
            // If there's an error with the profile, redirect to auth
            setCurrentScreen('auth')
            return
          }
        }
        
        // No valid session, show splash then location
        const timer = setTimeout(() => {
          setCurrentScreen('location')
        }, 2000)
        
        return () => clearTimeout(timer)
      } catch (error) {
        console.error('Auth check failed:', error)
        // If there's an error, redirect to auth screen
        setCurrentScreen('auth')
      } finally {
        setIsLoading(false)
        setIsInitialized(true)
      }
    }

    if (currentScreen === 'splash') {
      checkAuth()
    }
  }, [currentScreen, setUser])

  const handleLocationGranted = () => {
    setCurrentScreen("userType")
  }

  const handleAuthComplete = async () => {
    if (!pendingUserType) return
    
    try {
      // Get the current session after successful auth
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        // Fetch the latest profile to ensure we have the user type
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          
        if (profile) {
          setUserType(profile.user_type as 'buyer' | 'seller')
          setActiveTab(profile.user_type === 'buyer' ? 'buscar' : 'vender')
          setCurrentScreen('main')
          return
        }
      }
      
      // Fallback to pending type if we can't fetch profile
      setUserType(pendingUserType)
      setActiveTab(pendingUserType === 'buyer' ? 'buscar' : 'vender')
      setCurrentScreen('main')
    } catch (error) {
      console.error('Error completing auth:', error)
      // Still proceed to main screen even if there's an error
      setUserType(pendingUserType)
      setActiveTab(pendingUserType === 'buyer' ? 'buscar' : 'vender')
      setCurrentScreen('main')
    }
  }

  const handleUserTypeSelected = (type: "buyer" | "seller") => {
    setPendingUserType(type)
    setCurrentScreen("auth")
  }

  const handleNavigate = (screen: string) => {
    // Verificar si la pantalla es una de las pestañas principales
    const mainTabs: TabType[] = ["vender", "inventario", "billetera", "perfil", "buscar", "lista"]
    if (mainTabs.includes(screen as TabType)) {
      setActiveTab(screen as TabType)
      setCurrentScreen("main")
    } else {
      // Para otras pantallas, usamos currentScreen
      setCurrentScreen(screen)
    }
  }

  const handleTabChange = (tab: string) => {
    // Verificar que el tab sea un TabType válido
    const validTabs: TabType[] = ["buscar", "lista", "perfil", "vender", "inventario", "billetera"]
    if (validTabs.includes(tab as TabType)) {
      setActiveTab(tab as TabType)
    } else {
      console.error(`Invalid tab: ${tab}`)
    }
  }

  const renderMainContent = () => {
    if (!userType) return null

    if (userType === "buyer") {
      switch (activeTab) {
        case "buscar":
          return (
            <div className="animate-in fade-in duration-300">
              <BuyerDashboard onNavigate={handleNavigate} />
            </div>
          )
        case "lista":
          return (
            <div className="animate-in fade-in duration-300">
              <ShoppingList />
            </div>
          )
        case "perfil":
          return (
            <div className="animate-in fade-in duration-300">
              <Profile userType="buyer" onNavigate={handleNavigate} />
            </div>
          )
        default:
          return (
            <div className="animate-in fade-in duration-300">
              <BuyerDashboard onNavigate={handleNavigate} />
            </div>
          )
      }
    } else {
      switch (activeTab) {
        case "vender":
          return (
            <div className="animate-in fade-in duration-300">
              <SellerDashboard onNavigate={handleNavigate} />
            </div>
          )
        case "inventario":
          return (
            <div className="animate-in fade-in duration-300">
              <Inventory onNavigate={handleNavigate} />
            </div>
          )
        case "billetera":
          return (
            <div className="animate-in fade-in duration-300">
              <Wallet onNavigate={handleNavigate} />
            </div>
          )
        case "perfil":
          return (
            <div className="animate-in fade-in duration-300">
              <Profile userType="seller" onNavigate={handleNavigate} />
            </div>
          )
        default:
          return (
            <div className="animate-in fade-in duration-300">
              <SellerDashboard onNavigate={handleNavigate} />
            </div>
          )
      }
    }
  }

  const renderScreen = () => {
    if (currentScreen.startsWith("negotiationChat:")) {
      const chatId = currentScreen.split(":")[1]
      if (!selectedProduct) return <SplashScreen />
      return (
        <NegotiationChat
          product={selectedProduct}
          onBack={() => setCurrentScreen("main")}
          onNavigate={handleNavigate}
          role={userType === "buyer" ? "buyer" : "seller"}
          chatId={chatId}
        />
      )
    }

    switch (currentScreen) {
      case "splash":
        return <SplashScreen />
      case "location":
        return <LocationPermission onGranted={handleLocationGranted} />
      case "auth":
        return pendingUserType ? (
          <AuthScreen 
            onComplete={handleAuthComplete} 
            userType={pendingUserType} 
          />
        ) : (
          <UserTypeSelection onSelect={handleUserTypeSelected} />
        )
      case "userType":
        return <UserTypeSelection onSelect={handleUserTypeSelected} />
      case "main":
        return (
          <div>
            {renderMainContent()}
            <BottomNavigation
              userType={userType!}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </div>
        )
      case "productDetail":
        return <ProductDetail product={selectedProduct} onNavigate={handleNavigate} />
      case "addProduct":
        return <AddProduct onNavigate={handleNavigate} />
      default:
        return <SplashScreen />
    }
  }

  return <div className="min-h-screen bg-white">{renderScreen()}</div>
}
