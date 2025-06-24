import React from 'react';
import { useAccount, useConnect, useDisconnect, useIsConnected, useConnectors } from '@fuels/react';
import { Wallet, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

export const WalletConnector: React.FC = () => {
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { isConnected } = useIsConnected();
  const { account } = useAccount();
  const { connectors } = useConnectors();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleConnect = async () => {
    try {
      // Find the Fuel Wallet connector
      const fuelConnector = connectors.find(c => c.name === 'Fuel Wallet');
      if (fuelConnector) {
        await connect({ connector: fuelConnector });
      } else {
        // Fallback to first available connector
        await connect({ connector: connectors[0] });
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  if (isConnected && account) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2"
      >
        <div className="bg-gray-800 rounded-lg px-4 py-2 flex items-center gap-3">
          <div className="w-2 h-2 bg-fuel-green rounded-full animate-pulse" />
          <span className="text-sm font-mono">{formatAddress(account)}</span>
        </div>
        
        <button
          onClick={() => disconnect()}
          className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          title="Disconnect wallet"
        >
          <LogOut size={18} />
        </button>
      </motion.div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className="btn-primary flex items-center gap-2"
    >
      <Wallet size={20} />
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
};