// Product Types
export interface Product {
  id: string
  janCode: string
  name: string
  category: string
  costPrice: number
  sellingPrice: number
  supplier: string
  createdAt: Date
  updatedAt: Date
}

// Inventory Types
export interface InventoryItem {
  productId: string
  quantity: number
  location: string
  lastUpdated: Date
}

// Sales Types
export interface Sale {
  id: string
  productId: string
  quantity: number
  unitPrice: number
  totalAmount: number
  saleDate: Date
  channel: 'online' | 'offline' | 'wholesale'
}

// Invoice Types
export interface Invoice {
  id: string
  invoiceNumber: string
  supplierId: string
  items: InvoiceItem[]
  totalAmount: number
  invoiceDate: Date
  status: 'pending' | 'paid' | 'cancelled'
}

export interface InvoiceItem {
  productId: string
  quantity: number
  unitCost: number
  totalCost: number
}

// Prediction Types
export interface SalesPrediction {
  productId: string
  productName: string
  currentStock: number
  predictedDemand: number
  daysUntilStockout: number
  recommendedReorder: number
  confidence: number
}

// Dashboard Stats
export interface DashboardStats {
  totalProducts: number
  totalInventoryValue: number
  todaySales: number
  todayRevenue: number
  monthSales: number
  monthRevenue: number
  lowStockCount: number
  topSellingProducts: ProductSalesData[]
}

export interface ProductSalesData {
  productId: string
  productName: string
  totalQuantity: number
  totalRevenue: number
}
