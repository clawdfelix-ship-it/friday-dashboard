import { NextResponse } from 'next/server';
import { getInventory, setInventory } from '../../../../lib/redis';
import path from 'path';
import fs from 'fs';

// Helper to normalize strings for matching
function normalize(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[\s\-_,.]/g, '');
}

export async function POST() {
  try {
    // 1. Load Inventory
    let inventory = await getInventory();
    if (!inventory) {
      return NextResponse.json({ error: 'Failed to load inventory' }, { status: 500 });
    }

    // 2. Load Crawler Data
    const productsFile = path.join(process.cwd(), 'crawler', 'products.json');
    if (!fs.existsSync(productsFile)) {
      return NextResponse.json({ error: 'No crawler data found' }, { status: 404 });
    }
    
    const crawlerContent = fs.readFileSync(productsFile, 'utf-8');
    const crawlerProducts = JSON.parse(crawlerContent);
    
    if (!Array.isArray(crawlerProducts)) {
      return NextResponse.json({ error: 'Invalid crawler data format' }, { status: 500 });
    }

    // 3. Match and Update
    let updatedCount = 0;
    
    inventory = inventory.map((item: any) => {
      // Skip if item already has an image (optional: remove this check to force update)
      // if (item.imageUrl || item.image) return item;

      // Find match
      const itemName = normalize(item.productName);
      const itemBrand = normalize(item.brandName);
      
      const match = crawlerProducts.find((cp: any) => {
        const crawlerName = normalize(cp.name);
        
        // Exact match of normalized names
        if (crawlerName === itemName) return true;
        
        // Crawler name contains product name (and maybe brand)
        if (crawlerName.includes(itemName)) return true;
        
        // Crawler name contains brand + product name
        if (crawlerName.includes(itemBrand + itemName)) return true;
        
        return false;
      });

      if (match && match.local_image) {
        updatedCount++;
        // Use local image path relative to public
        const imagePath = `/images/products/${match.local_image}`;
        
        return {
          ...item,
          imageUrl: imagePath, // Standardize on imageUrl
          image: imagePath     // Keep legacy field if needed
        };
      }

      return item;
    });

    // 4. Save Inventory
    if (updatedCount > 0) {
      await setInventory(inventory);
    }

    return NextResponse.json({ 
      success: true, 
      message: `成功同步 ${updatedCount} 個產品圖片`,
      updatedCount 
    });

  } catch (error: any) {
    console.error('Sync failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: '同步失敗: ' + error.message 
    }, { status: 500 });
  }
}
