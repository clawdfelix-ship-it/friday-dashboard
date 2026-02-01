'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  Settings,
  Activity,
  Plus,
  Truck,
  Globe,
  Menu,
  X
} from 'lucide-react'
import { useState } from 'react'

export default function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { icon: LayoutDashboard, label: '數據總覽', href: '/' },
    { icon: Package, label: '庫存管理', href: '/inventory' },
    { icon: ShoppingCart, label: '銷售記錄', href: '/sales' },
    { icon: Globe, label: '商品爬蟲', href: '/crawler' },
    { icon: TrendingUp, label: '銷售預測', href: '/predictions' },
    { icon: AlertTriangle, label: '低庫存警報', href: '/alerts' },
    { icon: Plus, label: '補貨入庫', href: '/restock' },
    { icon: Truck, label: '訂貨記錄', href: '/orders' },
    { icon: FileSpreadsheet, label: '成本分析', href: '/reports' },
    { icon: Activity, label: '系統狀態', href: '/status' },
  ]

  return (
    <>
      {/* Mobile Menu Button */}
      <button 
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar Overlay for Mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 z-40 h-screen bg-white border-r transition-transform duration-300 ease-in-out
        w-64 lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          {/* Logo / Header */}
          <div className="p-6 border-b">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>🐴</span>
              Pegasus Trading
            </h1>
            <p className="text-xs text-gray-500 mt-1">MEGAOUTLET System</p>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-blue-50 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                  `}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Footer User Profile (Static for now) */}
          <div className="p-4 border-t bg-gray-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                A
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">管理員</p>
                <p className="text-xs text-gray-500">admin@pegasus.com</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
