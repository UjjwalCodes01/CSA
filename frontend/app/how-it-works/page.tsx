'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Vortex } from "@/components/ui/vortex";
import { motion } from "motion/react";
import { ArrowLeft, Zap, Shield, Bot, Network, Coins, Activity, ChevronRight, Code, Database, Cpu, Globe } from 'lucide-react';
import Image from "next/image";

export default function HowItWorksPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="w-full min-h-screen overflow-hidden relative">
      {/* Top Navigation Bar - Matching Landing Page */}
      <div className="absolute top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-sm bg-black/20">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/50">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <div>
              <span className="text-white font-bold text-xl block">Sentinel AI</span>
              <span className="text-gray-400 text-xs">Autonomous Trading</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Home</span>
            </Link>
            <Link
              href="/dashboard"
              className="px-6 py-2 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 rounded-full text-white font-semibold shadow-lg shadow-indigo-500/30 transform hover:scale-105"
            >
              View Dashboard
            </Link>
          </motion.div>
        </div>
      </div>

      <Vortex
        backgroundColor="black"
        rangeY={800}
        particleCount={600}
        baseHue={220}
        className="flex items-start flex-col justify-start px-4 md:px-10 py-20 w-full min-h-screen"
      >
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16 max-w-6xl mx-auto"
        >
          <h1 className="text-6xl md:text-7xl font-bold bg-linear-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-6">
            x402 Protocol
          </h1>
          <p className="text-2xl md:text-3xl text-gray-300 mb-4">
            AI-Driven Autonomous Trading Infrastructure
          </p>
          <p className="text-lg md:text-xl text-gray-400 max-w-4xl mx-auto leading-relaxed">
            A sophisticated multi-agent system combining blockchain security, HTTP 402 micropayments,
            and real-time sentiment analysis for autonomous cryptocurrency trading
          </p>
        </motion.div>

        {/* Key Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20 max-w-6xl mx-auto"
        >
          {[
            { icon: Bot, label: 'AI Judge Agents', value: '3', color: 'from-indigo-500 to-cyan-500' },
            { icon: Shield, label: 'Smart Contracts', value: '4', color: 'from-purple-500 to-pink-500' },
            { icon: Activity, label: 'Data Sources', value: '9', color: 'from-green-500 to-emerald-500' },
            { icon: Zap, label: 'Trade Cycle', value: '15min', color: 'from-orange-500 to-red-500' },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 + idx * 0.1 }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-linear-to-r opacity-20 group-hover:opacity-30 transition-opacity rounded-xl blur"
                   style={{ background: `linear-gradient(to right, var(--tw-gradient-stops))` }} />
              <div className="relative bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 text-center hover:border-gray-600 transition-all">
                <stat.icon className={`w-8 h-8 mx-auto mb-3 bg-linear-to-r ${stat.color} bg-clip-text text-transparent`} style={{ WebkitTextFillColor: 'transparent', WebkitBackgroundClip: 'text' }} />
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* System Architecture Section */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="w-full max-w-7xl mx-auto mb-20"
        >
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold bg-linear-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-4">
              System Architecture
            </h2>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto">
              A distributed, event-driven architecture leveraging blockchain immutability,
              WebSocket real-time communication, and AI consensus mechanisms
            </p>
          </div>

          <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-8 mb-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* ASCII Architecture Diagram */}
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-white mb-4">Architecture Overview</h3>
                <pre className="text-xs md:text-sm overflow-x-auto bg-gray-900/50 p-4 rounded-lg border border-gray-700">
{`┌─────────────────────────────────────┐
│           FRONTEND (Next.js)         │
│   ┌─────────────────┐ ┌─────────────┐ │
│   │   Dashboard     │ │ How It Works│ │
│   │   Components    │ │  Page       │ │
│   └─────────────────┘ └─────────────┘ │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│          BACKEND (Express.js)       │
│   ┌─────────────────┐ ┌─────────────┐ │
│   │   REST API      │ │ WebSocket   │ │
│   │   Endpoints     │ │ Server      │ │
│   └─────────────────┘ └─────────────┘ │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│         AI AGENT (Python)           │
│   ┌─────────────────┐ ┌─────────────┐ │
│   │ Multi-Agent     │ │ Sentiment   │ │
│   │ Council         │ │ Analysis    │ │
│   └─────────────────┘ └─────────────┘ │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│      CRONOS TESTNET (EVM)           │
│   ┌─────────────────┐ ┌─────────────┐ │
│   │ SentinelClamp   │ │ WCRO AMM    │ │
│   │ Contract        │ │ Pool        │ │
│   └─────────────────┘ └─────────────┘ │
└─────────────────────────────────────┘`}
                </pre>
              </div>

              {/* Mermaid Flow Diagram */}
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-white mb-4">Data Flow</h3>
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                  <pre className="text-xs md:text-sm text-gray-300">
{`graph TD
    A[User Request] --> B[Frontend]
    B --> C[Backend API]
    C --> D{HTTP 402 Check}
    D -->|No Payment| E[Return 402 Response]
    D -->|Payment OK| F[Process Request]
    F --> G[AI Agent]
    G --> H[Multi-Agent Council]
    H --> I[Consensus Decision]
    I --> J[Trade Execution]
    J --> K[Cronos Testnet]
    K --> L[SentinelClamp Check]
    L --> M[AMM Swap]
    M --> N[Transaction Confirm]
    N --> O[WebSocket Update]
    O --> B`}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Multi-Agent Council Section */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="w-full max-w-7xl mx-auto mb-20"
        >
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold bg-linear-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
              Multi-Agent Council System
            </h2>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto">
              Three specialized AI judge agents work together to make informed trading decisions
              with risk management and consensus mechanisms, analyzing data from 9 independent sources
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              {
                name: 'Risk Manager',
                icon: Shield,
                role: 'Conservative',
                description: 'Evaluates market volatility, position sizing, and risk exposure',
                color: 'from-red-500 to-orange-500'
              },
              {
                name: 'Market Analyst',
                icon: Database,
                role: 'Data-driven',
                description: 'Analyzes technical indicators, price patterns, and market trends',
                color: 'from-blue-500 to-cyan-500'
              },
              {
                name: 'Execution Specialist',
                icon: Zap,
                role: 'Aggressive',
                description: 'Identifies optimal entry/exit points and timing for trades',
                color: 'from-green-500 to-emerald-500'
              }
            ].map((agent, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.2 }}
                viewport={{ once: true }}
                className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-gray-600 transition-all"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-12 h-12 bg-linear-to-r ${agent.color} rounded-full flex items-center justify-center`}>
                    <agent.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{agent.name}</h3>
                    <p className="text-sm text-gray-400">{agent.role}</p>
                  </div>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">{agent.description}</p>
              </motion.div>
            ))}
          </div>

          {/* Consensus Algorithm */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8"
          >
            <h3 className="text-2xl font-bold text-white mb-6 text-center">Consensus Decision Algorithm</h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-lg font-semibold text-gray-300 mb-4">Decision Flow</h4>
                <pre className="text-xs md:text-sm bg-gray-900/50 p-4 rounded-lg border border-gray-700 overflow-x-auto">
{`1. Sentiment Analysis → All 3 agents vote
2. Risk Assessment → Conservative filtering
3. Confidence Scoring → Weighted consensus
4. Threshold Check → ≥65% confidence required
5. Trade Execution → Sentinel validation
6. Position Management → Automatic monitoring`}
                </pre>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-300 mb-4">Example Decision</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
                    <span className="text-gray-300">🛡️ Risk Manager</span>
                    <span className="text-red-400 font-semibold">HOLD (60%)</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
                    <span className="text-gray-300">📊 Market Analyst</span>
                    <span className="text-blue-400 font-semibold">BUY (70%)</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-900/50 rounded-lg">
                    <span className="text-gray-300">⚡ Execution Specialist</span>
                    <span className="text-green-400 font-semibold">STRONG_BUY (80%)</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-linear-to-r from-indigo-600/20 to-purple-600/20 rounded-lg border border-indigo-500/30">
                    <span className="text-white font-semibold">🎯 CONSENSUS</span>
                    <span className="text-indigo-400 font-bold">BUY (70%)</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* Multi-Source Sentiment Analysis Section */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="w-full max-w-7xl mx-auto mb-20"
        >
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold bg-linear-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent mb-4">
              Multi-Source Sentiment Analysis
            </h2>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto">
              Real-time sentiment aggregation from 9 independent data sources, providing comprehensive market intelligence
              for informed trading decisions
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <Activity className="w-8 h-8 text-blue-400" />
                <h3 className="text-2xl font-bold text-white">Data Sources (9)</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { name: 'CoinGecko Sentiment', desc: 'Community voting data', icon: '📊' },
                  { name: 'CoinGecko Trending', desc: 'Market trending analysis', icon: '🔥' },
                  { name: 'Reddit Posts', desc: 'Crypto community discussions', icon: '💬' },
                  { name: 'CryptoPanic RSS', desc: 'Real-time crypto news', icon: '📰' },
                  { name: 'Google News', desc: 'Financial news headlines', icon: '🌐' },
                  { name: 'Gemini AI Analysis', desc: 'AI-powered news sentiment', icon: '🤖' },
                  { name: 'Price Action', desc: 'Technical price movements', icon: '📈' },
                  { name: 'Volume Analysis', desc: 'Trading volume patterns', icon: '📊' },
                  { name: 'Technical Indicators', desc: 'RSI, MACD, moving averages', icon: '⚡' }
                ].map((source, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg">
                    <span className="text-xl">{source.icon}</span>
                    <div>
                      <div className="text-white font-medium">{source.name}</div>
                      <div className="text-gray-400 text-sm">{source.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <Bot className="w-8 h-8 text-purple-400" />
                <h3 className="text-2xl font-bold text-white">Analysis Process</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                  <div className="text-sm text-gray-300 mb-2">🔄 Real-time Data Collection</div>
                  <div className="text-xs text-gray-400">Continuous monitoring of all 9 sources with automatic updates every 15 minutes</div>
                </div>
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                  <div className="text-sm text-gray-300 mb-2">🧠 AI-Powered Sentiment Scoring</div>
                  <div className="text-xs text-gray-400">Gemini AI analyzes news articles and social media for bullish/bearish sentiment</div>
                </div>
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                  <div className="text-sm text-gray-300 mb-2">⚖️ Weighted Aggregation</div>
                  <div className="text-xs text-gray-400">Dynamic weighting based on source reliability and market conditions</div>
                </div>
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                  <div className="text-sm text-gray-300 mb-2">🎯 Trading Signal Generation</div>
                  <div className="text-xs text-gray-400">Converts aggregated sentiment into actionable buy/sell/hold recommendations</div>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6"
          >
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-2">Sentiment Signal Examples</h3>
              <p className="text-gray-400">How aggregated sentiment translates to trading decisions</p>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                <div className="text-2xl mb-2">📉</div>
                <div className="text-red-400 font-semibold">STRONG_SELL</div>
                <div className="text-sm text-gray-400">Score: -0.8 to -1.0</div>
                <div className="text-xs text-gray-500 mt-1">Multiple bearish signals across sources</div>
              </div>
              <div className="text-center p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                <div className="text-2xl mb-2">⏸️</div>
                <div className="text-yellow-400 font-semibold">HOLD</div>
                <div className="text-sm text-gray-400">Score: -0.3 to +0.3</div>
                <div className="text-xs text-gray-500 mt-1">Mixed or neutral sentiment</div>
              </div>
              <div className="text-center p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
                <div className="text-2xl mb-2">📈</div>
                <div className="text-green-400 font-semibold">STRONG_BUY</div>
                <div className="text-sm text-gray-400">Score: +0.8 to +1.0</div>
                <div className="text-xs text-gray-500 mt-1">Overwhelming bullish consensus</div>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* HTTP 402 Payment Protocol Section */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="w-full max-w-7xl mx-auto mb-20"
        >
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold bg-linear-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-4">
              HTTP 402 Payment Protocol
            </h2>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto">
              Implementation of the HTTP 402 "Payment Required" status code for blockchain-native micropayments,
              enabling pay-per-use API access with on-chain verification
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <Coins className="w-8 h-8 text-yellow-400" />
                <h3 className="text-2xl font-bold text-white">Why HTTP 402?</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-2xl">💰</span>
                  <div>
                    <div className="text-white font-semibold">Micropayment Native</div>
                    <div className="text-gray-400 text-sm">Pay only for what you use, down to fractions of a cent</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl">🔗</span>
                  <div>
                    <div className="text-white font-semibold">Blockchain Verified</div>
                    <div className="text-gray-400 text-sm">Every payment is immutably recorded on-chain</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl">⚡</span>
                  <div>
                    <div className="text-white font-semibold">Zero Subscription Fees</div>
                    <div className="text-gray-400 text-sm">No monthly costs, no credit cards, pure usage-based pricing</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-2xl">🌐</span>
                  <div>
                    <div className="text-white font-semibold">Universal Standard</div>
                    <div className="text-gray-400 text-sm">Built on HTTP protocol, works with any blockchain</div>
                  </div>
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <Network className="w-8 h-8 text-blue-400" />
                <h3 className="text-2xl font-bold text-white">Payment Flow</h3>
              </div>
              <div className="space-y-4">
                <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                  <pre className="text-xs md:text-sm text-gray-300 overflow-x-auto">
{`sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant A as AI Agent
    participant C as Cronos

    U->>F: Request AI Analysis
    F->>B: GET /api/market/sentiment
    B->>B: Check x402 Payment
    B-->>F: 402 Payment Required
    F->>F: Show Payment Dialog
    F->>C: Sign & Send Payment TX
    C-->>F: TX Confirmed
    F->>B: GET /api/market/sentiment + Proof
    B->>B: Verify Payment on-chain
    B->>A: Process AI Request
    A-->>B: Analysis Result
    B-->>F: 200 OK + Data
    F-->>U: Display Results`}
                  </pre>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-900/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-400">0.0005 CRO</div>
                    <div className="text-sm text-gray-400">Sentiment Analysis</div>
                  </div>
                  <div className="text-center p-3 bg-gray-900/50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-400">0.001 CRO</div>
                    <div className="text-sm text-gray-400">AI Decision</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Smart Contracts Section */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="w-full max-w-7xl mx-auto mb-20"
        >
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold bg-linear-to-r from-orange-400 to-red-400 bg-clip-text text-transparent mb-4">
              Smart Contract Ecosystem
            </h2>
            <p className="text-lg text-gray-400 max-w-3xl mx-auto">
              Four interconnected smart contracts providing security, liquidity, and automated trading functionality
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: 'SentinelClamp',
                icon: Shield,
                description: 'Safety limits and emergency controls',
                features: ['Daily limits', 'Emergency pause', 'On-chain validation'],
                color: 'from-red-500 to-orange-500'
              },
              {
                name: 'WCRO AMM',
                icon: Coins,
                description: 'Wrapped CRO liquidity pool',
                features: ['Auto liquidity', 'Price discovery', 'Low slippage'],
                color: 'from-blue-500 to-cyan-500'
              },
              {
                name: 'Mock Router',
                icon: Network,
                description: 'Decentralized exchange routing',
                features: ['Multi-path', 'Best price', 'Gas optimization'],
                color: 'from-purple-500 to-pink-500'
              },
              {
                name: 'x402 Receiver',
                icon: Globe,
                description: 'Payment protocol handler',
                features: ['Micropayments', 'On-chain proof', 'Universal access'],
                color: 'from-green-500 to-emerald-500'
              }
            ].map((contract, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 hover:border-gray-600 transition-all"
              >
                <div className={`w-12 h-12 bg-linear-to-r ${contract.color} rounded-full flex items-center justify-center mb-4 mx-auto`}>
                  <contract.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white text-center mb-2">{contract.name}</h3>
                <p className="text-gray-400 text-sm text-center mb-4">{contract.description}</p>
                <ul className="space-y-1">
                  {contract.features.map((feature, fidx) => (
                    <li key={fidx} className="text-xs text-gray-500 flex items-center gap-2">
                      <ChevronRight className="w-3 h-3" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center max-w-4xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Experience Autonomous Trading?
          </h2>
          <p className="text-lg text-gray-400 mb-8">
            Connect your wallet and watch the x402 protocol in action with real-time AI-driven trading decisions
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="px-8 py-4 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 rounded-full text-white font-semibold shadow-lg shadow-indigo-500/30 transform hover:scale-105"
            >
              Launch Dashboard
            </Link>
            <Link
              href="/"
              className="px-8 py-4 bg-gray-800/50 backdrop-blur-sm hover:bg-gray-700/80 transition duration-200 rounded-full text-white font-semibold border border-gray-600 transform hover:scale-105"
            >
              Back to Home
            </Link>
          </div>
        </motion.div>
      </Vortex>
    </div>
  );
}