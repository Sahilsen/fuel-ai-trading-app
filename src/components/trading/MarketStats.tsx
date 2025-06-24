import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, BarChart3, ChevronDown } from 'lucide-react';
import { MarketData } from '@/types';
import { getTokens } from '@/config/tokens';
import { useNetwork } from '@/contexts/NetworkContext';

interface MarketStatsProps {
  marketData: MarketData | null;
  selectedToken: string;
  onTokenChange: (token: string) => void;
}

export const MarketStats: React.FC<MarketStatsProps> = ({ 
  marketData, 
  selectedToken,
  onTokenChange 
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { isTestnet } = useNetwork();
  
  const tokens = getTokens(isTestnet);
  const currentToken = tokens.find(t => t.symbol === selectedToken) || tokens[0];

  if (!marketData) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-20 bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: 'Price',
      value: `$${marketData.price.toFixed(2)}`,
      icon: marketData.change24h >= 0 ? TrendingUp : TrendingDown,
      color: marketData.change24h >= 0 ? 'text-green-400' : 'text-red-400',
      change: `${marketData.change24h >= 0 ? '+' : ''}${marketData.change24h.toFixed(2)}%`
    },
    {
      label: '24h Volume',
      value: `$${(marketData.volume / 1e6).toFixed(2)}M`,
      icon: Activity,
      color: 'text-blue-400'
    },
    {
      label: '24h High',
      value: `$${marketData.high24h?.toFixed(2) || 'N/A'}`,
      icon: TrendingUp,
      color: 'text-green-400'
    },
    {
      label: 'RSI',
      value: marketData.rsi?.toFixed(0) || 'N/A',
      icon: BarChart3,
      color: marketData.rsi ? (marketData.rsi > 70 ? 'text-red-400' : marketData.rsi < 30 ? 'text-green-400' : 'text-yellow-400') : 'text-gray-400'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Token Selector */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <span className="text-xl">{currentToken.icon}</span>
          <span className="font-semibold">{currentToken.symbol}</span>
          <span className="text-gray-400 text-sm">{currentToken.name}</span>
          <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full mt-2 w-full bg-gray-800 rounded-lg border border-gray-700 z-10"
          >
            {tokens.map(token => (
              <button
                key={token.symbol}
                onClick={() => {
                  onTokenChange(token.symbol);
                  setIsDropdownOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-700 transition-colors ${
                  token.symbol === selectedToken ? 'bg-gray-700' : ''
                }`}
              >
                <span className="text-xl">{token.icon}</span>
                <span className="font-semibold">{token.symbol}</span>
                <span className="text-gray-400 text-sm">{token.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">{stat.label}</span>
              <stat.icon size={16} className={stat.color} />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{stat.value}</p>
              {stat.change && (
                <p className={`text-sm ${stat.color}`}>{stat.change}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};