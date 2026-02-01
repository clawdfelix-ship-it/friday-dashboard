'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Truck, 
  Search,
  Plus,
  Check,
  Clock,
  Package,
  Filter,
  Download,
  Eye,
  MessageCircle
} from 'lucide-react'

interface PurchaseOrder {
  id: string
  poNumber: string
  supplier: string
  date: string
  expectedDate: string
  status: 'pending' | 'ordered' | 'shipped' | 'received' | 'cancelled'
  items: POItem[]
  totalCost: number
  notes: string
}

interface POItem {
  janCode: string
  productName: string
  quantity: number
  unitCost: number
  totalCost: number
}

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  ordered: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  received: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
}

const STATUS_LABELS = {
  pending: '待處理',
  ordered: '已落單',
  shipped: '已出貨',
  received: '已到貨',
  cancelled: '已取消'
}

export default function OrdersPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)

  // Form state
  const [newOrder, setNewOrder] = useState({
    poNumber: '',
    supplier: '',
    expectedDate: '',
    notes: '',
    items: [] as POItem[]
  })

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/orders')
      if (res.ok) {
        const data = await res.json()
        setOrders(data.orders || [])
      }
    } catch (err) {
      console.error('Failed to load orders', err)
      // Try localStorage
      const local = localStorage.getItem('purchase_orders')
      if (local) {
        setOrders(JSON.parse(local).orders || [])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const saveOrders = async (updatedOrders: PurchaseOrder[]) => {
    setOrders(updatedOrders)
    localStorage.setItem('purchase_orders', JSON.stringify({ orders: updatedOrders }))
    
    try {
      await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: updatedOrders })
      })
    } catch (e) {
      console.error('Failed to sync orders to server', e)
    }
  }

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' || 
      order.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === '' || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    ordered: orders.filter(o => o.status === 'ordered').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    received: orders.filter(o => o.status === 'received').length
  }

  const handleAddOrder = () => {
    if (!newOrder.poNumber || !newOrder.supplier) return
    
    const order: PurchaseOrder = {
      id: `PO${Date.now()}`,
      poNumber: newOrder.poNumber,
      supplier: newOrder.supplier,
      date: new Date().toISOString().split('T')[0],
      expectedDate: newOrder.expectedDate || '',
      status: 'ordered',
      items: newOrder.items,
      totalCost: newOrder.items.reduce((sum, item) => sum + item.totalCost, 0),
      notes: newOrder.notes
    }

    saveOrders([order, ...orders])
    setNewOrder({ poNumber: '', supplier: '', expectedDate: '', notes: '', items: [] })
    setShowForm(false)
  }

  const updateStatus = (orderId: string, newStatus: PurchaseOrder['status']) => {
    const updated = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
    saveOrders(updated)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-gray-900">訂貨記錄</h1>
              <p className="text-sm text-gray-500">Purchase Orders & 供應商訂單</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">總訂單</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">待處理</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">已落單</p>
            <p className="text-2xl font-bold text-blue-600">{stats.ordered}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">已出貨</p>
            <p className="text-2xl font-bold text-purple-600">{stats.shipped}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <p className="text-gray-500 text-sm">已到貨</p>
            <p className="text-2xl font-bold text-green-600">{stats.received}</p>
          </div>
        </div>

        {/* WhatsApp Quick Create */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <MessageCircle className="w-5 h-5 text-green-600 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-800 mb-1">WhatsApp 快速落單</h3>
              <p className="text-sm text-green-700 mb-3">
                發送訊息給 Friday:
              </p>
              <div className="bg-white rounded p-3 text-sm font-mono text-gray-700">
                <p>落單</p>
                <p>供應商: MASA</p>
                <p>498703568441要50</p>
                <p>4902888731983要100</p>
                <p>預計: 2026-02-10</p>
              </div>
              <p className="text-xs text-green-600 mt-2">
                Friday 會自動識別 "CODE要Qty" 格式，創建訂單
              </p>
            </div>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜尋 PO Number / 供應商..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">全部狀態</option>
                <option value="pending">待處理</option>
                <option value="ordered">已落單</option>
                <option value="shipped">已出貨</option>
                <option value="received">已到貨</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
            <button 
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
            >
              <Plus className="w-4 h-4" />
              新增訂單
            </button>
          </div>
        </div>

        {/* New Order Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">新增訂單</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PO Number *</label>
                <input
                  type="text"
                  value={newOrder.poNumber}
                  onChange={(e) => setNewOrder({...newOrder, poNumber: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  placeholder="例如: PO-2026-0201"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">供應商 *</label>
                <input
                  type="text"
                  value={newOrder.supplier}
                  onChange={(e) => setNewOrder({...newOrder, supplier: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  placeholder="例如: MASA / 金川"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">預計到貨</label>
                <input
                  type="date"
                  value={newOrder.expectedDate}
                  onChange={(e) => setNewOrder({...newOrder, expectedDate: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
                <input
                  type="text"
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder({...newOrder, notes: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                  placeholder="其他備註..."
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleAddOrder}
                className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600"
              >
                確認新增
              </button>
              <button 
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <Clock className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-4" />
              <p className="text-gray-500">載入中...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center">
              <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">暫無訂單記錄</p>
              <p className="text-sm text-gray-400">點擊「新增訂單」創建第一筆訂單</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">PO Number</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">供應商</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">日期</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">預計到貨</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">狀態</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">金額</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900 font-mono">{order.poNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{order.supplier}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{order.date}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{order.expectedDate || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                          {STATUS_LABELS[order.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                        HK$ {order.totalCost.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button 
                            onClick={() => setSelectedOrder(order)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="詳情"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <select
                            value={order.status}
                            onChange={(e) => updateStatus(order.id, e.target.value as PurchaseOrder['status'])}
                            className="text-xs border border-gray-200 rounded px-2 py-1"
                          >
                            <option value="pending">待處理</option>
                            <option value="ordered">已落單</option>
                            <option value="shipped">已出貨</option>
                            <option value="received">已到貨</option>
                            <option value="cancelled">已取消</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Order Detail Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">訂單詳情</h2>
                  <button onClick={() => setSelectedOrder(null)} className="text-gray-400 hover:text-gray-600">
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">PO Number</p>
                    <p className="font-mono font-medium">{selectedOrder.poNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">供應商</p>
                    <p className="font-medium">{selectedOrder.supplier}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">落單日期</p>
                    <p>{selectedOrder.date}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">預計到貨</p>
                    <p>{selectedOrder.expectedDate || '-'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-2">產品清單</p>
                  {selectedOrder.items.length === 0 ? (
                    <p className="text-gray-400 text-sm">無產品資料</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-2 text-left">JAN Code</th>
                          <th className="px-3 py-2 text-left">產品名稱</th>
                          <th className="px-3 py-2 text-right">數量</th>
                          <th className="px-3 py-2 text-right">金額</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items.map((item, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-2 font-mono">{item.janCode}</td>
                            <td className="px-3 py-2">{item.productName}</td>
                            <td className="px-3 py-2 text-right">{item.quantity}</td>
                            <td className="px-3 py-2 text-right">HK$ {item.totalCost}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-500">總金額</p>
                  <p className="text-2xl font-bold text-green-600">HK$ {selectedOrder.totalCost.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
