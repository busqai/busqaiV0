"use client"

import { useCallback } from "react"
import { logEvent } from "../supabase"

export function useAnalytics() {
  const trackEvent = useCallback(async (eventName: string, eventData: Record<string, any> = {}) => {
    try {
      await logEvent(eventName, eventData)
    } catch (error) {
      console.error("Error tracking event:", error)
    }
  }, [])

  const trackAppOpen = useCallback(() => {
    trackEvent("app_opened")
  }, [trackEvent])

  const trackSearch = useCallback(
    (query: string, resultsCount: number) => {
      trackEvent("search_performed", { query, results_count: resultsCount })
    },
    [trackEvent],
  )

  const trackProductView = useCallback(
    (productId: string, productTitle: string) => {
      trackEvent("product_viewed", { product_id: productId, product_title: productTitle })
    },
    [trackEvent],
  )

  const trackChatStart = useCallback(
    (productId: string, sellerId: string) => {
      trackEvent("chat_started", { product_id: productId, seller_id: sellerId })
    },
    [trackEvent],
  )

  const trackOfferMade = useCallback(
    (chatId: string, offerAmount: number) => {
      trackEvent("offer_made", { chat_id: chatId, offer_amount: offerAmount })
    },
    [trackEvent],
  )

  const trackOfferAccepted = useCallback(
    (chatId: string, finalPrice: number) => {
      trackEvent("offer_accepted", { chat_id: chatId, final_price: finalPrice })
    },
    [trackEvent],
  )

  const trackWalletRecharge = useCallback(
    (amount: number) => {
      trackEvent("wallet_recharged", { amount })
    },
    [trackEvent],
  )

  const trackProductAdded = useCallback(
    (productId: string, category: string, price: number) => {
      trackEvent("product_added", { product_id: productId, category, price })
    },
    [trackEvent],
  )

  return {
    trackEvent,
    trackAppOpen,
    trackSearch,
    trackProductView,
    trackChatStart,
    trackOfferMade,
    trackOfferAccepted,
    trackWalletRecharge,
    trackProductAdded,
  }
}
