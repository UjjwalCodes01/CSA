# 🔷 CDC (Crypto.com) Integration

## Overview

This module integrates **Crypto.com Agent Client SDK** into the AI trading system, providing real-time CRO price feeds and multi-source price comparison.

**Hackathon Feature**: Priority #3  
**Status**: ✅ Complete

---

## 🎯 Features

### 1. **Real-Time Price Feeds**
- Fetches CRO/USD prices from Crypto.com using Agent Client SDK
- Updates every 30 seconds
- Falls back to realistic mock data if API key not configured

### 2. **Multi-Source Price Comparison**
- Compares prices from:
  - **CoinGecko** (primary source)
  - **Crypto.com** (via Agent Client SDK)
- Calculates:
  - Average price
  - Percentage difference
  - Spread analysis

### 3. **Dashboard Widget**
- Visual price comparison panel
- Real-time updates via WebSocket
- CDC branding and attribution
- Shows 24h price changes for both sources

---

## 📁 Components

### Python Service
**File**: `ai-agent/src/services/cdc_price_service.py`

```python
from services.cdc_price_service import CDCPriceService

service = CDCPriceService()
price_data = service.get_cro_price()
# Returns: { price, change_24h, volume_24h, source }
```

### Price Updater
**File**: `ai-agent/update_cdc_prices.py`

Runs continuously, fetching CDC prices every 30 seconds and updating the backend.

### Backend Endpoints

#### GET `/api/market/price/cdc`
Returns current CDC price data
```json
{
  "price": 0.085123,
  "change24h": 2.5,
  "volume_24h": 15000000,
  "source": "crypto.com",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### POST `/api/market/price/cdc/update`
Updates CDC price (called by Python updater)
```json
{
  "price": 0.085,
  "change24h": 2.5,
  "volume_24h": 15000000,
  "high_24h": 0.087,
  "low_24h": 0.083
}
```

#### GET `/api/market/price/compare`
Returns price comparison between sources
```json
{
  "sources": {
    "coingecko": { "price": 0.080, "change24h": 1.5 },
    "crypto_com": { "price": 0.085, "change24h": 2.5 }
  },
  "comparison": {
    "difference": 0.005,
    "percentage_diff": 6.25,
    "avg_price": 0.0825,
    "spread": 0.005
  }
}
```

### Frontend Widget
**Location**: Dashboard > Price Comparison Panel

Features:
- Side-by-side price display (CoinGecko vs CDC)
- 24h change indicators
- Average price, difference, and spread stats
- "Powered by Crypto.com" badge

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd ai-agent
pip install crypto_com_agent_client python-dotenv requests
```

### 2. Configure API Key (Optional)

Create `.env` file in `ai-agent/` directory:
```bash
CRYPTO_COM_API_KEY=your_api_key_here
```

⚠️ **Note**: Mock data is used if no API key is set (for testing/demo)

### 3. Start CDC Price Updater

**Option A - Windows Batch File**:
```bash
start-cdc-updater.bat
```

**Option B - Python Script**:
```bash
cd ai-agent
python update_cdc_prices.py
```

**Option C - Manual**:
```bash
cd ai-agent
python -c "from update_cdc_prices import main; main()"
```

### 4. Verify Integration

Run the test suite:
```bash
cd ai-agent
python test_cdc_integration.py
```

Expected output:
```
✅ PASS: CDC Price Service
✅ PASS: Backend Connection
✅ PASS: CDC Price Update
✅ PASS: Price Comparison
```

---

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `CRYPTO_COM_API_KEY` | CDC Agent API key | None | No (mock data used) |
| `BACKEND_URL` | Backend server URL | `http://localhost:3001` | No |
| `CDC_UPDATE_INTERVAL` | Update frequency (seconds) | 30 | No |

### Customization

**Change update frequency**:
```bash
# Update every 15 seconds instead of 30
export CDC_UPDATE_INTERVAL=15
python update_cdc_prices.py
```

**Use different backend**:
```bash
export BACKEND_URL=http://localhost:5000
python update_cdc_prices.py
```

---

## 📊 Architecture

```
┌─────────────────────┐
│  Frontend Dashboard │
│  (Price Widget)     │
└──────────┬──────────┘
           │ WebSocket + REST
           ▼
┌─────────────────────┐
│  Backend (Express)  │
│  - /api/market/     │
│    price/cdc        │
│  - WebSocket        │
└──────────┬──────────┘
           │ HTTP POST
           ▼
┌─────────────────────┐
│  CDC Price Updater  │
│  (Python Script)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  CDC Price Service  │
│  (Agent Client SDK) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Crypto.com API     │
│  (Real-time prices) │
└─────────────────────┘
```

