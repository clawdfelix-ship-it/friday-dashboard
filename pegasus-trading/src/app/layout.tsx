import type { Metadata } from 'next'
import Sidebar from '../components/Sidebar'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pegasus Trading - Warehouse Management',
  description: 'Sales data and inventory management system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 flex">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
