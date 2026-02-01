'use client'

import { useState, useEffect } from 'react'
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  DollarSign, 
  ShoppingCart,
  AlertTriangle,
  Package,
  RefreshCw,
  Home
} from 'lucide-react'

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    fetch('/data.json')
      .then(res => res.json())
      .then(setData)
      .catch(err => console.error('Error loading data:', err))
  }, [])

  const handleRefresh = () => {
    setIsLoading(true)
    fetch('/data.json')
      .then(res => res.json())
      .then(d => {
        setData(d)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-500">載入數據中...</p>
        </div>
      </div>
    )
  }

  // Process sales data
  const salesByDate: Record<string, any> = {}
  let totalRevenue = 0
  
  data.sales?.forEach((sale: any) => {
    const date = sale.orderDate || 'Unknown'
    if (!salesByDate[date]) {
      salesByDate[date] = { date, sales: 0, orders: 0 }
    }
    salesByDate[date].sales += sale.netAmount || 0
    salesByDate[date].orders += 1
    totalRevenue += sale.netAmount || 0
  })

  const salesChartData = Object.values(salesByDate)
    .sort((a: any, b: any) => a.date.localeCompare(b.date))
    .slice(-30)

  // Category distribution
  const categoryStats: Record<string, any> = {}
  data.inventory?.forEach((item: any) => {
    const brand = item.brandName || 'Other'
    if (!categoryStats[brand]) {
      categoryStats[brand] = { name: brand, value: 0 }
    }
    categoryStats[brand].value += 1
  })

  const categoryData = Object.values(categoryStats)
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 6)

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6B7280']

  // Top products
  const productSales: Record<string, any> = {}
  data.sales?.forEach((sale: any) => {
    const key = sale.productId
    if (!productSales[key]) {
      productSales[key] = { name: sale.productName || key, sales: 0, count: 0 }
    }
    productSales[key].sales += sale.netAmount || 0
    productSales[key].count += 1
  })

  const topProducts = Object.values(productSales)
    .sort((a: any, b: any) => b.sales - a.sales)
    .slice(0, 5)

  // Low stock items
  const lowStockItems = (data.inventory || []).filter((i: any) => i.totalStock < 20)

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
                <h1 className="text-2xl font-bold text-gray-900">📊 數據總覽</h1>
                <p className="text-gray-500">銷售與庫存概覽</p>
              </div>
            </div>
            <button 
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              刷新數據
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">總產品數</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{(data.inventory || []).length}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-100">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">總營業額</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">${totalRevenue.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-lg bg-green-100">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">低庫存產品</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{lowStockItems.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-red-100">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">總訂單數</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{(data.sales || []).length.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-100">
                <ShoppingCart className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Sales Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">銷售趨勢 (近30天)</h2>
            <div className="h-80">
              {salesChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                    <Line type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">
                  等待銷售數據...
                </div>
              )}
            </div>
          </div>

          {/* Category Pie Chart */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">品牌分佈 (前6)</h2>
            {categoryData.length > 0 ? (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {(categoryData as any[]).map((_: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {(categoryData as any[]).map((cat: any, index: number) => (
                    <div key={cat.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-sm text-gray-600">{cat.name}</span>
                      </div>
                      <span className="text-sm font-medium">{cat.value}項</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">等待庫存數據...</div>
            )}
          </div>
        </div>

        {/* Top Products & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">熱銷產品 TOP 5</h2>
            {topProducts.length > 0 ? (
              <div className="space-y-4">
                {(topProducts as any[]).map((product: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900 truncate max-w-[200px]">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.count} 單</p>
                      </div>
                    </div>
                    <p className="font-bold text-gray-900">${product.sales.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">等待銷售數據...</div>
            )}
          </div>

          {/* Low Stock Alerts */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">低庫存警報</h2>
              <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-sm font-medium">
                {lowStockItems.length} 項
              </span>
            </div>
            {lowStockItems.slice(0, 5).map((item: any) => (
              <div key={item.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-2">
                <div>
                  <p className="font-medium text-gray-900 truncate max-w-[200px]">{item.productName || item.productId}</p>
                  <p className="text-sm text-gray-500">JAN: {item.janCode}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-600">{item.totalStock}</p>
                  <p className="text-xs text-red-500">庫存不足</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
