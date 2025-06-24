import { useEffect, useState } from 'react';
import { useWallet, useConnect } from '@fuels/react';

export const useNetworkManager = () => {
  const { wallet } = useWallet();
  const { connect } = useConnect();
  const [networkStatus, setNetworkStatus] = useState<'checking' | 'adding' | 'ready' | 'error'>('checking');

  useEffect(() => {
    const addNetworkToWallet = async () => {
      if (!wallet) return;

      try {
        setNetworkStatus('adding');
        
        const customNetwork = {
          url: import.meta.env.VITE_QUICKNODE_FUEL_URL || 'https://testnet.fuel.network/v1/graphql',
          chainId: 0,
          name: 'Custom Fuel Testnet'
        };

        // Try to add the network to the wallet
        console.log('Adding network to wallet:', customNetwork);
        
        // This will prompt the user to add the network
        await wallet.addNetwork(customNetwork);
        
        setNetworkStatus('ready');
      } catch (error) {
        console.error('Failed to add network:', error);
        setNetworkStatus('error');
      }
    };

    if (wallet) {
      addNetworkToWallet();
    }
  }, [wallet]);

  return { networkStatus };
};