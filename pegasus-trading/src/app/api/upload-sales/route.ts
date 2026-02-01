import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getInventory, setInventory, getSales, setSales } from '../../../lib/redis'

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('Processing file:', file.name, 'size:', file.size)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Parse Excel
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    
    // Convert to JSON array of arrays first to find header
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
    
    console.log('Total raw rows:', rawData.length)
    
    // Find header row index with improved scoring
    let headerRowIndex = 0
    let maxMatches = 0
    
    const keywords = [
      'order id', 'order number', '訂單編號', 'ref no', 'invoice no',
      'jan', 'sku', 'product code', 'item code', 'merchant sku', 'jan code', 'sku id',
      'product name', 'item name', '產品名稱', '商品名稱', 'sku name',
      'quantity', 'qty', '數量',
      'unit price', 'price', '單價',
      'total amount', 'total', '總額', '金額',
      'order date', 'date', '日期'
    ]

    for (let i = 0; i < Math.min(30, rawData.length); i++) {
      const row = rawData[i]
      if (!Array.isArray(row)) continue
      
      const rowStr = JSON.stringify(row).toLowerCase()
      let matches = 0
      
      keywords.forEach(kw => {
        if (rowStr.includes(kw)) matches++
      })
      
      if (matches > maxMatches) {
        maxMatches = matches
        headerRowIndex = i
      }
    }
    
    // If we found a row with multiple keyword matches, use it. Otherwise default to 0.
    const foundHeader = maxMatches >= 2
    if (!foundHeader) headerRowIndex = 0
    
    console.log('Found header at row:', headerRowIndex, `(matches: ${maxMatches})`)
    
    // Re-parse with correct header row
    const data = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex })
    
    if (data.length > 0) {
      console.log('First data row keys:', Object.keys(data[0] as object))
    }

    // Process sales records
    const records = data.map((row: any, index) => {
      // Helper to handle keys with newlines or extra spaces
      const getValue = (keys: string[]) => {
        for (const key of keys) {
          if (row[key] !== undefined && row[key] !== null) return row[key]
        }
        return undefined
      }

      // Try different column names (including HKTVmall specific formats with newlines)
      const saleId = getValue(['Order ID', 'saleId', '訂單編號', 'Order Number', 'Invoice No.', 'Ref No.']) || `SALE-${Date.now()}-${index}`
      
      // Date parsing
      let date = getValue(['Order Date', 'date', '日期', 'Order Time', 'Date'])
      // Handle Excel serial date
      if (typeof date === 'number') {
        const d = new Date(Math.round((date - 25569)*86400*1000))
        date = d.toISOString().split('T')[0]
      } else if (!date) {
        date = new Date().toISOString().split('T')[0]
      } else if (typeof date === 'string' && date.includes(' ')) {
         // "2026-Feb-01 00:22:36" -> "2026-02-01"
         try {
           date = new Date(date).toISOString().split('T')[0]
         } catch (e) {}
      }

      const productName = getValue([
        'Product Name', 'productName', '產品名稱', 'Item Name', '商品名稱',
        'SKU Name\n(Chinese)', 'SKU Name\n(English)', 'SKU Name'
      ]) || 'Unknown'
      
      // JAN Code mapping - try common variations
      const janCode = getValue([
        'JAN', 'JAN Code', 'janCode', 'JAN碼', 
        'SKU ID', 'Merchant SKU', 'Item Code', 'Product Code'
      ]) || ''
      
      const qtyVal = getValue(['Quantity', 'quantity', '數量', 'Qty', 'Qty\n(Q)'])
      const quantity = parseInt(qtyVal || 0)

      const priceVal = getValue(['Unit Price', 'unitPrice', '單價', 'Item Price', 'Price', 'Unit Price\n(U)'])
      const unitPrice = parseFloat(priceVal || 0)

      const totalVal = getValue(['Total Amount', 'totalAmount', '總額', 'Amount', 'Total\nQ * U - D = T'])
      const totalAmount = parseFloat(totalVal || (quantity * unitPrice) || 0)
      
      const channel = getValue(['Channel', 'channel', '銷售渠道']) || 'HKTVmall'

      return {
        saleId,
        date,
        productName,
        janCode,
        quantity,
        unitPrice,
        totalAmount,
        channel
      }
    }).filter(r => r.janCode && r.quantity > 0)

    console.log('Valid records:', records.length)

    if (records.length === 0) {
      return NextResponse.json({ 
        error: 'No valid records found. Please check column names.',
        debug: {
          headerRowIndex,
          firstRowKeys: data.length > 0 ? Object.keys(data[0] as object) : 'Empty',
          sampleRow: data.length > 0 ? data[0] : null
        }
      }, { status: 400 })
    }

    // --- Inventory Deduction Logic ---
    
    // 1. Fetch current inventory
    const inventoryData = await getInventory()
    let inventory = []
    if (Array.isArray(inventoryData)) {
      inventory = inventoryData
    } else if (inventoryData && inventoryData.inventory) {
      inventory = inventoryData.inventory
    }

    // 2. Create a map for faster lookup
    const inventoryMap = new Map()
    inventory.forEach((item: any) => {
      // Normalize JAN code (trim spaces)
      if (item.janCode) inventoryMap.set(String(item.janCode).trim(), item)
    })

    // 3. Deduct stock
    let updatedCount = 0
    records.forEach((record: any) => {
      const jan = String(record.janCode).trim()
      const item = inventoryMap.get(jan)
      
      if (item) {
        // Ensure quantity is a number
        const currentQty = parseInt(item.quantity || item.totalStock || 0)
        const soldQty = record.quantity
        
        item.quantity = currentQty - soldQty
        updatedCount++
        console.log(`Deducted ${soldQty} from ${jan} (${item.productName}). New Qty: ${item.quantity}`)
      } else {
        console.log(`Warning: Product ${jan} not found in inventory. Cannot deduct stock.`)
      }
    })

    // 4. Save updated inventory back to Redis/Local Storage
    if (updatedCount > 0) {
      // Reconstruct inventory array from map values
      const updatedInventory = Array.from(inventoryMap.values())
      await setInventory(updatedInventory)
      console.log(`Updated inventory for ${updatedCount} items.`)
    }

    // --- End Inventory Deduction Logic ---

    // --- Merge with Existing Sales Data (Persistence via Redis) ---
    
    const salesData = await getSales()
    let existingRecords: any[] = salesData.records || []

    // Deduplicate: Create a Map of existing records by unique key (SaleID + JAN)
    // If a record exists, we overwrite it with the new one (assuming update), or keep it if not in new batch
    const salesMap = new Map()
    
    // Load existing
    existingRecords.forEach(r => {
      const key = `${r.saleId}-${r.janCode}`
      salesMap.set(key, r)
    })
    
    // Merge new (overwrite if exists)
    records.forEach((r: any) => {
      const key = `${r.saleId}-${r.janCode}`
      salesMap.set(key, r)
    })
    
    const allRecords = Array.from(salesMap.values())
    
    // Sort by date descending
    allRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Calculate summary for ALL records
    const summary = {
      totalSales: allRecords.reduce((sum: number, r: any) => sum + r.totalAmount, 0),
      totalOrders: new Set(allRecords.map((r: any) => r.saleId)).size,
      totalQuantity: allRecords.reduce((sum: number, r: any) => sum + r.quantity, 0),
      avgOrderValue: 0
    }
    summary.avgOrderValue = summary.totalOrders > 0 ? summary.totalSales / summary.totalOrders : 0

    const result = {
      records: allRecords,
      summary,
      count: allRecords.length,
      lastUpdated: new Date().toISOString()
    }

    // Save to Redis
    await setSales(result)

    console.log('Saved sales data to Redis. Total records:', allRecords.length, `(New/Updated: ${records.length})`)

    return NextResponse.json({ 
      success: true, 
      count: records.length,
      totalCount: allRecords.length,
      totalSales: summary.totalSales,
      inventoryUpdated: updatedCount
    })

  } catch (error) {
    console.error('Error processing file:', error)
    return NextResponse.json({ error: 'Failed to process file: ' + String(error) }, { status: 500 })
  }
}
