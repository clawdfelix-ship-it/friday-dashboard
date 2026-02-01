import asyncio
import json
import os
import sys
import argparse
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import aiohttp
import aiofiles

# Use a standard user agent
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

async def download_image(session, image_url, output_path):
    try:
        async with session.get(image_url, timeout=10) as response:
            if response.status == 200:
                f = await aiofiles.open(output_path, mode='wb')
                await f.write(await response.read())
                await f.close()
                return True
    except Exception as e:
        print(f"Error downloading {image_url}: {e}", file=sys.stderr)
    return False

async def fetch_image(product_name, output_dir, sku):
    results = {
        "success": False,
        "image_path": None,
        "error": None
    }

    if not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent=USER_AGENT,
            viewport={'width': 1920, 'height': 1080}
        )
        page = await context.new_page()

        try:
            # Google Image Search
            search_query = f"{product_name}"
            url = f"https://www.google.com/search?tbm=isch&q={search_query}"
            
            await page.goto(url, wait_until="domcontentloaded")
            
            # Wait a bit for images to load
            await page.wait_for_timeout(2000)

            # Try to click the first image to get higher res (optional, might be brittle)
            # For robustness, we'll just grab the first valid src from the grid
            
            content = await page.content()
            soup = BeautifulSoup(content, 'html.parser')
            
            img_tags = soup.find_all('img')
            
            target_url = None
            for img in img_tags:
                src = img.get('src') or img.get('data-src')
                # Filter out base64, tiny icons, etc.
                if src and src.startswith('http') and not 'favicon' in src:
                    # Prefer https
                    target_url = src
                    break
            
            if target_url:
                # Determine extension
                ext = ".jpg"
                if ".png" in target_url.lower(): ext = ".png"
                if ".webp" in target_url.lower(): ext = ".webp"
                
                filename = f"{sku}{ext}"
                output_path = os.path.join(output_dir, filename)
                
                async with aiohttp.ClientSession() as session:
                    success = await download_image(session, target_url, output_path)
                    
                    if success:
                        results["success"] = True
                        results["image_path"] = filename # Return filename only
                    else:
                        results["error"] = "Failed to download image"
            else:
                results["error"] = "No suitable image found"

        except Exception as e:
            results["error"] = str(e)
            print(f"Error: {e}", file=sys.stderr)
        finally:
            await browser.close()
            
    return results

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--name", required=True)
    parser.add_argument("--sku", required=True)
    parser.add_argument("--output", required=True)
    
    args = parser.parse_args()
    
    result = await fetch_image(args.name, args.output, args.sku)
    print(json.dumps(result))

if __name__ == "__main__":
    asyncio.run(main())
