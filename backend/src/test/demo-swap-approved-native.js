// Demo: Native CRO Swap (APPROVED by Sentinel)
// Swaps native TCRO for USDC.e without needing WCRO

import 'dotenv/config';
import { ethers } from 'ethers';
import { VVS_ROUTER_ABI } from '../abi/VVSRouter.js';
import { ERC20_ABI } from '../abi/ERC20.js';
import { SENTINEL_CLAMP_ABI } from '../abi/SentinelClamp.js';

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     DEMO: NATIVE CRO SWAP (SENTINEL APPROVES)             ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('📝 Scenario:');
  console.log('   Swap 0.05 TCRO → USDC.e (native CRO, no wrapping!)');
  console.log('   Daily limit: 1 TCRO');
  console.log('   Expected: ✅ APPROVED (within limit)\n');
  
  try {
    // Initialize
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const wallet = new ethers.Wallet(process.env.AGENT_PRIVATE_KEY, provider);
    
    const vvsRouter = new ethers.Contract(
      process.env.VVS_ROUTER_ADDRESS,
      VVS_ROUTER_ABI,
      wallet
    );
    
    const sentinel = new ethers.Contract(
      process.env.SENTINEL_CLAMP_ADDRESS,
      SENTINEL_CLAMP_ABI,
      wallet
    );
    
    const usdc = new ethers.Contract(
      process.env.USDC_CONTRACT_ADDRESS,
      ERC20_ABI,
      provider
    );
    
    console.log('Agent initialized');
    console.log(`   Wallet: ${wallet.address}`);
    console.log(`   VVS Router: ${process.env.VVS_ROUTER_ADDRESS}`);
    console.log(`   Sentinel: ${process.env.SENTINEL_CLAMP_ADDRESS}\n`);
    
    // Get WCRO address from router
    console.log('Getting WCRO address from VVS Router...');
    const wcroAddress = await vvsRouter.WETH();
    console.log(`   WCRO: ${wcroAddress}\n`);
    
    // Display initial balances
    console.log('═══════════════════════════════════════════════════════════');
    console.log('INITIAL STATE');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const initialCRO = await provider.getBalance(wallet.address);
    const initialUSDC = await usdc.balanceOf(wallet.address);
    const usdcDecimals = await usdc.decimals();
    
    console.log('💰 Balances:');
    console.log(`   TCRO: ${ethers.formatEther(initialCRO)}`);
    console.log(`   USDC.e: ${ethers.formatUnits(initialUSDC, usdcDecimals)}`);
    
    // Get Sentinel status
    const [spent, remaining] = await sentinel.getStatus();
    console.log(`\n🛡️  Sentinel:`);
    console.log(`   Daily Spent: ${ethers.formatEther(spent)} TCRO`);
    console.log(`   Remaining: ${ethers.formatEther(remaining)} TCRO`);
    
    // Swap parameters
    const amountIn = ethers.parseEther('0.05'); // 0.05 TCRO
    const path = [wcroAddress, process.env.USDC_CONTRACT_ADDRESS];
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('STEP 1: GET QUOTE');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log(`Requesting quote for 0.05 TCRO → USDC.e...`);
    const amounts = await vvsRouter.getAmountsOut(amountIn, path);
    console.log(`   Expected output: ${ethers.formatUnits(amounts[1], usdcDecimals)} USDC.e`);
    
    // Calculate min with 5% slippage
    const minOut = (amounts[1] * 95n) / 100n;
    console.log(`   Min output (5% slippage): ${ethers.formatUnits(minOut, usdcDecimals)} USDC.e`);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('STEP 2: SENTINEL CHECK (SIMULATION)');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const [approved, reason, remainingAfter] = await sentinel.simulateCheck(
      process.env.VVS_ROUTER_ADDRESS,
      amountIn
    );
    
    console.log(`Decision: ${approved ? '✅ APPROVED' : '❌ BLOCKED'}`);
    console.log(`Reason: ${reason}`);
    console.log(`Remaining after: ${ethers.formatEther(remainingAfter)} TCRO`);
    
    if (!approved) {
      console.log('\n❌ SWAP BLOCKED BY SENTINEL');
      return;
    }
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('STEP 3: RECORD IN SENTINEL');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('Recording approval in Sentinel...');
    const approveTx = await sentinel.checkAndApprove(process.env.VVS_ROUTER_ADDRESS, amountIn);
    console.log(`   Transaction sent: ${approveTx.hash}`);
    
    const approveReceipt = await approveTx.wait();
    console.log(`   ✅ Confirmed at block ${approveReceipt.blockNumber}`);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('STEP 4: EXECUTE SWAP ON VVS');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
    
    console.log('Executing swap...');
    console.log(`   Amount in: 0.05 TCRO`);
    console.log(`   Min out: ${ethers.formatUnits(minOut, usdcDecimals)} USDC.e`);
    console.log(`   Path: WCRO → USDC.e`);
    
    // Use swapExactETHForTokens - native CRO swap!
    const swapTx = await vvsRouter.swapExactETHForTokens(
      minOut,
      path,
      wallet.address,
      deadline,
      { value: amountIn } // Send CRO with transaction
    );
    
    console.log(`   Transaction sent: ${swapTx.hash}`);
    const swapReceipt = await swapTx.wait();
    console.log(`   ✅ Confirmed at block ${swapReceipt.blockNumber}`);
    
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('RESULT');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Get final balances
    const finalCRO = await provider.getBalance(wallet.address);
    const finalUSDC = await usdc.balanceOf(wallet.address);
    
    const croSpent = initialCRO - finalCRO;
    const usdcReceived = finalUSDC - initialUSDC;
    
    console.log('✅ SWAP SUCCESSFUL!\n');
    console.log('Transaction Details:');
    console.log(`   Sentinel Approval: ${approveReceipt.hash}`);
    console.log(`   Swap Transaction: ${swapReceipt.hash}`);
    console.log(`\nBalance Changes:`);
    console.log(`   TCRO Spent: ${ethers.formatEther(croSpent)}`);
    console.log(`   USDC.e Received: ${ethers.formatUnits(usdcReceived, usdcDecimals)}`);
    console.log(`\nFinal Balances:`);
    console.log(`   TCRO: ${ethers.formatEther(finalCRO)}`);
    console.log(`   USDC.e: ${ethers.formatUnits(finalUSDC, usdcDecimals)}`);
    
    console.log('\n🔗 View on Explorer:');
    console.log(`   https://explorer.cronos.org/testnet/tx/${swapReceipt.hash}`);
    
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ DEMO COMPLETE: SWAP EXECUTED WITH SENTINEL APPROVAL   ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
    if (error.reason) console.error('Reason:', error.reason);
    process.exit(1);
  }
}

main();
