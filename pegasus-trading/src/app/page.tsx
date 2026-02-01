'use client'

import { useEffect, useState } from 'react'
import { 
  TrendingUp,
  AlertTriangle,
  Package,
  DollarSign
} from 'lucide-react'

export default function Home() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    todaySales: 0,
    monthlyRevenue: 0
  })
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<any[]>([])
  const [salesData, setSalesData] = useState<any>({ records: [] })

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch Inventory
        const prodRes = await fetch('/api/products')
        const prodData = await prodRes.json()
        const fetchedProducts = Array.isArray(prodData) ? prodData : (prodData.inventory || [])
        setProducts(fetchedProducts)
        
        // Fetch Sales (API backed by Redis)
        const salesRes = await fetch('/api/sales')
        const fetchedSales = await salesRes.json()
        setSalesData(fetchedSales)
        
        // Calculate Inventory Stats
        const totalProducts = fetchedProducts.length
        const lowStock = fetchedProducts.filter((p: any) => {
          const qty = p.quantity !== undefined ? parseInt(p.quantity) : (p.totalStock || 0)
          return qty < 10
        }).length
        
        // Calculate Sales Stats
        const records = fetchedSales.records || []
        const today = new Date().toISOString().split('T')[0]
        const currentMonth = today.substring(0, 7) // YYYY-MM
        
        const todaySales = records
          .filter((r: any) => r.date === today)
          .reduce((sum: number, r: any) => sum + r.totalAmount, 0)
          
        const monthlyRevenue = records
          .filter((r: any) => r.date && r.date.startsWith(currentMonth))
          .reduce((sum: number, r: any) => sum + r.totalAmount, 0)

        setStats({
          totalProducts,
          lowStock,
          todaySales,
          monthlyRevenue
        })
      } catch (e) {
        console.error('Failed to fetch dashboard data', e)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  // Get top 5 low stock items
  const lowStockItems = products
    .filter((p: any) => {
      const qty = p.quantity !== undefined ? parseInt(p.quantity) : (p.totalStock || 0)
      return qty < 10
    })
    .sort((a: any, b: any) => {
      const qtyA = a.quantity !== undefined ? parseInt(a.quantity) : (a.totalStock || 0)
      const qtyB = b.quantity !== undefined ? parseInt(b.quantity) : (b.totalStock || 0)
      return qtyA - qtyB
    })
    .slice(0, 5)

  // Get recent 5 sales
  const recentSales = (salesData?.records || []).slice(0, 5)

  const cards = [
    { label: '總產品數', value: stats.totalProducts, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '今日銷售額', value: `$${stats.todaySales.toFixed(1)}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '低庫存警報', value: stats.lowStock, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: '本月營業額', value: `$${stats.monthlyRevenue.toFixed(1)}`, icon: DollarSign, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-2">Welcome back to Pegasus Trading System</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${card.bg}`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                {loading ? 'Loading...' : 'Updated'}
              </span>
            </div>
            <h3 className="text-sm font-medium text-gray-500">{card.label}</h3>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {loading ? '...' : card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions / Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Sales List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96 overflow-auto">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Sales</h3>
          {recentSales.length > 0 ? (
            <div className="space-y-4">
              {recentSales.map((sale: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{sale.productName}</p>
                    <p className="text-xs text-gray-500">{sale.date} • {sale.channel}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">${sale.totalAmount}</p>
                    <p className="text-xs text-gray-500">x{sale.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              No recent sales found
            </div>
          )}
        </div>
        
        {/* Low Stock List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-96 overflow-auto">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Low Stock Items</h3>
          {lowStockItems.length > 0 ? (
            <div className="space-y-4">
              {lowStockItems.map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-medium text-gray-900 text-sm truncate">{item.productName}</p>
                    <p className="text-xs text-gray-500">{item.brandName}</p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Qty: {item.quantity !== undefined ? item.quantity : item.totalStock}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-green-500">
              All stock levels healthy
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
