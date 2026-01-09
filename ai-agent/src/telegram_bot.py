"""
Cronos Sentinel Telegram Bot - Day 14
Bridges Python AI Agent + Node.js Backend for autonomous trading
"""
import os
import sys
import asyncio
import subprocess
import json
import time
import re
import aiohttp
from typing import Dict, Any
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes
from crypto_com_agent_client import Agent, SQLitePlugin

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import our agents
from agents.market_data_agent import MARKET_DATA_TOOLS_PRO
from agents.sentinel_agent import SENTINEL_TOOLS
from agents.sentiment_agent import SENTIMENT_TOOLS

load_dotenv()

# Token address mappings for Cronos Testnet 338
TOKEN_ADDRESSES = {
    "cro": None,  # Native TCRO
    "tcro": None,  # Native token
    "wcro": "0x6a3173618859C7cd40fAF6921b5E9eB6A76f1fD4",
    "usdc": "0xc21223249CA28397B4B6541dfFaEcC539BfF0c59",
    "usdt": "0x66e428c3f67a68878562e79A0234c1F83c208770",
}

def resolve_token_address(token_symbol: str) -> str:
    """Resolve token symbol to blockchain address"""
    if not token_symbol:
        return None
    token_key = token_symbol.lower().strip()
    return TOKEN_ADDRESSES.get(token_key, None)

# Configuration
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
AGENT_WALLET = os.getenv("AGENT_WALLET_ADDRESS", "0xa22Db5E0d0df88424207B6fadE76ae7a6FAABE94")
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:3001")
API_KEY = os.getenv("API_KEY", "sentinel-2024-cronos-hackathon-api-key")

# Simple response cache (5 min TTL)
response_cache = {}
CACHE_TTL = 300  # 5 minutes

# Initialize AI Agent
def create_ai_agent():
    """Initialize the Cronos Sentinel AI Agent"""
    all_tools = MARKET_DATA_TOOLS_PRO + SENTINEL_TOOLS + SENTIMENT_TOOLS
    
    storage = SQLitePlugin(db_path="telegram_agent_state.db")
    
    agent = Agent.init(
        llm_config={
            "provider": "GoogleGenAI",
            "model": "gemini-2.5-flash",
            "provider-api-key": os.getenv("GEMINI_API_KEY"),
            "temperature": 0.7,
        },
        blockchain_config={
            "api-key": os.getenv("DEVELOPER_PLATFORM_API_KEY"),
            "private-key": os.getenv("PRIVATE_KEY"),
            "timeout": 30,
        },
        plugins={
            "personality": {"tone": "friendly and professional", "verbosity": "concise"},
            "instructions": """You are Cronos Sentinel - an AI trading assistant with blockchain-enforced safety.

CAPABILITIES:
- Real-time market data from Crypto.com Exchange
- Social sentiment analysis for crypto tokens
- Smart contract safety checks (1 TCRO daily limit)

RESPONSE STYLE:
- Be concise and clear
- Use emojis: 📊 market, 🐦 sentiment, 🛡️ safety
- Always check safety before recommending trades
- Explain your reasoning

When users ask about trades:
1. Check market conditions
2. Analyze sentiment
3. Verify Sentinel approval
4. Provide clear recommendation

Be helpful but always prioritize safety!""",
            "tools": all_tools,
            "storage": storage,
        },
    )
    
    return agent

# Global agent instance
ai_agent = None

# Command handlers
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /start command"""
    welcome_msg = """
🛡️ **Cronos Sentinel Bot**

I'm your AI-powered DeFi trading assistant with blockchain-enforced safety!

**What I can do:**
📊 Real-time market analysis
🐦 Social sentiment tracking  
🛡️ Smart contract safety checks
💱 Execute trades (within limits)

**Try asking:**
• "What's the CRO price?"
• "What's CRO sentiment?"
• "Can I swap 0.05 CRO?"
• "Execute swap 0.05 CRO to USDC"

**Commands:**
/start - Show this message
/status - Check Sentinel status
/balance - View wallet balances
/help - Get help

