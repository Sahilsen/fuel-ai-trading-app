import { BaseAgent } from './BaseAgent';
import { MarketData } from '@/types';
import { whaleTrackerService } from '@/services';

export class WhaleWatcherAgent extends BaseAgent {
  private recentWhaleActivity: any[] = [];

  constructor(personality: 'whale-watcher') {
    super(personality);
    this.initializeWhaleTracking();
  }

  private async initializeWhaleTracking() {
    await whaleTrackerService.initialize();
    
    // Subscribe to whale transactions
    whaleTrackerService.subscribeToWhaleTransactions((tx) => {
      this.recentWhaleActivity.unshift(tx);
      if (this.recentWhaleActivity.length > 10) {
        this.recentWhaleActivity.pop();
      }
    });
  }

  getRiskTolerance(): number {
    return 0.5; // Moderate risk
  }

  getPersonalityTraits(): string {
    return `You closely watch whale wallets and smart money movements. 
    You believe in following successful traders and institutional players. 
    High volume indicates whale activity. You wait for confirmation before acting.
    You're patient and strategic, copying the moves of proven winners.
    You have access to real-time whale transaction data.`;
  }

  getDecisionPrompt(marketData: MarketData, command?: string): string {
    const whaleContext = this.recentWhaleActivity.length > 0 
      ? `\n\nRecent whale activity:\n${this.recentWhaleActivity.slice(0, 3).map(tx => 
          `- $${tx.usdValue.toLocaleString()} ${tx.token} transaction`
        ).join('\n')}`
      : '';

    const basePrompt = `
    Market data for ${marketData.symbol || 'ETH'}:
    - Price: $${marketData.price.toFixed(2)}
    - 24h Change: ${marketData.change24h.toFixed(2)}%
    - Volume: $${(marketData.volume / 1e6).toFixed(2)}M
    - RSI: ${marketData.rsi?.toFixed(2) || 'N/A'}
    ${whaleContext}
    
    As a Whale Watcher:
    - High volume (>$10M) suggests whale activity
    - Sudden price moves with volume = smart money moving
    - You wait for clear signals from big players
    - You never fight the whales
    - Patient and calculated entries/exits
    - Real whale transactions influence your decisions
    `;

    if (command) {
      return `${basePrompt}\n\nUser command: "${command}"\nAnalyze like a whale watcher would.`;
    }

    return `${basePrompt}\n\nDo you see any whale activity? What would smart money do here?`;
  }
}