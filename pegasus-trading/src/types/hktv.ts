// HKTVmall Inventory Types
export interface HKTVProduct {
  storeId: string
  productId: string
  skuId: string
  brandNameEn: string
  brandNameCh: string
  brandNameSc: string
  skuNameCh: string
  skuNameEn: string
  status: string
  deliveryMethod: string
  visibility: string
  sellStatus: string
  merchantQty: number
  plQty: number
  consignmentQty: number
  merchantInProcess: number
  plInProcess: number
  consignmentInProcess: number
  updateTime: Date
  merchantName: string
}

// Aggregated inventory for dashboard
export interface AggregatedInventory {
  productId: string
  janCode: string
  brandName: string
  productName: string
  totalStock: number
  location: string
  lastUpdated: Date
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
}

// Sales data types
export interface DailySale {
  saleId: string
  productId: string
  quantity: number
  unitPrice: number
  totalAmount: number
  saleDate: Date
  channel: string
}

// Invoice types
export interface Invoice {
  invoiceId: string
  invoiceNumber: string
  supplier: string
  productId: string
  quantity: number
  unitCost: number
  totalCost: number
  invoiceDate: Date
  status: 'pending' | 'paid' | 'cancelled'
}

// Prediction types
export interface InventoryPrediction {
  productId: string
  productName: string
  currentStock: number
  avgDailySales: number
  predicted30DaySales: number
  daysUntilStockout: number
  recommendedReorder: number
  confidence: number
}
