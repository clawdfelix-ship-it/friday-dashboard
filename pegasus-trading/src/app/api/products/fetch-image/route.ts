import { NextResponse } from 'next/server';
import { getInventory, setInventory } from '../../../../lib/redis';
import { exec } from 'child_process';
import path from 'path';
import util from 'util';

const execAsync = util.promisify(exec);

export async function POST(request: Request) {
  try {
    const { productName, sku } = await request.json();

    if (!productName || !sku) {
      return NextResponse.json({ error: 'Missing productName or sku' }, { status: 400 });
    }

    const scriptPath = path.join(process.cwd(), 'crawler', 'google_image_fetcher.py');
    const outputDir = path.join(process.cwd(), 'public', 'images', 'products');
    
    // Ensure sku is safe for filename
    const safeSku = sku.replace(/[^a-zA-Z0-9_-]/g, '');

    const command = `python3 "${scriptPath}" --name "${productName}" --sku "${safeSku}" --output "${outputDir}"`;
    
    const { stdout, stderr } = await execAsync(command);
    
    let result;
    try {
      result = JSON.parse(stdout);
    } catch (e) {
      console.error('Failed to parse script output:', stdout);
      return NextResponse.json({ error: 'Script failed', details: stdout, stderr }, { status: 500 });
    }

    if (result.success && result.image_path) {
      // Update Redis
      const inventory = await getInventory();
      let updated = false;
      
      const newInventory = inventory.map((item: any) => {
        // Match by SKU or Name if SKU matches or (Name matches and Brand matches?)
        // Assuming unique identifier is passed as SKU, but inventory might not have SKU field populated correctly?
        // Let's check inventory structure. Assuming we passed the item's identifying info.
        
        // If we passed the SKU from the item itself:
        if (item.janCode === sku || item.productName === productName) {
             updated = true;
             return {
                 ...item,
                 imageUrl: `/images/products/${result.image_path}`,
                 image: `/images/products/${result.image_path}`
             };
        }
        return item;
      });

      if (updated) {
        await setInventory(newInventory);
      }

      return NextResponse.json({ 
        success: true, 
        imageUrl: `/images/products/${result.image_path}` 
      });
    } else {
      return NextResponse.json({ success: false, error: result.error || 'Unknown error' }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Fetch image failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
