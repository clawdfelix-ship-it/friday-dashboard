import * as XLSX from 'xlsx'
import { 
  Product, 
  InventoryItem, 
  Sale, 
  Invoice, 
  InvoiceItem 
} from '../types'

// Excel Data Types
interface ExcelProduct {
  'Product ID': string
  'JAN Code': string
  'Product Name': string
  'Category': string
  'Cost Price': number
  'Selling Price': number
  'Supplier': string
}

interface ExcelInventory {
  'Product ID': string
  'JAN Code': string
  'Quantity': number
  'Location': string
}

interface ExcelSale {
  'Sale ID': string
  'Product ID': string
  'Quantity': number
  'Unit Price': number
  'Total Amount': number
  'Sale Date': string
  'Channel': string
}

interface ExcelInvoice {
  'Invoice ID': string
  'Invoice Number': string
  'Supplier': string
  'Product ID': string
  'Quantity': number
  'Unit Cost': number
  'Total Cost': number
  'Invoice Date': string
  'Status': string
}

// Data Processing Functions
export async function parseProducts(filePath: string): Promise<Product[]> {
  const workbook = XLSX.readFile(filePath)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const data: ExcelProduct[] = XLSX.utils.sheet_to_json(sheet)
  
  return data.map((item, index) => ({
    id: item['Product ID'] || `P${String(index + 1).padStart(5, '0')}`,
    janCode: item['JAN Code'] || '',
    name: item['Product Name'] || '',
    category: item['Category'] || 'Uncategorized',
    costPrice: item['Cost Price'] || 0,
    sellingPrice: item['Selling Price'] || 0,
    supplier: item['Supplier'] || '',
    createdAt: new Date(),
    updatedAt: new Date()
  }))
}

export async function parseInventory(filePath: string): Promise<InventoryItem[]> {
  const workbook = XLSX.readFile(filePath)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const data: ExcelInventory[] = XLSX.utils.sheet_to_json(sheet)
  
  return data.map((item, index) => ({
    productId: item['Product ID'] || `P${String(index + 1).padStart(5, '0')}`,
    quantity: item['Quantity'] || 0,
    location: item['Location'] || 'Main Warehouse',
    lastUpdated: new Date()
  }))
}

export async function parseSales(filePath: string): Promise<Sale[]> {
  const workbook = XLSX.readFile(filePath)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const data: ExcelSale[] = XLSX.utils.sheet_to_json(sheet)
  
  return data.map((item, index) => ({
    id: item['Sale ID'] || `S${String(index + 1).padStart(6, '0')}`,
    productId: item['Product ID'] || '',
    quantity: item['Quantity'] || 0,
    unitPrice: item['Unit Price'] || 0,
    totalAmount: item['Total Amount'] || 0,
    saleDate: new Date(item['Sale Date']),
    channel: (item['Channel'] as Sale['channel']) || 'online'
  }))
}

export async function parseInvoices(filePath: string): Promise<Invoice[]> {
  const workbook = XLSX.readFile(filePath)
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const data: ExcelInvoice[] = XLSX.utils.sheet_to_json(sheet)
  
  // Group by invoice number
  const invoiceMap = new Map<string, Invoice>()
  
  data.forEach((item, index) => {
    const invoiceId = item['Invoice ID'] || `INV${String(index + 1).padStart(6, '0')}`
    
    if (!invoiceMap.has(invoiceId)) {
      invoiceMap.set(invoiceId, {
        id: invoiceId,
        invoiceNumber: item['Invoice Number'] || '',
        supplierId: item['Supplier'] || '',
        items: [],
        totalAmount: 0,
        invoiceDate: new Date(item['Invoice Date']),
        status: (item['Status'] as Invoice['status']) || 'pending'
      })
    }
    
    const invoice = invoiceMap.get(invoiceId)!
    const invoiceItem: InvoiceItem = {
      productId: item['Product ID'] || '',
      quantity: item['Quantity'] || 0,
      unitCost: item['Unit Cost'] || 0,
      totalCost: item['Total Cost'] || 0
    }
    invoice.items.push(invoiceItem)
    invoice.totalAmount += item['Total Cost'] || 0
  })
  
  return Array.from(invoiceMap.values())
}

// Export functions
export function exportToExcel(data: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')
  XLSX.writeFile(workbook, filename)
}

// Data aggregation helpers
export function aggregateSalesByProduct(sales: Sale[]): Map<string, number> {
  const productSales = new Map<string, number>()
  
  sales.forEach(sale => {
    const current = productSales.get(sale.productId) || 0
    productSales.set(sale.productId, current + sale.quantity)
  })
  
  return productSales
}

export function getSalesTrend(sales: Sale[], days: number = 30): { date: string; amount: number }[] {
  const now = new Date()
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  
  const dailySales = new Map<string, number>()
  
  sales
    .filter(s => s.saleDate >= startDate)
    .forEach(sale => {
      const dateKey = sale.saleDate.toISOString().split('T')[0]
      const current = dailySales.get(dateKey) || 0
      dailySales.set(dateKey, current + sale.totalAmount)
    })
  
  return Array.from(dailySales.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
