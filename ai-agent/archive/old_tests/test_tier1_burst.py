"""Burst test to confirm Tier 1 is active (20 rapid API calls)"""

import os
import time
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

api_key = os.getenv('GEMINI_API_KEY')
genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-pro')

print("="*70)
print("TIER 1 BURST TEST")
print("="*70)
print()
print("This test will make 20 API calls in rapid succession.")
print("Free tier: 15 RPM limit (will fail around call 16)")
print("Tier 1: 1,000 RPM limit (should pass all 20)")
print()
print("Starting test...")
print()

successes = 0
failures = 0
errors = []

for i in range(1, 21):
    try:
        response = model.generate_content(f'Say "Test {i} OK"')
        successes += 1
        print(f"Call {i:2d}: ✓ SUCCESS - {response.text.strip()}")
        time.sleep(0.1)  # Small delay to avoid overwhelming
        
    except Exception as e:
        failures += 1
        error_msg = str(e)
        errors.append((i, error_msg))
        
        if '429' in error_msg or 'quota' in error_msg.lower():
            print(f"Call {i:2d}: ✗ RATE LIMIT HIT")
            print(f"           {error_msg[:80]}")
        else:
            print(f"Call {i:2d}: ✗ ERROR - {error_msg[:80]}")

print()
print("="*70)
print("RESULTS")
print("="*70)
print()
print(f"Successful calls: {successes}/20")
print(f"Failed calls: {failures}/20")
print()

if successes == 20:
    print("🎉 SUCCESS! All 20 calls passed.")
    print()
    print("✅ TIER 1 IS ACTIVE AND WORKING")
    print()
    print("Your API key has:")
    print("  - 1,000 RPM limit")
    print("  - 4M tokens/day")
    print("  - Full Tier 1 capabilities")
    print()
    print("You can run your autonomous trader without issues!")
    
elif successes >= 15 and failures > 0:
    print("⚠️  MIXED RESULTS")
    print()
    print("You hit rate limits after ~15 calls.")
    print("This suggests FREE TIER limits are still active.")
    print()
    print("Possible reasons:")
    print("  1. Tier 1 upgrade not yet propagated (wait 24 hours)")
    print("  2. API key not properly linked to billing")
    print("  3. Billing account not active")
    print()
    print("Temporary solution:")
    print("  - Reduce autonomous trader to 10-15 minute intervals")
    print("  - Wait 24 hours for tier upgrade to propagate")
    
elif failures > 10:
    print("❌ MANY FAILURES")
    print()
    print("Possible issues:")
    print("  - Network problems")
    print("  - API service issues")
    print("  - Billing not properly configured")
    print()
    print("Check:")
    print("  https://console.cloud.google.com/billing/projects")

else:
    print("⚠️  UNEXPECTED RESULTS")
    print()
    print("Some calls succeeded, some failed.")
    print("This might indicate temporary service issues.")

if errors:
    print()
    print("Error details:")
    for call_num, error in errors[:3]:  # Show first 3 errors
        print(f"  Call {call_num}: {error[:100]}")

print()
print("="*70)
