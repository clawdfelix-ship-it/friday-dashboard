import { NextResponse } from 'next/server'
import { getSales } from '../../../lib/redis'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await getSales()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch sales data' }, { status: 500 })
  }
}
