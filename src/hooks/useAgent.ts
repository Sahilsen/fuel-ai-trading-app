import { useState, useEffect, useCallback, useRef } from 'react';
import { createAgent, BaseAgent } from '@/agents';
import { realMarketDataService } from '@/services';
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
    // Initialize agent based on type using the factory function
    const newAgent = createAgent(agentType);
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