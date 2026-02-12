import { NextResponse } from 'next/server'
import { getSales } from '@/lib/redis'
import { subDays, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await getSales()
    const records = data.records || []

    // Calculate daily sales for the last 7 days
    const today = new Date()
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(today, 6 - i)
      return {
        date: format(d, 'yyyy-MM-dd'),
        amount: 0,
        label: format(d, 'MM/dd')
      }
    })

    // Aggregate sales
    records.forEach((record: any) => {
      if (!record.date || !record.totalAmount) return
      
      // Find matching date in our 7-day window
      // record.date is expected to be YYYY-MM-DD
      const dayData = last7Days.find(d => d.date === record.date)
      if (dayData) {
        dayData.amount += Number(record.totalAmount)
      }
    })

    return NextResponse.json({
      ...data,
      dailySales: last7Days
    })
  } catch (error) {
    console.error('Sales API Error:', error)
    return NextResponse.json({ error: 'Failed to fetch sales data' }, { status: 500 })
  }
}
