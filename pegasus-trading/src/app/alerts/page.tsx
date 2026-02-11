'use client'

import { useState, useEffect } from 'react'
import { 
  AlertTriangle, 
  Search, 
  RefreshCw,
  Package,
  TrendingUp,
  ShoppingCart,
  Filter,
  ArrowRight,
  ImagePlus,
  Loader2,
  CheckCircle,
  ChevronLeft,
  ChevronRight
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
const ITEMS_PER_PAGE = 30

export default function AlertsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('All')
  const [stockStatus, setStockStatus] = useState('All') // 'All', 'OutOfStock', 'LowStock'
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [fetchingImages, setFetchingImages] = useState<Record<string, boolean>>({})
  const [currentPage, setCurrentPage] = useState(1)

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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedBrand, stockStatus])

  const handleFetchImage = async (item: InventoryItem) => {
    if (fetchingImages[item.janCode]) return;

    setFetchingImages(prev => ({ ...prev, [item.janCode]: true }))
    
    try {
      const res = await fetch('/api/products/fetch-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productName: item.brandName + " " + item.productName,
          sku: item.janCode 
        })
      })
      const data = await res.json()
      
      if (data.success && data.imageUrl) {
         setInventory(prev => prev.map(p => 
           p.janCode === item.janCode ? { ...p, imageUrl: data.imageUrl } : p
         ))
      } else {
        console.error('Fetch image error:', data.error)
      }
    } catch (err) {
      console.error('Fetch image failed', err)
    } finally {
      setFetchingImages(prev => ({ ...prev, [item.janCode]: false }))
    }
  }

  const getImageUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return url;
    // Encode filename to handle special characters (e.g. Chinese, spaces)
    return `/images/products/${encodeURIComponent(url)}`;
  }

  // Base low stock items (unfiltered by UI controls)
  const baseLowStockItems = inventory.filter(item => item.totalStock <= LOW_STOCK_THRESHOLD)

  // Get available brands from the low stock items
  const availableBrands = Array.from(new Set(baseLowStockItems.map(i => i.brandName))).filter(Boolean).sort()

  // Filter for display
  const filteredItems = baseLowStockItems.filter(item => {
    // 1. Search
    const matchesSearch = searchTerm === '' || 
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.janCode.includes(searchTerm) ||
      item.brandName.toLowerCase().includes(searchTerm.toLowerCase())
    
    // 2. Brand Filter
    const matchesBrand = selectedBrand === 'All' || item.brandName === selectedBrand

    // 3. Stock Status Filter
    let matchesStatus = true
    if (stockStatus === 'OutOfStock') matchesStatus = item.totalStock === 0
    if (stockStatus === 'LowStock') matchesStatus = item.totalStock > 0

    return matchesSearch && matchesBrand && matchesStatus
  }).sort((a, b) => a.totalStock - b.totalStock) // Sort by lowest stock first

  const outOfStockCount = filteredItems.filter(i => i.totalStock === 0).length
  const lowStockCount = filteredItems.length - outOfStockCount

  // Pagination Logic
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE)
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE, 
    currentPage * ITEMS_PER_PAGE
  )

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

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
                <p className="text-2xl font-bold text-blue-700">{filteredItems.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Filters & Search */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="搜尋警報產品..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border rounded-xl shadow-sm focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
            
            {/* Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
              <div className="flex items-center gap-2 bg-white border rounded-xl px-3 py-2 shadow-sm min-w-max">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">篩選:</span>
              </div>
              
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="bg-white border rounded-xl px-4 py-3 shadow-sm focus:ring-2 focus:ring-red-500 outline-none text-sm min-w-[140px]"
              >
                <option value="All">所有品牌</option>
                {availableBrands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>

              <select
                value={stockStatus}
                onChange={(e) => setStockStatus(e.target.value)}
                className="bg-white border rounded-xl px-4 py-3 shadow-sm focus:ring-2 focus:ring-red-500 outline-none text-sm min-w-[140px]"
              >
                <option value="All">所有庫存狀態</option>
                <option value="OutOfStock">缺貨 (0)</option>
                <option value="LowStock">低庫存 (1-{LOW_STOCK_THRESHOLD})</option>
              </select>
            </div>
          </div>
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
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <CheckCircle className="w-12 h-12 text-green-500" />
                        <p className="text-lg font-medium text-gray-900">沒有符合的產品</p>
                        <p>嘗試調整篩選條件</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((item) => (
                    <tr key={item.productId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border relative group">
                            {item.imageUrl ? (
                              <img 
                                src={getImageUrl(item.imageUrl)} 
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
                            
                            {/* Hover Overlay for fetching image if missing or placeholder */}
                            {(!item.imageUrl || item.imageUrl.includes('placeholder')) && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleFetchImage(item);
                                    }}
                                    disabled={fetchingImages[item.janCode]}
                                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white cursor-pointer z-10"
                                    title="自動搜尋圖片"
                                >
                                    {fetchingImages[item.janCode] ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <ImagePlus className="w-5 h-5" />
                                    )}
                                </button>
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

          {/* Pagination Controls */}
          {filteredItems.length > 0 && (
            <div className="bg-gray-50 px-6 py-4 border-t flex items-center justify-between">
              <div className="text-sm text-gray-500">
                顯示 {Math.min(filteredItems.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(filteredItems.length, currentPage * ITEMS_PER_PAGE)} 筆，共 {filteredItems.length} 筆
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5) {
                    if (currentPage > 3) {
                      pageNum = currentPage - 3 + i;
                    }
                    if (pageNum > totalPages) {
                      pageNum = totalPages - 4 + i;
                    }
                  }
                  return null; 
                })}
                
                <div className="flex items-center gap-1">
                  {currentPage > 2 && (
                     <>
                        <button
                          onClick={() => handlePageChange(1)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors hover:bg-white`}
                        >
                          1
                        </button>
                        {currentPage > 3 && <span className="text-gray-400">...</span>}
                     </>
                  )}

                   <button
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium bg-red-600 text-white shadow-sm`}
                  >
                    {currentPage}
                  </button>

                  {currentPage < totalPages - 1 && (
                     <>
                        {currentPage < totalPages - 2 && <span className="text-gray-400">...</span>}
                        <button
                          onClick={() => handlePageChange(totalPages)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors hover:bg-white`}
                        >
                          {totalPages}
                        </button>
                     </>
                  )}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
