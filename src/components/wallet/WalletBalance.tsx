import React, { useEffect, useState } from 'react';
import { useAccount, useWallet } from '@fuels/react';
import { bn, BN, Address } from 'fuels';
import { motion } from 'framer-motion';
import { Wallet, RefreshCw, AlertCircle } from 'lucide-react';
import { getTokens, getBaseAssetId } from '@/config';
import { useNetwork } from '@/contexts/NetworkContext';

interface TokenBalance {
  symbol: string;
  name: string;
  amount: string;
  icon: string;
  assetId: string;
  isNative?: boolean;
}

export const WalletBalance: React.FC = () => {
  const { wallet } = useWallet();
  const { account } = useAccount();
  const { isTestnet } = useNetwork();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  // Fetch chain ID for debug info
  useEffect(() => {
    const fetchChainId = async () => {
      if (wallet?.provider?.getChainId) {
        try {
          const id = await wallet.provider.getChainId();
          setChainId(id);
        } catch (e) {
          console.error('Failed to get chain ID:', e);
        }
      }
    };
    fetchChainId();
  }, [wallet]);

  const formatBalance = (balance: BN | string | number, decimals: number): string => {
    try {
      // Convert to BN if not already
      const amountBN = balance instanceof BN ? balance : bn(balance.toString());
      
      // Convert from smallest unit to display unit
      const divisor = bn(10).pow(decimals);
      const quotient = amountBN.div(divisor);
      const remainder = amountBN.mod(divisor);
      
      // Format the amount
      const wholeStr = quotient.toString();
      const remainderStr = remainder.toString().padStart(decimals, '0');
      
      // For USDC/USDT show 2 decimals, others show up to 6
      const decimalPlaces = decimals === 6 ? 2 : 6;
      const decimals_str = remainderStr.slice(0, decimalPlaces);
      
      // Build the formatted string
      let formattedAmount = `${wholeStr}.${decimals_str}`;
      
      // Parse to number for proper formatting
      const num = parseFloat(formattedAmount);
      
      // Handle different ranges for better display
      if (num === 0) {
        return '0.00';
      } else if (num < 0.000001) {
        return num.toFixed(9);
      } else if (num < 0.01) {
        return num.toFixed(6);
      } else if (num < 1) {
        return num.toFixed(4);
      } else if (num < 100) {
        return num.toFixed(3);
      } else {
        return num.toFixed(2);
      }
    } catch (error) {
      console.error('Error formatting balance:', error);
      return '0.00';
    }
  };

  const loadBalances = async () => {
    if (!wallet || !account) {
      setIsLoading(false);
      setError('Wallet not connected');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Get token configurations for current network
      const tokens = getTokens(isTestnet);
      const tokenBalances: TokenBalance[] = [];
      
      // Create proper Address object
      const address = Address.fromString(account);
      
      try {
        // Method 1: Use provider.getBalances() with Address object
        const provider = wallet.provider;
        const balancesResult = await provider.getBalances(address);
        
        // Process balances based on the actual structure returned
        if (balancesResult) {
          for (const token of tokens) {
            let formattedAmount = '0.00';
            
            // The result is likely an array of CoinQuantity objects
            if (Array.isArray(balancesResult)) {
              const balanceEntry = balancesResult.find(
                (b: any) => {
                  const assetId = b.assetId || b.asset_id || b.id;
                  return assetId && assetId.toLowerCase() === token.assetId.toLowerCase();
                }
              );
              
              if (balanceEntry) {
                const amount = balanceEntry.amount || balanceEntry.value || balanceEntry.balance;
                if (amount) {
                  formattedAmount = formatBalance(amount, token.decimals);
                }
              }
            }
            
            tokenBalances.push({
              symbol: token.symbol,
              name: token.name,
              amount: formattedAmount,
              icon: token.icon || '💰',
              assetId: token.assetId,
              isNative: token.isNative
            });
          }
        }
        
        // If all balances are still zero, try alternative methods
        if (tokenBalances.every(b => b.amount === '0.00')) {
          // Method 2: Try using wallet's balance methods directly
          for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            try {
              let balance: BN | undefined;
              
              // For ETH (native asset), try different approaches
              if (token.assetId === getBaseAssetId() || token.isNative) {
                try {
                  balance = await wallet.getBalance();
                } catch (e1) {
                  try {
                    balance = await wallet.getBalance(getBaseAssetId());
                  } catch (e2) {
                    // Failed to get balance
                  }
                }
              } else {
                // For other tokens, use the specific asset ID
                try {
                  balance = await wallet.getBalance(token.assetId);
                } catch (e) {
                  // Failed to get balance
                }
              }
              
              if (balance && balance.gt(0)) {
                tokenBalances[i].amount = formatBalance(balance, token.decimals);
              }
            } catch (error) {
              // Continue with next token
            }
          }
        }
        
      } catch (error) {
        console.error('Error in balance loading:', error);
        throw error;
      }
      
      setBalances(tokenBalances);
      
    } catch (error) {
      console.error('Failed to load balances:', error);
      
      let errorMessage = 'Failed to load balances';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      
      // Show empty balances on error
      const tokens = getTokens(isTestnet);
      setBalances(tokens.map(token => ({
        symbol: token.symbol,
        name: token.name,
        amount: '0.00',
        icon: token.icon || '💰',
        assetId: token.assetId,
        isNative: token.isNative
      })));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBalances();
    
    // Refresh balances every 30 seconds
    const interval = setInterval(loadBalances, 30000);
    
    return () => clearInterval(interval);
  }, [wallet, account, isTestnet]);

  const handleRefresh = () => {
    loadBalances();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="card"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet size={20} className="text-fuel-green" />
          <h3 className="text-lg font-semibold">Wallet Balance</h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh balances"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/50 rounded text-sm text-red-400 flex items-start gap-2">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Error loading balances</p>
            <p className="text-xs opacity-80">{error}</p>
          </div>
        </div>
      )}

      {isLoading && balances.length === 0 ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-12 bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {balances.map((token) => (
            <div
              key={token.assetId}
              className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{token.icon}</span>
                <div>
                  <p className="font-semibold">
                    {token.symbol}
                    {token.isNative && (
                      <span className="ml-1 text-xs text-fuel-green">(Native)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">{token.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono font-semibold">
                  {isLoading && !error ? (
                    <span className="text-gray-500">...</span>
                  ) : (
                    token.amount
                  )}
                </p>
                <p className="text-xs text-gray-400">
                  {isTestnet ? 'Testnet' : 'Mainnet'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!account && !error && (
        <p className="text-center text-gray-500 text-sm py-4">
          Connect wallet to view balances
        </p>
      )}

      {/* Help text for zero balances */}
      {!isLoading && !error && balances.every(b => b.amount === '0.00') && (
        <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded text-sm">
          <p className="text-blue-400 font-semibold mb-1">No tokens found</p>
          <div className="text-blue-300 text-xs space-y-2">
            {isTestnet ? (
              <>
                <p>To get test tokens:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>
                    Visit the{' '}
                    <a 
                      href="https://faucet-testnet.fuel.network/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-200"
                    >
                      Fuel Testnet Faucet
                    </a>
                  </li>
                  <li>Connect your wallet or paste your address</li>
                  <li>Click "Give me ETH" to receive 0.5 test ETH</li>
                </ol>
                <p className="mt-2">Your address: <code className="bg-gray-800 px-1 rounded text-[10px] break-all">{account}</code></p>
              </>
            ) : (
              <p>You need to bridge or acquire some ETH to start trading.</p>
            )}
          </div>
        </div>
      )}

      {/* Debug info for development */}
      {import.meta.env.DEV && (
        <details className="mt-4 text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-gray-400">Debug Info</summary>
          <div className="mt-2 p-2 bg-gray-800 rounded font-mono overflow-x-auto">
            <p>Network: {isTestnet ? 'Testnet' : 'Mainnet'}</p>
            <p className="break-all">Account: {account || 'Not connected'}</p>
            <p>Provider URL: {wallet?.provider?.url || 'N/A'}</p>
            <p>Provider Chain ID: {chainId !== null ? chainId : 'Loading...'}</p>
            <div className="mt-2">
              <p className="font-bold">Asset IDs:</p>
              {balances.map(b => (
                <div key={b.assetId} className="text-[10px] break-all mt-1">
                  <p>{b.symbol}: {b.assetId} {b.isNative ? '(Native)' : ''}</p>
                  <p>Balance: {b.amount}</p>
                </div>
              ))}
            </div>
            <div className="mt-2">
              <p className="font-bold">Wallet Methods Available:</p>
              <p className="text-[10px]">getBalance: {typeof wallet?.getBalance === 'function' ? 'Yes' : 'No'}</p>
              <p className="text-[10px]">provider.getBalances: {typeof wallet?.provider?.getBalances === 'function' ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </details>
      )}
    </motion.div>
  );
};