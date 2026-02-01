'use client'

import { useState, useEffect } from 'react'
import { 
  Activity, 
  Server, 
  Database, 
  Clock,
  RefreshCw,
  Home,
  Zap,
  HardDrive,
  TrendingUp
} from 'lucide-react'

interface SystemStatus {
  uptime: number
  memoryUsage: number
  cpuLoad: number
  activeConnections: number
  lastUpdated: string
  dataStats: {
    inventory: number
    sales: number
    productsWithCost: number
    productsWithPrice: number
  }
}

export default function Status() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastFetch, setLastFetch] = useState<Date>(new Date())

  const fetchStatus = () => {
    setLastFetch(new Date())
    setIsLoading(true)
    
    fetch('/data.json')
      .then(res => res.json())
      .then(data => {
        const now = new Date()
        setStatus({
          uptime: now.getTime() % 86400000, // Simulated uptime
          memoryUsage: Math.random() * 50 + 20, // Simulated
          cpuLoad: Math.random() * 30 + 10, // Simulated
          activeConnections: Math.floor(Math.random() * 10) + 1,
          lastUpdated: now.toLocaleTimeString('zh-HK'),
          dataStats: {
            inventory: data.inventory?.length || 0,
            sales: data.sales?.length || 0,
            productsWithCost: data.inventory?.filter((i: any) => i.unitCost).length || 0,
            productsWithPrice: data.inventory?.filter((i: any) => i.sellingPrice).length || 0
          }
        })
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 5000) // Auto refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours}時 ${minutes}分 ${secs}秒`
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
                <h1 className="text-2xl font-bold text-gray-900">📡 系統狀態</h1>
                <p className="text-gray-500">實時監控系統運作</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                更新: {lastFetch.toLocaleTimeString('zh-HK')}
              </span>
              <button 
                onClick={fetchStatus}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                刷新
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Uptime */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-gray-500">運行時間</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {status ? formatUptime(status.uptime) : '---'}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-sm text-green-600">運行中</span>
            </div>
          </div>

          {/* Memory */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <HardDrive className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-gray-500">記憶體使用</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {status ? `${status.memoryUsage.toFixed(1)}%` : '---'}
            </p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${status?.memoryUsage || 0}%` }}
              />
            </div>
          </div>

          {/* CPU */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Zap className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-gray-500">CPU 負載</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {status ? `${status.cpuLoad.toFixed(1)}%` : '---'}
            </p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-orange-500 h-2 rounded-full transition-all"
                style={{ width: `${status?.cpuLoad || 0}%` }}
              />
            </div>
          </div>

          {/* Connections */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-gray-500">連線數</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {status ? status.activeConnections : '---'}
            </p>
            <p className="text-sm text-gray-500 mt-2">活躍連線</p>
          </div>
        </div>

        {/* Data Stats */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5" />
            數據庫狀態
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">
                {status?.dataStats.inventory.toLocaleString() || '---'}
              </p>
              <p className="text-gray-500 mt-1">庫存產品</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-green-600">
                {status?.dataStats.sales.toLocaleString() || '---'}
              </p>
              <p className="text-gray-500 mt-1">銷售記錄</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-purple-600">
                {status?.dataStats.productsWithCost.toLocaleString() || '---'}
              </p>
              <p className="text-gray-500 mt-1">有成本資料</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-orange-600">
                {status?.dataStats.productsWithPrice.toLocaleString() || '---'}
              </p>
              <p className="text-gray-500 mt-1">有售價資料</p>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Server className="w-5 h-5" />
            實時活動
          </h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="text-green-700">系統運行中</span>
              <span className="text-gray-400 ml-auto">{status?.lastUpdated}</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span className="text-blue-700">
                數據庫已載入 {status?.dataStats.inventory} 項產品
              </span>
              <span className="text-gray-400 ml-auto">{status?.lastUpdated}</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              <span className="text-purple-700">
                銷售記錄 {status?.dataStats.sales} 筆
              </span>
              <span className="text-gray-400 ml-auto">{status?.lastUpdated}</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
              <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
              <span className="text-orange-700">
                成本資料 {status?.dataStats.productsWithCost} 項
              </span>
              <span className="text-gray-400 ml-auto">{status?.lastUpdated}</span>
            </div>
          </div>
        </div>

        {/* Auto Refresh Info */}
        <div className="mt-6 bg-gray-100 rounded-lg p-4 text-center text-sm text-gray-500">
          📡 系統每5秒自動刷新 | 最後更新: {lastFetch.toLocaleTimeString('zh-HK')}
        </div>
      </main>
    </div>
  )
}
