'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  Package, 
  TrendingUp,
  Download,
  RefreshCw,
  Search,
  BarChart3
} from 'lucide-react'

interface SaleRecord {
  saleId: string
  date: string
  productName: string
  janCode: string
  quantity: number
  unitPrice: number
  totalAmount: number
  channel: string
}

interface SalesSummary {
  totalSales: number
  totalOrders: number
  totalQuantity: number
  avgOrderValue: number
}

export default function SalesPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [salesData, setSalesData] = useState<SaleRecord[]>([])
  const [summary, setSummary] = useState<SalesSummary | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  // 嘗試載入現有數據
  useEffect(() => {
    loadSalesData()
  }, [])

  const loadSalesData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Fetch from API (Redis backed) instead of static file
      const res = await fetch('/api/sales')
      if (res.ok) {
        const data = await res.json()
        setSalesData(data.records || [])
        setSummary(data.summary || null)
      } else {
        setError('暫無銷售數據')
      }
    } catch (err) {
      setError('載入失敗')
    } finally {
      setIsLoading(false)
    }
  }

  // 處理文件上傳
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload-sales', {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (response.ok) {
        await loadSalesData()
        alert('✅ 數據上傳成功！')
      } else {
        console.error('Upload failed:', result)
        let errorMsg = result.error || '上傳失敗'
        if (result.debug) {
          errorMsg += `\n\n檢測到的欄位: ${JSON.stringify(result.debug)}`
        }
        alert(`❌ ${errorMsg}`)
      }
    } catch (err: any) {
      alert('❌ 上傳錯誤: ' + err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // 篩選數據
  const filteredSales = useMemo(() => {
    return salesData.filter(sale => {
      const matchesSearch = 
        sale.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sale.janCode.includes(searchTerm) ||
        sale.saleId.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesDate = selectedDate ? sale.date === selectedDate : true

      return matchesSearch && matchesDate
    })
  }, [salesData, searchTerm, selectedDate])

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">銷售記錄</h1>
                <p className="text-sm text-gray-500">管理和查看所有銷售訂單</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={loadSalesData}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer shadow-sm">
                <Download className="w-4 h-4" />
                <span>匯入銷售報表 (Excel)</span>
                <input 
                  type="file" 
                  accept=".xlsx,.xls,.csv" 
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-600">總銷售額</p>
                  <p className="text-2xl font-bold text-blue-700">
                    ${summary.totalSales.toLocaleString()}
                  </p>
                </div>
              </div>
              
              <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Package className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-600">總銷量</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {summary.totalQuantity.toLocaleString()} 件
                  </p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-green-600">訂單數</p>
                  <p className="text-2xl font-bold text-green-700">
                    {summary.totalOrders.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-orange-600">平均單價</p>
                  <p className="text-2xl font-bold text-orange-700">
                    ${summary.avgOrderValue.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="搜尋產品名稱、JAN碼或訂單編號..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="sm:w-48 relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Sales Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">日期 / 訂單號</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">產品</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">數量</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">單價</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">總額</th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">渠道</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      沒有找到相關銷售記錄
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale, index) => (
                    <tr key={`${sale.saleId}-${index}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{sale.date}</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">{sale.saleId}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 line-clamp-2 max-w-[300px]" title={sale.productName}>
                          {sale.productName}
                        </div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">{sale.janCode}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900 font-medium">
                        {sale.quantity}
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-500">
                        ${sale.unitPrice.toFixed(1)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                        ${sale.totalAmount.toFixed(1)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {sale.channel}
                        </span>
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

function AlertTriangle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
}
