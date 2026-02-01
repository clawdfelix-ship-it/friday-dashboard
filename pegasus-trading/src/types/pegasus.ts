// Pegasus Trading - HKTVmall Sales & Inventory Types

// Sales Order Types
export interface HKTVOrder {
  orderDate: Date
  orderNo: string
  combinedOrderNo: string
  productId: string
  productName: string
  brand: string
  category: string
  productCode: string
  deliveryDate: Date
  quantity: number
  unitPrice: number
  discount: number
  netAmount: number
  commission: number
  payment: number
  orderStatus: string
  deliveryFee: number
  platformFee: number
  netRevenue: number
  deliveryMethod: string
  isSampleOrder: string
}

// Aggregated Sales Data
export interface DailySalesSummary {
  date: string
  totalOrders: number
  totalQuantity: number
  totalRevenue: number
  totalNetRevenue: number
}

export interface ProductSalesSummary {
  productId: string
  productName: string
  brand: string
  category: string
  totalQuantity: number
  totalRevenue: number
  avgUnitPrice: number
  orderCount: number
}

// Inventory Types (from HKTVmall inventory export)
export interface HKTVInventory {
  storeId: string
  productId: string
  skuId: string
  brandNameEn: string
  brandNameCh: string
  skuNameCh: string
  skuNameEn: string
  status: string
  deliveryMethod: string
  visibility: string
  sellStatus: string
  merchantQty: number
  plQty: number
  consignmentQty: number
  inProcessQty: number
  updateTime: Date
}

// Aggregated Inventory
export interface InventorySummary {
  productId: string
  janCode: string
  brandName: string
  productName: string
  totalStock: number
  sellableStock: number
  inProcessStock: number
  location: string
  lastUpdated: Date
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
}

// Prediction Types
export interface SalesPrediction {
  productId: string
  productName: string
  currentStock: number
  avgDailySales: number
  predictedDailySales: number
  predicted30DayDemand: number
  daysUntilStockout: number
  recommendedReorder: number
  confidence: number
  trend: 'up' | 'down' | 'stable'
}

// Dashboard Stats
export interface DashboardStats {
  todaySales: number
  todayRevenue: number
  monthSales: number
  monthRevenue: number
  monthOrders: number
  avgOrderValue: number
  topProducts: ProductSalesSummary[]
  lowStockCount: number
  revenueGrowth: number
  orderGrowth: number
}

// Invoice Types
export interface InvoiceItem {
  itemCode: string
  itemDescription: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Invoice {
  invoiceNo: string
  invoiceDate: Date
  supplier: string
  items: InvoiceItem[]
  totalAmount: number
}
