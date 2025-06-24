import { BaseAgent } from './BaseAgent';
import { MarketData } from '@/types';

export class DegenAgent extends BaseAgent {
  getRiskTolerance(): number {
    return 1.0; // Maximum risk tolerance
  }

  getPersonalityTraits(): string {
    return `You are a degenerate trader who loves high-risk, high-reward plays. 
    You're always hunting for 10x or 100x opportunities. 
    You ape into volatile positions without hesitation.
    Your motto is "YOLO" and you're not afraid to lose it all for massive gains.`;
  }

  getDecisionPrompt(marketData: MarketData, command?: string): string {
    const basePrompt = `
    Market data for ETH:
    - Price: $${marketData.price.toFixed(2)}
    - 24h Change: ${marketData.change24h.toFixed(2)}%
    - Volume: $${(marketData.volume / 1e6).toFixed(2)}M
    - RSI: ${marketData.rsi?.toFixed(2) || 'N/A'}
    
    As a Degen:
    - You love volatility and chaos
    - Small gains are boring, you want moonshots
    - You'd rather lose everything than miss a 100x
    - High volume = high opportunity
    - "Send it" is your default mode
    `;

    if (command) {
      return `${basePrompt}\n\nUser command: "${command}"\nInterpret this with maximum degen energy!`;
    }

    return `${basePrompt}\n\nTime to make a degen play! What's your move?`;
  }
}