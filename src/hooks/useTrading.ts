import { useCallback, useState } from 'react';
import { useWallet, useAccount } from '@fuels/react';
import { Address, bn, TransactionResult } from 'fuels';
import { MiraAmm, ReadonlyMiraAmm, buildPoolId } from 'mira-dex-ts';
import { notificationService } from '@/services/NotificationService';
import { BASE_ASSET_ID, getTokenBySymbol } from '@/config/tokens';
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

interface TransactionDetails {
  hash: string;
  action: 'buy' | 'sell';
  tokenSymbol: string;
  tokenAmount: number;
  ethAmount: number;
  effectivePrice: number;
  priceInUSD: number;
  gasUsed: string;
  gasCost: number;
  gasCostUSD: number;
  totalCostETH: number;
  totalCostUSD: number;
}

export const useTrading = () => {
  const { wallet: connectedWallet } = useWallet();
  const { account } = useAccount();
  const [isExecuting, setIsExecuting] = useState(false);
  const { isTestnet } = useNetwork();

  const executeTrade = useCallback(async (decision: TradeDecision): Promise<{ success: boolean; details?: TransactionDetails }> => {
    if (!connectedWallet || !account) {
      notificationService.error('Wallet Error', 'Please connect your wallet');
      return { success: false };
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

      // Check if it's a hold decision
      if (decision.action === 'hold') {
        notificationService.info('No Trade', 'Agent decided to hold position');
        return { success: false };
      }

      // For mainnet, execute real trade
      const provider = connectedWallet.provider;

      // Get token configuration
      const tokenConfig = getTokenBySymbol(decision.token.symbol, isTestnet);

      if (!tokenConfig) {
        throw new Error('Token configuration not found');
      }

      // Skip if trying to trade ETH for ETH
      if (tokenConfig.assetId === BASE_ASSET_ID) {
        throw new Error('Cannot swap ETH for ETH');
      }

      console.log('Token configuration:', {
        symbol: tokenConfig.symbol,
        address: tokenConfig.address,
        assetId: tokenConfig.assetId,
        decimals: tokenConfig.decimals
      });

      console.log('ETH Asset ID:', BASE_ASSET_ID);

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

          console.log({ spendableCoins })

          console.log(`Found ${spendableCoins.length} spendable coins in wallet`);

          // If there are many small coins, warn the user
          if (spendableCoins.length > 5) {
            console.warn(`Your wallet has ${spendableCoins.length} UTXOs which may cause transaction issues`);
          }
        }
      } catch (e) {
        console.error('Failed to check UTXO fragmentation:', e);
      }

      // For token swaps on Mira
      try {
        // Create Mira AMM instance
        const miraAmm = new MiraAmm(connectedWallet);

        console.log('Trading pair:', {
          token: tokenConfig.symbol,
          base: 'ETH',
          action: decision.action
        });

        // Prepare swap parameters
        let amountIn;

        // Convert the amount to BN with proper decimal places
        try {
          if (decision.action === 'buy') {
            // For buy: we need to calculate how much ETH to spend
            // This is a simplified calculation - in production you'd use getAmountsIn
            const tokenPrice = decision.token.price; // Price in USD
            const ethPrice = 2000; // You should get this from market data
            const ethAmount = (decision.amount * tokenPrice) / ethPrice;
            amountIn = bn(Math.floor(ethAmount * Math.pow(10, 9)).toString()); // ETH has 9 decimals
          } else {
            // For sell: we're selling the token amount
            const tokenDecimals = tokenConfig.decimals;
            amountIn = bn(Math.floor(decision.amount * Math.pow(10, tokenDecimals)).toString());
          }
        } catch (e) {
          console.error('Error converting amount:', e);
          throw new Error('Failed to calculate swap amounts');
        }

        console.log('Amount for swap:', {
          original: decision.amount,
          amountIn: amountIn.toString(),
          action: decision.action,
          inputToken: decision.action === 'buy' ? 'ETH' : tokenConfig.symbol,
          outputToken: decision.action === 'buy' ? tokenConfig.symbol : 'ETH'
        });

        // Determine the asset IDs for swap based on the action
        // ALWAYS use ETH as the base currency
        const assetIn = decision.action === 'buy'
          ? { bits: BASE_ASSET_ID }  // Buy with ETH
          : { bits: tokenConfig.assetId };     // Sell token

        const assetOut = decision.action === 'buy'
          ? { bits: tokenConfig.assetId }      // Get token
          : { bits: BASE_ASSET_ID }; // Get ETH

        // Build pool ID - the order matters!
        // For Mira, pools are identified by the token pair
        const poolId = buildPoolId(assetIn, assetOut, false); // false for volatile pool

        console.log('Pool ID constructed:', poolId);
        console.log('Asset IDs:', {
          assetIn: assetIn.bits,
          assetOut: assetOut.bits,
          assetInSymbol: decision.action === 'buy' ? 'ETH' : tokenConfig.symbol,
          assetOutSymbol: decision.action === 'buy' ? tokenConfig.symbol : 'ETH'
        });

        // Get current block height for deadline
        const currentBlock = await provider.getBlock('latest');

        if (!currentBlock) {
          throw new Error('Failed to get current block');
        }

        const deadline = currentBlock.height.add(100); // 100 blocks deadline

        // Calculate minAmountOut with slippage protection
        const miraAmmReader = new ReadonlyMiraAmm(provider);

        // Calculate the expected output amount using ETH as input
        const result_out = await miraAmmReader.getAmountsOut(
          { bits: assetIn.bits }, // Use the actual input asset
          amountIn,
          [poolId],
        );

        if (!result_out || result_out.length === 0 || !result_out[0] || result_out[0].length < 2) {
          throw new Error('Failed to calculate output amount');
        }

        let amountOutWei;
        if (result_out[1] && result_out[1][0].bits === assetOut.bits) {
          amountOutWei = result_out[1][1];
        } else if (result_out[0][0].bits === assetOut.bits) {
          amountOutWei = result_out[0][1];
        }

        if (!amountOutWei) {
          throw new Error('Failed to calculate output amount');
        }

        // Apply 1% slippage tolerance
        const minAmountOut = amountOutWei
          .mul(bn(99))
          .div(bn(100));
        
        console.log('Min amount out (with 1% slippage):', minAmountOut.toString());

        // Log the exact parameters being sent to swapExactInput
        console.log('Executing swap with params:', {
          amountIn: amountIn.toString(),
          assetIn: assetIn,
          minAmountOut: minAmountOut.toString(),
          poolId: poolId,
          deadline: deadline.toString()
        });

        // Execute the swap
        let txRequest;
        try {
          console.log('Creating swap transaction...');
          
          // Create the swap transaction with optimized gas settings
          txRequest = await miraAmm.swapExactInput(
            amountIn,
            assetIn,
            minAmountOut,
            [poolId],
            deadline,
            {
              gasLimit: 1000000, // Set a reasonable gas limit
              variableOutputs: 1, // Reduce variable outputs to save gas
            }
          );

          console.log('Transaction request created:', txRequest);
          
          // Check if txRequest is valid
          if (!txRequest || typeof txRequest !== 'object') {
            throw new Error('Invalid transaction request from Mira');
          }

        } catch (e) {
          console.error('Error creating swap transaction:', e);
          
          // If insufficient funds, offer to consolidate UTXOs
          if (String(e).includes('Insufficient funds') || String(e).includes('MAX_INPUTS_EXCEEDED')) {
            const shouldConsolidate = window.confirm(
              `Transaction failed due to insufficient funds or UTXO fragmentation. ` +
              `Would you like to consolidate your UTXOs and try again?`
            );

            if (shouldConsolidate && typeof connectedWallet.consolidateCoins === 'function') {
              try {
                console.log('Consolidating UTXOs...');
                notificationService.info(
                  'Consolidating UTXOs',
                  'Please wait while your funds are being consolidated...'
                );

                const baseAssetId = await provider.getBaseAssetId();
                const result = await connectedWallet.consolidateCoins({
                  assetId: baseAssetId,
                  mode: 'sequential',
                  outputNum: 1
                });

                console.log('Consolidation result:', result);

                notificationService.success(
                  'UTXOs Consolidated',
                  'Your funds have been consolidated. Please try your transaction again.'
                );

                return { success: false };
              } catch (consolidateError) {
                console.error('Failed to consolidate UTXOs:', consolidateError);
              }
            }
          }
          
          throw e;
        }

        // Send transaction with proper error handling
        let response;
        try {
          console.log('Sending transaction...');
          
          // Send the transaction request directly
          response = await connectedWallet.sendTransaction(txRequest);
          console.log('Transaction sent:', response);
        } catch (sendError) {
          console.error('Error sending transaction:', sendError);
          console.error('Transaction that failed:', txRequest);
          
          // Check if it's a wallet error
          if (String(sendError).includes('User rejected') || String(sendError).includes('cancelled')) {
            throw new Error('Transaction cancelled by user');
          }
          
          throw sendError;
        }

        // Wait for confirmation
        console.log('Waiting for confirmation...');
        const result = await response.waitForResult();
        console.log('Transaction confirmed:', result);

        // Extract transaction details
        const txHash = result.id || 'Unknown';
        const gasUsed = result.fee ? result.fee.format() : 'Unknown';
        const gasCost = result.fee ? parseFloat(formatBalance(result.fee, 9)) : 0;
        const gasUsedAmount = result.gasUsed ? result.gasUsed.toString() : 'Unknown';
        
        // Calculate actual amounts from the transaction
        let actualAmountIn = formatBalance(amountIn, decision.action === 'buy' ? 9 : tokenConfig.decimals);
        let actualAmountOut = formatBalance(minAmountOut, decision.action === 'buy' ? tokenConfig.decimals : 9);
        
        // Log transaction details
        console.log('Transaction result details:', {
          transactionId: txHash,
          fee: result.fee?.toString(),
          gasUsed: gasUsedAmount,
          receipts: result.receipts,
          status: result.status
        });

        // Calculate price per token
        const ethAmount = decision.action === 'buy' ? parseFloat(actualAmountIn) : parseFloat(actualAmountOut);
        const tokenAmount = decision.action === 'buy' ? decision.amount : parseFloat(actualAmountIn);
        const effectivePrice = ethAmount / tokenAmount;
        const priceInUSD = effectivePrice * 2000; // Assuming ETH = $2000, you should use actual ETH price

        // Create detailed transaction summary
        const txDetails: TransactionDetails = {
          hash: txHash,
          action: decision.action as 'buy' | 'sell', // Ensure it's only buy or sell
          tokenSymbol: tokenConfig.symbol,
          tokenAmount: tokenAmount,
          ethAmount: ethAmount,
          effectivePrice: effectivePrice,
          priceInUSD: priceInUSD,
          gasUsed: gasUsed,
          gasCost: gasCost,
          gasCostUSD: gasCost * 2000, // Assuming ETH = $2000
          totalCostETH: decision.action === 'buy' ? ethAmount + gasCost : gasCost,
          totalCostUSD: decision.action === 'buy' ? (ethAmount + gasCost) * 2000 : gasCost * 2000
        };

        console.log('Transaction Details:', txDetails);

        // Create a formatted message for the notification
        const txSummary = decision.action === 'buy' 
          ? `Bought ${tokenAmount} ${tokenConfig.symbol} for ${ethAmount.toFixed(6)} ETH (~$${(ethAmount * 2000).toFixed(2)})`
          : `Sold ${tokenAmount} ${tokenConfig.symbol} for ${ethAmount.toFixed(6)} ETH (~$${(ethAmount * 2000).toFixed(2)})`;

        notificationService.success(
          'Trade Executed',
          `${txSummary}. Gas: ${gasCost.toFixed(6)} ETH (~$${(gasCost * 2000).toFixed(2)})`
        );

        // Return transaction details for the chat
        return { success: true, details: txDetails };

      } catch (miraError) {
        console.error('Mira AMM error:', miraError);

        // Try to extract meaningful information from the error
        const errorStr = String(miraError);
        console.log('Full error string:', errorStr);

        // Provide helpful error messages
        if (errorStr.includes('Insufficient funds')) {
          throw new Error(`Insufficient ETH balance for this trade. You have ${formatBalance(ethBalance, 9)} ETH.`);
        } else if (errorStr.includes('Pool not found') || errorStr.includes('pool does not exist')) {
          throw new Error(`No liquidity pool found for ETH/${tokenConfig.symbol} pair on ${isTestnet ? 'testnet' : 'mainnet'}.`);
        } else if (errorStr.includes('slippage')) {
          throw new Error('Transaction would exceed slippage tolerance. Try a smaller amount.');
        } else if (miraError instanceof Error) {
          throw new Error(`Swap failed: ${miraError.message}`);
        } else {
          throw new Error(`Swap failed: ${errorStr}`);
        }
      }

    } catch (error) {
      console.error('Trade execution failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      notificationService.error('Trade Failed', errorMessage);

      return { success: false };
    } finally {
      setIsExecuting(false);
    }
  }, [connectedWallet, account, isTestnet]);

  return { executeTrade, isExecuting };
};