'use client'

import React, { useEffect , useState } from "react";
import { Vortex } from "@/components/ui/vortex";
import { useRouter } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import toast from "react-hot-toast";
import { motion } from "motion/react";
import Image from "next/image";

export default function LandingPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  // Track if we've already shown the connect toast this session
  const [hasShownConnectToast, setHasShownConnectToast] = useState(() => {
    // Use sessionStorage to prevent toast spam on page refresh
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('walletConnectToastShown') === 'true';
    }
    return false;
  });

  // Show success toast only once when wallet connects (not on page refresh)
  useEffect(() => {
    if (isConnected && address && !hasShownConnectToast) {
      toast.success(`Wallet connected successfully!`, {
        duration: 3000,
        icon: '🎉',
      });
      setHasShownConnectToast(true);
      sessionStorage.setItem('walletConnectToastShown', 'true');
    }
    
    // Clear flag when wallet disconnects
    if (!isConnected && hasShownConnectToast) {
      setHasShownConnectToast(false);
      sessionStorage.removeItem('walletConnectToastShown');
    }
  }, [isConnected, address, hasShownConnectToast]);

  const handleConnect = async () => {
    try {
      const connector = connectors[0]; // MetaMask injected connector
      if (connector) {
        connect({ connector });
        toast.loading("Connecting wallet...", { duration: 2000 });
      } else {
        toast.error("No wallet connector found. Please install MetaMask.", {
          duration: 4000,
          icon: '⚠️',
        });
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      toast.error("Failed to connect wallet", {
        duration: 3000,
        icon: '❌',
      });
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast.success("Wallet disconnected", {
      icon: '👋',
    });
  };

  const handleLaunchTerminal = () => {
    if (isConnected) {
      toast.success("Loading dashboard...", { icon: '🚀' });
      router.push("/dashboard");
    } else {
      toast.error("Please connect your wallet first to access the dashboard", {
        duration: 4000,
        icon: '🔐',
      });
    }
  };

  return (
    <div className="w-full h-[100vh] overflow-hidden relative">
      {/* Top Navigation Bar */}
      <div className="absolute top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-sm bg-black/20">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/50">
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
            {isConnected && address && (
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-4 py-2 bg-green-900/30 backdrop-blur-sm border border-green-500/30 rounded-full"
              >
                <p className="text-green-400 text-sm font-mono flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
              </motion.div>
            )}
            
            {!isConnected ? (
              <button 
                onClick={handleConnect}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 rounded-full text-white font-semibold shadow-lg shadow-indigo-500/30 transform hover:scale-105"
              >
                Connect Wallet
              </button>
            ) : (
              <button 
                onClick={handleDisconnect}
                className="px-6 py-2.5 bg-red-900/50 backdrop-blur-sm hover:bg-red-800/80 transition duration-200 rounded-full text-white font-semibold border border-red-700/50 transform hover:scale-105"
              >
                Disconnect
              </button>
            )}
          </motion.div>
        </div>
      </div>

      <Vortex
        backgroundColor="black"
        rangeY={800}
        particleCount={600}
        baseHue={220}
        className="flex items-center flex-col justify-center px-4 md:px-10 py-4 w-full h-full"
      >
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center"
        >
          {/* Status Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 mb-6 bg-blue-900/20 backdrop-blur-sm border border-blue-500/30 rounded-full"
          >
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
            <span className="text-blue-200 text-sm font-medium">Cronos Testnet • Live</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-5xl md:text-8xl font-bold mb-6"
          >
            <span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Sentinel AI
            </span>
            <br />
            <span className="text-white">
              Trader
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-gray-300 text-lg md:text-2xl max-w-4xl mx-auto mb-8 leading-relaxed"
          >
            Autonomous DeFi trading powered by multi-agent AI systems
            <br className="hidden md:block" />
            Real-time sentiment analysis • Blockchain-enforced safety
          </motion.p>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex flex-wrap justify-center gap-3 mb-12"
          >
            <div className="px-4 py-2 bg-gray-900/40 backdrop-blur-sm rounded-full border border-gray-600/30">
              <span className="text-sm text-gray-300"> 9 AI Tools</span>
            </div>
            <div className="px-4 py-2 bg-gray-900/40 backdrop-blur-sm rounded-full border border-gray-600/30">
              <span className="text-sm text-gray-300"> On-chain Safety</span>
            </div>
            <div className="px-4 py-2 bg-gray-900/40 backdrop-blur-sm rounded-full border border-gray-600/30">
              <span className="text-sm text-gray-300"> 24/7 Trading</span>
            </div>
            <div className="px-4 py-2 bg-gray-900/40 backdrop-blur-sm rounded-full border border-gray-600/30">
              <span className="text-sm text-gray-300"> x402 Protocol</span>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <button 
              onClick={handleLaunchTerminal}
              className="group relative px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 rounded-full text-white font-semibold shadow-2xl shadow-indigo-500/30 transform hover:scale-105"
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Launch Dashboard
              </span>
            </button>
            <a 
              href="https://github.com/UjjwalCodes01/CSA" 
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-4 bg-zinc-900/50 backdrop-blur-sm hover:bg-zinc-800/80 transition duration-200 rounded-full text-white font-semibold border border-zinc-700/50 transform hover:scale-105"
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                View on GitHub
              </span>
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto"
          >
          </motion.div>
        </motion.div>
      </Vortex>
    </div>
  );
}
