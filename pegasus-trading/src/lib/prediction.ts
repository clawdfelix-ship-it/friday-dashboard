import { Sale, Product, InventoryItem, SalesPrediction } from '../types'
import * as ss from 'simple-statistics'

interface DailySales {
  date: string
  quantity: number
  revenue: number
}

interface PredictionInput {
  product: Product
  inventory: InventoryItem
  salesHistory: Sale[]
  daysToPredict: number
}

// Simple Moving Average prediction
export function predictSalesSMA(
  sales: Sale[], 
  windowSize: number = 7,
  daysToPredict: number = 30
): number {
  if (sales.length === 0) return 0
  
  // Get daily sales
  const dailySales = getDailySales(sales)
  const quantities = dailySales.map(d => d.quantity)
  
  if (quantities.length === 0) return 0
  
  // Calculate SMA
  const sma = ss.mean(quantities.slice(-windowSize))
  
  // Predict future (with slight growth factor)
  const growthFactor = 1.05 // 5% growth assumption
  return Math.round(sma * daysToPredict * growthFactor)
}

// Weighted Moving Average (recent sales weighted more)
export function predictSalesWMA(
  sales: Sale[],
  weights: number[] = [1, 2, 3, 4, 5, 6, 7],
  daysToPredict: number = 30
): number {
  if (sales.length === 0) return 0
  
  const dailySales = getDailySales(sales).slice(-weights.length)
  const quantities = dailySales.map(d => d.quantity)
  
  if (quantities.length === 0) return 0
  
  // Pad if not enough data
  while (quantities.length < weights.length) {
    quantities.unshift(quantities[0] || 0)
  }
  
  // Calculate WMA
  let weightedSum = 0
  let weightSum = 0
  for (let i = 0; i < weights.length; i++) {
    weightedSum += quantities[i] * weights[i]
    weightSum += weights[i]
  }
  
  const wma = weightedSum / weightSum
  const growthFactor = 1.05
  
  return Math.round(wma * daysToPredict * growthFactor)
}

// Exponential Smoothing for trend detection
export function predictSalesExponentialSmoothing(
  sales: Sale[],
  alpha: number = 0.3,
  daysToPredict: number = 30
): { prediction: number; trend: number } {
  if (sales.length === 0) return { prediction: 0, trend: 0 }
  
  const dailySales = getDailySales(sales)
  const quantities = dailySales.map(d => d.quantity)
  
  if (quantities.length === 0) return { prediction: 0, trend: 0 }
  
  // Calculate smoothed series
  const smoothed: number[] = [quantities[0]]
  for (let i = 1; i < quantities.length; i++) {
    smoothed.push(alpha * quantities[i] + (1 - alpha) * smoothed[i - 1])
  }
  
  // Calculate trend
  const trend = ss.linearRegression(
    smoothed.map((v, i) => [i, v])
  ).m
  
  const lastSmoothed = smoothed[smoothed.length - 1]
  const prediction = Math.round((lastSmoothed + trend * daysToPredict) * daysToPredict)
  
  return { prediction: Math.max(0, prediction), trend }
}

// Main prediction function for all products
export function generatePredictions(
  products: Product[],
  inventory: InventoryItem[],
  sales: Sale[],
  daysToPredict: number = 30
): SalesPrediction[] {
  const predictions: SalesPrediction[] = []
  
  products.forEach(product => {
    const invItem = inventory.find(i => i.productId === product.id)
    const productSales = sales.filter(s => s.productId === product.id)
    
    if (!invItem) return
    
    // Use multiple methods and average
    const smaPrediction = predictSalesSMA(productSales, 7, daysToPredict)
    const { prediction: expPrediction } = predictSalesExponentialSmoothing(productSales, 0.3, daysToPredict)
    
    // Weighted average of methods
    const finalPrediction = Math.round(smaPrediction * 0.4 + expPrediction * 0.6)
    
    // Calculate days until stockout
    const avgDailySales = finalPrediction / daysToPredict
    const daysUntilStockout = avgDailySales > 0 
      ? Math.round(invItem.quantity / avgDailySales)
      : 999
    
    // Recommended reorder quantity (lead time buffer + safety stock)
    const leadTimeDays = 7
    const safetyStock = Math.round(avgDailySales * 3)
    const recommendedReorder = Math.max(0, Math.round(avgDailySales * (leadTimeDays + 14) + safetyStock - invItem.quantity))
    
    // Confidence based on data quality
    const confidence = Math.min(100, productSales.length * 5 + 50)
    
    predictions.push({
      productId: product.id,
      productName: product.name,
      currentStock: invItem.quantity,
      predictedDemand: finalPrediction,
      daysUntilStockout,
      recommendedReorder: Math.max(0, recommendedReorder),
      confidence
    })
  })
  
  return predictions.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout)
}

// Helper function
function getDailySales(sales: Sale[]): DailySales[] {
  const dailyMap = new Map<string, { quantity: number; revenue: number }>()
  
  sales.forEach(sale => {
    const dateKey = sale.saleDate.toISOString().split('T')[0]
    const current = dailyMap.get(dateKey) || { quantity: 0, revenue: 0 }
    dailyMap.set(dateKey, {
      quantity: current.quantity + sale.quantity,
      revenue: current.revenue + sale.totalAmount
    })
  })
  
  return Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

// Detect seasonality
export function detectSeasonality(sales: Sale[]): {
  hasSeasonality: boolean
  peakDays: string[]
  lowDays: string[]
} {
  if (sales.length < 30) {
    return { hasSeasonality: false, peakDays: [], lowDays: [] }
  }
  
  const daySales = new Map<string, number>()
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  
  sales.forEach(sale => {
    const dayName = dayNames[sale.saleDate.getDay()]
    const current = daySales.get(dayName) || 0
    daySales.set(dayName, current + sale.quantity)
  })
  
  const values = Array.from(daySales.values())
  const avg = ss.mean(values)
  const stdDev = ss.standardDeviation(values)
  
  const peakDays: string[] = []
  const lowDays: string[] = []
  
  daySales.forEach((value, day) => {
    if (value > avg + stdDev) peakDays.push(day)
    if (value < avg - stdDev) lowDays.push(day)
  })
  
  return {
    hasSeasonality: peakDays.length > 0 || lowDays.length > 0,
    peakDays,
    lowDays
  }
}
