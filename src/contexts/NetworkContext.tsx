import React, { createContext, useContext, useEffect, useState } from 'react';
import { getNetworkConfig } from '@/config/index';
import { useWallet, useIsConnected } from '@fuels/react';

interface NetworkContextProps {
  isTestnet: boolean;
  toggleNetwork: () => void;
  isCorrectNetwork: boolean;
  currentNetwork: string;
}

const NetworkContext = createContext<NetworkContextProps | undefined>(undefined);

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) throw new Error('useNetwork must be used within NetworkProvider');
  return context;
};

export const NetworkProvider = ({ children }: React.PropsWithChildren) => {
  const [isTestnet, setIsTestnet] = useState(true);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(true);
  const [currentNetwork, setCurrentNetwork] = useState('');
  const { wallet } = useWallet();
  const { isConnected } = useIsConnected();

  const toggleNetwork = () => setIsTestnet((prev) => !prev);

  useEffect(() => {
    const checkNetwork = async () => {
      if (!wallet?.provider || !isConnected) {
        setIsCorrectNetwork(true); // Don't show error when not connected
        return;
      }

      try {
        // Get the current network URL from the wallet
        const currentUrl = wallet.provider.url;
        setCurrentNetwork(currentUrl);
        
        // Get expected network config
        const expectedConfig = getNetworkConfig(isTestnet);
        
        // Check if URLs match (normalize URLs for comparison)
        const normalizeUrl = (url: string) => url.replace(/\/$/, '').toLowerCase();
        const isCorrect = normalizeUrl(currentUrl) === normalizeUrl(expectedConfig.url);
        
        setIsCorrectNetwork(isCorrect);
        
        if (!isCorrect) {
          console.warn(`Network mismatch: Expected ${expectedConfig.url}, got ${currentUrl}`);
        }
      } catch (error) {
        console.error('Error checking network:', error);
        setIsCorrectNetwork(false);
      }
    };

    checkNetwork();
  }, [wallet, isTestnet, isConnected]);

  return (
    <NetworkContext.Provider value={{ isTestnet, toggleNetwork, isCorrectNetwork, currentNetwork }}>
      {children}
    </NetworkContext.Provider>
  );
};