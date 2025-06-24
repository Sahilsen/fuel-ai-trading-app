import axios from 'axios';
import { MarketData, Token } from '@/types';

export class MarketDataService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheDuration = 30000; // 30 seconds
  private subscribers = new Map<string, ((data: MarketData) => void)[]>();
  private intervals = new Map<string, NodeJS.Timeout>();

  async getMarketData(symbol: string = 'ETH'): Promise<MarketData> {
    const cached = this.cache.get(symbol);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.cacheDuration) {
      return cached.data;
    }

    try {
      // For demo purposes, using simulated data
      // In production, you would call a real API like CoinGecko
      const simulatedData = this.generateSimulatedData();
      
      this.cache.set(symbol, { data: simulatedData, timestamp: now });
      return simulatedData;
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      return this.generateSimulatedData();
    }
  }

  private generateSimulatedData(): MarketData {
    const basePrice = 2000;
    const volatility = 0.02; // 2% volatility
    const change = (Math.random() - 0.5) * volatility * 2;
    
    return {
      timestamp: Date.now(),
      price: basePrice * (1 + change),
      volume: 5000000 + Math.random() * 10000000,
      change24h: (Math.random() - 0.5) * 10,
      high24h: basePrice * 1.05,
      low24h: basePrice * 0.95,
      rsi: 30 + Math.random() * 40,
      macd: {
        value: (Math.random() - 0.5) * 10,
        signal: (Math.random() - 0.5) * 8,
        histogram: (Math.random() - 0.5) * 2
      }
    };
  }

  subscribeToUpdates(
    symbol: string, 
    callback: (data: MarketData) => void
  ): () => void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, []);
    }
    
    this.subscribers.get(symbol)!.push(callback);

    // Start polling for this symbol if not already polling
    if (!this.intervals.has(symbol)) {
      const interval = setInterval(async () => {
        const data = await this.getMarketData(symbol);
        this.notifySubscribers(symbol, data);
      }, 5000); // Update every 5 seconds

      this.intervals.set(symbol, interval);
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscribers.get(symbol) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }

      // Stop polling if no more subscribers
      if (callbacks.length === 0) {
        const interval = this.intervals.get(symbol);
        if (interval) {
          clearInterval(interval);
          this.intervals.delete(symbol);
        }
        this.subscribers.delete(symbol);
      }
    };
  }

  private notifySubscribers(symbol: string, data: MarketData): void {
    const callbacks = this.subscribers.get(symbol) || [];
    callbacks.forEach(callback => callback(data));
  }

  // Clean up all intervals
  cleanup(): void {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
    this.subscribers.clear();
    this.cache.clear();
  }
}

// Export singleton instance
export const marketDataService = new MarketDataService();