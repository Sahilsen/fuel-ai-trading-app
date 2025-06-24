import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Zap, Diamond, Eye } from 'lucide-react';
import { AgentPersonality } from '@/types';

interface AgentOption {
  id: AgentPersonality;
  name: string;
  icon: React.ElementType;
  description: string;
  color: string;
  bgColor: string;
}

const agents: AgentOption[] = [
  {
    id: 'fomor',
    name: 'FOMOer',
    icon: TrendingUp,
    description: 'Emotional trader. Buys pumps, panic sells dips.',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10 hover:bg-red-500/20'
  },
  {
    id: 'degen',
    name: 'Degen',
    icon: Zap,
    description: 'Maximum risk, maximum reward. YOLO everything.',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10 hover:bg-purple-500/20'
  },
  {
    id: 'diamond-hands',
    name: 'Diamond Hands',
    icon: Diamond,
    description: 'Never sells. Only accumulates. Long-term vision.',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 hover:bg-blue-500/20'
  },
  {
    id: 'whale-watcher',
    name: 'Whale Watcher',
    icon: Eye,
    description: 'Follows smart money. Copies winning strategies.',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10 hover:bg-green-500/20'
  }
];

interface AgentSelectorProps {
  onSelectAgent: (agent: AgentPersonality) => void;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({ onSelectAgent }) => {
  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h2 className="text-4xl font-bold mb-4">Choose Your AI Trading Agent</h2>
        <p className="text-xl text-gray-400">
          Each agent has a unique personality and trading strategy
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {agents.map((agent, index) => (
          <motion.button
            key={agent.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectAgent(agent.id)}
            className={`p-6 rounded-xl border border-gray-700 ${agent.bgColor} transition-all text-left`}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-lg bg-gray-800 ${agent.color}`}>
                <agent.icon size={28} />
              </div>
              
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">{agent.name}</h3>
                <p className="text-gray-400">{agent.description}</p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};