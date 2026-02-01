// Order Parser Utility for WhatsApp Integration
// Usage: Parse order messages and create order records

import fs from 'fs'
import path from 'path'

interface OrderItem {
  janCode: string
  productName: string
  quantity: number
  unitCost: number
  totalCost: number
}

export interface PurchaseOrder {
  id: string
  poNumber: string
  supplier: string
  date: string
  expectedDate: string
  status: 'pending' | 'ordered' | 'shipped' | 'received' | 'cancelled'
  items: OrderItem[]
  totalCost: number
  notes: string
}

interface ParseResult {
  success: boolean
  supplier?: string
  poNumber?: string
  expectedDate?: string
  items?: OrderItem[]
  totalCost?: number
  error?: string
}

export function parseOrderMessage(message: string): ParseResult {
  const result: ParseResult = { success: false }
  
  // Load inventory for matching
  const dataPath = path.join(process.cwd(), 'public', 'data.json')
  const inventory = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
  const inventoryMap: Record<string, any> = {}
  inventory.inventory.forEach((item: any) => {
    inventoryMap[item.janCode] = item
  })

  // Extract Supplier
  const supplierMatch = message.match(/供應商[: ]*([^\n,，]+)/i) || message.match(/Supplier[: ]*([^\n,，]+)/i)
  if (supplierMatch) {
    result.supplier = supplierMatch[1].trim()
  } else {
    // Try to infer from message context
    const suppliers = ['MASA', '金川', 'AIA', 'BT', 'CO.CROPS']
    for (const s of suppliers) {
      if (message.toLowerCase().includes(s.toLowerCase())) {
        result.supplier = s
        break
      }
    }
  }

  // Extract PO Number
  const poMatch = message.match(/PO[-: ]*([A-Z0-9-]+)/i) || message.match(/訂單編號[: ]*([A-Z0-9-]+)/i)
  if (poMatch) {
    result.poNumber = poMatch[1]
  }

  // Extract Expected Date
  const dateMatch = message.match(/預計[: ]*(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/) || message.match(/到貨[: ]*(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/)
  if (dateMatch) {
    result.expectedDate = dateMatch[1].replace(/\//g, '-')
  }

  // Extract products with JAN code and quantity
  // Patterns: 
  // - "CODE要Qty" (MASA format: 498703568441要50)
  // - "JAN x Qty" or "Qty x JAN"
  // - "Name (JAN) Qty"
  const patterns = [
    /(\d{8,13})\s*要\s*(\d+)/g,                        // MASA format: JAN要Qty
    /(\d{8,13})\s*[xX*]\s*(\d+)/g,                    // JAN x Qty
    /(\d+)\s*[xX*]\s*(\d{8,13})/g,                    // Qty x JAN
    /([^\n(]+)\s*\((\d{8,13})\)\s*[:：]?\s*(\d+)/g,   // Name (JAN) Qty
  ]

  // Detect MASA format (CODE要Qty) first
  const masaPattern = /(\d{8,13})\s*要\s*(\d+)/g
  let masaMatch
  while ((masaMatch = masaPattern.exec(message)) !== null) {
    const janCode = masaMatch[1]
    const quantity = parseInt(masaMatch[2])
    
    if (janCode && quantity > 0 && inventoryMap[janCode]) {
      const invItem = inventoryMap[janCode]
      result.items.push({
        janCode: janCode,
        productName: invItem.productName || janCode,
        quantity: quantity,
        unitCost: invItem.unitCostJPY ? invItem.unitCostJPY * 0.055 : 0,
        totalCost: 0
      })
    }
  }

  // If no MASA format found, try other patterns
  if (result.items.length === 0) {
    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(message)) !== null) {
        let janCode = ''
        let quantity = 0
        let productName = ''

        if (match[3]) {
          productName = match[1].trim()
          janCode = match[2]
          quantity = parseInt(match[3])
        } else {
          janCode = match[1]
          quantity = parseInt(match[2])
        }

        if (janCode && quantity > 0 && inventoryMap[janCode]) {
          const invItem = inventoryMap[janCode]
          result.items.push({
            janCode: janCode,
            productName: invItem.productName || productName,
            quantity: quantity,
            unitCost: invItem.unitCostJPY ? invItem.unitCostJPY * 0.055 : 0,
            totalCost: 0
          })
        }
      }
    }
  }

  if (!result.supplier) {
    return { success: false, error: '找不到供應商 (請輸入: 供應商: XXX)' }
  }

  if (!result.items || result.items.length === 0) {
    return { success: false, error: '找不到產品 (請輸入: JAN Code x 數量)' }
  }

  // Calculate costs
  result.items.forEach(item => {
    item.totalCost = item.unitCost * item.quantity
  })
  result.totalCost = result.items.reduce((sum, item) => sum + item.totalCost, 0)
  result.success = true

  return result
}

export function createOrder(parsed: ParseResult, notes: string = 'Via WhatsApp'): PurchaseOrder {
  const now = new Date()
  return {
    id: 'PO' + now.getTime(),
    poNumber: parsed.poNumber || 'PO' + now.getTime().toString().slice(-6),
    supplier: parsed.supplier || 'Unknown',
    date: now.toISOString().split('T')[0],
    expectedDate: parsed.expectedDate || '',
    status: 'ordered',
    items: parsed.items || [],
    totalCost: parsed.totalCost || 0,
    notes: notes
  }
}

export function saveOrder(order: PurchaseOrder) {
  const ordersPath = path.join(process.cwd(), 'public', 'orders.json')
  let orders = { orders: [] as PurchaseOrder[] }
  
  if (fs.existsSync(ordersPath)) {
    orders = JSON.parse(fs.readFileSync(ordersPath, 'utf-8'))
  }

  orders.orders = [order, ...orders.orders]
  fs.writeFileSync(ordersPath, JSON.stringify(orders, null, 2))
  
  return order
}

// Example usage for Friday AI:
// 1. User sends: "落單 供應商: MASA PO: PO-2026-0201 4902888731983 x 50"
// 2. Call: parseOrderMessage(message)
// 3. If success: createOrder(parsed), then saveOrder(order)
// 4. Reply: "[OK] 訂單已創建: PO-2026-0201 | MASA | 1項產品 | HK$ xxx"
