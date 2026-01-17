from web3 import Web3
import os
from dotenv import load_dotenv

load_dotenv('../backend/.env')

w3 = Web3(Web3.HTTPProvider(os.getenv('RPC_URL')))
wallet = os.getenv('AGENT_WALLET_ADDRESS')
balance = w3.eth.get_balance(wallet)

print(f'Wallet: {wallet}')
print(f'Balance: {w3.from_wei(balance, "ether")} TCRO')
print(f'Status: {"FUNDED" if balance > w3.to_wei(0.05, "ether") else "NEEDS MORE"}')
