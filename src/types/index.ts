export type AgentPersonality = 'fomor' | 'degen' | 'diamond-hands' | 'whale-watcher';

export interface Token {
  symbol: string;
  address: string;
  decimals: number;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  marketCap?: number;
}

export interface TradeDecision {
  action: 'buy' | 'sell' | 'hold';
  token: Token;
  amount: number;
  reason: string;
  confidence: number;
  suggestedPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface MarketData {
  timestamp: number;
  price: number;
  volume: number;
  change24h: number;
  high24h?: number;
  low24h?: number;
  rsi?: number;
  macd?: {
    value: number;
    signal: number;
    histogram: number;
  };
  marketCap?: number;
  symbol?: string;
  priceHistory?: {
    time: string;
    price: number;
    timestamp: number;
  }[];
}

export interface AgentMetrics {
  totalTrades: number;
  winRate: number;
  avgConfidence: number;
  profitLoss: number;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  tradeDecision?: TradeDecision;
}

// Fuel types
export interface FuelWallet {
  address: string;
  provider: any;
  wallet: any;
}

export interface TransactionResult {
  transactionId: string;
  status: 'success' | 'failure';
  gasUsed?: bigint;
}