Powered by SentinelClamp - trades are blockchain-limited for your safety!
"""
    await update.message.reply_text(welcome_msg)

async def status_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /status command - show Sentinel status"""
    await update.message.reply_text("🔍 Checking Sentinel status...")
    
    try:
        # Call backend API
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{API_BASE_URL}/api/sentinel/status",
                headers={"X-API-Key": API_KEY}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    status = data['data']
                    
                    msg = f"""
🛡️ **Sentinel Status**

💰 Daily Limit: {float(status['currentSpent']) + float(status['remaining']):.2f} CRO
📊 Current Spent: {status['currentSpent']} CRO
✅ Remaining: {status['remaining']} CRO
⏰ Reset in: {status['timeUntilReset']}s
🔢 Total Transactions: {status['txCount']}
🔐 x402 Transactions: {status['x402TxCount']}
{"⏸️ Paused" if status['isPaused'] else "▶️ Active"}
"""
                    await update.message.reply_text(msg)
                else:
                    await update.message.reply_text(f"❌ API Error: {response.status}")
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {str(e)}")

async def balance_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /balance command"""
    await update.message.reply_text("💰 Checking wallet balances...")
    
    try:
        # Call backend API
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{API_BASE_URL}/api/wallet/balance",
                headers={"X-API-Key": API_KEY}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    balances = data['data']
                    
                    msg = f"""
💰 **Wallet Balances**

🪙 TCRO: {balances['TCRO']}
🔄 WCRO: {balances['WCRO']}
💵 USDC: {balances['USDC']}

Wallet: `{AGENT_WALLET}`
"""
                    await update.message.reply_text(msg, parse_mode="Markdown")
                else:
                    await update.message.reply_text(f"❌ API Error: {response.status}")
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {str(e)}")

async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle /help command"""
    help_msg = """
🆘 **Cronos Sentinel Help**

**Analysis Commands:**
Just ask naturally! Examples:
• "What's the price of CRO?"
• "Show me CRO sentiment"
• "Is it a good time to buy?"
• "Compare CRO and ETH sentiment"

**Trading Commands:**
• "Can I swap 0.05 CRO to USDC?" - Check if trade is approved
• "Execute swap 0.05 CRO to USDC" - Execute the trade

**Bot Commands:**
/status - Sentinel safety status
/balance - Wallet balances
/help - This message

**How it works:**
1. You ask about a trade
2. I analyze market + sentiment + safety
3. If approved, I can execute via SentinelClamp
4. Smart contract enforces 1 TCRO daily limit

Your safety is guaranteed by blockchain, not just code!
"""
    await update.message.reply_text(help_msg)

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle regular text messages"""
    user_message = update.message.text
    user_id = update.effective_user.id
    
    # Check cache first (normalize query)
    cache_key = user_message.lower().strip()
    current_time = time.time()
    
    if cache_key in response_cache:
        cached_response, cache_time = response_cache[cache_key]
        if current_time - cache_time < CACHE_TTL:
            # Use cached response
            await update.message.reply_text(f"{cached_response}\n\n💾 _Cached response_", parse_mode="Markdown")
            return
    
    # Show typing indicator
    await update.message.chat.send_action("typing")
    
    try:
        # Check if user wants to execute a trade
        if "execute swap" in user_message.lower() or "do the swap" in user_message.lower():
            await execute_trade(update, user_message)
        else:
            # Use AI agent for analysis
            response = ai_agent.interact(user_message)
            
            # Cache the response
            response_cache[cache_key] = (response, current_time)
            
            await update.message.reply_text(response)
            
    except Exception as e:
        error_msg = f"❌ Sorry, I encountered an error: {str(e)}\n\nPlease try again or use /help for guidance."
        await update.message.reply_text(error_msg)

async def execute_trade(update: Update, user_message: str):
    """Execute a trade via backend API"""
    await update.message.reply_text("🔄 Analyzing trade request...")
    
    try:
        # Parse trade parameters from message
        # Example: "execute swap 0.05 CRO to USDC"
        message_lower = user_message.lower()
        
        # Extract amount using regex
        amount_match = re.search(r'(\d+\.?\d*)\s*(cro|tcro|usdc|wcro)', message_lower)
        if not amount_match:
            await update.message.reply_text("❌ Could not parse amount. Example: 'execute swap 0.05 CRO to USDC'")
            return
        
        amount = float(amount_match.group(1))
        
        # Extract token symbols
        # Look for pattern: "X CRO to USDC" or "X from CRO to USDC"
        token_pattern = r'(\d+\.?\d*)\s*(cro|tcro|usdc|wcro)\s*(?:to|for)\s*(cro|tcro|usdc|wcro)'
        token_match = re.search(token_pattern, message_lower)
        
        if token_match:
            token_in_symbol = token_match.group(2)
            token_out_symbol = token_match.group(3)
        else:
            # Default: CRO to USDC
            token_in_symbol = "cro"
            token_out_symbol = "usdc"
        
        # Resolve to addresses
        token_in_addr = resolve_token_address(token_in_symbol)
        token_out_addr = resolve_token_address(token_out_symbol)
        
        await update.message.reply_text(f"💱 Swap: {amount} {token_in_symbol.upper()} → {token_out_symbol.upper()}")
        
        # First, check with Sentinel via API to see if this is safe
        await update.message.reply_text("🛡️ Checking Sentinel safety limits...")
        
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{API_BASE_URL}/api/sentinel/status",
                headers={"X-API-Key": API_KEY}
            ) as response:
                sentinel_status = await response.json()
                
                if not sentinel_status['success']:
                    await update.message.reply_text("❌ Could not check Sentinel status. Aborting for safety.")
                    return
                
                remaining = float(sentinel_status['data']['remaining'])
                
                if amount > remaining:
                    await update.message.reply_text(
                        f"🚫 **Sentinel Blocked!**\n\n"
                        f"Requested: {amount} CRO\n"
                        f"Remaining limit: {remaining} CRO\n\n"
                        f"Daily limit enforced by blockchain smart contract."
                    )
                    return
                
                await update.message.reply_text(
                    f"✅ Sentinel approved!\n"
                    f"Will use {amount} CRO of {remaining} CRO remaining"
                )
        
        # Execute via backend API
        await update.message.reply_text("⚙️ Executing trade via SentinelClamp...")
        
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{API_BASE_URL}/api/trade/execute",
                json={
                    "amount": amount,
                    "tokenIn": token_in_addr,
                    "tokenOut": token_out_addr,
                    "slippage": 5
                },
                headers={"X-API-Key": API_KEY}
            ) as response:
                result = await response.json()
                
                if result['success']:
                    data = result['data']
                    success_msg = f"""
