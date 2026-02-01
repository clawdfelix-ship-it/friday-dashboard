import { NextResponse } from 'next/server';
import { getInventory, getData } from '../../../lib/redis';

export async function GET() {
  try {
    const inventory = await getInventory() || [];
    const lastUpdatedData = await getData('lastUpdated');
    
    return NextResponse.json({
      inventory,
      lastUpdated: lastUpdatedData?.time || null
    });
  } catch (error) {
    console.error('Failed to load products:', error);
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
  }
}
