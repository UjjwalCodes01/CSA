#!/usr/bin/env python3
import sys
sys.path.insert(0, 'src')
from agents.executioner_agent import check_execution_feasibility

print("=== SENTINEL FEASIBILITY TEST ===")
result = check_execution_feasibility.invoke({
    'amount_cro': 2.0, 
    'token_out': 'WCRO'
})

print("RESULTS:")
print(f"   Feasible: {result['feasible']}")
print(f"   Sentinel Approved: {result['sentinel_approved']}")
print(f"   Action: {result['sentinel_action']}")
print(f"   Blocking Reason: {result.get('blocking_reason', 'None')}")

if result['feasible'] and result['sentinel_approved']:
    print("\n🎉 SUCCESS: SENTINEL ERROR RESOLVED!")
    print("🚀 Autonomous trading is now ready to execute!")
else:
    print("\n❌ ERROR: Still blocked")
    print(f"   Issue: {result.get('blocking_reason', 'Unknown')}")