"""
Gemini API Tier Comparison & Usage Optimization Guide

FREE TIER vs TIER 1 (PAY-AS-YOU-GO)
"""

print("="*70)
print("GEMINI API TIER LIMITS")
print("="*70)
print()

print("FREE TIER (No billing):")
print("  - 15 requests per minute (RPM)")
print("  - 1 million tokens per day (TPD)")
print("  - 1,500 requests per day (RPD)")
print()

print("TIER 1 (Pay-as-you-go with billing enabled):")
print("  - 1,000 requests per minute (RPM)")
print("  - 4 million tokens per day (TPD)")
print("  - No daily request limit")
print("  - ~$0.15 per 1M input tokens")
print("  - ~$0.60 per 1M output tokens")
print()

print("="*70)
print("YOUR CURRENT USAGE PATTERN")
print("="*70)
print()

# Calculate usage
checks_per_hour = 12  # Every 5 minutes
hours_per_day = 24
checks_per_day = checks_per_hour * hours_per_day

print(f"Autonomous Trader: Every 5 minutes")
print(f"  - {checks_per_hour} checks/hour")
print(f"  - {checks_per_day} checks/day")
print()

tokens_per_check = 2000  # Estimate: 1000 input + 1000 output
tokens_per_day = checks_per_day * tokens_per_check

print(f"Estimated token usage:")
print(f"  - ~{tokens_per_check:,} tokens per check")
print(f"  - ~{tokens_per_day:,} tokens per day")
print()

cost_per_day = (tokens_per_day / 1_000_000) * 0.375  # Average of input/output

print(f"Estimated cost (Tier 1):")
print(f"  - ${cost_per_day:.2f} per day")
print(f"  - ${cost_per_day * 30:.2f} per month")
print()

print("="*70)
print("WHY YOU MIGHT STILL HIT LIMITS")
print("="*70)
print()

print("1. RPM (Requests Per Minute) Limit:")
print("   - Free tier: 15 RPM")
print("   - Tier 1: 1,000 RPM")
print("   - Your usage: ~0.2 RPM (safe)")
print()

print("2. Daily Token Limit:")
print("   - Free tier: 1M TPD")
print("   - Your estimate: ~576K TPD")
print("   - Status: CLOSE TO FREE TIER LIMIT")
print()

print("3. Possible Issues:")
print("   - API key might still be on free tier")
print("   - GCP billing not properly linked")
print("   - Need to verify tier at AI Studio")
print()

print("="*70)
print("HOW TO VERIFY YOUR TIER")
print("="*70)
print()

print("Step 1: Check API Key")
print("  https://aistudio.google.com/apikey")
print("  - Should show 'Connected to project: kronos-483807'")
print("  - Should show pricing tier")
print()

print("Step 2: Check GCP Billing")
print("  https://console.cloud.google.com/billing")
print("  - Verify 'kronos-483807' has billing enabled")
print("  - Check if $300 credits are active")
print()

print("Step 3: Check Quotas")
print("  https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas")
print("  - Should show 1,000 RPM (not 15)")
print("  - Should show 4M TPD (not 1M)")
print()

print("="*70)
print("OPTIMIZATION OPTIONS")
print("="*70)
print()

print("Option 1: Reduce Check Frequency (Immediate)")
print("  - Change from 5 minutes to 10 minutes")
print("  - Cuts token usage in half")
print("  - File: src/autonomous_trader.py")
print("  - Change: schedule.every(10).minutes.do(...)")
print()

print("Option 2: Use Lighter Model (Immediate)")
print("  - Switch from 'gemini-2.0-flash-exp' to 'gemini-1.5-flash'")
print("  - 50% cheaper")
print("  - Still very capable")
print()

print("Option 3: Cache Decisions (Advanced)")
print("  - Don't re-analyze if signal hasn't changed")
print("  - Only call API on new signals")
print("  - Reduces calls by ~80%")
print()

print("Option 4: Verify Tier 1 is Active (Required)")
print("  - Follow verification steps above")
print("  - Ensure billing is properly linked")
print("  - May need to recreate API key")
print()

print("="*70)
print("RECOMMENDED IMMEDIATE ACTION")
print("="*70)
print()

print("1. Verify your API key tier at:")
print("   https://aistudio.google.com/apikey")
print()
print("2. Check if it shows 'Connected to project: kronos-483807'")
print()
print("3. If NOT connected to project:")
print("   - Delete current API key")
print("   - Create new one")
print("   - Select 'kronos-483807' project during creation")
print("   - Update .env with new key")
print()
print("4. If already connected but still hitting limits:")
print("   - Change monitoring interval to 10 minutes")
print("   - Or use gemini-1.5-flash model")
print()

print("="*70)
