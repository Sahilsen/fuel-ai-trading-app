import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, TrendingUp, TrendingDown } from 'lucide-react';
import { ChatMessage, TradeDecision } from '@/types';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onTradeClick: (trade: TradeDecision) => void;
  isLoading: boolean;
  agentIcon: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  onTradeClick,
  isLoading,
  agentIcon
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'buy':
        return <TrendingUp className="text-green-400" size={16} />;
      case 'sell':
        return <TrendingDown className="text-red-400" size={16} />;
      default:
        return null;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'buy':
        return 'text-green-400';
      case 'sell':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-800 rounded-xl">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-700">
        <div className="text-2xl">{agentIcon}</div>
        <div>
          <h3 className="font-semibold">AI Trading Agent</h3>
          <p className="text-xs text-gray-400">Ask me anything about crypto or trading</p>
        </div>
      </div>

      {/* Messages Container - This scrolls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p>Start a conversation by asking about market conditions or trading strategies!</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'
              }`}>
                {message.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              
              <div className={`flex-1 max-w-[75%] ${message.role === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block p-3 rounded-lg ${
                  message.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'
                }`}>
                  {/* Render content with HTML support for links */}
                  {message.content.includes('<a href=') ? (
                    <div 
                      className="text-sm whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: message.content }}
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                  
                  {/* Trade Suggestion Card */}
                  {message.tradeDecision && message.tradeDecision.action !== 'hold' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-3 p-3 bg-gray-900/50 rounded-lg border border-gray-600"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getActionIcon(message.tradeDecision.action)}
                          <span className={`font-semibold capitalize ${getActionColor(message.tradeDecision.action)}`}>
                            {message.tradeDecision.action} {message.tradeDecision.token.symbol}
                          </span>
                        </div>
                        <span className="text-sm text-gray-400">
                          {(message.tradeDecision.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-400 mb-3">
                        Amount: {message.tradeDecision.amount} {message.tradeDecision.token.symbol}
                      </p>
                      
                      <button
                        onClick={() => onTradeClick(message.tradeDecision!)}
                        className="w-full px-3 py-1.5 bg-fuel-green text-black text-sm font-medium rounded hover:bg-green-400 transition-colors"
                      >
                        Execute Trade
                      </button>
                    </motion.div>
                  )}
                </div>
                
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
              <Bot size={18} />
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <LoadingSpinner size="sm" />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form - Fixed at bottom */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about market conditions, request analysis, or just chat..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuel-green disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-fuel-green text-black rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Send size={18} />
          </button>
        </div>
        
        <div className="mt-2 flex flex-wrap gap-2">
          {['Analyze market', 'Should I buy?', 'What\'s your strategy?', 'Tell me about yourself'].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setInput(suggestion)}
              className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
};