import React from "react";
import { Vortex } from "@/components/ui/vortex";
import Link from "next/link";

export default function LandingPage() {
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
        <div className="flex flex-col sm:flex-row items-center gap-6 mt-10">
          <Link href="/dashboard">
            <button className="group relative px-8 py-3 bg-indigo-600 hover:bg-indigo-700 transition duration-200 rounded-full text-white font-semibold shadow-lg shadow-indigo-500/30">
              Launch Terminal
            </button>
          </Link>
          <button className="px-8 py-3 bg-zinc-900/50 backdrop-blur-sm hover:bg-zinc-800/80 transition duration-200 rounded-full text-white font-semibold border border-zinc-700/50">
            Learn More
          </button>
        </div>
      </Vortex>
    </div>
  );
}
