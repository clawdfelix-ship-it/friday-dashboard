import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { addRestockRecord, getInventory, setInventory } from '../../../lib/redis'

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const supplier = formData.get('supplier') as string || 'Unknown'
    const poNumber = formData.get('poNumber') as string || `RESTOCK-${Date.now()}`

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log('Processing restock file:', file.name, 'size:', file.size)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Parse Excel
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    
    // Convert to JSON array of arrays first to find header
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]
    
    console.log('Total raw rows:', rawData.length)
    
    // Find header row index
    let headerRowIndex = 0
    let maxMatches = 0
    
    const keywords = [
      'jan', 'code', 'sku', 'item', 'product', '商品', '編號', '条码',
      'qty', 'quantity', 'amount', '数量', '數量', 'pcs', '入庫'
    ]

    // Scan first 20 rows for header
    for (let i = 0; i < Math.min(20, rawData.length); i++) {
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
    
    // If we found a row with multiple keyword matches, use it. 
    // Otherwise, if no header found, we might need to guess columns based on content.
    // For now, let's assume if maxMatches < 1, maybe it's raw data from row 0.
    if (maxMatches < 1) {
      console.log('No obvious header found, trying to parse from row 0')
      headerRowIndex = 0
    } else {
      console.log('Found header at row:', headerRowIndex, `(matches: ${maxMatches})`)
    }
    
    // Re-parse with correct header row
    const data = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex })
    
    // Helper to find value by possible keys
    const findValue = (row: any, keys: string[]) => {
      for (const key of keys) {
        // Case insensitive lookup
        const rowKeys = Object.keys(row)
        const matchKey = rowKeys.find(k => k.toLowerCase().includes(key.toLowerCase()) || k === key)
        if (matchKey && row[matchKey] !== undefined) return row[matchKey]
      }
      return undefined
    }

    // Process records
    const records = data.map((row: any) => {
      // JAN Code: Look for 'JAN', 'Code', 'SKU'
      let janCode = findValue(row, ['jan', 'code', 'sku', 'item code', 'product code', '條碼', '編號'])
      
      // If not found by name, try to find 8-13 digit number in values
      if (!janCode) {
        const values = Object.values(row)
        for (const v of values) {
          const s = String(v).trim()
          if (/^\d{8,13}$/.test(s)) {
            janCode = s
            break
          }
        }
      }

      // Quantity
      let quantity = findValue(row, ['qty', 'quantity', 'amount', 'pcs', '數量', '数量'])
      
      // If not found, look for number < 10000 (likely not JAN)
      if (quantity === undefined) {
        const values = Object.values(row)
        for (const v of values) {
          if (typeof v === 'number' && v > 0 && v < 10000 && String(v).length < 8) {
            quantity = v
            break
          }
        }
      }

      return {
        janCode: janCode ? String(janCode).trim() : '',
        quantity: quantity ? parseInt(String(quantity)) : 0,
        productName: findValue(row, ['name', 'product', 'desc', '名稱', '品名']) || ''
      }
    }).filter(r => r.janCode && r.quantity > 0)

    console.log('Valid records:', records.length)

    if (records.length === 0) {
      return NextResponse.json({ 
        error: 'No valid records found',
        debug: {
          headerRowIndex,
          firstRowKeys: data.length > 0 ? Object.keys(data[0] as object) : 'Empty',
          sampleRow: data.length > 0 ? data[0] : null
        }
      }, { status: 400 })
    }

    // --- Inventory Update Logic ---
    
    // 1. Fetch current inventory
    const inventoryData = await getInventory()
    let inventory = []
    if (Array.isArray(inventoryData)) {
      inventory = inventoryData
    } else if (inventoryData && inventoryData.inventory) {
      inventory = inventoryData.inventory
    }

    // 2. Create map for update
    const inventoryMap = new Map()
    inventory.forEach((item: any) => {
      if (item.janCode) inventoryMap.set(String(item.janCode).trim(), item)
    })

    // 3. Update stock
    let updatedCount = 0
    let newItemsCount = 0
    
    records.forEach((record) => {
      const jan = record.janCode
      const qty = record.quantity
      
      if (inventoryMap.has(jan)) {
        const item = inventoryMap.get(jan)
        const currentQty = parseInt(item.quantity || item.totalStock || 0)
        item.quantity = currentQty + qty
        updatedCount++
      } else {
        // New item
        const newItem = {
          janCode: jan,
          productName: record.productName || `New Item (${jan})`,
          quantity: qty,
          category: 'Uncategorized',
          location: 'Unknown'
        }
        inventoryMap.set(jan, newItem)
        newItemsCount++
      }
    })

    // 4. Save inventory
    const updatedInventory = Array.from(inventoryMap.values())
    await setInventory(updatedInventory)

    // 5. Add Restock Record
    const restockRecord = {
      id: `RESTOCK-${Date.now()}`,
      date: new Date().toISOString(),
      supplier,
      poNumber,
      itemCount: records.length,
      totalQuantity: records.reduce((sum, r) => sum + r.quantity, 0),
      items: records.map(r => ({
        janCode: r.janCode,
        quantity: r.quantity
      }))
    }
    
    await addRestockRecord(restockRecord)

    return NextResponse.json({
      success: true,
      count: records.length,
      updated: updatedCount,
      newItems: newItemsCount,
      totalQuantity: restockRecord.totalQuantity,
      message: `Successfully processed ${records.length} items`
    })

  } catch (error) {
    console.error('Error processing restock file:', error)
    return NextResponse.json({ error: 'Failed to process file: ' + String(error) }, { status: 500 })
  }
}
