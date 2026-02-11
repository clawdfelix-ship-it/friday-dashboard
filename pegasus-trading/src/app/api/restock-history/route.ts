import { NextResponse } from 'next/server'
import { getRestockHistory } from '../../../lib/redis'

export async function GET() {
  try {
    const data = await getRestockHistory()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get restock history' }, { status: 500 })
  }
}
