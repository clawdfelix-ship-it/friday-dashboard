'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Product {
  sku: string;
  name: string;
  price: string;
  image_url: string;
  local_image: string | null;
  source: string;
}

export default function CrawlerPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/crawler');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  
  const syncToInventory = async () => {
    setSyncing(true);
    setStatus('正在同步圖片到庫存...');
    setError('');
    
    try {
      const res = await fetch('/api/crawler/sync', { method: 'POST' });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      
      setStatus(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const startCrawler = async () => {
    setLoading(true);
    setStatus('正在啟動爬蟲... (這可能需要幾分鐘)');
    setError('');
    
    try {
      const res = await fetch('/api/crawler', { method: 'POST' });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to start crawler');
      
      setStatus(data.message);
      await fetchProducts(); // Refresh list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">商品爬蟲中心</h1>
            <p className="text-gray-500 mt-2">HKTVmall Mega Outlet 自動化採集</p>
          </div>
          <div className="space-x-4">
            <Link href="/" className="text-gray-600 hover:text-gray-900">返回首頁</Link>
            <button
              onClick={syncToInventory}
              disabled={loading || syncing}
              className={`px-6 py-2 rounded-lg text-white font-medium transition-colors ${
                syncing ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {syncing ? '同步中...' : '同步到庫存'}
            </button>
            <button
              onClick={startCrawler}
              disabled={loading || syncing}
              className={`px-6 py-2 rounded-lg text-white font-medium transition-colors ${
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? '採集進行中...' : '開始採集'}
            </button>
          </div>
        </div>

        {status && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <p className="text-blue-700">{status}</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">已採集商品 ({products.length})</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6">
            {products.map((product, index) => (
              <div key={`${product.sku}-${index}`} className="group border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden relative">
                  {product.local_image ? (
                    <img 
                      src={`/images/products/${encodeURIComponent(product.local_image)}`} 
                      alt={product.name}
                      className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                </div>
                <h3 className="font-medium text-gray-900 line-clamp-2 h-12 mb-2">{product.name}</h3>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-blue-600">${product.price}</span>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{product.sku}</span>
                </div>
              </div>
            ))}
            
            {products.length === 0 && !loading && (
              <div className="col-span-full text-center py-12 text-gray-500">
                暫無數據，請點擊「開始採集」按鈕
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
