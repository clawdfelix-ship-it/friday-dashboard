import Redis from 'ioredis'
import fs from 'fs'
import path from 'path'

// Initialize Redis client
function getRedisClient() {
  const url = process.env.REDIS_URL || process.env.KV_URL || ''
  
  if (url.startsWith('redis://') || url.startsWith('rediss://')) {
    console.log('Connecting to Redis...')
    return new Redis(url)
  }
  
  return null
}

let redisClient: Redis | null = null

export function getRedis() {
  if (!redisClient) {
    redisClient = getRedisClient()
  }
  return redisClient
}

// Local file storage fallback
// On Vercel, we must use /tmp, but note that it's ephemeral!
const IS_VERCEL = !!process.env.VERCEL || process.env.NODE_ENV === 'production'
const DATA_DIR = IS_VERCEL 
  ? path.join('/tmp', 'data') 
  : path.join(process.cwd(), 'data')

const STORAGE_FILE = path.join(DATA_DIR, 'local_storage.json')

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  } catch (e) {
    console.error('Failed to create data dir:', e)
  }
}

// Helper to read local storage
function readLocalStorage(): Record<string, any> {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error('Error reading local storage:', error)
  }
  return {}
}

// Helper to write local storage
function writeLocalStorage(data: Record<string, any>) {
  try {
    // Ensure dir exists again just in case (e.g. /tmp might be cleaned)
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8')
  } catch (error) {
    console.error('Error writing local storage:', error)
  }
}

// Get data from Redis or local file fallback
export async function getData(key: string) {
  const redis = getRedis()
  
  if (redis) {
    try {
      const data = await redis.get(key)
      if (data) return JSON.parse(data)
    } catch (e) {
      console.error('Redis get error:', e)
    }
  }
  
  // Fallback to local file
  const store = readLocalStorage()
  const memoryKey = 'pegasus:' + key
  // Check both prefixed and non-prefixed keys for backward compatibility
  return store[memoryKey] || store[key] || null
}

// Set data to Redis or local file fallback
export async function setData(key: string, value: any) {
  const jsonStr = JSON.stringify(value)
  const redis = getRedis()
  
  if (redis) {
    try {
      await redis.set(key, jsonStr)
      console.log('Redis set:', key)
    } catch (e) {
      console.error('Redis set error:', e)
    }
  }
  
  // Fallback to local file (Always write to local file as backup/dev cache)
  const store = readLocalStorage()
  const memoryKey = 'pegasus:' + key
  store[memoryKey] = value
  writeLocalStorage(store)
}

// Get inventory
export async function getInventory() {
  let data = await getData('inventory')
  
  // Fallback to public/data.json if empty (Initial seed data)
  if (!data) {
    try {
      // In production/Vercel, we can read from the bundle
      const publicPath = path.join(process.cwd(), 'public', 'data.json')
      if (fs.existsSync(publicPath)) {
        console.log('Loading inventory from public/data.json')
        const fileContent = fs.readFileSync(publicPath, 'utf-8')
        const jsonData = JSON.parse(fileContent)
        
        if (jsonData.inventory && Array.isArray(jsonData.inventory)) {
          return jsonData.inventory
        }
      }
    } catch (e) {
      console.error('Failed to load public/data.json:', e)
    }
  }
  
  return data
}

// Set inventory
export async function setInventory(inventory: any[]) {
  await setData('inventory', inventory)
  await setData('lastUpdated', { time: new Date().toISOString() })
}

// Get orders
export async function getOrders() {
  return await getData('orders') || { orders: [] }
}

// Add order
export async function addOrder(order: any) {
  const data = await getOrders()
  data.orders = [order, ...data.orders]
  await setData('orders', data)
  return data
}

// Get restock history
export async function getRestockHistory() {
  return await getData('restock_history') || { records: [] }
}

// Add restock record
export async function addRestockRecord(record: any) {
  const data = await getRestockHistory()
  data.records = [record, ...data.records]
  await setData('restock_history', data)
  return data
}

// Get sales data
export async function getSales() {
  return await getData('sales') || { records: [], summary: { totalSales: 0, totalOrders: 0, totalQuantity: 0, avgOrderValue: 0 } }
}

// Set sales data
export async function setSales(data: any) {
  await setData('sales', data)
}
