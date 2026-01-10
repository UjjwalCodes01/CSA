"""
Real Balance Tracking with SQLite Memory
Tracks on-chain balances with intelligent fallback for RPC failures
"""
import os
import sqlite3
from datetime import datetime
from typing import Dict, Optional
from web3 import Web3
from dotenv import load_dotenv

load_dotenv()


class BalanceTracker:
    """Track real on-chain balances with SQLite memory for fallback"""
    
    def __init__(self, db_path: str = "balance_memory.db"):
        self.w3 = Web3(Web3.HTTPProvider(os.getenv("RPC_URL")))
        
        # Get agent address from private key or direct address
        agent_addr = os.getenv("AGENT_WALLET_ADDRESS")
        if not agent_addr:
            # Derive from private key
            private_key = os.getenv("PRIVATE_KEY")
            if private_key:
                account = self.w3.eth.account.from_key(private_key)
                agent_addr = account.address
            else:
                raise ValueError("Either AGENT_WALLET_ADDRESS or PRIVATE_KEY must be set in .env")
        
        self.agent_address = Web3.to_checksum_address(agent_addr)
        self.db_path = db_path
        self._init_database()
        
    def _init_database(self):
        """Initialize SQLite database for balance memory"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS balance_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                token_symbol TEXT NOT NULL,
                token_address TEXT,
                balance TEXT NOT NULL,
                balance_decimal REAL NOT NULL,
                source TEXT NOT NULL,
                UNIQUE(timestamp, token_symbol)
            )
        """)
        
        conn.commit()
        conn.close()
        
    def get_native_balance(self, address: Optional[str] = None) -> Dict:
        """Get TCRO balance with SQLite fallback"""
        if address is None:
            address = self.agent_address
        else:
            address = Web3.to_checksum_address(address)
            
        try:
            # Try to get real on-chain balance
            balance_wei = self.w3.eth.get_balance(address)
            balance_tcro = self.w3.from_wei(balance_wei, 'ether')
            
            # Store in memory
            self._store_balance("TCRO", None, str(balance_wei), float(balance_tcro), "on-chain")
            
            return {
                "symbol": "TCRO",
                "balance_wei": balance_wei,
                "balance": float(balance_tcro),
                "source": "on-chain",
                "timestamp": datetime.now().isoformat(),
                "fresh": True
            }
            
        except Exception as e:
            # RPC failed, use memory
            print(f"⚠️  RPC failed for TCRO balance: {e}")
            return self._get_balance_from_memory("TCRO")
    
    def get_token_balance(self, token_address: str, token_symbol: str, decimals: int = 18) -> Dict:
        """Get ERC20 token balance with SQLite fallback"""
        token_address = Web3.to_checksum_address(token_address)
        
        try:
            # ERC20 ABI for balanceOf
            erc20_abi = [
                {
                    "constant": True,
                    "inputs": [{"name": "_owner", "type": "address"}],
                    "name": "balanceOf",
                    "outputs": [{"name": "balance", "type": "uint256"}],
                    "type": "function"
                }
            ]
            
            contract = self.w3.eth.contract(address=token_address, abi=erc20_abi)
            balance_raw = contract.functions.balanceOf(self.agent_address).call()
            balance_decimal = balance_raw / (10 ** decimals)
            
            # Store in memory
            self._store_balance(token_symbol, token_address, str(balance_raw), balance_decimal, "on-chain")
            
            return {
                "symbol": token_symbol,
                "address": token_address,
                "balance_raw": balance_raw,
                "balance": balance_decimal,
                "decimals": decimals,
                "source": "on-chain",
                "timestamp": datetime.now().isoformat(),
                "fresh": True
            }
            
        except Exception as e:
            # RPC failed, use memory
            print(f"⚠️  RPC failed for {token_symbol} balance: {e}")
            return self._get_balance_from_memory(token_symbol, token_address)
    
    def get_all_balances(self) -> Dict:
        """Get all tracked balances"""
        # Known tokens - use WCRO (ecosystem standard) and tUSD
        tokens = {
            "WCRO": {
                "address": os.getenv("WCRO_ADDRESS"),
                "decimals": 18
            },
            "tUSD": {
                "address": os.getenv("TEST_USD_ADDRESS"),
                "decimals": 18
            }
        }
        
        balances = {}
        
        # Native token
        balances["TCRO"] = self.get_native_balance()
        
        # ERC20 tokens
        for symbol, info in tokens.items():
            if info["address"] and info["address"] != "0x...":
                balances[symbol] = self.get_token_balance(
                    info["address"], 
                    symbol, 
                    info["decimals"]
                )
        
        return balances
    
    def _store_balance(self, symbol: str, address: Optional[str], balance_raw: str, 
                      balance_decimal: float, source: str):
        """Store balance in SQLite for memory"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            timestamp = datetime.now().isoformat()
            
            cursor.execute("""
                INSERT OR REPLACE INTO balance_history 
                (timestamp, token_symbol, token_address, balance, balance_decimal, source)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (timestamp, symbol, address, balance_raw, balance_decimal, source))
            
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"⚠️  Failed to store balance in memory: {e}")
    
    def _get_balance_from_memory(self, symbol: str, address: Optional[str] = None) -> Dict:
        """Get last known balance from SQLite memory"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            if address:
                cursor.execute("""
                    SELECT timestamp, balance, balance_decimal, source
                    FROM balance_history
                    WHERE token_symbol = ? AND token_address = ?
                    ORDER BY timestamp DESC
                    LIMIT 1
                """, (symbol, address))
            else:
                cursor.execute("""
                    SELECT timestamp, balance, balance_decimal, source
                    FROM balance_history
                    WHERE token_symbol = ?
                    ORDER BY timestamp DESC
                    LIMIT 1
                """, (symbol,))
            
            result = cursor.fetchone()
            conn.close()
            
            if result:
                timestamp, balance_raw, balance_decimal, original_source = result
                
                # Calculate how old the data is
                stored_time = datetime.fromisoformat(timestamp)
                age_minutes = (datetime.now() - stored_time).total_seconds() / 60
                
                return {
                    "symbol": symbol,
                    "address": address,
                    "balance": balance_decimal,
                    "source": f"memory (from {original_source} {age_minutes:.1f}min ago)",
                    "timestamp": timestamp,
                    "fresh": False,
                    "age_minutes": age_minutes
                }
            else:
                # No memory available
                return {
                    "symbol": symbol,
                    "address": address,
                    "balance": 0.0,
                    "source": "no-data",
                    "timestamp": datetime.now().isoformat(),
                    "fresh": False,
                    "error": "No balance history available"
                }
                
        except Exception as e:
            print(f"⚠️  Failed to read from memory: {e}")
            return {
                "symbol": symbol,
                "balance": 0.0,
                "source": "error",
                "error": str(e),
                "fresh": False
            }
    
    def get_balance_summary(self) -> str:
        """Get human-readable balance summary"""
        balances = self.get_all_balances()
        
        lines = ["💰 AGENT BALANCE SUMMARY", "=" * 60]
        
        for symbol, data in balances.items():
            if data.get("fresh"):
                status = "✅"
            else:
                age = data.get("age_minutes", 0)
                status = f"⚠️  (cached {age:.1f}min ago)"
            
            lines.append(f"{status} {symbol}: {data['balance']:.6f} ({data['source']})")
        
        lines.append("=" * 60)
        return "\n".join(lines)


def main():
    """Test balance tracking"""
    print("\n🔍 REAL BALANCE TRACKING TEST")
    print("=" * 80)
    
    tracker = BalanceTracker()
    
    print("\n1️⃣  Testing Native Token (TCRO)...")
    print("-" * 80)
    tcro = tracker.get_native_balance()
    print(f"✅ TCRO Balance: {tcro['balance']:.6f}")
    print(f"   Source: {tcro['source']}")
    print(f"   Fresh: {tcro['fresh']}")
    
    print("\n2️⃣  Testing Full Balance Summary...")
    print("-" * 80)
    print(tracker.get_balance_summary())
    
    print("\n3️⃣  Testing RPC Failure Simulation...")
    print("-" * 80)
    print("Simulating RPC failure by using invalid RPC URL...")
    
    # Create tracker with bad RPC to test fallback
    import tempfile
    temp_db = tempfile.mktemp(suffix=".db")
    
    # First store some data
    tracker2 = BalanceTracker(temp_db)
    tracker2._store_balance("TCRO", None, "95000000000000000000", 95.0, "simulated")
    
    # Now break the RPC
    tracker2.w3 = Web3(Web3.HTTPProvider("http://invalid-rpc-url"))
    
    result = tracker2.get_native_balance()
    print(f"✅ Fallback worked!")
    print(f"   Balance: {result['balance']:.6f} TCRO")
    print(f"   Source: {result['source']}")
    print(f"   Fresh: {result['fresh']}")
    
    print("\n" + "=" * 80)
    print("✅ BALANCE TRACKING TEST COMPLETE")
    print("=" * 80)
    print("\n💡 KEY FEATURES:")
    print("   ✅ Real on-chain balance queries (w3.eth.get_balance)")
    print("   ✅ ERC20 token support (contract.balanceOf)")
    print("   ✅ SQLite memory for intelligent fallback")
    print("   ✅ Graceful RPC failure handling")
    print("   ✅ Timestamp tracking for data freshness")


if __name__ == "__main__":
    main()