✅ **Trade Executed Successfully!**

💱 **Swap Details:**
• Amount In: {data['amountIn']} CRO
• Expected Out: {data['expectedOut']} USDC
• Min Out: {data['minOut']} USDC
• Final Balance: {data['finalBalance']} USDC

🔗 **Transactions:**
• Sentinel: `{data['sentinelTx'][:10]}...`
• Swap: `{data['swapTx'][:10]}...`
• Block: {data['blockNumber']}

🔗 [View on Explorer]({data['explorerUrl']})

🛡️ Protected by SentinelClamp smart contract
"""
                    await update.message.reply_text(success_msg, parse_mode="Markdown")
                else:
                    await update.message.reply_text(f"❌ Trade failed: {result['error']}")
            
    except aiohttp.ClientError as e:
        await update.message.reply_text(f"❌ API connection error: {str(e)}\n\nMake sure backend API is running!")
    except Exception as e:
        await update.message.reply_text(f"❌ Error: {str(e)}")

async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle errors"""
    print(f"Error: {context.error}")
    if update and update.message:
        await update.message.reply_text("❌ An error occurred. Please try again.")

def main():
    """Start the Telegram bot"""
    global ai_agent
    
    print("=" * 60)
    print("🛡️  CRONOS SENTINEL TELEGRAM BOT")
    print("=" * 60)
    print()
    
    # Check configuration
    if not TELEGRAM_BOT_TOKEN:
        print("❌ TELEGRAM_BOT_TOKEN not set in .env")
        return
    
    # Initialize AI agent
    print("Initializing AI agent...")
    try:
        ai_agent = create_ai_agent()
        print("✅ AI agent initialized")
    except Exception as e:
        print(f"❌ Failed to initialize AI agent: {e}")
        return
    
    # Create Telegram application
    print(f"Starting bot: @CronosSentinel_bot")
    app = Application.builder().token(TELEGRAM_BOT_TOKEN).build()
    
    # Add handlers
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("status", status_command))
    app.add_handler(CommandHandler("balance", balance_command))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_error_handler(error_handler)
    
    # Start bot
    print("✅ Bot is running!")
    print("   Send /start to @CronosSentinel_bot on Telegram")
    print()
    
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
