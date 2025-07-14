// Initialize app metrics for tracking
const initMetrics = () => {
  const metrics = {
    visits: 0,
    chats: 0,
    sales: 0,
    timestamp: new Date().toISOString(),
  }

  if (typeof window !== "undefined") {
    localStorage.setItem("appMetrics", JSON.stringify(metrics))
    console.log("App metrics initialized:", metrics)
  }
}

// Track visit
const trackVisit = () => {
  if (typeof window !== "undefined") {
    const metrics = JSON.parse(localStorage.getItem("appMetrics") || '{"visits": 0, "chats": 0, "sales": 0}')
    metrics.visits += 1
    localStorage.setItem("appMetrics", JSON.stringify(metrics))
  }
}

// Track chat initiation
const trackChat = () => {
  if (typeof window !== "undefined") {
    const metrics = JSON.parse(localStorage.getItem("appMetrics") || '{"visits": 0, "chats": 0, "sales": 0}')
    metrics.chats += 1
    localStorage.setItem("appMetrics", JSON.stringify(metrics))
  }
}

// Track sale completion
const trackSale = () => {
  if (typeof window !== "undefined") {
    const metrics = JSON.parse(localStorage.getItem("appMetrics") || '{"visits": 0, "chats": 0, "sales": 0}')
    metrics.sales += 1
    localStorage.setItem("appMetrics", JSON.stringify(metrics))
  }
}

// Export functions for use in components
if (typeof window !== "undefined") {
  window.trackVisit = trackVisit
  window.trackChat = trackChat
  window.trackSale = trackSale
}

initMetrics()
