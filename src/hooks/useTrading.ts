import { useCallback, useState } from 'react';
import { useWallet, useAccount } from '@fuels/react';
import { Address, bn } from 'fuels';
import { MiraAmm, buildPoolId } from 'mira-dex-ts';
import { notificationService } from '@/services/NotificationService';
import { getTokenBySymbol } from '@/config/tokens';
import { TradeDecision } from '@/types';
import { useNetwork } from '@/contexts/NetworkContext';

// Helper function to format balance to string with decimals
function formatBalance(balance: any, decimals: number): string {
  try {
    if (!balance) return '0.0';
    
    // Convert to string first
    const balanceStr = balance.toString();
    
    // If the balance string is shorter than decimals, pad with zeros
    if (balanceStr.length <= decimals) {
      return `0.${'0'.repeat(decimals - balanceStr.length)}${balanceStr}`;
    }
    
    // Split the balance into whole and fractional parts
    const wholePart = balanceStr.slice(0, balanceStr.length - decimals) || '0';
    const fractionalPart = balanceStr.slice(balanceStr.length - decimals);
    
    return `${wholePart}.${fractionalPart}`;
  } catch (error) {
    console.error('Error formatting balance:', error);
    return balance.toString();
  }
}

export const useTrading = () => {
  const { wallet: connectedWallet } = useWallet();
  const { account } = useAccount();
  const [isExecuting, setIsExecuting] = useState(false);
  const { isTestnet } = useNetwork();

  const executeTrade = useCallback(async (decision: TradeDecision): Promise<boolean> => {
    if (!connectedWallet || !account) {
      notificationService.error('Wallet Error', 'Please connect your wallet');
      return false;
    }

    setIsExecuting(true);

    try {
      console.log('Starting trade execution:', {
        type: decision.action,
        token: decision.token.symbol,
        amount: decision.amount,
        network: isTestnet ? 'testnet' : 'mainnet',
        wallet: account,
      });
      
      // Check if wallet has consolidateCoins method
      const hasConsolidateMethod = typeof (connectedWallet as any).consolidateCoins === 'function';
      console.log('Wallet has consolidateCoins method:', hasConsolidateMethod);

      // For testnet, simulate the trade
      if (isTestnet) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Simulate success/failure (90% success rate)
        const isSuccess = Math.random() > 0.1;
        
        if (isSuccess) {
          notificationService.success(
            'Trade Simulated', 
            `Mock ${decision.action} of ${decision.amount} ${decision.token.symbol} executed successfully (testnet)`
          );
          
          // Log mock transaction
          console.log('Mock Transaction:', {
            hash: '0x' + Math.random().toString(16).substr(2, 64),
            action: decision.action,
            amount: decision.amount,
            token: decision.token.symbol,
            timestamp: Date.now()
          });
        } else {
          throw new Error('Simulated transaction failed');
        }
        
        return isSuccess;
      }

      // For mainnet, execute real trade
      const provider = connectedWallet.provider;
      
      // Get token configuration
      const tokenConfig = getTokenBySymbol(decision.token.symbol, false);
      
      if (!tokenConfig) {
        throw new Error('Token configuration not found');
      }

      console.log('Token configuration:', {
        symbol: tokenConfig.symbol,
        address: tokenConfig.address,
        assetId: tokenConfig.assetId,
        decimals: tokenConfig.decimals
      });

      // Check ETH balance for gas fees
      console.log('Checking ETH balance for gas fees...');
      let ethBalance = bn(0);
      
      try {
        ethBalance = await connectedWallet.getBalance();
        console.log('ETH balance:', ethBalance.toString());
        
        // Format balance for display
        const ethDecimals = 9; // ETH has 9 decimals on Fuel
        const readableEthBalance = formatBalance(ethBalance, ethDecimals);
        console.log(`ETH balance (formatted): ${readableEthBalance} ETH`);
      } catch (error) {
        console.error('Error checking ETH balance:', error);
      }

      // Check for UTXO fragmentation
      console.log('Checking for UTXO fragmentation...');
      try {
        if (connectedWallet.provider && account) {
          const address = Address.fromString(account);
          const spendableCoinsResponse = await connectedWallet.provider.getCoins(address);
          
          // Access the coins array safely
          const spendableCoins = spendableCoinsResponse && spendableCoinsResponse.coins ? spendableCoinsResponse.coins : [];
          
          console.log(`Found ${spendableCoins.length} spendable coins in wallet`);
          
          // If there are many small coins, offer to consolidate them
          if (spendableCoins.length > 5) {
            console.warn(`Your wallet has ${spendableCoins.length} UTXOs which may cause transaction issues`);
            
            // Check if we can consolidate coins automatically
            if (typeof (connectedWallet as any).consolidateCoins === 'function') {
              const shouldConsolidate = window.confirm(
                `Your wallet has ${spendableCoins.length} small transactions (UTXOs) which may cause issues. ` +
                `Would you like to consolidate them now?`
              );
              
              if (shouldConsolidate) {
                try {
                  console.log('Consolidating UTXOs...');
                  notificationService.info(
                    'Consolidating UTXOs', 
                    'Please wait while your funds are being consolidated...'
                  );
                  
                  // Determine base asset ID for consolidation (ETH)
                  const baseAssetId = spendableCoins[0]?.assetId || tokenConfig.assetId;
                  
                  // Execute consolidation
                  const result = await (connectedWallet as any).consolidateCoins({
                    assetId: baseAssetId,
                    mode: 'sequential',
                    outputNum: 1
                  });
                  
                  console.log('Consolidation result:', result);
                  
                  notificationService.success(
                    'UTXOs Consolidated',
                    'Your funds have been consolidated. Please try your transaction again.'
                  );
                  
                  // Return false to indicate the trade wasn't executed but consolidation was performed
                  return false;
                } catch (consolidateError) {
                  console.error('Failed to consolidate UTXOs:', consolidateError);
                  
                  // Continue with the trade attempt even if consolidation fails
                  notificationService.warning(
                    'UTXO Consolidation Failed',
                    'Attempting to proceed with the trade anyway, but it may fail due to UTXO fragmentation.'
                  );
                }
              } else {
                notificationService.warning(
                  'UTXO Fragmentation',
                  `Proceeding without consolidation, but the transaction may fail.`
                );
              }
            } else {
              // Manual consolidation warning
              notificationService.warning(
                'UTXO Fragmentation Detected',
                `Your wallet has ${spendableCoins.length} small transactions which may cause issues. Consider consolidating your funds by sending yourself a single transaction first.`
              );
            }
          }
        }
      } catch (e) {
        console.error('Failed to check UTXO fragmentation:', e);
      }

      // For token swaps, we need to determine the trading pair
      // If trading FUEL, we need to know what we're trading it against
      // For now, let's assume FUEL/USDC pairs exist on Mira
      try {
        // Create Mira AMM instance
        const miraAmm = new MiraAmm(connectedWallet);
        
        // Determine the base currency for the trade
        // For non-USDC trades, we'll use USDC as the base currency
        // This supports FUEL/USDC, ETH/USDC pairs
        const baseTokenSymbol = 'USDC';
        const baseTokenConfig = getTokenBySymbol(baseTokenSymbol, false);
        
        if (!baseTokenConfig) {
          throw new Error(`Base token ${baseTokenSymbol} configuration not found`);
        }
        
        console.log('Trading pair:', {
          token: tokenConfig.symbol,
          base: baseTokenConfig.symbol,
          action: decision.action
        });
        
        // Prepare swap parameters with correct decimals
        let amountIn;
        
        // Convert the amount to BN with proper decimal places
        try {
          // For buy orders: we're spending base currency (USDC) to get the token
          // For sell orders: we're spending the token to get base currency (USDC)
          const inputToken = decision.action === 'buy' ? baseTokenConfig : tokenConfig;
          const multiplier = Math.pow(10, inputToken.decimals);
          amountIn = bn(Math.floor(decision.amount * multiplier).toString());
        } catch (e) {
          console.error('Error converting amount:', e);
          amountIn = bn(decision.amount.toString());
        }
        
        console.log('Amount for swap:', {
          original: decision.amount,
          bn: amountIn.toString(),
          action: decision.action
        });
        
        // Determine the asset IDs for swap based on the action
        const assetIn = decision.action === 'buy' 
          ? { bits: baseTokenConfig.assetId }  // Buy with USDC
          : { bits: tokenConfig.assetId };     // Sell token
          
        const assetOut = decision.action === 'buy'
          ? { bits: tokenConfig.assetId }      // Get token
          : { bits: baseTokenConfig.assetId }; // Get USDC
        
        // Build pool ID
        const poolId = buildPoolId(assetIn, assetOut, false); // false for volatile pool
        
        console.log('Pool ID constructed:', poolId);
        console.log('Asset IDs:', {
          assetIn: assetIn.bits,
          assetOut: assetOut.bits
        });
        
        // Get current block height for deadline
        const currentBlock = await provider.getBlock('latest');
        if (!currentBlock) {
          throw new Error('Failed to get current block');
        }
        
        const deadline = currentBlock.height.add(100); // 100 blocks deadline
        
        // Calculate minAmountOut with 2% slippage (98% of expected)
        // For simplicity, we'll use 50% of input amount as a conservative minimum
        const minAmountOut = amountIn.mul(bn(50)).div(bn(100));
        console.log('Min amount out (50% of input):', minAmountOut.toString());
        
        // Log the exact parameters being sent to swapExactInput
        console.log('Executing swap with params:', {
          amountIn: amountIn.toString(),
          assetIn: assetIn.bits,
          minAmountOut: minAmountOut.toString(),
          poolId: poolId,
          deadline: deadline.toString()
        });
        
        // Try with smaller gas limit and fewer options
        const txRequest = await miraAmm.swapExactInput(
          amountIn,
          assetIn,
          minAmountOut,
          [poolId],
          deadline,
          { gasLimit: bn(100000) } // Lower gas limit
        );
        
        console.log('Transaction request created');
        
        // Send transaction
        console.log('Sending transaction...');
        const response = await connectedWallet.sendTransaction(txRequest);
        console.log('Transaction sent:', response);
        
        // Wait for confirmation
        console.log('Waiting for confirmation...');
        const result = await response.wait();
        console.log('Transaction confirmed:', result);
        
        notificationService.success(
          'Trade Executed',
          `Successfully ${decision.action === 'buy' ? 'bought' : 'sold'} ${decision.amount} ${decision.token.symbol}`
        );
        
        return true;
        
      } catch (miraError) {
        console.error('Mira AMM error:', miraError);
        
        // Try to extract meaningful information from the error
        const errorStr = String(miraError); // Convert to string safely
        console.log('Full error string:', errorStr);
        
        // If Mira fails, provide a more helpful error message
        if (miraError instanceof Error) {
          // Try a self-transfer to consolidate UTXOs if we see this specific error
          if (
            errorStr.includes('Insufficient funds or too many small value coins') ||
            errorStr.includes('MAX_INPUTS_EXCEEDED') || 
            errorStr.includes('INSUFFICIENT_FUNDS') || 
            errorStr.includes('too many small value coins')
          ) {
            // Offer automatic UTXO consolidation
            const shouldConsolidate = window.confirm(
              `UTXO Fragmentation Detected: Your ${decision.token.symbol} is split into too many small UTXOs. ` +
              `Would you like to consolidate them now to fix this issue?`
            );
            
            if (shouldConsolidate) {
              try {
                console.log('Attempting to consolidate UTXOs...');
                notificationService.info(
                  'Consolidating UTXOs', 
                  'Please wait while your funds are being consolidated...'
                );
                
                // Try direct token self-transfer if consolidateCoins isn't available
                if (typeof connectedWallet.consolidateCoins !== 'function') {
                  // Get token balance
                  const tokenBalance = await connectedWallet.getBalance(tokenConfig.assetId);
                  console.log(`${tokenConfig.symbol} balance for consolidation:`, tokenBalance.toString());
                  
                  // Calculate amount to send (keep some for gas if it's ETH)
                  const gasAmount = tokenConfig.symbol === 'ETH' ? bn(50000000) : bn(0); // 0.05 ETH for gas
                  let sendAmount = tokenBalance.sub(gasAmount);
                  
                  // Ensure we're not sending a negative amount
                  if (sendAmount.lte(bn(0))) {
                    throw new Error('Insufficient balance for consolidation');
                  }
                  
                  console.log('Self-transfer amount:', sendAmount.toString());
                  
                  // Create a self-transfer transaction
                  const txRequest = await connectedWallet.createTransfer(account, sendAmount, tokenConfig.assetId);
                  
                  // Send the transaction
                  const response = await connectedWallet.sendTransaction(txRequest);
                  const result = await response.wait();
                  
                  console.log('Self-transfer successful:', result);
                  
                  notificationService.success(
                    'UTXOs Consolidated',
                    'Your funds have been consolidated. Please try your transaction again in a few moments.'
                  );
                } else {
                  // Use consolidateCoins method if available
                  const result = await connectedWallet.consolidateCoins({
                    assetId: tokenConfig.assetId,
                    mode: 'sequential',
                    outputNum: 1
                  });
                  
                  console.log('Consolidation result:', result);
                  
                  notificationService.success(
                    'UTXOs Consolidated',
                    'Your funds have been consolidated. Please try your transaction again in a few moments.'
                  );
                }
                
                throw new Error(`Consolidation completed. Please try your transaction again.`);
              } catch (consolidateError) {
                console.error('Failed to consolidate UTXOs:', consolidateError);
                throw new Error(`UTXO Fragmentation Issue: Your ${tokenConfig.symbol} is split into too many small UTXOs. We tried to consolidate but encountered an error: ${String(consolidateError)}`);
              }
            } else {
              throw new Error(`UTXO Fragmentation Issue: Your ${tokenConfig.symbol} is split into too many small UTXOs. Try sending yourself all your ${tokenConfig.symbol} in a single transaction to consolidate funds.`);
            }
          }
          
          // Rethrow the original error with full details
          throw new Error(`Swap failed: ${miraError.message}`);
        } else {
          // Handle non-Error objects
          throw new Error(`Swap failed: ${errorStr}`);
        }
      }

    } catch (error) {
      console.error('Trade execution failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      notificationService.error('Trade Failed', errorMessage);
      
      return false;
    } finally {
      setIsExecuting(false);
    }
  }, [connectedWallet, account, isTestnet]);

  return { executeTrade, isExecuting };
};