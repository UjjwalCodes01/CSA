'use client'

import React from "react";
import { Vortex } from "@/components/ui/vortex";
import { useRouter } from "next/navigation";
import { useAccount, useConnect, useDisconnect } from "wagmi";

export default function LandingPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  const handleConnect = async () => {
    try {
      const connector = connectors[0]; // MetaMask injected connector
      if (connector) {
        connect({ connector });
      }
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  const handleLaunchTerminal = () => {
    if (isConnected) {
      router.push("/dashboard");
    } else {
      // Optionally show a toast/alert that wallet connection is required
      alert("Please connect your wallet first");
    }
  };

  return (
    <div className="w-full h-[100vh] overflow-hidden">
      <Vortex
        backgroundColor="black"
        rangeY={800}
        particleCount={500}
        baseHue={220}
        className="flex items-center flex-col justify-center px-4 md:px-10 py-4 w-full h-full"
      >
        <h2 className="text-white text-4xl md:text-7xl font-bold text-center tracking-tight">
          Sentinel AI Trader
        </h2>
        <p className="text-white/80 text-base md:text-2xl max-w-3xl mt-6 text-center leading-relaxed">
          The next generation of autonomous decentralized trading. 
          Powered by multi-agent systems and real-time sentiment analysis.
        </p>
        
        {/* Wallet Connection Status */}
        {isConnected && address && (
          <div className="mt-6 px-6 py-3 bg-green-900/30 backdrop-blur-sm border border-green-500/30 rounded-full">
            <p className="text-green-400 text-sm font-mono">
              Connected: {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-6 mt-10">
          {!isConnected ? (
            <button 
              onClick={handleConnect}
              className="group relative px-8 py-3 bg-indigo-600 hover:bg-indigo-700 transition duration-200 rounded-full text-white font-semibold shadow-lg shadow-indigo-500/30"
            >
              Connect MetaMask
            </button>
          ) : (
            <>
              <button 
                onClick={handleLaunchTerminal}
                className="group relative px-8 py-3 bg-indigo-600 hover:bg-indigo-700 transition duration-200 rounded-full text-white font-semibold shadow-lg shadow-indigo-500/30"
              >
                Launch Terminal
              </button>
              <button 
                onClick={() => disconnect()}
                className="px-8 py-3 bg-red-900/50 backdrop-blur-sm hover:bg-red-800/80 transition duration-200 rounded-full text-white font-semibold border border-red-700/50"
              >
                Disconnect
              </button>
            </>
          )}
          <button className="px-8 py-3 bg-zinc-900/50 backdrop-blur-sm hover:bg-zinc-800/80 transition duration-200 rounded-full text-white font-semibold border border-zinc-700/50">
            Learn More
          </button>
        </div>
      </Vortex>
    </div>
  );
}
