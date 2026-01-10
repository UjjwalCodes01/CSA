"""
Check Gemini API quota and availability
"""
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

print("=" * 60)
print("🔍 GEMINI API QUOTA CHECK")
print("=" * 60)
print()

if not API_KEY:
    print("❌ No GEMINI_API_KEY found in .env")
    exit(1)

print(f"✓ API Key found: {API_KEY[:10]}...{API_KEY[-4:]}")
print()

# Configure Gemini
genai.configure(api_key=API_KEY)

# Try to list available models
print("📋 Testing API access...")
try:
    models = genai.list_models()
    print("✅ API Key is valid!")
    print()
    print("Available models:")
    for model in models:
        if 'gemini' in model.name.lower():
            print(f"  • {model.name}")
    print()
except Exception as e:
    print(f"❌ API Error: {e}")
    print()
    exit(1)

# Try a simple generation request
print("🧪 Testing generation (checking quota)...")
try:
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    response = model.generate_content("Say 'Hello' in one word")
    
    print("✅ Generation successful!")
    print(f"Response: {response.text}")
    print()
    print("🎉 Gemini API is working! You have quota available.")
    print()
    
except Exception as e:
    error_str = str(e)
    
    if "429" in error_str or "quota" in error_str.lower():
        print("❌ QUOTA EXCEEDED")
        print()
        print("Your Gemini API quota is exhausted.")
        print()
        print("Solutions:")
        print("  1. Wait 24 hours for daily quota reset")
        print("  2. Enable billing on Google AI Studio")
        print("  3. Use GCP Vertex AI (you have $300 credits)")
        print("  4. Switch to gemini-1.5-flash model (higher quota)")
        print()
        print(f"Full error: {error_str[:200]}...")
    else:
        print(f"❌ Error: {e}")
    print()
    exit(1)

print("=" * 60)
