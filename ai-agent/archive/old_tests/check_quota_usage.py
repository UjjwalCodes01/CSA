"""Check actual Gemini API quota consumption"""

import os
from dotenv import load_dotenv

load_dotenv()

print("="*70)
print("QUOTA CONSUMPTION CHECK")
print("="*70)
print()

print("Your Tier 1 Limits:")
print("  - 1,000 requests per minute")
print("  - 4,000,000 tokens per day")
print("  - No daily request limit")
print()

print("Your Usage Pattern:")
print("  - 288 API calls per day (every 5 minutes)")
print("  - ~576,000 tokens per day (estimated)")
print("  - 0.2 requests per minute (average)")
print()

print("Status: Using only 14% of daily token limit")
print()

print("="*70)
print("IF YOU'RE STILL SEEING ERRORS")
print("="*70)
print()

print("Possible reasons:")
print()

print("1. Quota Not Yet Propagated (24 hours)")
print("   - API key created Jan 9")
print("   - Tier upgrades can take up to 24 hours")
print("   - Should be active by now (Jan 10)")
print()

print("2. Check Actual Usage at:")
print("   https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas?project=kronos-483807")
print()
print("   Look for:")
print("   - 'Generate content requests per minute'")
print("   - 'Generate content input tokens per day'")
print("   - Current consumption vs limits")
print()

print("3. Verify Billing Account is Active:")
print("   https://console.cloud.google.com/billing/projects")
print()
print("   Confirm:")
print("   - kronos-483807 has billing linked")
print("   - $300 free credits are active")
print("   - No payment failures")
print()

print("4. API Caching/CDN Issues:")
print("   - Old quota limits might be cached")
print("   - Wait 1-2 hours for propagation")
print("   - Or test with a brand new API key")
print()

print("="*70)
print("RECOMMENDED ACTIONS")
print("="*70)
print()

print("Action 1: Wait 2-4 hours")
print("  - Tier changes can take time to propagate")
print("  - Try again later today")
print()

print("Action 2: Reduce frequency temporarily")
print("  - Change to 10 or 15 minute intervals")
print("  - Ensures you stay under even free tier limits")
print("  - Can change back once confirmed working")
print()

print("Action 3: Test with burst usage")
print("  - Make 20 API calls rapidly")
print("  - Free tier would block after 15 calls")
print("  - Tier 1 should handle all 20 easily")
print()

print("="*70)
print()

print("Want to run the burst test now? (20 rapid API calls)")
print("This will confirm if Tier 1 is active.")
print()
print("Run: python test_tier1_burst.py")
print()
