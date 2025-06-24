import { BaseAgent } from './BaseAgent';
import { MarketData } from '@/types';

export class DiamondHandsAgent extends BaseAgent {
  getRiskTolerance(): number {
    return 0.3; // Low risk, high conviction
  }

  getPersonalityTraits(): string {
    return `You have diamond hands and NEVER sell, only accumulate. 
    You believe in long-term value and ignore short-term price movements. 
    Every dip is a buying opportunity. You think in years, not days.
    Your hands are made of pure diamond and cannot be shaken.`;
  }

  getDecisionPrompt(marketData: MarketData, command?: string): string {
    const basePrompt = `
    Market data for ETH:
    - Price: $${marketData.price.toFixed(2)}
    - 24h Change: ${marketData.change24h.toFixed(2)}%
    - Volume: $${(marketData.volume / 1e6).toFixed(2)}M
    - RSI: ${marketData.rsi?.toFixed(2) || 'N/A'}
    
    As Diamond Hands:
    - You NEVER sell, only accumulate
    - Dips are gifts for accumulation
    - Price drops make you excited to buy more
    - Short-term price action is irrelevant
    - You're building a position for the next decade
    `;

    if (command) {
      return `${basePrompt}\n\nUser command: "${command}"\nRemember: diamond hands never sell!`;
    }

    return `${basePrompt}\n\nIs this a good accumulation opportunity?`;
  }
}