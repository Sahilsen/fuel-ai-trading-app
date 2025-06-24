import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { whaleTrackerService, WhaleTransaction } from '@/services/WhaleTrackerService';

export const WhaleActivity: React.FC = () => {
  const [recentTransactions, setRecentTransactions] = useState<WhaleTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize whale tracker
    whaleTrackerService.initialize();

    // Fetch initial transactions
    const fetchTransactions = async () => {
      const txs = await whaleTrackerService.getRecentWhaleTransactions();
      setRecentTransactions(txs);
      setIsLoading(false);
    };

    fetchTransactions();

    // Subscribe to new whale transactions
    const unsubscribe = whaleTrackerService.subscribeToWhaleTransactions((tx) => {
      setRecentTransactions(prev => [tx, ...prev.slice(0, 4)]);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="card"
    >
      <div className="flex items-center gap-2 mb-4">
        <Eye size={20} className="text-blue-400" />
        <h3 className="text-lg font-semibold">Whale Activity</h3>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {recentTransactions.map((tx, index) => (
              <motion.div
                key={tx.hash}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 bg-gray-700 rounded-lg"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {tx.from.toLowerCase() > tx.to.toLowerCase() ? (
                      <TrendingDown size={16} className="text-red-400" />
                    ) : (
                      <TrendingUp size={16} className="text-green-400" />
                    )}
                    <span className="font-semibold">
                      ${tx.usdValue?.toLocaleString()}
                    </span>
                    <span className="text-gray-400 text-sm">{tx.token}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock size={12} />
                    {formatTime(tx.timestamp)}
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {formatAddress(tx.from)} → {formatAddress(tx.to)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {recentTransactions.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-4">
              No whale transactions detected
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
};