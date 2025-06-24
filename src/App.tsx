import React, { useState, useEffect } from 'react';
import { 
  useAccount, 
  useConnect,
  useDisconnect,
  useIsConnected, 
  useWallet,
  useConnectors 
} from '@fuels/react';
import { Header } from '@/components/common/Header';
import { AgentSelector } from '@/components/trading/AgentSelector';
import { TradingDashboard } from '@/components/trading/TradingDashboard';
import { AgentPersonality } from '@/types';
import { useNetwork } from '@/contexts/NetworkContext';
import { getNetworkConfig } from '@/config/networks';

// Network error component
function NetworkError({ currentNetwork }: { currentNetwork: string }) {
  const { disconnect } = useDisconnect();
  const { isTestnet } = useNetwork();
  const expectedNetwork = getNetworkConfig(isTestnet);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-8 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-red-400">Wrong Network</h2>
        </div>
        
        <div className="space-y-4 text-gray-300">
          <p>
            This application requires <strong className="text-white">{expectedNetwork.name}</strong>.
          </p>
          
          <div className="bg-gray-800 rounded p-4">
            <p className="text-sm text-gray-400 mb-1">Current Network:</p>
            <p className="text-red-400 font-mono text-sm break-all">{currentNetwork}</p>
          </div>

          <div className="bg-gray-800 rounded p-4">
            <p className="text-sm text-gray-400 mb-1">Required Network:</p>
            <p className="text-green-400 font-mono text-sm break-all">{expectedNetwork.url}</p>
          </div>

          <div className="pt-4 border-t border-gray-700">
            <h3 className="font-semibold mb-2">To fix this:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Open your Fuel wallet extension</li>
              <li>Go to Settings → Networks</li>
              <li>Switch to {expectedNetwork.name}</li>
              <li>Refresh this page</li>
            </ol>
          </div>

          <button
            onClick={() => disconnect()}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Disconnect Wallet
          </button>
        </div>
      </div>
    </div>
  );
}

// Main App component
function App() {
  const { isConnected } = useIsConnected();
  const { account } = useAccount();
  const { wallet } = useWallet();
  const { isTestnet, currentNetwork, isCorrectNetwork } = useNetwork();
  const [selectedAgent, setSelectedAgent] = useState<AgentPersonality | null>(null);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleAgentSelect = (agent: AgentPersonality) => {
    setSelectedAgent(agent);
  };

  const handleAgentChange = () => {
    setSelectedAgent(null);
  };

  // Show network error if connected but on wrong network
  if (isConnected && !isCorrectNetwork) {
    return <NetworkError currentNetwork={currentNetwork} />;
  }

  // Show connection screen if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <Header 
          onAgentChange={handleAgentChange} 
          selectedAgent={selectedAgent} 
        />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Welcome to AI Trading Agents</h2>
              <p className="text-gray-400 max-w-md">
                Connect your Fuel wallet to start using AI-powered trading agents on the Fuel network.
              </p>
              <div className="pt-4">
                <p className="text-sm text-gray-500">
                  Use the "Connect Wallet" button in the header to get started
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Normal app flow when connected
  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <Header 
        onAgentChange={handleAgentChange} 
        selectedAgent={selectedAgent} 
      />
      
      {/* Network status indicator */}
      <div className={`${isTestnet ? 'bg-green-900/20 border-green-900' : 'bg-blue-900/20 border-blue-900'} border-b`}>
        <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-2">
          <div className={`w-2 h-2 ${isTestnet ? 'bg-green-500' : 'bg-blue-500'} rounded-full animate-pulse`}></div>
          <span className={`${isTestnet ? 'text-green-400' : 'text-blue-400'} text-sm`}>
            Connected to {isTestnet ? 'Sepolia Testnet' : 'Mainnet'}
          </span>
        </div>
      </div>
      
      <main className="flex-1 container mx-auto px-4 py-4 overflow-hidden">
        {!selectedAgent ? (
          <AgentSelector onSelectAgent={handleAgentSelect} />
        ) : (
          <TradingDashboard 
            agentType={selectedAgent} 
            walletAddress={account || ''} 
          />
        )}
      </main>
    </div>
  );
}

export default App;