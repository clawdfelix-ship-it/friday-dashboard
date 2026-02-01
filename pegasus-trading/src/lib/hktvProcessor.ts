import * as XLSX from 'xlsx'
import { 
  HKTVOrder, 
  HKTVInventory, 
  DailySalesSummary, 
  ProductSalesSummary,
  SalesPrediction,
  DashboardStats 
} from '../types/pegasus'
import { detectSeasonality } from './prediction'

// HKTV Order Excel Parsing
interface RawOrderRow {
  [key: string]: any
}

export async function parseHKTVOrders(filePath: string): Promise<HKTVOrder[]> {
  const workbook = XLSX.readFile(filePath)
  
  // Try different sheet names
  const sheetNames = ['completed_order_report', 'Order List', 'Orders']
  let ws = workbook[sheetNames[0]]
  
  for (const name of sheetNames) {
    if (workbook[name]) {
      ws = workbook[name]
      break
    }
  }
  
  // Find header row (contains "Order No" or "Order Date")
  let headerRow = 1
  for (let i = 1; i < 30; i++) {
    const row = Array.from(ws[i]).map((cell: any) => cell.value)
    if (row.some((v: any) => v && String(v).includes('Order'))) {
      headerRow = i
      break
    }
  }
  
  const headers = Array.from(ws[headerRow]).map((cell: any) => cell.value)
  const headerMap: Record<string, number> = {}
  
  // Map header names to indices
  headers.forEach((h, i) => {
    if (h) {
      const key = String(h).toLowerCase().trim()
      headerMap[key] = i
    }
  })
  
  // Find data rows
  const orders: HKTVOrder[] = []
  
  for (let rowNum = headerRow + 1; rowNum <= ws.max_row; rowNum++) {
    const row = Array.from(ws[rowNum]).map((cell: any) => cell.value)
    
    // Skip subtotal/summary rows
    const firstCell = row[0]
    if (firstCell === 'Subtotal:' || firstCell === 'Order dated during') {
      continue
    }
    
    // Check if it's a valid order (has order number)
    const orderNo = row[headerMap['order no'] || headerMap['order'] || 1]
    if (!orderNo || String(orderNo).startsWith('H9') === false) {
      continue
    }
    
    try {
      const order: HKTVOrder = {
        orderDate: parseDate(row[headerMap['order date'] || 0]),
        orderNo: String(orderNo),
        combinedOrderNo: String(row[headerMap['combined order no'] || headerMap['combined order'] || 2] || ''),
        productId: String(row[headerMap['product id'] || headerMap['product'] || 4] || ''),
        productName: String(row[headerMap['product name'] || headerMap['product name (en)'] || 5] || ''),
        brand: String(row[headerMap['brand'] || 6] || ''),
        category: String(row[headerMap['category'] || headerMap['product category'] || 7] || ''),
        productCode: String(row[headerMap['product code'] || 8] || ''),
        deliveryDate: parseDate(row[headerMap['delivery date'] || headerMap['delivery'] || 9]),
        quantity: Number(row[headerMap['quantity'] || headerMap['qty'] || 10]) || 0,
        unitPrice: Number(row[headerMap['unit price'] || headerMap['price'] || 11]) || 0,
        discount: Math.abs(Number(row[headerMap['discount'] || headerMap['amount'] || 12]) || 0),
        netAmount: Math.abs(Number(row[headerMap['net amount'] || 13]) || 0),
        commission: Math.abs(Number(row[headerMap['commission'] || headerMap['fee'] || 14]) || 0),
        payment: Math.abs(Number(row[headerMap['payment'] || 15]) || 0),
        orderStatus: String(row[headerMap['order status'] || 16] || 'Normal'),
        deliveryFee: Math.abs(Number(row[headerMap['delivery fee'] || 17]) || 0),
        platformFee: Math.abs(Number(row[headerMap['platform fee'] || 18] || 0) || 0),
        netRevenue: Math.abs(Number(row[headerMap['net revenue'] || headerMap['net'] || 19]) || 0),
        deliveryMethod: String(row[headerMap['delivery method'] || 20] || ''),
        isSampleOrder: String(row[headerMap['sample order'] || 21] || 'N')
      }
      
      orders.push(order)
    } catch (e) {
      // Skip problematic rows
    }
  }
  
  return orders
}

