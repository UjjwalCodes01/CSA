/**
 * Blockchain Event Monitor
 * 
 * Listens to SentinelClamp contract events on Cronos testnet
 * Monitors all on-chain activity for full transparency
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { SENTINEL_CLAMP_ABI } from '../abi/SentinelClamp.js';

dotenv.config();

export class EventMonitor {
  constructor(broadcastCallback) {
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    this.sentinelAddress = process.env.SENTINEL_CLAMP_ADDRESS;
    this.broadcastCallback = broadcastCallback;
    this.events = [];
    this.maxEvents = 200; // Keep last 200 events
    this.processedEvents = new Set(); // Track processed event IDs
    this.pollingInterval = null;
    
    // Event types to monitor (including manual trades)
    this.EVENT_TYPES = [
      'TransactionApproved',
      'TransactionBlocked',
      'X402PaymentApproved',
      'DailyLimitUpdated',
      'AgentAuthorized',
      'DappWhitelisted',
      'EmergencyPause',
      'LimitReset',
      'ManualTradeExecuted'  // Added for manual trade visibility
    ];
    
    // Create contract instance
    this.sentinel = new ethers.Contract(
      this.sentinelAddress,
      SENTINEL_CLAMP_ABI,
      this.provider
    );
    
    console.log('🔍 Event Monitor initialized');
    console.log(`   Watching: ${this.sentinelAddress}`);
  }

  /**
   * Start listening to all SentinelClamp events
   * NOTE: Cronos RPC doesn't support eth_newFilter, so we use polling instead
   */
  startListening() {
    console.log('🎧 Starting blockchain event polling...\n');
    console.log('⚠️  Note: Using polling instead of WebSocket (Cronos RPC limitation)\n');
    
    // Poll for new events every 30 seconds
    this.pollingInterval = setInterval(() => {
      this.pollRecentEvents();
    }, 30000); // 30 seconds
    
    // Do initial poll
    this.pollRecentEvents();
    
    console.log('✅ Event polling active (checks every 30 seconds)!\n');
  }
  
  /**
   * Poll for recent events (last 100 blocks)
   */
  async pollRecentEvents() {
    try {
      const currentBlock = await this.provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 100); // Last ~5 minutes on Cronos
      
      console.log(`📡 Polling events from block ${fromBlock} to ${currentBlock}...`);
      
      // Query all event types
      for (const eventType of this.EVENT_TYPES) {
        try {
          const filter = this.sentinel.filters[eventType]();
          const events = await this.sentinel.queryFilter(filter, fromBlock, currentBlock);
          
          // Process new events only
          for (const event of events) {
            const eventId = `${event.transactionHash}-${event.logIndex}`;
            if (!this.processedEvents.has(eventId)) {
              this.processedEvents.add(eventId);
              await this.processEvent(eventType, event);
            }
          }
        } catch (error) {
          // Silently skip - some events might not exist yet
        }
      }
    } catch (error) {
      console.error('Error polling events:', error.message);
    }
  }
  
  /**
   * Process a single event
   */
  async processEvent(eventType, event) {
    const eventData = {
      type: eventType,
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: Date.now(),
      ...this.parseEventArgs(eventType, event.args)
    };
    
    this.handleEvent(eventData);
    console.log(`✅ ${eventType}:`, {
      tx: event.transactionHash.slice(0, 10) + '...',
      block: event.blockNumber
    });
  }
  
  /**
   * Parse event arguments based on type
   */
  parseEventArgs(eventType, args) {
    switch(eventType) {
      case 'TransactionApproved':
        return {
          agent: args[0],
          dapp: args[1],
          amount: ethers.formatEther(args[2]),
          remaining: ethers.formatEther(args[3]),
          reason: args[4]
        };
      case 'TransactionBlocked':
        return {
          agent: args[0],
          dapp: args[1],
          amount: ethers.formatEther(args[2]),
          reason: args[3]
        };
      case 'X402PaymentApproved':
        return {
          agent: args[0],
          recipient: args[1],
          amount: ethers.formatEther(args[2]),
          service: args[3]
        };
      case 'DailyLimitUpdated':
        return {
          oldLimit: ethers.formatEther(args[0]),
          newLimit: ethers.formatEther(args[1])
        };
      case 'AgentAuthorized':
        return {
          agent: args[0],
          status: args[1]
        };
      case 'DappWhitelisted':
        return {
          dapp: args[0],
          status: args[1]
        };
      case 'EmergencyPause':
        return {
          by: args[0],
          timestamp: Number(args[1])
        };
      case 'LimitReset':
        return {
          timestamp: Number(args[0]),
          previousSpent: ethers.formatEther(args[1])
        };
      case 'ManualTradeExecuted':
        // Manual trades don't come from smart contract events
        // They are added directly via handleEvent() from the API
        return {};
      default:
        return {};
    }
  }
  
  /**
   * Stop monitoring
   */
  stop() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log('⏹️  Event polling stopped');
    }
  }

  /**
   * Handle incoming event
   */
  handleEvent(eventData) {
    // Add to events array
    this.events.unshift(eventData);
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(0, this.maxEvents);
    }
    
    // Broadcast to connected clients via WebSocket
    if (this.broadcastCallback) {
      this.broadcastCallback({
        type: 'blockchain_event',
        event: eventData
      });
    }
  }

  /**
   * Add manual event (e.g., manual trades that don't come from blockchain)
   * This allows manual trades to appear in Smart Contract Event Monitor
   */
  addManualEvent(eventData) {
    console.log(`📝 Adding manual event: ${eventData.type}`);
    console.log(`   Event data:`, eventData);
    console.log(`   Current events count: ${this.events.length}`);
    this.handleEvent(eventData);
    console.log(`   After adding: ${this.events.length}`);
  }

  /**
   * Get all events
   */
  getAllEvents() {
    return this.events;
  }

  /**
   * Get events filtered by type
   */
  getEventsByType(type) {
    return this.events.filter(e => e.type === type);
  }

  /**
   * Get events for specific agent
   */
  getEventsByAgent(agentAddress) {
    return this.events.filter(e => 
      e.agent && e.agent.toLowerCase() === agentAddress.toLowerCase()
    );
  }

  /**
   * Query historical events from blockchain
   */
  async queryHistoricalEvents(fromBlock = 'earliest', toBlock = 'latest') {
    try {
      console.log(`📜 Querying historical events from block ${fromBlock} to ${toBlock}...`);
      
      const currentBlock = await this.provider.getBlockNumber();
      console.log(`   Current block: ${currentBlock}`);
      
      // Cronos RPC limit: max 2000 blocks per query
      const lookbackBlocks = 2000;
      const startBlock = Math.max(0, currentBlock - lookbackBlocks);
      
      // Query all event types
      const eventTypes = [
        'TransactionApproved',
        'TransactionBlocked',
        'X402PaymentApproved',
        'DailyLimitUpdated',
        'AgentAuthorized',
        'DappWhitelisted',
        'EmergencyPause',
        'LimitReset'
      ];
      
      for (const eventType of eventTypes) {
        try {
          const filter = this.sentinel.filters[eventType]();
          const events = await this.sentinel.queryFilter(filter, startBlock, currentBlock);
          
          console.log(`   Found ${events.length} ${eventType} events`);
          
          for (const event of events) {
            const block = await event.getBlock();
            const eventData = this.parseEvent(event, block.timestamp);
            this.events.unshift(eventData);
          }
        } catch (err) {
          console.error(`   Error querying ${eventType}:`, err.message);
        }
      }
      
      // Sort by timestamp and limit
      this.events.sort((a, b) => b.timestamp - a.timestamp);
      this.events = this.events.slice(0, this.maxEvents);
      
      console.log(`✅ Loaded ${this.events.length} historical events\n`);
    } catch (error) {
      console.error('❌ Error querying historical events:', error.message);
    }
  }

  /**
   * Parse event log into standard format
   */
  parseEvent(event, blockTimestamp) {
    const eventName = event.fragment.name;
    const args = event.args;
    
    const baseData = {
      type: eventName,
      txHash: event.transactionHash,
      blockNumber: event.blockNumber,
      timestamp: blockTimestamp * 1000
    };
    
    switch (eventName) {
      case 'TransactionApproved':
        return {
          ...baseData,
          agent: args.agent,
          dapp: args.dapp,
          amount: ethers.formatEther(args.amount),
          remaining: ethers.formatEther(args.remainingLimit),
          reason: args.reason
        };
      
      case 'TransactionBlocked':
        return {
          ...baseData,
          agent: args.agent,
          dapp: args.dapp,
          amount: ethers.formatEther(args.amount),
          reason: args.reason
        };
      
      case 'X402PaymentApproved':
        return {
          ...baseData,
          agent: args.agent,
          recipient: args.recipient,
          amount: ethers.formatEther(args.amount),
          service: args.service
        };
      
      case 'DailyLimitUpdated':
        return {
          ...baseData,
          oldLimit: ethers.formatEther(args.oldLimit),
          newLimit: ethers.formatEther(args.newLimit)
        };
      
      case 'AgentAuthorized':
        return {
          ...baseData,
          agent: args.agent,
          status: args.status
        };
      
      case 'DappWhitelisted':
        return {
          ...baseData,
          dapp: args.dapp,
          status: args.status
        };
      
      case 'EmergencyPause':
        return {
          ...baseData,
          by: args.by,
          pausedAt: Number(args.timestamp)
        };
      
      case 'LimitReset':
        return {
          ...baseData,
          resetAt: Number(args.timestamp),
          previousSpent: ethers.formatEther(args.previousSpent)
        };
      
      default:
        return baseData;
    }
  }

  /**
   * Load historical events on startup
   */
  async loadHistoricalEvents() {
    await this.queryHistoricalEvents();
  }
}
