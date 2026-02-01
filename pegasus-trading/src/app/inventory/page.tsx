'use client'

import { useState, useEffect } from 'react'
import { 
  Package, 
  Search, 
  Filter,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Home,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'

interface InventoryItem {
  productId: string
  janCode: string
  brandName: string
  productName: string
  totalStock: number
  status: string
  visibility: string
  unitCost?: number
  sellingPrice?: number
  originalPrice?: number
  imageUrl?: string
  quantity?: number // For backward compatibility with stored data
}

const ITEMS_PER_PAGE = 30

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('')
  const [brandFilter, setBrandFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [visibilityFilter, setVisibilityFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  // Helper to handle image error
  const handleImageError = (id: string) => {
    setImageErrors(prev => {
      const newSet = new Set(prev)
      newSet.add(id)
      return newSet
    })
  }

  const loadData = () => {
    setIsLoading(true)
    // Fetch from API which reads from Redis/Local Storage (the source of truth)
    fetch('/api/products')
      .then(res => {
        if (!res.ok) throw new Error('API error')
        return res.json()
      })
      .then(data => {
        // Handle API response format: { inventory: [], lastUpdated: "..." }
        // Or backward compatibility: []
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
          // Ensure totalStock reflects quantity if available (from deduction logic)
          totalStock: item.quantity !== undefined ? parseInt(item.quantity) : (item.totalStock || 0),
          status: item.status || item.hktvStatus || 'Normal',
          visibility: item.visibility || item.hktvVisible || 'Visible',
          imageUrl: item.image || item.imageUrl
        }))
        
        setInventory(items)
        setLastUpdated(updatedTime)
        setIsLoading(false)
      })
      .catch((err) => {
        console.error('API fetch failed, falling back to static files:', err)
        // Fallback to static file if API fails
        fetch('/data_with_images.json')
          .then(res => res.json())
          .then(data => {
            const items = (data.inventory || []).map((item: any) => ({
              ...item,
              status: item.status || item.hktvStatus || 'Normal',
              visibility: item.visibility || item.hktvVisible || 'Visible',
              imageUrl: item.image || item.imageUrl
            }))
            setInventory(items)
            setLastUpdated(null) // No live update time for static file
            setIsLoading(false)
          })
          .catch(() => setIsLoading(false))
      })
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRefresh = () => {
    loadData()
  }

  // Filter logic
  const filteredItems = inventory.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.janCode.includes(searchTerm) ||
      item.brandName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesBrand = brandFilter === 'all' || item.brandName === brandFilter
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    const matchesVisibility = visibilityFilter === 'all' || item.visibility === visibilityFilter

    return matchesSearch && matchesBrand && matchesStatus && matchesVisibility
  })

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE)
  const currentItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  // Unique brands for filter
  const brands = Array.from(new Set(inventory.map(item => item.brandName))).sort()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
             <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">📦 庫存管理</h1>
              <p className="text-sm text-gray-500">Pegasus Trading - Inventory Control</p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex-1 min-w-[300px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜尋產品名稱、JAN碼或品牌..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
              <select 
                className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={brandFilter}
                onChange={(e) => setBrandFilter(e.target.value)}
              >
                <option value="all">所有品牌</option>
                {brands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>

              <select 
                className="border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">所有狀態</option>
                <option value="ONLINE">上架中</option>
                <option value="OFFLINE">已下架</option>
              </select>

              <button 
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">刷新</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Last Updated Notification */}
        {lastUpdated && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2 shadow-sm animate-fade-in">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-medium">庫存記錄已成功更新</p>
              <p className="text-xs text-green-600 mt-0.5 opacity-90">
                最近更新時間：{new Date(lastUpdated).toLocaleString('zh-HK')}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">產品資料</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">品牌</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">庫存</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">成本/售價</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-center">狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentItems.map((item) => (
                  <tr key={item.productId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex gap-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden relative border border-gray-100">
                          {item.imageUrl && !imageErrors.has(item.productId) ? (
                            <img 
                              src={item.imageUrl} 
                              alt={item.productName}
                              className="w-full h-full object-contain p-1"
                              onError={() => handleImageError(item.productId)}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <ImageIcon className="w-6 h-6" />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 line-clamp-2 max-w-md">
                            {item.productName}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 font-mono">
                            JAN: {item.janCode}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                        {item.brandName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className={`font-bold ${item.totalStock <= 5 ? 'text-red-600' : 'text-gray-900'}`}>
                        {item.totalStock}
                      </div>
                      {item.totalStock <= 5 && (
                        <div className="flex items-center justify-end gap-1 text-xs text-red-500 mt-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>低庫存</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <div className="text-gray-900 font-medium">${item.sellingPrice?.toFixed(1)}</div>
                      <div className="text-gray-400 text-xs mt-0.5">Cost: ${item.unitCost?.toFixed(1)}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          item.status === 'ONLINE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {item.status === 'ONLINE' ? '上架中' : '已下架'}
                        </span>
                        {item.visibility === 'Invisible' && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <EyeOff className="w-3 h-3" />
                            <span>隱藏</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              顯示 {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredItems.length)} 至 {Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} 筆，共 {filteredItems.length} 筆
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
