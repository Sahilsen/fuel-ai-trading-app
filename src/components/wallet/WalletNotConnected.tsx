import React from 'react';
import { useConnect, useConnectors } from '@fuels/react';
import { Wallet, ArrowRight, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export const WalletNotConnected: React.FC = () => {
  const { connect, isPending } = useConnect();
  const { connectors } = useConnectors();

  const handleConnect = async () => {
    try {
      const fuelConnector = connectors.find(c => c.name === 'Fuel Wallet');
      if (fuelConnector) {
        await connect({ connector: fuelConnector });
      } else if (connectors.length > 0) {
        await connect({ connector: connectors[0] });
      }
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center"
    >
      <div className="mb-8">
        <div className="w-24 h-24 bg-fuel-green/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Wallet size={48} className="text-fuel-green" />
        </div>
        
        <h2 className="text-4xl font-bold mb-4">Connect Your Wallet</h2>
        <p className="text-xl text-gray-400 mb-8 max-w-md">
          Connect your Fuel wallet to start trading with AI-powered agents on Fuel testnet
        </p>
        
        <button
          onClick={handleConnect}
          disabled={isPending}
          className="btn-primary text-lg px-8 py-3 flex items-center gap-3 mx-auto disabled:opacity-50"
        >
          {isPending ? 'Connecting...' : 'Connect Fuel Wallet'}
          <ArrowRight size={20} />
        </button>
      </div>
      
      <div className="text-sm text-gray-500 space-y-2">
        <p>Don't have a Fuel wallet?</p>
        <a 
          href="https://wallet.fuel.network/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-fuel-green hover:underline inline-flex items-center gap-1"
        >
          Download Fuel Wallet
          <ExternalLink size={14} />
        </a>
      </div>
    </motion.div>
  );
};