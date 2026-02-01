# Sub-Agents Configuration

## Available Agents

### 1. 📦 Inventory Agent
**Task:** Manage inventory, stock levels, low stock alerts
**Command:** `/spawn inventory` or `spawn agent=inventory`
**Memory:** `memory/inventory.md`

### 2. 💰 Cost Analysis Agent  
**Task:** Cost analysis, profit margins, inventory value
**Command:** `/spawn cost` or `spawn agent=cost`
**Memory:** `memory/cost.md`

### 3. 📊 Sales Analysis Agent
**Task:** Sales trends, predictions, performance reports
**Command:** `/spawn sales` or `spawn agent=sales`
**Memory:** `memory/sales.md`

### 4. 🔮 Prediction Agent
**Task:** Demand forecasting, restock recommendations
**Command:** `/spawn prediction` or `spawn agent=prediction`
**Memory:** `memory/prediction.md`

### 5. 🖼️ Image Agent
**Task:** Download and manage product images
**Command:** `/spawn image` or `spawn agent=image`
**Memory:** `memory/image.md`

### 6. 📡 System Monitor Agent
**Task:** Monitor system status, data updates
**Command:** `/spawn monitor` or `spawn agent=monitor`
**Memory:** `memory/monitor.md`

---

## Usage

**Spawn an agent:**
```
/spawn inventory
```

**Check active agents:**
```
/agents
```

**Send message to agent:**
```
/send inventory 你今日做咗咩更新？
```

**Kill an agent:**
```
/kill inventory
```

---

## Agent Memory Files

Each agent has its own memory file to persist context:
- `memory/inventory.md` - Inventory agent context
- `memory/cost.md` - Cost analysis context
- `memory/sales.md` - Sales analysis context
- `memory/prediction.md` - Prediction context
- `memory/image.md` - Image management context
- `memory/monitor.md` - System monitoring context
