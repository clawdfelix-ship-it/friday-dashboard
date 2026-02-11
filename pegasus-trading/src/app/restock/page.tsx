'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Package, 
  Upload,
  History
} from 'lucide-react'

interface RestockRecord {
  id: string
  date: string
  janCode: string
  productName: string
  quantity: number
  supplier: string
  poNumber: string
  notes: string
}

interface ProductInfo {
  janCode: string
  productName: string
  currentStock: number
  unitCost?: number
}

export default function RestockPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<ProductInfo[]>([])
  const [restockHistory, setRestockHistory] = useState<RestockRecord[]>([])
  const [supplier, setSupplier] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [uploadResult, setUploadResult] = useState<{success: number, failed: number} | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // 1. Fetch products from API (Redis) instead of static JSON
      const prodRes = await fetch('/api/products')
      const prodData = await prodRes.json()
      
      let items = []
      if (Array.isArray(prodData)) {
        items = prodData
      } else if (prodData && prodData.inventory) {
        items = prodData.inventory
      }
      
      // Normalize product data
      const normalizedProducts = items.map((p: any) => ({
        janCode: p.janCode,
        productName: p.productName,
        currentStock: parseInt(p.quantity || p.totalStock || 0),
        unitCost: p.unitCost
      }))
      
      setProducts(normalizedProducts)
      
      // 2. Fetch Restock History from API (Redis) instead of localStorage
      const historyRes = await fetch('/api/restock-history')
      if (historyRes.ok) {
        const historyData = await historyRes.json()
        
        const rawRecords = historyData.records || []
        const flattenedRecords: RestockRecord[] = []
        
        rawRecords.forEach((batch: any) => {
          if (batch.items && Array.isArray(batch.items)) {
            batch.items.forEach((item: any) => {
              // Find product name
              const product = normalizedProducts.find((p: any) => p.janCode === item.janCode)
              
              flattenedRecords.push({
                id: batch.id + '-' + item.janCode,
                date: batch.date ? batch.date.split('T')[0] : '',
                janCode: item.janCode,
                productName: product?.productName || item.productName || 'Unknown',
                quantity: item.quantity,
                supplier: batch.supplier,
                poNumber: batch.poNumber,
                notes: batch.itemCount > 1 ? `Batch of ${batch.itemCount} items` : ''
              })
            })
          } else {
             flattenedRecords.push(batch)
          }
        })
        
        // Sort by date desc
        flattenedRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        
        setRestockHistory(flattenedRecords)
      }
      
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('supplier', supplier)
      formData.append('poNumber', poNumber)

      const response = await fetch('/api/restock-excel', {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        setUploadResult({ success: result.success, failed: result.failed || 0 })
        await loadData()
        setSuccessMsg('[OK] 批量入庫完成: 成功 ' + result.success + ' 項')
        setTimeout(() => setSuccessMsg(''), 5000)
      } else {
        alert('[X] 上傳失敗')
      }
    } catch (err) {
      alert('[X] 上傳錯誤')
    } finally {
      setIsLoading(false)
      event.target.value = ''
    }
  }

  const totalRestocked = restockHistory.reduce((sum, r) => sum + r.quantity, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">補貨入庫</h1>
              <p className="text-sm text-gray-500">Excel 批量入庫</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {successMsg && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800">{successMsg}</p>
          </div>
        )}

        {uploadResult && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800">
              [OK] 批量入庫結果: 成功 {uploadResult.success} 項
              {uploadResult.failed > 0 && ', 失敗 ' + uploadResult.failed + ' 項 (JAN code 未找到)'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">上傳 Excel 批量入庫</h2>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 mb-2">Excel 格式要求（日本 Invoice）：</p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>- 系統會自動偵測 JAN Code (8-13位數字)</li>
                  <li>- 自動偵測數量 (整數)</li>
                  <li>- 支援任何欄位順序</li>
                  <li>- 第一行可以是 Invoice 標題</li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">供應商</label>
                  <input
                    type="text"
                    value={supplier}
                    onChange={(e) => setSupplier(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    placeholder="例如: MASA / 金川"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                    placeholder="例如: PO-2026-0201"
                  />
                </div>
              </div>

              <label className="flex items-center justify-center gap-2 px-4 py-6 bg-green-500 text-white rounded-lg cursor-pointer hover:bg-green-600 transition-colors">
                <Upload className="w-5 h-5" />
                <span className="font-medium">選擇 Excel 文件</span>
                <input 
                  type="file" 
                  accept=".xlsx,.xls" 
                  onChange={handleExcelUpload}
                  className="hidden"
                />
              </label>

              {isLoading && (
                <div className="mt-4 text-center text-gray-500">
                  處理中...
                </div>
              )}
            </div>
          </div>

          {/* History */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                <History className="w-4 h-4" />
                <span className="text-sm">入庫歷史</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                {restockHistory.length} 筆記錄
              </p>
              <p className="text-sm text-gray-500">
                總入庫: {totalRestocked} 件
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-semibold mb-4">最近入庫</h3>
              {restockHistory.length === 0 ? (
                <p className="text-gray-500 text-sm">暫無入庫記錄</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {restockHistory.slice(0, 20).map(record => (
                    <div key={record.id} className="border-b pb-3 last:border-b-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{record.productName ? record.productName.substring(0, 15) : ''}...</span>
                        <span className="text-green-600 font-medium">+{record.quantity}</span>
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        <span>{record.date}</span>
                        {record.supplier && <span className="ml-2">| {record.supplier}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
