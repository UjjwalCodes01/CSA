import { http, createConfig } from 'wagmi'
import { cronosTestnet } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

// Cronos Testnet configuration
export const config = createConfig({
  chains: [cronosTestnet],
  connectors: [
    injected(), // MetaMask
  ],
  transports: {
    [cronosTestnet.id]: http('https://evm-t3.cronos.org'),
  },
})
