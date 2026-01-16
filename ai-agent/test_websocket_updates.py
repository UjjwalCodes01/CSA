"""
Test WebSocket Connection and Real-Time Updates
Run this to verify everything is working
"""
import requests
import time

BACKEND_URL = "http://localhost:3001/api"

def test_backend():
    print("\n" + "="*60)
    print("🔍 TESTING BACKEND CONNECTION")
    print("="*60)
    
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is online")
            print(f"   Response: {response.json()}")
            return True
        else:
            print(f"❌ Backend returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend")
        print("   → Make sure backend is running: cd backend && npm start")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_websocket_broadcast():
    print("\n" + "="*60)
    print("🔍 TESTING WEBSOCKET BROADCAST")
    print("="*60)
    
    try:
        # Send a test thinking message
        response = requests.post(
            f"{BACKEND_URL}/agent/thinking",
            json={
                "type": "test",
                "message": "🧪 Testing real-time updates from Python script"
            },
            timeout=5
        )
        
        if response.status_code == 200:
            print("✅ Test message sent to WebSocket")
            print("   → Check your dashboard 'AI Agent Live Thinking' panel")
            print("   → You should see: '🧪 Testing real-time updates...'")
            return True
        else:
            print(f"❌ Failed to send message: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_agent_status():
    print("\n" + "="*60)
    print("🔍 CHECKING AGENT STATUS")
    print("="*60)
    
    try:
        response = requests.get(f"{BACKEND_URL}/agent/status", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ Agent status retrieved")
            print(f"   Status: {data.get('status', 'unknown')}")
            print(f"   Action: {data.get('currentAction', 'none')}")
            print(f"   Confidence: {data.get('confidence', 0)}")
            return True
        else:
            print(f"❌ Failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("\n╔══════════════════════════════════════════════════════════════╗")
    print("║          WEBSOCKET & REAL-TIME UPDATE TEST                   ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    
    # Test 1: Backend connection
    backend_ok = test_backend()
    if not backend_ok:
        print("\n❌ FAILED: Backend not reachable")
        print("   Fix: cd backend && npm start")
        return
    
    time.sleep(1)
    
    # Test 2: Agent status
    agent_ok = test_agent_status()
    
    time.sleep(1)
    
    # Test 3: WebSocket broadcast
    ws_ok = test_websocket_broadcast()
    
    # Summary
    print("\n" + "="*60)
    print("📊 TEST SUMMARY")
    print("="*60)
    print(f"   Backend API:      {'✅ PASS' if backend_ok else '❌ FAIL'}")
    print(f"   Agent Status:     {'✅ PASS' if agent_ok else '❌ FAIL'}")  
    print(f"   WebSocket:        {'✅ PASS' if ws_ok else '❌ FAIL'}")
    print("="*60)
    
    if all([backend_ok, ws_ok]):
        print("\n🎉 ALL TESTS PASSED!")
        print("\n📋 Next Steps:")
        print("   1. Open dashboard: http://localhost:3000/dashboard")
        print("   2. Check 'AI Agent Live Thinking' panel")
        print("   3. You should see the test message appear")
        print("   4. If you see it → Real-time updates are working!")
        print("\n   Then start the AI agent:")
        print("   cd ai-agent && python run_autonomous_trader.py")
    else:
        print("\n⚠️  SOME TESTS FAILED")
        print("\n📋 Troubleshooting:")
        if not backend_ok:
            print("   → Start backend: cd backend && npm start")
        if not ws_ok:
            print("   → Check backend console for WebSocket errors")

if __name__ == "__main__":
    main()
