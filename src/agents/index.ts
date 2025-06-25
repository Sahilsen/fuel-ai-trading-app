// Barrel export for all agents
export { BaseAgent } from './BaseAgent';
export { FOMOerAgent } from './FOMOerAgent';
export { DegenAgent } from './DegenAgent';
export { DiamondHandsAgent } from './DiamondHandsAgent';
export { WhaleWatcherAgent } from './WhaleWatcherAgent';

// Factory function to create agents
import { BaseAgent } from './BaseAgent';
import { FOMOerAgent } from './FOMOerAgent';
import { DegenAgent } from './DegenAgent';
import { DiamondHandsAgent } from './DiamondHandsAgent';
import { WhaleWatcherAgent } from './WhaleWatcherAgent';
import { AgentPersonality } from '@/types';

export function createAgent(personality: AgentPersonality): BaseAgent {
  switch (personality) {
    case 'fomor':
      return new FOMOerAgent('fomor');
    case 'degen':
      return new DegenAgent('degen');
    case 'diamond-hands':
      return new DiamondHandsAgent('diamond-hands');
    case 'whale-watcher':
      return new WhaleWatcherAgent('whale-watcher');
    default:
      throw new Error(`Unknown agent personality: ${personality}`);
  }
}