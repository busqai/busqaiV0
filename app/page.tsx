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
import { BottomNavigation } from "@/components/bottom-navigation"
import { ShoppingList } from "@/components/shopping-list"
import { Profile } from "@/components/profile"

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState("splash")
  const { user, selectedProduct } = useAppStore()
  const [activeTab, setActiveTab] = useState("buscar") // para buyer, "vender" para seller

  useEffect(() => {
    // Splash screen timer
    if (currentScreen === "splash") {
      const timer = setTimeout(() => {
        setCurrentScreen("location")
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [currentScreen])

  const handleLocationGranted = () => {
    setCurrentScreen("auth")
  }

  const handleAuthComplete = () => {
    setCurrentScreen("userType")
  }

  const handleUserTypeSelected = (type: "buyer" | "seller") => {
    if (type === "buyer") {
      setActiveTab("buscar")
      setCurrentScreen("buyerMain")
    } else {
      setActiveTab("vender")
      setCurrentScreen("sellerMain")
    }
  }

  const handleNavigate = (screen: string) => {
    setCurrentScreen(screen)
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)

    // Determinar el tipo de usuario basado en el tab actual o el estado
    const currentUserType =
      activeTab === "buscar" || activeTab === "lista" || (activeTab === "perfil" && currentScreen.includes("buyer"))
        ? "buyer"
        : "seller"

    // Map tab to screen
    const tabToScreen: Record<string, string> = {
      // Buyer tabs
      lista: "shoppingList",
      buscar: "buyerDashboard",
      perfil: currentUserType === "buyer" ? "buyerProfile" : "sellerProfile",
      // Seller tabs
      billetera: "wallet",
      vender: "sellerDashboard",
    }

    const screen =
      tabToScreen[tab] ||
      (tab === "perfil" ? (currentUserType === "buyer" ? "buyerProfile" : "sellerProfile") : "buyerDashboard")

    setCurrentScreen(screen)
  }

  const renderMainContent = () => {
    if (activeTab === "buscar" || activeTab === "lista" || activeTab === "perfil") {
      // Buyer screens
      switch (activeTab) {
        case "buscar":
          return <BuyerDashboard onNavigate={handleNavigate} />
        case "lista":
          return <ShoppingList />
        case "perfil":
          return <Profile userType="buyer" onNavigate={handleNavigate} />
        default:
          return <BuyerDashboard onNavigate={handleNavigate} />
      }
    } else {
      // Seller screens
      switch (activeTab) {
        case "vender":
          return <SellerDashboard onNavigate={handleNavigate} />
        case "billetera":
          return <Wallet onNavigate={handleNavigate} />
        case "perfil":
          return <Profile userType="seller" onNavigate={handleNavigate} />
        default:
          return <SellerDashboard onNavigate={handleNavigate} />
      }
    }
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case "splash":
        return <SplashScreen />
      case "location":
        return <LocationPermission onGranted={handleLocationGranted} />
      case "auth":
        return <AuthScreen onComplete={handleAuthComplete} />
      case "userType":
        return <UserTypeSelection onSelect={handleUserTypeSelected} />
      case "buyerMain":
      case "sellerMain":
        return (
          <div>
            {renderMainContent()}
            <BottomNavigation
              userType={currentScreen === "buyerMain" ? "buyer" : "seller"}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </div>
        )
      case "shoppingList":
        return (
          <div>
            <ShoppingList />
            <BottomNavigation userType="buyer" activeTab={activeTab} onTabChange={handleTabChange} />
          </div>
        )
      case "profile":
        return (
          <div>
            <Profile userType={user?.type || "buyer"} onNavigate={handleNavigate} />
            <BottomNavigation userType={user?.type || "buyer"} activeTab={activeTab} onTabChange={handleTabChange} />
          </div>
        )
      case "buyerDashboard":
        return (
          <div>
            <BuyerDashboard onNavigate={handleNavigate} />
            <BottomNavigation userType="buyer" activeTab="buscar" onTabChange={handleTabChange} />
          </div>
        )
      case "sellerDashboard":
        return (
          <div>
            <SellerDashboard onNavigate={handleNavigate} />
            <BottomNavigation userType="seller" activeTab="vender" onTabChange={handleTabChange} />
          </div>
        )
      case "productDetail":
        return <ProductDetail product={selectedProduct} onNavigate={handleNavigate} />
      case "addProduct":
        return <AddProduct onNavigate={handleNavigate} />
      case "wallet":
        return (
          <div>
            <Wallet onNavigate={handleNavigate} />
            <BottomNavigation userType="seller" activeTab="billetera" onTabChange={handleTabChange} />
          </div>
        )
      case "buyerProfile":
        return (
          <div>
            <Profile userType="buyer" onNavigate={handleNavigate} />
            <BottomNavigation userType="buyer" activeTab="perfil" onTabChange={handleTabChange} />
          </div>
        )
      case "sellerProfile":
        return (
          <div>
            <Profile userType="seller" onNavigate={handleNavigate} />
            <BottomNavigation userType="seller" activeTab="perfil" onTabChange={handleTabChange} />
          </div>
        )
      default:
        return <SplashScreen />
    }
  }

  return <div className="min-h-screen bg-white">{renderScreen()}</div>
}
