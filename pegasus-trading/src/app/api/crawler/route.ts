import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import util from 'util';
import fs from 'fs';

const execAsync = util.promisify(exec);

export async function GET() {
  try {
    const productsFile = path.join(process.cwd(), 'crawler', 'products.json');
    if (fs.existsSync(productsFile)) {
      const content = fs.readFileSync(productsFile, 'utf-8');
      const products = JSON.parse(content);
      return NextResponse.json(products);
    }
    return NextResponse.json([]);
  } catch (error) {
    console.error('Failed to read crawler results:', error);
    return NextResponse.json({ error: 'Failed to read results' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const crawlerScript = path.join(process.cwd(), 'crawler', 'hktvmall_crawler.py');
    
    // Execute python script
    // Using 'python3' assuming it is in path. In restricted envs, might need full path.
    const { stdout, stderr } = await execAsync(`python3 "${crawlerScript}"`);
    
    console.log('Crawler stdout:', stdout);
    if (stderr) console.error('Crawler stderr:', stderr);
    
    return NextResponse.json({ 
      success: true, 
      message: '爬蟲執行完成',
      details: stdout 
    });
  } catch (error: any) {
    console.error('Crawler execution failed:', error);
    return NextResponse.json(
      { success: false, error: '爬蟲執行失敗: ' + error.message },
      { status: 500 }
    );
  }
}
