# Pegasus Trading - Warehouse Management System

Sales data and inventory management system for Pegasus Trading Limited.

## Features

- 📊 **Dashboard** - Real-time sales and inventory overview
- 📦 **Inventory Management** - Track stock levels, locations, and movements
- 💰 **Sales Tracking** - Daily sales data with analytics
- 🔮 **Sales Predictions** - AI-powered demand forecasting using ML
- 📈 **Reports** - Comprehensive sales and inventory reports
- 🔔 **Low Stock Alerts** - Automatic notifications for critical stock levels

## Tech Stack

- **Frontend**: Next.js 14 + React 18 + TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Data Processing**: xlsx (Excel parsing)
- **ML/Analytics**: simple-statistics
- **Deployment**: Vercel

## Project Structure

```
pegasus-trading/
├── src/
│   ├── app/
│   │   ├── dashboard/      # Main dashboard with charts
│   │   ├── inventory/      # Inventory management
│   │   ├── sales/          # Sales tracking
│   │   ├── predictions/    # ML sales predictions
│   │   ├── alerts/         # Low stock alerts
│   │   ├── reports/        # Reports page
│   │   ├── layout.tsx
│   │   ├── page.tsx        # Home page
│   │   └── globals.css
│   ├── components/         # Reusable components
│   ├── lib/
│   │   ├── dataProcessor.ts    # Excel parsing
│   │   └── prediction.ts       # ML prediction algorithms
│   └── types/
│       └── index.ts        # TypeScript interfaces
├── package.json
├── tailwind.config.js
└── next.config.js
```

## Installation

```bash
# Clone the repository
cd pegasus-trading

# Install dependencies
npm install

# Run development server
npm run dev
```

## Excel Data Format

The system expects 5 Excel files:

### 1. Monthly Sales Report
| Column | Description |
|--------|-------------|
| Sale ID | Unique sale identifier |
| Product ID | Product reference |
| Quantity | Units sold |
| Unit Price | Price per unit |
| Total Amount | Sale total |
| Sale Date | Date of sale |
| Channel | online/offline/wholesale |

### 2. Current Inventory
| Column | Description |
|--------|-------------|
| Product ID | Product reference |
| JAN Code | Product barcode |
| Quantity | Current stock |
| Location | Warehouse location |

### 3. Daily Sales
| Column | Description |
|--------|-------------|
| Sale ID | Unique identifier |
| Product ID | Product reference |
| Quantity | Units sold |
| Sale Date | Date |

### 4. Restock Invoices (Inbound)
| Column | Description |
|--------|-------------|
| Invoice ID | Invoice reference |
| Invoice Number | Invoice number |
| Supplier | Supplier name |
| Product ID | Product reference |
| Quantity | Ordered quantity |
| Unit Cost | Cost per unit |
| Invoice Date | Date received |

### 5. Past Invoices (Cost Tracking)
| Column | Description |
|--------|-------------|
| Invoice ID | Invoice reference |
| Product ID | Product reference |
| Unit Cost | Historical cost |
| Invoice Date | Date of purchase |

## ML Prediction Methods

The system uses multiple forecasting algorithms:

1. **Simple Moving Average (SMA)** - 7-day window
2. **Weighted Moving Average (WMA)** - Recent data weighted more
3. **Exponential Smoothing** - Trend detection

Final prediction = SMA × 0.4 + Exponential × 0.6

## Deployment

Deploy to Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Or connect to GitHub for automatic deployments.

## Authors

- **Friday AI** - Initial development

## License

Private - Pegasus Trading Limited
