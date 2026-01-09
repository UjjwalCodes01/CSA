#!/bin/bash
# Dry run testing for Cronos Sentinel

API_KEY="sentinel-2024-cronos-hackathon-api-key"
BASE_URL="http://localhost:3001"

echo "🧪 Cronos Sentinel - Dry Run Testing"
echo "====================================="
echo ""

# Test 1: Health check
echo "1️⃣  Testing health endpoint..."
curl -s $BASE_URL/health | jq '.'
echo ""

# Test 2: Sentinel status
echo "2️⃣  Checking Sentinel status..."
curl -s -H "X-API-Key: $API_KEY" $BASE_URL/api/sentinel/status | jq '.'
echo ""

# Test 3: Wallet balance
echo "3️⃣  Checking wallet balance..."
curl -s -H "X-API-Key: $API_KEY" $BASE_URL/api/wallet/balance | jq '.'
echo ""

# Test 4: Get swap quote (no execution)
echo "4️⃣  Getting swap quote for 0.01 CRO → USDC..."
curl -s -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount": 0.01, "tokenIn": null, "tokenOut": "0xc21223249CA28397B4B6541dfFaEcC539BfF0c59", "slippage": 5}' \
  $BASE_URL/api/trade/quote | jq '.'
echo ""

echo "====================================="
echo "✅ Dry run complete!"
echo ""
echo "Next steps:"
echo "  1. Test Telegram bot: @CronosSentinel_bot"
echo "  2. Try: 'What is CRO price?'"
echo "  3. Try: 'Can I swap 0.01 CRO to USDC?'"
echo "  4. Execute real trade (CAREFUL - REAL BLOCKCHAIN)"
echo ""
