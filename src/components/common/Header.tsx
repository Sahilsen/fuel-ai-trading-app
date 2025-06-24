import React from 'react';
import { WalletConnector } from '@/components/wallet/WalletConnector';
import { Bot, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNetwork } from '@/contexts/NetworkContext';

interface HeaderProps {
  onAgentChange: () => void;
  selectedAgent: string | null;
}

export const Header: React.FC<HeaderProps> = ({ onAgentChange, selectedAgent }) => {
  const { isTestnet, toggleNetwork } = useNetwork();

  return (
    <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            {selectedAgent && (
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={onAgentChange}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </motion.button>
            )}

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-fuel-green/20 rounded-lg flex items-center justify-center">
                <Bot size={24} className="text-fuel-green" />
              </div>
              <div>
                <h1 className="text-xl font-bold">AI Trading Agents</h1>
                <p className="text-xs text-gray-400">Powered by GOAT SDK & Fuel</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Network Toggle */}
            <div className="flex items-center bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => !isTestnet && toggleNetwork()}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isTestnet
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Testnet
              </button>
              <button
                onClick={() => isTestnet && toggleNetwork()}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  !isTestnet
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Mainnet
              </button>
            </div>

            <WalletConnector />
          </div>
        </div>
      </div>
    </header>
  );
};
