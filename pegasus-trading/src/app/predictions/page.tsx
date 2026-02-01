'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  AlertTriangle, 
  ShoppingCart,
  Brain,
  Home,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react'

const ITEMS_PER_PAGE = 50

// Order schedule: Order on 15th and 30th, arrive 10-14 days later
const ORDER_DAYS = [15, 30] // 每月15號、30號向日本落單
const DELIVERY_DAYS = 12 // 平均12日到貨

function getNextOrderDate() {
  const now = new Date()
  const today = now.getDate()
  const month = now.getMonth()
  const year = now.getFullYear()
  
  // Find next order date
  for (const day of ORDER_DAYS) {
    if (day > today) {
      return { date: new Date(year, month, day), day: day }
    }
  }
  // Next month
  return { date: new Date(year, month + 1, ORDER_DAYS[0]), day: ORDER_DAYS[0] }
}

function getDaysUntilOrder() {
  const nextOrder = getNextOrderDate()
  const now = new Date()
  const diff = nextOrder.date.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function Predictions() {
  const [filter, setFilter] = useState<'all' | 'critical' | 'reorder'>('all')
  const [isCalculating, setIsCalculating] = useState(false)
  const [inventory, setInventory] = useState<any[]>([])
  const [salesRecords, setSalesRecords] = useState<any[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load Inventory
      const invRes = await fetch('/api/products')
      const invData = await invRes.json()
      setInventory(invData.inventory || [])

      // Load Sales (API backed by Redis)
      const salesRes = await fetch('/api/sales')
      if (salesRes.ok) {
        const salesData = await salesRes.json()
        setSalesRecords(salesData.records || [])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  const handleRecalculate = () => {
    setIsCalculating(true)
    loadData().then(() => {
      setTimeout(() => setIsCalculating(false), 1000)
    })
  }

  if (!inventory.length && !salesRecords.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">載入數據中...</p>
        </div>
      </div>
    )
  }

  const nextOrderInfo = getNextOrderDate()
  const daysUntilOrder = getDaysUntilOrder()
  const nextOrderStr = `${nextOrderInfo.date.getMonth() + 1}月${nextOrderInfo.day}日`
  
  // 1. Calculate date range of sales data to determine "Average Daily Sales"
  let daysRange = 30 // Default to 30 days if only 1 day or no dates
  if (salesRecords.length > 0) {
    const dates = salesRecords.map(r => new Date(r.date).getTime())
    const minDate = Math.min(...dates)
    const maxDate = Math.max(...dates)
    const diffDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1
    daysRange = Math.max(1, diffDays)
  }

  // Build sales lookup by JAN code
  const salesByJanCode: Record<string, any> = {}
  salesRecords.forEach((sale: any) => {
    const janCode = String(sale.janCode).trim()
    
    if (!salesByJanCode[janCode]) {
      salesByJanCode[janCode] = {
        janCode,
        productName: sale.productName,
        quantity: 0,
        revenue: 0,
        orders: 0
      }
    }
    salesByJanCode[janCode].quantity += sale.quantity || 0
    salesByJanCode[janCode].revenue += sale.totalAmount || 0
    salesByJanCode[janCode].orders += 1
  })

  // Generate predictions for visible inventory products
  const predictions = inventory
    .filter((item: any) => item.visibility !== 'Invisible')
    .map((item: any) => {
      const janCode = String(item.janCode).trim()
      const sale = salesByJanCode[janCode] || {}
      
      const totalSold = sale.quantity || 0
      const avgDailySales = totalSold / daysRange
      const currentStock = parseInt(item.quantity || item.totalStock || 0)
      
      // Calculate demand from now until order arrives
      // Order now → arrives in ~12 days
      // But we can only order on 15th/30th
      const totalDaysToCover = daysUntilOrder + DELIVERY_DAYS
      const demandToCover = Math.ceil(avgDailySales * totalDaysToCover)
      
      // Recommended reorder = demand until goods arrive - current stock
      const recommendedReorder = Math.max(0, demandToCover - currentStock)
      
      // Check if stock will last until order arrives
      const daysUntilStockout = avgDailySales > 0 ? Math.floor(currentStock / avgDailySales) : 999
      const willArriveBeforeStockout = daysUntilStockout > daysUntilOrder + DELIVERY_DAYS
      
      // Critical: won't last until order arrives
      const criticalStock = currentStock < (avgDailySales * (daysUntilOrder + DELIVERY_DAYS))
      
      // Need to order: stock won't last until arrival
      const needReorder = !willArriveBeforeStockout || recommendedReorder > 0

      return {
        janCode: item.janCode,
        productId: item.productId,
        productName: item.productName || sale.productName || item.janCode,
        brand: item.brandName || '-',
        currentStock,
        avgDailySales,
        daysUntilStockout,
        daysUntilOrder,
        demandToCover,
        recommendedReorder,
        willArriveBeforeStockout,
        criticalStock,
        needReorder,
        hasSales: !!sale.quantity,
        salesRevenue: sale.revenue || 0,
        salesOrders: sale.orders || 0
      }
    })

  const filteredPredictions = predictions.filter((p: any) => {
    if (filter === 'critical') return p.criticalStock
    if (filter === 'reorder') return p.needReorder
    return true
  })

  const totalPages = Math.ceil(filteredPredictions.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedItems = filteredPredictions.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const criticalCount = predictions.filter((p: any) => p.criticalStock).length
  const needReorderCount = predictions.filter((p: any) => p.needReorder).length
  const productsWithSales = predictions.filter((p: any) => p.hasSales).length

  // Sales trend data
  const salesByDate: Record<string, number> = {}
  salesRecords.forEach((sale: any) => {
    const date = sale.date || 'Unknown'
    salesByDate[date] = (salesByDate[date] || 0) + (sale.totalAmount || 0)
  })
  const trendData = Object.entries(salesByDate)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8)

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <a href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <Home size={20} />
                <span className="text-sm">回首頁</span>
              </a>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">🔮 銷售預測</h1>
                <p className="text-gray-500">日本落單預測 (每月15號、30號)</p>
              </div>
            </div>
            <button 
              onClick={handleRecalculate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <Brain size={18} className={isCalculating ? 'animate-pulse' : ''} />
              {isCalculating ? '計算中...' : '重新計算'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">下次落單日</p>
                <p className="text-xl font-bold text-gray-900">{nextOrderStr}</p>
              </div>
            </div>
            <p className="text-sm text-blue-600 pl-14">還有 {daysUntilOrder} 天</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                <AlertTriangle size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">庫存危急</p>
                <p className="text-xl font-bold text-gray-900">{criticalCount} 樣產品</p>
              </div>
            </div>
            <p className="text-sm text-red-600 pl-14">撐不到下次落單</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-orange-100">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
                <ShoppingCart size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">建議補貨</p>
                <p className="text-xl font-bold text-gray-900">{needReorderCount} 樣產品</p>
              </div>
            </div>
            <p className="text-sm text-orange-600 pl-14">預計需求大於庫存</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100">
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-500">活躍銷售</p>
                <p className="text-xl font-bold text-gray-900">{productsWithSales} 樣產品</p>
              </div>
            </div>
            <p className="text-sm text-green-600 pl-14">有銷售記錄 (過去 {daysRange} 天)</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm mb-6">
          <div className="p-4 border-b flex gap-4">
            <button 
              onClick={() => { setFilter('all'); setCurrentPage(1) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              所有產品
            </button>
            <button 
              onClick={() => { setFilter('critical'); setCurrentPage(1) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'critical' ? 'bg-red-500 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              庫存危急
            </button>
            <button 
              onClick={() => { setFilter('reorder'); setCurrentPage(1) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'reorder' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              建議補貨
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">產品資訊</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">現有庫存</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">日均銷量</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">庫存天數</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">預計需求</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">建議補貨</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedItems.map((item: any) => (
                  <tr key={item.janCode} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{item.productName}</div>
                        <div className="text-sm text-gray-500">{item.janCode}</div>
                        <div className="text-xs text-gray-400">{item.brand}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {item.currentStock}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {item.avgDailySales.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`${
                        item.daysUntilStockout < daysUntilOrder + DELIVERY_DAYS ? 'text-red-600 font-bold' : 'text-gray-600'
                      }`}>
                        {item.daysUntilStockout === 999 ? '∞' : item.daysUntilStockout} 天
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600">
                      {item.demandToCover}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {item.recommendedReorder > 0 ? (
                        <span className="text-blue-600 font-bold">+{item.recommendedReorder}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {item.criticalStock ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          危急
                        </span>
                      ) : item.needReorder ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          需補貨
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          充足
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-500">
                顯示 {startIndex + 1} 至 {Math.min(startIndex + ITEMS_PER_PAGE, filteredPredictions.length)} 筆，共 {filteredPredictions.length} 筆
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-4 py-2 text-sm text-gray-600">
                  第 {currentPage} 頁，共 {totalPages} 頁
                </span>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sales Trend Chart (Simple Bar) */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">近期銷售趨勢</h2>
          <div className="h-48 flex items-end gap-2">
            {trendData.map(([date, amount]) => {
              const max = Math.max(...trendData.map(([, a]) => a))
              const height = max > 0 ? (amount / max) * 100 : 0
              return (
                <div key={date} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full bg-blue-100 rounded-t relative hover:bg-blue-200 transition-colors" style={{ height: `${height}%` }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      HK$ {amount.toFixed(0)}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 rotate-45 origin-left mt-2 whitespace-nowrap">
                    {date.slice(5)}
                  </div>
                </div>
              )
            })}
            {trendData.length === 0 && (
               <div className="w-full h-full flex items-center justify-center text-gray-400">
                 暫無銷售數據
               </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
