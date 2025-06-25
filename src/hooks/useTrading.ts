import { useCallback, useState } from 'react';
import { useWallet, useAccount } from '@fuels/react';
import { Address, bn, TransactionResult, ScriptTransactionRequest } from 'fuels';
import { MiraAmm, ReadonlyMiraAmm, buildPoolId } from 'mira-dex-ts';
import { notificationService } from '@/services';
import { BASE_ASSET_ID, getTokenBySymbol } from '@/config';
import { TradeDecision } from '@/types';
import { useNetwork } from '@/contexts/NetworkContext';

// Helper function to format balance to string with decimals
function formatBalance(balance: any, decimals: number): string {
  try {
    if (!balance) return '0.0';
    const balanceStr = balance.toString();
    if (balanceStr.length <= decimals) {
      return `0.${'0'.repeat(decimals - balanceStr.length)}${balanceStr}`;
    }
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
      if (decision.action === 'hold') {
        notificationService.info('No Trade', 'Agent decided to hold position');
        return { success: false };
      }

      // Temporarily disable sell transactions due to Mira AMM bug
      if (decision.action === 'sell') {
        throw new Error(
          'Sell transactions are temporarily disabled due to a known issue with Mira AMM. ' +
          'The DEX fails to include ETH for gas fees when selling tokens. ' +
          'Please use the Mira web interface directly or wait for a fix.'
        );
      }

      const provider = connectedWallet.provider;
      const tokenConfig = getTokenBySymbol(decision.token.symbol, isTestnet);

      if (!tokenConfig) {
        throw new Error('Token configuration not found');
      }

      if (tokenConfig.assetId === BASE_ASSET_ID) {
        throw new Error('Cannot swap ETH for ETH');
      }

      // Check ETH balance for gas fees
      const ethBalance = await connectedWallet.getBalance(BASE_ASSET_ID);
      const minGasRequired = bn(100000); // 0.0001 ETH minimum
      
      if (ethBalance.lt(minGasRequired)) {
        throw new Error(
          `Insufficient ETH for gas. You have ${formatBalance(ethBalance, 9)} ETH ` +
          `but need at least ${formatBalance(minGasRequired, 9)} ETH`
        );
      }

      // Create Mira AMM instance
      const miraAmm = new MiraAmm(connectedWallet);

      // Prepare swap parameters
      let amountIn;
      if (decision.action === 'buy') {
        // Calculate ETH needed for token amount
        const ethPrice = 2000; // Should get from market data
        const ethAmount = (decision.amount * decision.token.price) / ethPrice;
        amountIn = bn(Math.floor(ethAmount * Math.pow(10, 9)).toString());
      } else {
        // Selling token amount
        amountIn = bn(Math.floor(decision.amount * Math.pow(10, tokenConfig.decimals)).toString());
      }

      // Determine asset IDs
      const assetIn = decision.action === 'buy'
        ? { bits: BASE_ASSET_ID }
        : { bits: tokenConfig.assetId };

      const assetOut = decision.action === 'buy'
        ? { bits: tokenConfig.assetId }
        : { bits: BASE_ASSET_ID };

      // Build pool ID and get deadline
      const poolId = buildPoolId(assetIn, assetOut, false);
      const currentBlock = await provider.getBlock('latest');
      if (!currentBlock) throw new Error('Failed to get current block');
      const deadline = currentBlock.height.add(100);

      // Calculate min amount out with slippage
      const miraAmmReader = new ReadonlyMiraAmm(provider);
      const result_out = await miraAmmReader.getAmountsOut(
        { bits: assetIn.bits },
        amountIn,
        [poolId],
      );

      if (!result_out || result_out.length === 0) {
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

      const minAmountOut = amountOutWei.mul(bn(99)).div(bn(100)); // 1% slippage

      // Execute the swap (currently only buy transactions work)
      let txRequest;
      
      // Buy transactions work fine with standard approach
      const txParams = {
        gasLimit: 1000000,
        variableOutputs: 2,
      };
      
      txRequest = await miraAmm.swapExactInput(
        amountIn,
        assetIn,
        minAmountOut,
        [poolId],
        deadline,
        txParams
      );

      // Send transaction
      const response = await connectedWallet.sendTransaction(txRequest);
      const result = await response.waitForResult();

      // Extract transaction details
      const txHash = result.id || 'Unknown';
      const gasUsed = result.fee ? result.fee.format() : 'Unknown';
      const gasCost = result.fee ? parseFloat(formatBalance(result.fee, 9)) : 0;
      
      // Calculate amounts
      const actualAmountIn = formatBalance(amountIn, decision.action === 'buy' ? 9 : tokenConfig.decimals);
      const actualAmountOut = formatBalance(minAmountOut, decision.action === 'buy' ? tokenConfig.decimals : 9);
      
      const ethAmount = decision.action === 'buy' ? parseFloat(actualAmountIn) : parseFloat(actualAmountOut);
      const tokenAmount = decision.action === 'buy' ? decision.amount : parseFloat(actualAmountIn);
      const effectivePrice = ethAmount / tokenAmount;
      const priceInUSD = effectivePrice * 2000; // Assuming ETH = $2000

      const txDetails: TransactionDetails = {
        hash: txHash,
        action: decision.action as 'buy' | 'sell',
        tokenSymbol: tokenConfig.symbol,
        tokenAmount: tokenAmount,
        ethAmount: ethAmount,
        effectivePrice: effectivePrice,
        priceInUSD: priceInUSD,
        gasUsed: gasUsed,
        gasCost: gasCost,
        gasCostUSD: gasCost * 2000,
        totalCostETH: decision.action === 'buy' ? ethAmount + gasCost : gasCost,
        totalCostUSD: decision.action === 'buy' ? (ethAmount + gasCost) * 2000 : gasCost * 2000
      };

      const txSummary = decision.action === 'buy' 
        ? `Bought ${tokenAmount} ${tokenConfig.symbol} for ${ethAmount.toFixed(6)} ETH`
        : `Sold ${tokenAmount} ${tokenConfig.symbol} for ${ethAmount.toFixed(6)} ETH`;

      notificationService.success(
        'Trade Executed',
        `${txSummary}. Gas: ${gasCost.toFixed(6)} ETH`
      );

      return { success: true, details: txDetails };

    } catch (error) {
      console.error('Trade execution failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Provide specific error for common issues
      if (errorMessage.includes('InsufficientFeeAmount')) {
        notificationService.error(
          'Insufficient ETH for Gas',
          'Even when selling tokens, you need ETH in your wallet to pay for transaction fees.'
        );
      } else if (errorMessage.includes('Pool not found')) {
        notificationService.error(
          'No Liquidity Pool',
          `No liquidity pool found for this token pair on ${isTestnet ? 'testnet' : 'mainnet'}.`
        );
      } else {
        notificationService.error('Trade Failed', errorMessage);
      }
      
      return { success: false };
    } finally {
      setIsExecuting(false);
    }
  }, [connectedWallet, account, isTestnet]);

  return { executeTrade, isExecuting };
};