import { NextRequest, NextResponse } from 'next/server'
import { getOrders, addOrder, setData } from '../../../lib/redis'

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

    // Parse order from message
    const parsed = parseOrderMessage(message)

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
      notes: 'Via WhatsApp'
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

function parseOrderMessage(message: string) {
  const result: any = {
    status: 'ordered',
    items: [],
    date: new Date().toISOString().split('T')[0]
  }

  // Extract PO Number
  const poMatch = message.match(/PO[-: ]*([A-Z0-9-]+)/i)
  if (poMatch) result.poNumber = poMatch[1]

  // Extract Supplier
  const supplierMatch = message.match(/供應商[: ]*([^\n,，]+)/i) || message.match(/Supplier[: ]*([^\n,，]+)/i)
  if (supplierMatch) result.supplier = supplierMatch[1].trim()

  // Extract Expected Date
  const dateMatch = message.match(/預計[: ]*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/) || message.match(/到貨[: ]*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/)
  if (dateMatch) result.expectedDate = dateMatch[1].replace(/\//g, '-')

  // MASA format: "CODE要Qty"
  const masaPattern = /(\d{8,13})\s*要\s*(\d+)/g
  let match
  while ((match = masaPattern.exec(message)) !== null) {
    result.items.push({
      janCode: match[1],
      productName: 'Unknown Item', // In real app, look up from DB
      quantity: parseInt(match[2]),
      unitCost: 0,
      totalCost: 0
    })
  }

  return result
}
