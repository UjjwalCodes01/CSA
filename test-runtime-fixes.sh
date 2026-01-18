#!/bin/bash

# Quick test script to verify the runtime error fixes
# Run this after restarting the backend

echo "========================================"
echo "Runtime Error Fixes - Verification Test"
echo "========================================"

echo ""
echo "1. Testing Explainable AI Endpoint..."
echo "=================================================="

RESPONSE=$(curl -s http://localhost:3001/api/agent/explainable-ai)

echo "Response:"
echo "$RESPONSE" | jq '.'

# Check for key fields
echo ""
echo "2. Validating Response Structure..."
echo "=================================================="

# Check if reasoning is an array
REASONING_TYPE=$(echo "$RESPONSE" | jq 'type | .reasoning')
echo "✓ Reasoning field type: $(echo "$RESPONSE" | jq '.reasoning | type')"

# Check price_indicators are numbers
CURRENT_PRICE_TYPE=$(echo "$RESPONSE" | jq '.price_indicators.current_price | type')
echo "✓ Current price type: $CURRENT_PRICE_TYPE (should be 'number')"

CHANGE_24H_TYPE=$(echo "$RESPONSE" | jq '.price_indicators.change_24h | type')
echo "✓ Change 24h type: $CHANGE_24H_TYPE (should be 'number')"

# Check decision field
DECISION=$(echo "$RESPONSE" | jq '.decision')
echo "✓ Decision: $DECISION"

# Check confidence is number
CONFIDENCE=$(echo "$RESPONSE" | jq '.confidence | type')
echo "✓ Confidence type: $CONFIDENCE (should be 'number')"

echo ""
echo "3. Summary"
echo "=================================================="

if [ "$CURRENT_PRICE_TYPE" = "\"number\"" ] && [ "$CHANGE_24H_TYPE" = "\"number\"" ]; then
  echo "✅ All fields have correct types!"
  echo "✅ Runtime errors should be fixed!"
else
  echo "❌ Some fields still have incorrect types"
  echo "Run backend with: npm start"
fi

echo ""
echo "========================================"
echo "Test Complete"
echo "========================================"