---

## 🧪 Testing

### Unit Tests
```bash
# Test CDC service only
cd ai-agent
python -c "from src.services.cdc_price_service import get_cdc_service; s=get_cdc_service(); print(s.get_cro_price())"
```

### Integration Tests
```bash
# Test complete flow
cd ai-agent
python test_cdc_integration.py
```

### Manual Testing
1. Start backend: `cd backend && npm start`
2. Start CDC updater: `start-cdc-updater.bat`
3. Open dashboard: `http://localhost:3000/dashboard`
4. Check "Price Comparison" panel for CDC prices

---

## 🐛 Troubleshooting

### Issue: "CDC price shows $0.000000"
**Solution**: 
- CDC updater is not running
- Start with: `start-cdc-updater.bat`

### Issue: "Backend not responding"
**Solution**:
- Verify backend is running: `curl http://localhost:3001/api/health`
- Check port 3001 is not in use

### Issue: "Import error: crypto_com_agent_client"
**Solution**:
```bash
cd ai-agent
pip install crypto_com_agent_client
```

### Issue: "Prices not updating in dashboard"
**Solution**:
- Check browser console for WebSocket errors
- Verify CDC updater is running (should print updates every 30s)
- Refresh dashboard page

---

## 📝 API Reference

### CDCPriceService Class

```python
class CDCPriceService:
    def __init__(self):
        """Initialize with optional CRYPTO_COM_API_KEY"""
    
    def get_cro_price(self) -> dict:
        """
        Fetch current CRO/USD price
        
        Returns:
            {
                'price': float,
                'change_24h': float,
                'volume_24h': float,
                'high_24h': float,
                'low_24h': float,
                'source': str  # 'crypto.com', 'mock', or 'fallback'
            }
        """
    
    def get_cro_market_data(self) -> dict:
        """
        Extended market data with bid/ask spreads
        """
    
    def compare_prices(self, coingecko_price: float) -> dict:
        """
        Compare CDC price with another source
        """
```

---

## 🎨 Frontend Components

### Price Comparison Widget

Located in `frontend/app/dashboard/page.tsx`

**State Management**:
```typescript
const [cdcPrice, setCdcPrice] = useState<{
  price: number;
  change24h: number;
  timestamp: string;
} | null>(null);

const [priceComparison, setPriceComparison] = useState<{
  difference: number;
  percentageDiff: number;
  avgPrice: number;
  spread: number;
} | null>(null);
```

**WebSocket Updates**:
```typescript
// Receives 'cdc_price_update' events from backend
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'cdc_price_update') {
    setCdcPrice(data.data);
  }
};
```

---

## 🏆 Hackathon Highlights

This integration demonstrates:

1. **Crypto.com Agent Client SDK Usage**
   - Direct integration with CDC Agent toolkit
   - Real-time price feeds
   - Proper error handling and fallbacks

2. **Multi-Source Data Aggregation**
   - Combines CoinGecko + Crypto.com data
   - Calculates meaningful comparisons
   - Shows spread analysis

3. **Professional UI/UX**
   - Dedicated price comparison panel
   - CDC branding and attribution
   - Real-time WebSocket updates
   - Responsive design

4. **Production-Ready Code**
   - Error handling and retries
   - Mock data for testing
   - Comprehensive documentation
   - Full test coverage

---

## 📚 Related Files

- `ai-agent/src/services/cdc_price_service.py` - Core CDC service
- `ai-agent/update_cdc_prices.py` - Price updater daemon
- `ai-agent/test_cdc_integration.py` - Integration tests
- `backend/src/index.js` - CDC API endpoints (lines 270-355)
- `frontend/app/dashboard/page.tsx` - Price widget (lines 930-1025)
- `start-cdc-updater.bat` - Windows launcher

---

## ✨ Future Enhancements

- [ ] Support for more cryptocurrencies (BTC, ETH, etc.)
- [ ] Historical price charts comparing sources
- [ ] Alert system for price discrepancies
- [ ] Arbitrage opportunity detection
- [ ] CDC order book integration
- [ ] Real-time trade execution via CDC

---

## 📞 Support

For issues or questions about CDC integration:
1. Check this README
2. Run `python test_cdc_integration.py` for diagnostics
3. Review backend logs
4. Check browser console for frontend errors

---

**Status**: ✅ Complete and production-ready  
**Last Updated**: 2024  
**Author**: CSA Trading Team  
**License**: MIT
