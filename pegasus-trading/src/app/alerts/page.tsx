'use client'

import { useState, useEffect } from 'react'
import { 
  AlertTriangle, 
  Search, 
  RefreshCw,
  Package,
  TrendingUp,
  ShoppingCart,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'

interface InventoryItem {
  productId: string
  janCode: string
  brandName: string
  productName: string
  totalStock: number
  status: string
  imageUrl?: string
  quantity?: number
}

const LOW_STOCK_THRESHOLD = 20

export default function AlertsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const loadData = () => {
    setIsLoading(true)
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        let items = []
        let updatedTime = null

        if (Array.isArray(data)) {
          items = data
        } else {
          items = data.inventory || []
          updatedTime = data.lastUpdated
        }
        
        // Normalize items
        items = items.map((item: any) => ({
          ...item,
          totalStock: item.quantity !== undefined ? parseInt(item.quantity) : (item.totalStock || 0),
          status: item.status || item.hktvStatus || 'Normal',
          imageUrl: item.image || item.imageUrl
        }))
        
        setInventory(items)
        setLastUpdated(updatedTime)
        setIsLoading(false)
      })
      .catch((err) => {
        console.error('API fetch failed:', err)
        setIsLoading(false)
      })
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter for low stock items
  const lowStockItems = inventory.filter(item => {
    const isLowStock = item.totalStock <= LOW_STOCK_THRESHOLD
    const matchesSearch = searchTerm === '' || 
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.janCode.includes(searchTerm) ||
      item.brandName.toLowerCase().includes(searchTerm.toLowerCase())
    
    return isLowStock && matchesSearch
  }).sort((a, b) => a.totalStock - b.totalStock) // Sort by lowest stock first

  const outOfStockCount = lowStockItems.filter(i => i.totalStock === 0).length
  const lowStockCount = lowStockItems.length - outOfStockCount

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">低庫存警報</h1>
                <p className="text-sm text-gray-500">
                  需要補貨的產品列表 (低於 {LOW_STOCK_THRESHOLD} 件)
                </p>
              </div>
            </div>
            <button 
              onClick={loadData}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <Package className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-600">缺貨產品 (0件)</p>
                <p className="text-2xl font-bold text-red-700">{outOfStockCount}</p>
              </div>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-yellow-600">低庫存 (1-{LOW_STOCK_THRESHOLD}件)</p>
                <p className="text-2xl font-bold text-yellow-700">{lowStockCount}</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-4">
               <div className="p-3 bg-blue-100 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-600">建議補貨總數</p>
                <p className="text-2xl font-bold text-blue-700">{lowStockItems.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Search Bar */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="搜尋警報產品..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border rounded-xl shadow-sm focus:ring-2 focus:ring-red-500 outline-none"
          />
        </div>

        {/* Product List */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">產品資訊</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">品牌</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">庫存狀態</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">JAN編碼</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lowStockItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <CheckCircleIcon className="w-12 h-12 text-green-500" />
                        <p className="text-lg font-medium text-gray-900">庫存充足</p>
                        <p>目前沒有低於 {LOW_STOCK_THRESHOLD} 件的產品</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  lowStockItems.map((item) => (
                    <tr key={item.productId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border">
                            {item.imageUrl ? (
                              <img 
                                src={`/images/products/${encodeURIComponent(item.imageUrl)}`} 
                                alt={item.productName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/placeholder.png'
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <Package className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 line-clamp-2 max-w-[300px]" title={item.productName}>
                              {item.productName}
                            </p>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${
                              item.status === 'ONLINE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {item.status}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.brandName}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${
                            item.totalStock === 0 ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            {item.totalStock}
                          </span>
                          <span className="text-xs text-gray-400">件</span>
                          {item.totalStock === 0 && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                              缺貨
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-500">
                        {item.janCode}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/orders?sku=${item.janCode}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          補貨
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}
