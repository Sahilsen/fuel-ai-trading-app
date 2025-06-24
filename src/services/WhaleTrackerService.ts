import { Provider } from 'fuels';
import { config } from '@/config/constants';
import axios from 'axios';

export interface WhaleTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  token: string;
  timestamp: number;
  usdValue?: number;
}

export class WhaleTrackerService {
  private provider: Provider | null = null;
  private whaleThreshold = 10000; // $10k USD
  private subscribers: ((tx: WhaleTransaction) => void)[] = [];
  private intervalId: any = null;

  async initialize() {
    try {
      // Use QuickNode endpoint if available, otherwise fallback to default
      const rpcUrl = config.quicknodeFuelUrl || 'https://testnet.fuel.network/v1/graphql';
      this.provider = await Provider.create(rpcUrl);
      
      console.log('Whale tracker initialized with:', rpcUrl);
    } catch (error) {
      console.error('Failed to initialize whale tracker:', error);
    }
  }

  async getRecentWhaleTransactions(tokenAddress?: string): Promise<WhaleTransaction[]> {
    if (!this.provider) {
      console.warn('Whale tracker not initialized');
      return [];
    }

    try {
      // For Fuel testnet, we'll need to implement proper transaction querying
      // This is a placeholder that shows the structure
      const latestBlock = await this.provider.getBlock('latest');
      
      if (!latestBlock) {
        return [];
      }

      // In a real implementation, you would:
      // 1. Query transaction receipts
      // 2. Filter by value threshold
      // 3. Decode token transfers
      // 4. Convert to USD values

      // For now, return mock whale transactions for demo
      return this.generateMockWhaleTransactions();
    } catch (error) {
      console.error('Failed to fetch whale transactions:', error);
      return [];
    }
  }

  private generateMockWhaleTransactions(): WhaleTransaction[] {
    const now = Date.now();
    const whales = [
      { 
        address: '0x742d35Cc6634C0532925a3b844Bc9e7595f7b1e0', 
        label: 'Whale Alpha' 
      },
      { 
        address: '0x53d284357ec70cE289D6D64134DfAc8E511c8a3D', 
        label: 'Smart Money' 
      },
      { 
        address: '0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8', 
        label: 'Institution' 
      }
    ];

    return Array.from({ length: 5 }, (_, i) => {
      const whale = whales[Math.floor(Math.random() * whales.length)];
      const isBuy = Math.random() > 0.5;
      const value = (Math.random() * 50000 + 10000).toFixed(2);
      
      return {
        hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        from: isBuy ? whale.address : '0x' + Math.random().toString(16).substr(2, 40),
        to: isBuy ? '0x' + Math.random().toString(16).substr(2, 40) : whale.address,
        value: value,
        token: 'ETH',
        timestamp: now - (i * 60000),
        usdValue: parseFloat(value)
      };
    });
  }

  subscribeToWhaleTransactions(callback: (tx: WhaleTransaction) => void): () => void {
    this.subscribers.push(callback);

    // Simulate real-time whale transactions
    if (!this.intervalId) {
      this.intervalId = setInterval(() => {
        if (Math.random() > 0.7) { // 30% chance of whale tx
          const tx = this.generateMockWhaleTransactions()[0];
          this.subscribers.forEach(cb => cb(tx));
        }
      }, 10000); // Check every 10 seconds
    }

    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
      if (this.subscribers.length === 0 && this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    };
  }

  isWhaleTransaction(value: number): boolean {
    return value >= this.whaleThreshold;
  }
}

export const whaleTrackerService = new WhaleTrackerService();