#!/usr/bin/env python3
"""Test Gemini API Key"""
import google.generativeai as genai
from dotenv import load_dotenv
import os

load_dotenv()

print("\n" + "="*60)
print("TESTING GEMINI API KEY")
print("="*60)

api_key = os.getenv('GEMINI_API_KEY')
print(f"\nAPI Key loaded: {api_key[:20]}...{api_key[-5:]}")

try:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
    
    print("\nSending test prompt to Gemini...")
    response = model.generate_content('Say hello in one sentence')
    
    print("\n✅ SUCCESS! Gemini API is working!")
    print(f"\nGemini Response: {response.text}")
    print("\n" + "="*60)
    
except Exception as e:
    print(f"\n❌ ERROR: Gemini API failed!")
    print(f"Error: {e}")
    print("\n" + "="*60)
