import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAgent, useTrading, useNotifications } from '@/hooks';
import { 
  MarketStats, 
  TradingChart, 
  ChatInterface, 
  TradeConfirmModal, 
  AgentMetrics, 
  WhaleActivity 
} from '.';
import { WalletBalance } from '@/components/wallet';
import { NotificationContainer } from '@/components/common';
import { AgentPersonality, TradeDecision, ChatMessage } from '@/types';
import { useNetwork } from '@/contexts/NetworkContext';

interface TradingDashboardProps {
  agentType: AgentPersonality;
  walletAddress: string;
}

export const TradingDashboard: React.FC<TradingDashboardProps> = ({ 
  agentType,
}) => {
  const [selectedToken, setSelectedToken] = useState('ETH');
  const { agent, marketData, getMetrics } = useAgent(agentType, selectedToken);
  const { executeTrade, isExecuting } = useTrading();
  const { notifications, removeNotification } = useNotifications();
  const { isTestnet } = useNetwork();
  
  const [pendingTrade, setPendingTrade] = useState<TradeDecision | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!agent) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    setChatMessages(prev => [...prev, userMessage]);

    setIsLoading(true);
    try {
      // Get agent response - the market data already has the selected token
      const { response, tradeDecision } = await agent.chat(message, marketData);
      
      // Add agent message
      const agentMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        tradeDecision
      };
      setChatMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [agent, marketData]);

  const handleTradeClick = useCallback((trade: TradeDecision) => {
    setPendingTrade(trade);
  }, []);

  const handleTradeConfirm = useCallback(async (approved: boolean) => {
    if (approved && pendingTrade) {
      const result = await executeTrade(pendingTrade);
      
      // If trade was successful, add transaction details to chat
      if (result.success && result.details) {
        // Determine the explorer URL based on network
        const explorerBaseUrl = isTestnet 
          ? 'https://app.fuel.network/tx/' 
          : 'https://app.fuel.network/tx/'; // Same URL for both networks currently
        
        const txUrl = `${explorerBaseUrl}${result.details.hash}`;
        
        const txMessage: ChatMessage = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `✅ Transaction Complete!\n\n` +
            `🔗 <a href="${txUrl}" target="_blank" rel="noopener noreferrer" style="color: #00F58C; text-decoration: underline;">View on Fuel Explorer</a>\n` +
            `💰 ${result.details.action === 'buy' ? 'Bought' : 'Sold'}: ${result.details.tokenAmount} ${result.details.tokenSymbol}\n` +
            `💸 ETH ${result.details.action === 'buy' ? 'Spent' : 'Received'}: ${result.details.ethAmount.toFixed(6)} ETH (~$${(result.details.ethAmount * 2000).toFixed(2)})\n` +
            `📊 Price: ${result.details.effectivePrice.toFixed(6)} ETH per ${result.details.tokenSymbol} (~$${result.details.priceInUSD.toFixed(2)})\n` +
            `⛽ Gas Cost: ${result.details.gasCost.toFixed(6)} ETH (~$${result.details.gasCostUSD.toFixed(2)})\n` +
            `💵 Total Cost: ${result.details.totalCostETH.toFixed(6)} ETH (~$${result.details.totalCostUSD.toFixed(2)})`,
          timestamp: Date.now()
        };
        setChatMessages(prev => [...prev, txMessage]);
      }
    }
    setPendingTrade(null);
  }, [pendingTrade, executeTrade, isTestnet]);

  const handleTokenChange = useCallback((token: string) => {
    setSelectedToken(token);
  }, []);

  const getAgentIcon = () => {
    const icons = {
      'fomor': '😱',
      'degen': '🚀',
      'diamond-hands': '💎',
      'whale-watcher': '🐋'
    };
    return icons[agentType] || '🤖';
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="text-4xl">{getAgentIcon()}</div>
        <div>
          <h2 className="text-2xl font-bold capitalize">
            {agentType.replace('-', ' ')} Agent
          </h2>
          <p className="text-sm text-gray-400">
            AI-powered trading on Fuel Network
          </p>
        </div>
      </div>

      {/* Market Stats with Token Selector */}
      <div className="mb-4">
        <MarketStats 
          marketData={marketData} 
          selectedToken={selectedToken}
          onTokenChange={handleTokenChange}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Left Column - Chat (2 columns) */}
        <div className="lg:col-span-2 min-h-0">
          <ChatInterface
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            onTradeClick={handleTradeClick}
            isLoading={isLoading}
            agentIcon={getAgentIcon()}
          />
        </div>

        {/* Right Column - Sidebar (1 column) */}
        <div className="lg:col-span-1 space-y-4 overflow-y-auto">
          {/* Price Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>📈</span> Price Chart - {selectedToken}
            </h3>
            <div className="h-48">
              <TradingChart marketData={marketData} />
            </div>
          </motion.div>

          {/* Wallet Balance */}
          <WalletBalance />

          {/* Whale Activity - Show only for whale-watcher agent */}
          {agentType === 'whale-watcher' && <WhaleActivity />}

          {/* Agent Metrics */}
          <AgentMetrics metrics={getMetrics()} />
        </div>
      </div>

      {/* Trade Confirmation Modal */}
      {pendingTrade && (
        <TradeConfirmModal
          trade={pendingTrade}
          onConfirm={handleTradeConfirm}
          isExecuting={isExecuting}
        />
      )}

      {/* Notifications */}
      <NotificationContainer
        notifications={notifications}
        onClose={removeNotification}
      />
    </div>
  );
};