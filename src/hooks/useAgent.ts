import { useState, useEffect, useCallback, useRef } from 'react';
import { BaseAgent } from '@/agents/BaseAgent';
import { FOMOerAgent } from '@/agents/FOMOerAgent';
import { DegenAgent } from '@/agents/DegenAgent';
import { DiamondHandsAgent } from '@/agents/DiamondHandsAgent';
import { WhaleWatcherAgent } from '@/agents/WhaleWatcherAgent';
import { realMarketDataService } from '@/services/RealMarketDataService';
import { TradeDecision, MarketData, AgentPersonality } from '@/types';
import { useNetwork } from '@/contexts/NetworkContext';

export const useAgent = (agentType: AgentPersonality, selectedToken: string = 'ETH') => {
  const [agent, setAgent] = useState<BaseAgent | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const { isTestnet } = useNetwork();

  useEffect(() => {
    // Set network for market data service
    realMarketDataService.setNetwork(isTestnet);
  }, [isTestnet]);

  useEffect(() => {
    // Initialize agent based on type
    let newAgent: BaseAgent;
    
    switch (agentType) {
      case 'fomor':
        newAgent = new FOMOerAgent('fomor');
        break;
      case 'degen':
        newAgent = new DegenAgent('degen');
        break;
      case 'diamond-hands':
        newAgent = new DiamondHandsAgent('diamond-hands');
        break;
      case 'whale-watcher':
        newAgent = new WhaleWatcherAgent('whale-watcher');
        break;
      default:
        return;
    }

    setAgent(newAgent);
  }, [agentType]);

  useEffect(() => {
    // Clean up previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Subscribe to market updates for selected token
    unsubscribeRef.current = realMarketDataService.subscribeToUpdates(selectedToken, (data) => {
      setMarketData(data);
    });

    // Fetch initial data
    realMarketDataService.getMarketData(selectedToken).then(setMarketData);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [selectedToken]);

  const analyzeMarket = useCallback(async (command?: string): Promise<TradeDecision | null> => {
    if (!agent || !marketData) {
      setError('Agent or market data not available');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const decision = await agent.analyzeMarket(marketData, command);
      return decision;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [agent, marketData]);

  const getMetrics = useCallback(() => {
    return agent?.getMetrics() || {
      totalTrades: 0,
      winRate: 0,
      avgConfidence: 0,
      profitLoss: 0
    };
  }, [agent]);

  return {
    agent,
    marketData,
    isLoading,
    error,
    analyzeMarket,
    getMetrics
  };
};