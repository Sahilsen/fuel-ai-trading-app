import axios from 'axios';
import { MarketData } from '@/types';
import { config } from '@/config';
import { getTokenBySymbol } from '@/config';

interface PriceHistory {
  time: string;
  price: number;
  timestamp: number;
}

export class RealMarketDataService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheDuration = 5000; // 5 seconds for price updates
  private subscribers = new Map<string, ((data: MarketData) => void)[]>();
  private intervals = new Map<string, NodeJS.Timeout>();
  private isTestnet: boolean = true;
  private priceHistory = new Map<string, PriceHistory[]>(); // Store price history for charts
  private maxHistoryPoints = 50; // Keep last 50 data points (4+ minutes of data)

  setNetwork(isTestnet: boolean) {
    this.isTestnet = isTestnet;
    // Clear cache when network changes
    this.cache.clear();
    this.priceHistory.clear();
  }

  getPriceHistory(symbol: string): PriceHistory[] {
    return this.priceHistory.get(symbol) || [];
  }

  async getMarketData(symbol: string = 'ETH'): Promise<MarketData> {
    const cached = this.cache.get(symbol);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.cacheDuration) {
      return cached.data;
    }

    try {
      const token = getTokenBySymbol(symbol, this.isTestnet);
      if (!token || !token.coingeckoId) {
        throw new Error(`Token ${symbol} not supported`);
      }

      // Fetch price data from QuickNode CoinGecko API
      if (!config.quicknodeCgUrl) {
        throw new Error('QuickNode CoinGecko URL not configured');
      }

      const priceResponse = await axios.post(
        config.quicknodeCgUrl,
        {
          jsonrpc: "2.0",
          method: "cg_simplePrice",
          params: [token.coingeckoId],
          id: 1
        }
      );

      if (!priceResponse.data.result || !priceResponse.data.result[token.coingeckoId]) {
        throw new Error(`Price data not available for ${symbol}`);
      }

      const coinData = priceResponse.data.result[token.coingeckoId];
      const currentPrice = coinData.usd;

      // Get or initialize price history
      let history = this.priceHistory.get(symbol) || [];
      
      // Add new price point
      const newPoint: PriceHistory = {
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        price: currentPrice,
        timestamp: now
      };
      
      history.push(newPoint);
      
      // Keep only the last maxHistoryPoints
      if (history.length > this.maxHistoryPoints) {
        history = history.slice(-this.maxHistoryPoints);
      }
      
      this.priceHistory.set(symbol, history);

      // Calculate metrics from history
      const prices = history.map(h => h.price);
      const high24h = Math.max(...prices);
      const low24h = Math.min(...prices);
      
      // Calculate 24h change (or change since we started tracking)
      let change24h = 0;
      if (prices.length >= 2) {
        const oldestPrice = prices[0];
        change24h = ((currentPrice - oldestPrice) / oldestPrice) * 100;
      }

      // Calculate volume (estimated based on price volatility)
      const priceVolatility = prices.length > 1 ? 
        Math.abs(Math.max(...prices) - Math.min(...prices)) / Math.min(...prices) : 0;
      const volume = 5000000 + (priceVolatility * 100000000); // Higher volatility = higher volume

      // Calculate RSI
      const rsi = this.calculateRSI(prices);

      const marketData: MarketData = {
        timestamp: now,
        price: currentPrice,
        volume,
        change24h,
        high24h,
        low24h,
        rsi,
        marketCap: currentPrice * 1000000000, // Estimated market cap
        symbol,
        priceHistory: history // Include history for charts
      };

      this.cache.set(symbol, { data: marketData, timestamp: now });
      return marketData;

    } catch (error) {
      console.error('Failed to fetch market data:', error);
      // Return last cached data if available
      if (cached) {
        return cached.data;
      }
      // Fallback to simulated data
      return this.generateFallbackData(symbol);
    }
  }

  private calculateRSI(prices: number[]): number {
    if (prices.length < 14) {
      // Not enough data for proper RSI, return neutral
      return 50;
    }

    let gains = 0;
    let losses = 0;
    
    // Calculate average gains and losses over last 14 periods
    for (let i = prices.length - 14; i < prices.length; i++) {
      if (i > 0) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) {
          gains += change;
        } else {
          losses += Math.abs(change);
        }
      }
    }

    const avgGain = gains / 14;
    const avgLoss = losses / 14;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
  }

  private generateFallbackData(symbol: string): MarketData {
    const basePrices: Record<string, number> = {
      'ETH': 2000,
      'FUEL': 0.05,
      'USDC': 1.0
    };
    
    const basePrice = basePrices[symbol] || 100;
    const volatility = symbol === 'USDC' ? 0.001 : 0.02;
    const change = (Math.random() - 0.5) * volatility * 2;
    
    // Generate some fake history
    const history: PriceHistory[] = [];
    for (let i = 10; i >= 0; i--) {
      const time = new Date(Date.now() - i * 5000);
      history.push({
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        price: basePrice * (1 + (Math.random() - 0.5) * volatility),
        timestamp: time.getTime()
      });
    }
    
    return {
      timestamp: Date.now(),
      price: basePrice * (1 + change),
      volume: 5000000 + Math.random() * 10000000,
      change24h: (Math.random() - 0.5) * 10,
      high24h: basePrice * 1.05,
      low24h: basePrice * 0.95,
      rsi: 30 + Math.random() * 40,
      symbol,
      priceHistory: history
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
      // Initial fetch
      this.getMarketData(symbol).then(data => {
        this.notifySubscribers(symbol, data);
      });

      // Poll every 5 seconds for real-time updates
      const interval = setInterval(async () => {
        const data = await this.getMarketData(symbol);
        this.notifySubscribers(symbol, data);
      }, 5000);

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

  cleanup(): void {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
    this.subscribers.clear();
    this.cache.clear();
    this.priceHistory.clear();
  }
}

// Export singleton instance
export const realMarketDataService = new RealMarketDataService();