import asyncio
import json
import os
import random
import re
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import aiohttp
import aiofiles
import hashlib

# Configuration
BASE_URL = "https://www.hktvmall.com/hktv/zh/main/MEGA-OUTLET/s/H9456001"
QUERY_PARAM = "q=%3Arelevance%3Astreet%3Amain%3Astore%3AH9456001%3A"
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "images", "products")
PRODUCTS_FILE = os.path.join(os.path.dirname(__file__), "products.json")

# Ensure directories exist
os.makedirs(OUTPUT_DIR, exist_ok=True)

async def download_image(session, image_url, sku):
    if not image_url: return None
    try:
        ext = '.jpg'
        if '.png' in image_url.lower(): ext = '.png'
        elif '.webp' in image_url.lower(): ext = '.webp'
        
        filename = f"{sku}{ext}"
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        if os.path.exists(filepath):
            return filename # Return filename for frontend use
        
        async with session.get(image_url) as response:
            if response.status == 200:
                f = await aiofiles.open(filepath, mode='wb')
                await f.write(await response.read())
                await f.close()
                return filename
    except Exception as e:
        print(f"Error downloading {image_url}: {e}")
    return None

def generate_sku(name):
    if not name: return "UNKNOWN"
    # Keep only alphanumeric and Chinese characters
    clean = re.sub(r'[^a-zA-Z0-9\u4e00-\u9fff]', '', name)
    # Generate hash from original name to ensure uniqueness
    name_hash = hashlib.md5(name.encode('utf-8')).hexdigest()[:6]
    sku_base = clean[:40].upper()
    return f"{sku_base}_{name_hash}"

def clean_price(price_str):
    if not price_str: return ''
    # Try to find price after $ symbol first (e.g. $ 9.90)
    dollar_match = re.search(r'\$\s*([\d,]+\.?\d*)', price_str)
    if dollar_match:
        return dollar_match.group(1).replace(',', '')
        
    # Fallback: simple extraction
    match = re.search(r'[\d,]+\.?\d*', price_str)
    return match.group().replace(',', '') if match else price_str

async def extract_products_from_page(page, session, existing_products):
    content = await page.content()
    soup = BeautifulSoup(content, 'html.parser')
    items = soup.select('div.product-item, div[class*="product"], li.product')
    
    new_count = 0
    for item in items:
        name_elem = item.select_one('h3, h4, [class*="name"]')
        name = name_elem.get_text(strip=True) if name_elem else ''
        
        price_elem = item.select_one('[class*="price"]')
        price = price_elem.get_text(strip=True) if price_elem else ''
        
        img_tag = item.select_one('img')
        image_url = ''
        if img_tag:
            image_url = img_tag.get('src') or img_tag.get('data-src') or ''
        
        if not name or not price or not image_url:
            continue
            
        sku = generate_sku(name)
        
        # Check if SKU already exists in our current collection
        if any(p['sku'] == sku for p in existing_products):
            # print(f"Skipping duplicate: {name[:20]}...")
            continue

        if image_url and not image_url.startswith('http'):
            image_url = "https:" + image_url if image_url.startswith('//') else "https://www.hktvmall.com" + image_url
            
        cleaned_price = clean_price(price)
        print(f"Found new item: {name[:20]}... (Raw: {price} -> Clean: {cleaned_price})")
        local_image = await download_image(session, image_url, sku)
        
        existing_products.append({
            'sku': sku,
            'name': name,
            'price': cleaned_price,
            'image_url': image_url,
            'local_image': local_image,
            'source': 'HKTVmall'
        })
        new_count += 1
        
    return new_count

async def main():
    print("Starting HKTVmall Crawler (Pagination Mode)...")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1280, 'height': 800}
        )
        page = await context.new_page()
        
        products = []
        page_num = 0
        max_pages = 10 # Safety limit, user provided 4 pages but there might be more
        
        try:
            async with aiohttp.ClientSession() as session:
                while page_num < max_pages:
                    url = f"{BASE_URL}?page={page_num}&{QUERY_PARAM}"
                    print(f"\nScanning Page {page_num}: {url}")
                    
                    try:
                        await page.goto(url, timeout=60000, wait_until='domcontentloaded')
                        await asyncio.sleep(5) # Wait for initial render
                        
                        # Scroll to bottom to trigger any lazy loading images
                        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                        await asyncio.sleep(2)
                        
                        count_before = len(products)
                        new_items = await extract_products_from_page(page, session, products)
                        
                        print(f"Page {page_num} finished. Added {new_items} items. Total: {len(products)}")
                        
                        if new_items == 0 and page_num > 0:
                            print("No new items found on this page. Assuming end of list.")
                            break
                            
                        page_num += 1
                        
                    except Exception as e:
                        print(f"Error on page {page_num}: {e}")
                        break
            
            # Save results
            print(f"\nSaving {len(products)} products to {PRODUCTS_FILE}")
            async with aiofiles.open(PRODUCTS_FILE, 'w', encoding='utf-8') as f:
                await f.write(json.dumps(products, ensure_ascii=False, indent=2))
                
            print(f"Successfully scraped {len(products)} products.")
            
        except Exception as e:
            print(f"Crawler error: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
