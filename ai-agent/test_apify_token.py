"""Test Apify API token validity and list available actors"""

from apify_client import ApifyClient
from dotenv import load_dotenv
import os

load_dotenv()

api_token = os.getenv("APIFY_API_TOKEN")

print("🔑 Testing Apify API Token...")
print(f"Token: {api_token[:20]}..." if api_token else "Token: NOT FOUND")
print()

try:
    client = ApifyClient(api_token)
    
    # Test 1: Get user info
    print("📊 Test 1: Fetching user information...")
    user = client.user('me').get()
    print(f"   ✓ Connected as: {user.get('username', 'unknown')}")
    print(f"   Email: {user.get('email', 'N/A')}")
    print()
    
    # Test 2: List available actors (first 10)
    print("📋 Test 2: Available actors in Apify Store...")
    actors = client.actors().list(limit=10)
    
    # Search for Twitter-related actors
    print("\n🔍 Searching for Twitter scrapers...")
    twitter_actors = client.actors().list(
        my=False,
        limit=50,
    )
    
    twitter_related = []
    for actor in twitter_actors.items:
        name = actor.get('name', '').lower()
        title = actor.get('title', '').lower()
        if 'twitter' in name or 'twitter' in title or 'tweet' in name:
            twitter_related.append({
                'id': actor.get('id'),
                'name': actor.get('name'),
                'title': actor.get('title'),
                'username': actor.get('username')
            })
    
    if twitter_related:
        print(f"\n   Found {len(twitter_related)} Twitter-related actors:")
        for actor in twitter_related[:5]:  # Show first 5
            full_name = f"{actor['username']}/{actor['name']}"
            print(f"   • {full_name}")
            print(f"     Title: {actor['title']}")
    else:
        print("   ⚠️  No Twitter actors found in public store")
        print("   This might mean:")
        print("     - Need to use a different scraping approach")
        print("     - Twitter actors require special access")
        print("     - Or use generic web scraper")
    
    print("\n✅ API Token is valid!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    print("\nPossible issues:")
    print("  - Invalid API token")
    print("  - Network connection problems")
    print("  - Apify service unavailable")