// HKTV Inventory Excel Parsing
export async function parseHKTVInventory(filePath: string): Promise<HKTVInventory[]> {
  const workbook = XLSX.readFile(filePath)
  const ws = workbook[workbook.SheetNames[0]]
  
  const headers = Array.from(ws[1]).map((cell: any) => cell.value)
  const headerMap: Record<string, number> = {}
  
  headers.forEach((h, i) => {
    if (h) {
      const key = String(h).toLowerCase().trim()
      headerMap[key] = i
    }
  })
  
  const inventory: HKTVInventory[] = []
  
  for (let rowNum = 2; rowNum <= ws.max_row; rowNum++) {
    const row = Array.from(ws[rowNum]).map((cell: any) => cell.value)
    
    const item: HKTVInventory = {
      storeId: String(row[headerMap['store id'] || 0] || ''),
      productId: String(row[headerMap['product id'] || 1] || ''),
      skuId: String(row[headerMap['sku id'] || 2] || ''),
      brandNameEn: String(row[headerMap['brand name (en)'] || 3] || ''),
      brandNameCh: String(row[headerMap['brand name (ch)'] || 4] || ''),
      skuNameCh: String(row[headerMap['sku name (ch)'] || 5] || ''),
      skuNameEn: String(row[headerMap['sku name (en)'] || 6] || ''),
      status: String(row[headerMap['hktvmall status'] || 7] || ''),
      deliveryMethod: String(row[headerMap['product ready method'] || 8] || ''),
      visibility: String(row[headerMap['hktvmall visible/invisible'] || 9] || ''),
      sellStatus: String(row[headerMap['hktvmall stock status'] || 10] || ''),
      merchantQty: Number(row[headerMap['merchant inventory qty'] || 11]) || 0,
      plQty: Number(row[headerMap['3pl inventory qty'] || 12]) || 0,
      consignmentQty: Number(row[headerMap['consignment inventory qty'] || 13]) || 0,
      inProcessQty: Number(row[headerMap['merchant inventory (in process)'] || 14]) || 0,
      updateTime: parseDate(row[headerMap['update time'] || 15]),
    }
    
    if (item.productId) {
      inventory.push(item)
    }
  }
  
  return inventory
}

// Helper function to parse dates
function parseDate(value: any): Date {
  if (!value) return new Date()
  if (value instanceof Date) return value
  if (typeof value === 'string') {
    // Try common formats
    const parsed = new Date(value)
    if (!isNaN(parsed.getTime())) return parsed
  }
  return new Date()
}

// Aggregate sales by date
export function aggregateSalesByDate(orders: HKTVOrder[]): DailySalesSummary[] {
  const dailyMap = new Map<string, DailySalesSummary>()
  
  orders.forEach(order => {
    const dateKey = order.orderDate.toISOString().split('T')[0]
    
    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        date: dateKey,
        totalOrders: 0,
        totalQuantity: 0,
        totalRevenue: 0,
        totalNetRevenue: 0
      })
    }
    
    const day = dailyMap.get(dateKey)!
    day.totalOrders++
    day.totalQuantity += order.quantity
    day.totalRevenue += order.netAmount
    day.totalNetRevenue += order.netRevenue
  })
  
  return Array.from(dailyMap.values())
    .sort((a, b) => a.date.localeCompare(b.date))
}

// Aggregate sales by product
export function aggregateSalesByProduct(orders: HKTVOrder[]): ProductSalesSummary[] {
  const productMap = new Map<string, ProductSalesSummary>()
  
  orders.forEach(order => {
    const key = order.productId
    
    if (!productMap.has(key)) {
      productMap.set(key, {
        productId: order.productId,
        productName: order.productName,
        brand: order.brand,
        category: order.category,
        totalQuantity: 0,
        totalRevenue: 0,
        avgUnitPrice: 0,
        orderCount: 0
      })
    }
    
    const prod = productMap.get(key)!
    prod.totalQuantity += order.quantity
    prod.totalRevenue += order.netAmount
    prod.orderCount++
  })
  
  // Calculate averages
  productMap.forEach(prod => {
    prod.avgUnitPrice = prod.totalRevenue / prod.totalQuantity || 0
  })
  
  return Array.from(productMap.values())
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
}

