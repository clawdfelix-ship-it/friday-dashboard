import { NextRequest, NextResponse } from 'next/server'
import { addRestockRecord, getInventory, setInventory } from '../../../lib/redis'

export async function POST(request: NextRequest): Promise<void | Response> {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const supplier = formData.get('supplier') as string || ''
    const poNumber = formData.get('poNumber') as string || ''

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Get current inventory from Redis
    let inventoryData = await getInventory()
    const inventory = inventoryData?.inventory || inventoryData || []
    const inventoryMap: Record<string, any> = {}
    inventory.forEach((item: any) => {
      inventoryMap[item.janCode] = item
    })

    // Process Excel with Python
    const pythonScript = `
import json
import openpyxl
import os
from datetime import datetime

temp_path = "/tmp/restock_$(date +%s).xlsx"
supplier = "${supplier}"
po_number = "${poNumber}"

# Read Excel
wb = openpyxl.load_workbook(temp_path)
sheet = wb.active

success = 0
failed = 0
records = []

for i, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), 1):
    janCode = ''
    quantity = 0
    
    for col_idx in range(min(5, len(row))):
        val = str(row[col_idx]).strip() if row[col_idx] else ''
        if val and val.isdigit() and 8 <= len(val) <= 13:
            janCode = val
            break
    
    for col_idx in range(min(5, len(row))):
        if row[col_idx]:
            try:
                qty = int(float(row[col_idx]))
                if qty > 0:
                    quantity = qty
                    break
            except:
                continue
    
    if not janCode or not quantity:
        continue

    print(json.dumps({'janCode': janCode, 'quantity': quantity}))
`

    // Simplified: just return success for now
    // In production, we'd process the Excel file properly
    
    // Mock response for testing
    return NextResponse.json({ 
      success: 0, 
      failed: 0,
      message: 'Excel upload ready - Redis connected!'
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
