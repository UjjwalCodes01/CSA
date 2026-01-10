"""Test Gemini API Key Quota Status"""

import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

api_key = os.getenv('GEMINI_API_KEY')
gcp_project = os.getenv('GCP_PROJECT_ID')

print("="*60)
print("GEMINI API KEY TEST")
print("="*60)
print(f"API Key (first 20): {api_key[:20] if api_key else 'NOT FOUND'}")
print(f"GCP Project: {gcp_project}")
print()

# Test 1: Basic API call
print("Test 1: Simple API Call")
print("-"*60)
try:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    
    response = model.generate_content('Say "API working" in 3 words')
    print(f"Response: {response.text}")
    print("Status: SUCCESS - API is working!")
    
except Exception as e:
    error_str = str(e)
    print(f"Error: {error_str}")
    
    if '429' in error_str or 'Resource' in error_str or 'quota' in error_str.lower():
        print()
        print("RATE LIMIT / QUOTA ERROR DETECTED")
        print()
        print("This means:")
        print("  - You've exceeded your API quota for today")
        print("  - Your API key might still be on free tier")
        print("  - Need to wait for quota reset (usually 24 hours)")
        print()
        print("Solutions:")
        print("  1. Check API key tier: https://aistudio.google.com/apikey")
        print("  2. Verify GCP billing: https://console.cloud.google.com/billing")
        print("  3. Check quotas: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas")
        print("  4. Create new API key with billing enabled")
        print("  5. Wait 24 hours for quota reset")
    else:
        print()
        print("Other error (not quota related)")

print()

# Test 2: Check if using GCP billing
print("Test 2: GCP Configuration Check")
print("-"*60)
if gcp_project:
    print(f"GCP Project ID configured: {gcp_project}")
    print()
    print("NOTE: Even with GCP project ID, you need to:")
    print("  1. Enable billing on the project")
    print("  2. Create API key LINKED to that project")
    print("  3. Enable Generative Language API")
    print()
    print("Check at: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com")
else:
    print("No GCP Project ID configured")
    print("Using standard API key (subject to free tier limits)")

print()
print("="*60)