// Calculate dashboard stats
export function calculateDashboardStats(
  orders: HKTVOrder[],
  inventory: HKTVInventory[],
  days: number = 30
): DashboardStats {
  const now = new Date()
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  
  // Filter recent orders
  const recentOrders = orders.filter(o => o.orderDate >= startDate)
  
  // Today's orders
  const today = now.toISOString().split('T')[0]
  const todayOrders = orders.filter(o => 
    o.orderDate.toISOString().split('T')[0] === today
  )
  
  // Calculate metrics
  const monthRevenue = recentOrders.reduce((sum, o) => sum + o.netRevenue, 0)
  const monthOrders = recentOrders.length
  const avgOrderValue = monthOrders > 0 ? monthRevenue / monthOrders : 0
  
  // Top products
  const topProducts = aggregateSalesByProduct(recentOrders).slice(0, 10)
  
  // Low stock count
  const lowStockCount = inventory.filter(i => 
    (i.merchantQty + i.plQty + i.consignmentQty) < 20
  ).length
  
  return {
    todaySales: todayOrders.reduce((sum, o) => sum + o.quantity, 0),
    todayRevenue: todayOrders.reduce((sum, o) => sum + o.netRevenue, 0),
    monthSales: recentOrders.reduce((sum, o) => sum + o.quantity, 0),
    monthRevenue,
    monthOrders,
    avgOrderValue,
    topProducts,
    lowStockCount,
    revenueGrowth: 0, // Would calculate from previous period
    orderGrowth: 0
  }
}

// Generate sales predictions
export function generatePredictions(
  orders: HKTVOrder[],
  inventory: HKTVInventory[],
  daysToPredict: number = 30
): SalesPrediction[] {
  // Get daily sales for each product
  const productDailySales = new Map<string, { date: string; quantity: number }[]>()
  
  orders.forEach(order => {
    const dateKey = order.orderDate.toISOString().split('T')[0]
    
    if (!productDailySales.has(order.productId)) {
      productDailySales.set(order.productId, [])
    }
    
    const current = productDailySales.get(order.productId)!
    const existing = current.find(d => d.date === dateKey)
    
    if (existing) {
      existing.quantity += order.quantity
    } else {
      current.push({ date: dateKey, quantity: order.quantity })
    }
  })
  
  // Calculate predictions
  const predictions: SalesPrediction[] = []
  
  productDailySales.forEach((sales, productId) => {
    // Sort by date
    sales.sort((a, b) => a.date.localeCompare(b.date))
    
    // Calculate average daily sales
    const quantities = sales.map(s => s.quantity)
    const avgDaily = quantities.reduce((a, b) => a + b, 0) / quantities.length || 0
    
    // Simple linear trend
    const n = quantities.length
    if (n < 3) return // Skip products with insufficient data
    
    // Calculate trend
    let trendScore = 0
    const recentAvg = quantities.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, n)
    const olderAvg = quantities.slice(0, Math.min(7, n)).reduce((a, b) => a + b, 0) / Math.min(7, n)
    
    if (olderAvg > 0) {
      trendScore = (recentAvg - olderAvg) / olderAvg
    }
    
    // Predict demand
    const predictedDaily = avgDaily * (1 + trendScore * 0.5)
    const predicted30Day = predictedDaily * daysToPredict
    
    // Get current stock
    const inv = inventory.find(i => i.productId === productId)
    const currentStock = (inv?.merchantQty || 0) + (inv?.plQty || 0) + (inv?.consignmentQty || 0)
    
    // Calculate days until stockout
    const daysUntilStockout = predictedDaily > 0 
      ? Math.floor(currentStock / predictedDaily)
      : 999
    
    // Recommended reorder (lead time buffer)
    const leadTimeDays = 7
    const safetyStock = Math.ceil(predictedDaily * 3)
    const recommendedReorder = Math.max(0, Math.ceil(predictedDaily * (leadTimeDays + 30) + safetyStock - currentStock))
    
    // Confidence based on data quality
    const confidence = Math.min(95, 50 + n * 5)
    
    // Determine trend
    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (trendScore > 0.1) trend = 'up'
    else if (trendScore < -0.1) trend = 'down'
    
    // Get product name
    const order = orders.find(o => o.productId === productId)
    
    predictions.push({
      productId,
      productName: order?.productName || productId,
      currentStock,
      avgDailySales: avgDaily,
      predictedDailySales: predictedDaily,
      predicted30DayDemand: Math.ceil(predicted30Day),
      daysUntilStockout,
      recommendedReorder,
      confidence,
      trend
    })
  })
  
  // Sort by urgency (lowest days until stockout)
  return predictions.sort((a, b) => a.daysUntilStockout - b.daysUntilStockout)
}
