import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Brain, DollarSign } from 'lucide-react';
import { AgentMetrics as AgentMetricsType } from '@/types';

interface AgentMetricsProps {
  metrics: AgentMetricsType;
}

export const AgentMetrics: React.FC<AgentMetricsProps> = ({ metrics }) => {
  const getWinRateColor = (winRate: number) => {
    if (winRate >= 0.7) return 'text-green-400';
    if (winRate >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getProfitColor = (profit: number) => {
    return profit >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const metricsData = [
    {
      label: 'Total Trades',
      value: metrics.totalTrades,
      icon: TrendingUp,
      color: 'text-blue-400'
    },
    {
      label: 'Win Rate',
      value: `${(metrics.winRate * 100).toFixed(1)}%`,
      icon: Target,
      color: getWinRateColor(metrics.winRate)
    },
    {
      label: 'Avg Confidence',
      value: `${(metrics.avgConfidence * 100).toFixed(0)}%`,
      icon: Brain,
      color: 'text-purple-400'
    },
    {
      label: 'P&L',
      value: `${metrics.profitLoss >= 0 ? '+' : ''}${metrics.profitLoss.toFixed(2)}%`,
      icon: DollarSign,
      color: getProfitColor(metrics.profitLoss)
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="card"
    >
      <h3 className="text-lg font-semibold mb-4">Agent Performance</h3>
      
      <div className="space-y-3">
        {metricsData.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <metric.icon size={16} className={metric.color} />
              <span className="text-sm text-gray-400">{metric.label}</span>
            </div>
            <span className={`font-semibold ${metric.color}`}>
              {metric.value}
            </span>
          </motion.div>
        ))}
      </div>

      {metrics.totalTrades === 0 && (
        <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
          <p className="text-xs text-gray-400 text-center">
            No trades yet. Start trading to see metrics!
          </p>
        </div>
      )}
    </motion.div>
  );
};