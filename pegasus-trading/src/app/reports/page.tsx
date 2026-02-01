'use client'

import { useState, useEffect } from 'react'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Package,
  RefreshCw,
  Home,
  PieChart,
  BarChart3
} from 'lucide-react'

interface InventoryItem {
  productId: string
  janCode: string
  brandName: string
  productName: string
  totalStock: number
  unitCost?: number
  unitCostJPY?: number
}

interface BrandSummary {
  name: string
  productCount: number
  totalStock: number
  totalValue: number
  avgCost: number
}

export default function Reports() {
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [brandStats, setBrandStats] = useState<BrandSummary[]>([])

  useEffect(() => {
    fetch('/data.json')
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
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

  // Calculate brand statistics
  const brandMap: Record<string, BrandSummary> = {}
  
  data.inventory?.forEach((item: InventoryItem) => {
    const brand = item.brandName || 'Other'
    const cost = item.unitCost || 0
    const stock = item.totalStock || 0
    const value = cost * stock
    
    if (!brandMap[brand]) {
      brandMap[brand] = {
        name: brand,
        productCount: 0,
        totalStock: 0,
        totalValue: 0,
        avgCost: 0
      }
    }
    
    if (item.unitCost) {
      brandMap[brand].productCount += 1
    }
    brandMap[brand].totalStock += stock
    brandMap[brand].totalValue += value
  })

  // Calculate average costs per brand
  const brandStatsList = Object.values(brandMap)
    .map(b => ({
      ...b,
      avgCost: b.productCount > 0 ? b.totalValue / b.productCount : 0
    }))
    .sort((a, b) => b.totalValue - a.totalValue)

  // Products with cost
  const productsWithCost = data.inventory?.filter((i: InventoryItem) => i.unitCost) || []
  const productsWithoutCost = data.inventory?.filter((i: InventoryItem) => !i.unitCost) || []

  // Calculate totals
  const totalInventoryValue = brandStatsList.reduce((sum, b) => sum + b.totalValue, 0)
  const totalStock = data.inventory?.reduce((sum: number, i: InventoryItem) => sum + (i.totalStock || 0), 0) || 0
  const productsWithCostCount = productsWithCost.length

  // Top expensive products
  const topExpensive = productsWithCost
    .sort((a: InventoryItem, b: InventoryItem) => (b.unitCost || 0) - (a.unitCost || 0))
    .slice(0, 10)

  // Highest value inventory
  const topValue = productsWithCost
    .map((i: InventoryItem) => ({
      ...i,
      totalValue: (i.unitCost || 0) * i.totalStock
    }))
    .sort((a: any, b: any) => b.totalValue - a.totalValue)
    .slice(0, 10)

  // COLORS for charts
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1']

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
                <h1 className="text-2xl font-bold text-gray-900">💰 成本分析</h1>
                <p className="text-gray-500">進貨成本與庫存價值分析</p>
              </div>
            </div>
            <button 
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              刷新
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">總庫存價值</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">${totalInventoryValue.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-lg bg-green-100">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">有成本資料</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{productsWithCostCount}</p>
                <p className="text-sm text-gray-400">項產品</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-100">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">未有成本</p>
                <p className="text-2xl font-bold text-gray-400 mt-1">{productsWithoutCost.length}</p>
                <p className="text-sm text-gray-400">項產品</p>
              </div>
              <div className="p-2 rounded-lg bg-gray-100">
                <Package className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-sm">總庫存數量</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalStock.toLocaleString()}</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-100">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Brand Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">品牌成本分佈 (前10)</h2>
            <div className="space-y-4">
              {brandStatsList.slice(0, 10).map((brand, index) => (
                <div key={brand.name}>
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium text-gray-900">{brand.name}</span>
                      <span className="text-sm text-gray-400">({brand.productCount}項)</span>
                    </div>
                    <span className="text-gray-600">${brand.totalValue.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full"
                      style={{ 
                        width: `${(brand.totalValue / totalInventoryValue) * 100}%`,
                        backgroundColor: COLORS[index % COLORS.length]
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">成本涵蓋率</h2>
            <div className="flex items-center justify-center h-48">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="#f3f4f6"
                    strokeWidth="16"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="16"
                    strokeDasharray={`${(productsWithCostCount / data.inventory?.length) * 352} 352`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">
                    {((productsWithCostCount / data.inventory?.length) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
            <p className="text-center text-sm text-gray-500 mt-2">
              {productsWithCostCount} / {data.inventory?.length} 項產品有成本資料
            </p>
          </div>
        </div>

        {/* Top Products Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Highest Value Inventory */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">庫存價值 TOP 10</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">產品</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">成本</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">庫存</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">總值</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {topValue.map((item: any, index: number) => (
                    <tr key={item.janCode} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-[150px]">{item.productName || item.janCode}</p>
                        <p className="text-sm text-gray-500">{item.brandName}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">${item.unitCost?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-600">{item.totalStock}</td>
                      <td className="px-4 py-3 font-bold text-green-600">${item.totalValue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Most Expensive Products */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">單價最高 TOP 10</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">產品</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">成本</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">庫存</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">總值</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {topExpensive.map((item: InventoryItem, index: number) => (
                    <tr key={item.janCode} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-[150px]">{item.productName || item.janCode}</p>
                        <p className="text-sm text-gray-500">{item.brandName}</p>
                      </td>
                      <td className="px-4 py-3 font-bold text-orange-600">${item.unitCost?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-gray-600">{item.totalStock}</td>
                      <td className="px-4 py-3 text-gray-600">${((item.unitCost || 0) * item.totalStock).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Data Info */}
        <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-100 text-sm text-blue-700">
          💰 成本資料來源：日本進貨發票 (Check Cost folder)
          <br />
          📊 總庫存價值: ${totalInventoryValue.toLocaleString()} | 
          匯率: 1 JPY = $0.055 HKD
        </div>
      </main>
    </div>
  )
}
