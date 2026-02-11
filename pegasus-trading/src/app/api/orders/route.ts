import { NextRequest, NextResponse } from 'next/server'
import { getOrders, addOrder, setData, getInventory } from '../../../lib/redis'

interface OrderItem {
  janCode: string
  productName: string
  quantity: number
  unitCost: number
  totalCost: number
}

interface PurchaseOrder {
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

export async function GET() {
  try {
    const data = await getOrders()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get orders' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { orders } = body
    
    if (!Array.isArray(orders)) {
      return NextResponse.json({ error: 'Invalid orders data' }, { status: 400 })
    }
    
    await setData('orders', { orders })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving orders:', error)
    return NextResponse.json({ error: 'Failed to save orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, from } = body

    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 })
    }

    // Fetch inventory for lookup
    const inventoryData = await getInventory()
    let inventory = []
    if (Array.isArray(inventoryData)) {
      inventory = inventoryData
    } else if (inventoryData && inventoryData.inventory) {
      inventory = inventoryData.inventory
    }

    const inventoryMap = new Map()
    inventory.forEach((item: any) => {
      if (item.janCode) inventoryMap.set(String(item.janCode).trim(), item)
    })

    // Parse order from message
    const parsed = await parseOrderMessage(message, inventoryMap)

    if (!parsed.supplier || !parsed.items || parsed.items.length === 0) {
      return NextResponse.json({ 
        error: 'Could not parse order',
        hint: 'Please include: 供應商, JAN Code, 數量',
        parsed
      }, { status: 400 })
    }

    // Create order
    const newOrder: PurchaseOrder = {
      id: 'PO' + Date.now(),
      poNumber: parsed.poNumber || 'PO' + Date.now().toString().slice(-6),
      supplier: parsed.supplier || 'Unknown',
      date: parsed.date || new Date().toISOString().split('T')[0],
      expectedDate: parsed.expectedDate || '',
      status: 'ordered',
      items: parsed.items || [],
      totalCost: parsed.totalCost || 0,
      notes: from ? `Via ${from}` : 'Via Quick Order'
    }

    await addOrder(newOrder)

    return NextResponse.json({
      success: true,
      order: newOrder,
      message: `[OK] 訂單已創建: ${newOrder.poNumber}\n供應商: ${newOrder.supplier}\n產品數: ${newOrder.items.length}\n總金額: HK$ ${newOrder.totalCost.toFixed(2)}`
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

async function parseOrderMessage(message: string, inventoryMap: Map<string, any>) {
  const result: any = {
    status: 'ordered',
    items: [],
    date: new Date().toISOString().split('T')[0]
  }

  // Extract PO Number
  const poMatch = message.match(/PO[-: ]*([A-Z0-9-]+)/i) || message.match(/訂單編號[: ]*([A-Z0-9-]+)/i)
  if (poMatch) result.poNumber = poMatch[1]

  // Extract Supplier
  // 1. Explicit tag
  let supplierMatch = message.match(/供應商[: ]*([^\n,，]+)/i) || message.match(/Supplier[: ]*([^\n,，]+)/i)
  if (supplierMatch) {
    result.supplier = supplierMatch[1].trim()
  } else {
    // 2. Inference from header (e.g. "MEGA 補貨 MASA:") or keywords
    const suppliers = ['MASA', '金川', 'AIA', 'BT', 'CO.CROPS', 'MEGA']
    for (const s of suppliers) {
      if (message.toLowerCase().includes(s.toLowerCase())) {
        result.supplier = s
        break
      }
    }
  }

  // Extract Expected Date
  const dateMatch = message.match(/預計[: ]*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/) || message.match(/到貨[: ]*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/)
  if (dateMatch) result.expectedDate = dateMatch[1].replace(/\//g, '-')

  // Extract Items
  // Patterns: 
  // 1. MASA format: "CODE要Qty" (e.g. 498703568441要50)
  // 2. Standard: "JAN x Qty" or "Qty x JAN"
  
  const patterns = [
    /(\d{8,13})\s*要\s*(\d+)/g,                        // MASA format: JAN要Qty
    /(\d{8,13})\s*[xX*]\s*(\d+)/g,                    // JAN x Qty
    /(\d+)\s*[xX*]\s*(\d{8,13})/g,                    // Qty x JAN
  ]

  // Track added items to avoid duplicates if multiple patterns match (though usually distinct)
  // But regex loop is sequential.
  
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(message)) !== null) {
      let janCode = ''
      let quantity = 0

      // Determine which group is JAN and which is Qty
      if (pattern.source.startsWith('(\\d+)')) { // Pattern 3: Qty x JAN
        quantity = parseInt(match[1])
        janCode = match[2]
      } else {
        janCode = match[1]
        quantity = parseInt(match[2])
      }

      if (janCode && quantity > 0) {
        // Look up product info
        const invItem = inventoryMap.get(janCode)
        const productName = invItem?.productName || 'Unknown Item'
        // Cost: use JPY cost * 0.055 exchange rate, or 0 if not found
        const unitCost = invItem?.unitCostJPY ? invItem.unitCostJPY * 0.055 : 0
        
        result.items.push({
          janCode,
          productName,
          quantity,
          unitCost,
          totalCost: unitCost * quantity
        })
      }
    }
  }

  // Calculate total cost
  result.totalCost = result.items.reduce((sum: number, item: any) => sum + item.totalCost, 0)

  return result
}
