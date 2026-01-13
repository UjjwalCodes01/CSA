'use client'

import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isConnected, isConnecting } = useAccount()
  const router = useRouter()

  useEffect(() => {
    if (!isConnecting && !isConnected) {
      router.push('/')
    }
  }, [isConnected, isConnecting, router])

  if (isConnecting) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          <p className="text-white/60">Checking wallet connection...</p>
        </div>
      </div>
    )
  }

  if (!isConnected) {
    return null // Will redirect
  }

  return <>{children}</>
}
