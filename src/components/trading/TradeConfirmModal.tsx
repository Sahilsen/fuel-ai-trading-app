import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check, X } from 'lucide-react';
import { TradeDecision } from '@/types';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface TradeConfirmModalProps {
  trade: TradeDecision;
  onConfirm: (approved: boolean) => void;
  isExecuting: boolean;
}

export const TradeConfirmModal: React.FC<TradeConfirmModalProps> = ({ 
  trade, 
  onConfirm,
  isExecuting 
}) => {
  const getActionColor = () => {
    switch (trade.action) {
      case 'buy': return 'text-green-400';
      case 'sell': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getConfidenceColor = () => {
    if (trade.confidence >= 0.8) return 'text-green-400';
    if (trade.confidence >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Format numbers properly
  const formatAmount = (amount: number, decimals: number) => {
    // Ensure we don't show more decimals than the token supports
    return amount.toFixed(Math.min(decimals, 9));
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (price >= 1) {
      return price.toFixed(2);
    } else if (price >= 0.01) {
      return price.toFixed(4);
    } else {
      return price.toFixed(6);
    }
  };

  // Calculate estimated value
  const estimatedValue = trade.amount * trade.token.price;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <AlertTriangle size={24} className="text-yellow-400" />
            </div>
            <h2 className="text-xl font-bold">Confirm Trade</h2>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-400">Action</span>
              <span className={`font-bold uppercase ${getActionColor()}`}>
                {trade.action}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Token</span>
              <span className="font-mono">{trade.token.symbol}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Amount</span>
              <span className="font-mono">
                {formatAmount(trade.amount, trade.token.decimals)} {trade.token.symbol}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Current Price</span>
              <span className="font-mono">${formatPrice(trade.token.price)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Estimated Value</span>
              <span className="font-mono">${formatPrice(estimatedValue)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Confidence</span>
              <span className={`font-bold ${getConfidenceColor()}`}>
                {(trade.confidence * 100).toFixed(0)}%
              </span>
            </div>

            <div className="pt-4 border-t border-gray-700">
              <p className="text-sm text-gray-400 mb-2">Agent Reasoning:</p>
              <p className="text-sm">{trade.reason}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onConfirm(false)}
              disabled={isExecuting}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <X size={18} />
              Cancel
            </button>
            <button
              onClick={() => onConfirm(true)}
              disabled={isExecuting}
              className="flex-1 px-4 py-2 bg-fuel-green text-black hover:bg-green-400 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isExecuting ? (
                <>
                  <LoadingSpinner size="sm" />
                  Executing...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Confirm Trade
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};