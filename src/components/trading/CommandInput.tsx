import React, { useState, KeyboardEvent } from 'react';
import { Send, Bot } from 'lucide-react';
import { motion } from 'framer-motion';

interface CommandInputProps {
  onSubmit: (command: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export const CommandInput: React.FC<CommandInputProps> = ({ 
  onSubmit, 
  isLoading,
  placeholder = "Ask your AI agent to analyze or trade..."
}) => {
  const [command, setCommand] = useState('');

  const handleSubmit = () => {
    if (command.trim() && !isLoading) {
      onSubmit(command.trim());
      setCommand('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const suggestions = [
    "What's your analysis of the current market?",
    "Should I buy now?",
    "Analyze the trend and make a decision",
    "Is this a good entry point?",
    "What do the indicators suggest?"
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-center gap-2 mb-4">
        <Bot size={20} className="text-fuel-green" />
        <h3 className="text-lg font-semibold">Command Your Agent</h3>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={isLoading}
            className="w-full px-4 py-3 pr-12 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuel-green disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={isLoading || !command.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-fuel-green hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-gray-500">Suggestions:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => setCommand(suggestion)}
                className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};