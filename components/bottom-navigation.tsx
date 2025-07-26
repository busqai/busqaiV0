"use client"

import { Search, List, User, Wallet, Store, Package } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BottomNavigationProps {
  userType: "buyer" | "seller"
  activeTab: string
  onTabChange: (tab: string) => void
}

export function BottomNavigation({ userType, activeTab, onTabChange }: BottomNavigationProps) {
  const buyerTabs = [
    { id: "lista", label: "Lista", icon: List },
    { id: "buscar", label: "Buscar", icon: Search },
    { id: "perfil", label: "Perfil", icon: User },
  ]

  const sellerTabs = [
    { id: "vender", label: "Vender", icon: Store },
    { id: "inventario", label: "Inventario", icon: Package },
    { id: "billetera", label: "Billetera", icon: Wallet },
    { id: "perfil", label: "Perfil", icon: User },
  ]

  const tabs = userType === "buyer" ? buyerTabs : sellerTabs

  const handleTabClick = (tabId: string) => {
    if (tabId !== activeTab) {
      onTabChange(tabId)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 safe-area-pb z-50">
      <div className="flex justify-around items-center">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <Button
              key={tab.id}
              variant="ghost"
              onClick={() => handleTabClick(tab.id)}
              className={`flex flex-col items-center gap-1 p-2 h-auto transition-all duration-200 ease-in-out ${
                isActive 
                  ? "text-orange-600 scale-105" 
                  : "text-gray-600 hover:text-gray-800 hover:scale-102"
              }`}
            >
              <div 
                className={`p-1 rounded-lg transition-all duration-200 ease-in-out ${
                  isActive 
                    ? "bg-gradient-to-r from-[#FF7300] to-[#FFE100] shadow-sm" 
                    : "hover:bg-gray-100"
                }`}
              >
                <Icon className={`w-5 h-5 transition-colors duration-200 ${
                  isActive ? "text-white" : ""
                }`} />
              </div>
              <span className="text-xs font-medium transition-colors duration-200">
                {tab.label}
              </span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}
