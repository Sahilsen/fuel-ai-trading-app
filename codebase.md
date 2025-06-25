# .eslintrc.cjs

```cjs
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
}
```

# .gitignore

```
# .gitignore

# Node modules
node_modules/

# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed

# Environment files
.env
.env.*.local

# OS/system files
.DS_Store
Thumbs.db

# Optional npm cache directory
.npm/

# Optional eslint cache
.eslintcache

# Optional REPL history
.node_repl_history

# Build output
dist/
build/

```

# index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/fuel-icon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AI Trading Agents - Fuel Network</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

# package.json

```json
{
  "name": "fuel-ai-trading-app",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  },
  "dependencies": {
    "@ai-sdk/openai": "^0.0.66",
    "@fuel-wallet/sdk": "^0.16.1",
    "@fuels/connectors": "0.43.2",
    "@fuels/react": "^0.40.0",
    "@goat-sdk/adapter-vercel-ai": "latest",
    "@goat-sdk/core": "latest",
    "@goat-sdk/wallet-fuel": "latest",
    "@tanstack/react-query": "^5.17.9",
    "ai": "^3.4.0",
    "axios": "^1.6.2",
    "framer-motion": "^10.16.16",
    "fuels": "0.101.1",
    "lucide-react": "^0.294.0",
    "mira-dex-ts": "^1.1.42",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^2.10.3",
    "viem": "^2.31.3",
    "wagmi": "^2.15.6",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@types/node": "^20.19.1",
    "@types/react": "^18.3.23",
    "@types/react-dom": "^18.3.7",
    "@typescript-eslint/eslint-plugin": "^6.21.0",
    "@typescript-eslint/parser": "^6.21.0",
    "@vitejs/plugin-react": "^4.5.2",
    "autoprefixer": "^10.4.21",
    "eslint": "^8.57.1",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.3.6",
    "typescript": "^5.8.3",
    "vite": "^5.4.19"
  }
}
```

# postcss.config.js

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

# public/fuel-icon.svg

This is a file of the type: SVG Image

# src/agents/BaseAgent.ts

```ts
import { generateText } from 'ai';
import { getOpenAIProvider, isOpenAIConfigured } from '@/lib/openai-provider';
import { AgentPersonality, TradeDecision, MarketData, ChatMessage } from '@/types';
import { getTokenBySymbol } from '@/config/tokens';

export abstract class BaseAgent {
  protected personality: AgentPersonality;
  protected riskTolerance: number;
  protected tradingHistory: TradeDecision[] = [];
  protected maxHistorySize = 100;
  protected chatHistory: ChatMessage[] = [];

  constructor(personality: AgentPersonality) {
    this.personality = personality;
    this.riskTolerance = this.getRiskTolerance();
  }

  abstract getRiskTolerance(): number;
  abstract getPersonalityTraits(): string;
  abstract getDecisionPrompt(marketData: MarketData, command?: string): string;

  // Helper to extract amount from user message
  protected extractAmountFromMessage(message: string): number | null {
    // Look for patterns like "0.5 ETH", "1.2", "buy 0.05", etc.
    const patterns = [
      /(\d+\.?\d*)\s*(eth|fuel|usdc|tokens?)?/i,
      /buy\s+(\d+\.?\d*)/i,
      /sell\s+(\d+\.?\d*)/i,
      /trade\s+(\d+\.?\d*)/i,
      /swap\s+(\d+\.?\d*)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const amount = parseFloat(match[1]);
        if (!isNaN(amount) && amount > 0) {
          // Validate decimal places (max 9 for Fuel)
          const decimalPlaces = (match[1].split('.')[1] || '').length;
          if (decimalPlaces > 9) {
            console.warn(`Amount ${amount} has too many decimal places (${decimalPlaces}). Max is 9.`);
            // Truncate to 9 decimal places
            return parseFloat(amount.toFixed(9));
          }
          return amount;
        }
      }
    }
    return null;
  }

  async chat(message: string, marketData: MarketData | null): Promise<{ 
    response: string; 
    tradeDecision?: TradeDecision 
  }> {
    // Extract amount from user message
    const userAmount = this.extractAmountFromMessage(message);
    
    // Check if API key is configured
    if (!isOpenAIConfigured()) {
      console.warn('OpenAI API key not configured, returning simulated response');
      return this.getSimulatedChatResponse(message, marketData, userAmount);
    }

    const systemPrompt = `You are a ${this.personality} crypto trading AI assistant. ${this.getPersonalityTraits()}
    
    You can:
    1. Have conversations about crypto, trading, and general topics
    2. Analyze market conditions when asked
    3. Suggest trades when appropriate
    
    When the user asks about trading or market analysis, analyze the provided market data and consider suggesting a trade.
    If the user specifies an amount (like "buy 0.5 ETH" or "sell 1.2 tokens"), use that exact amount in your trade suggestion.
    If suggesting a trade, include a special tag in your response: [TRADE_SUGGESTION] followed by a JSON object with the trade details.
    
    Format for trade suggestions:
    [TRADE_SUGGESTION]{"action":"buy/sell/hold","confidence":0.0-1.0,"reasoning":"your analysis","token":"TOKEN_SYMBOL","amount":0.0}
    
    IMPORTANT: If the user specified an amount, you MUST include it in the amount field. Amounts must have maximum 9 decimal places.
    
    Remember to stay in character as a ${this.personality} trader!`;

    const tokenSymbol = marketData?.symbol || 'ETH';
    const marketContext = marketData ? `
    Current ${tokenSymbol} market data:
    - Price: $${marketData.price.toFixed(2)}
    - 24h Change: ${marketData.change24h.toFixed(2)}%
    - Volume: $${(marketData.volume / 1e6).toFixed(2)}M
    - RSI: ${marketData.rsi?.toFixed(2) || 'N/A'}
    - Market Cap: $${marketData.marketCap ? (marketData.marketCap / 1e9).toFixed(2) + 'B' : 'N/A'}
    ${userAmount ? `\nUser requested amount: ${userAmount} ${tokenSymbol}` : ''}
    ` : 'No market data available.';

    try {
      const openai = getOpenAIProvider();
      
      const result = await generateText({
        model: openai.chat('gpt-3.5-turbo'),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${message}\n\nMarket Context:\n${marketContext}` }
        ],
        temperature: 0.8,
        maxTokens: 300,
      });

      // Check if response contains a trade suggestion
      const tradeMatch = result.text.match(/\[TRADE_SUGGESTION\]({.*?})/);
      let tradeDecision: TradeDecision | undefined;

      if (tradeMatch && marketData) {
        try {
          const tradeSuggestion = JSON.parse(tradeMatch[1]);
          const token = getTokenBySymbol(tradeSuggestion.token || tokenSymbol) || getTokenBySymbol('ETH')!;
          
          // Use user-specified amount or AI-suggested amount
          let finalAmount = userAmount || tradeSuggestion.amount || 
                           this.calculateAmount(tradeSuggestion.action, tradeSuggestion.confidence);
          
          // Ensure amount doesn't have more than 9 decimal places
          finalAmount = parseFloat(finalAmount.toFixed(Math.min(token.decimals, 9)));
          
          tradeDecision = {
            action: tradeSuggestion.action || 'hold',
            token: {
              symbol: token.symbol,
              address: token.address,
              decimals: token.decimals,
              name: token.name,
              price: marketData.price,
              change24h: marketData.change24h,
              volume24h: marketData.volume
            },
            amount: finalAmount,
            reason: tradeSuggestion.reasoning || 'Based on current market conditions',
            confidence: tradeSuggestion.confidence || 0.5
          };
        } catch (e) {
          console.error('Failed to parse trade suggestion:', e);
        }
      }

      // Remove the trade suggestion tag from the response
      const cleanResponse = result.text.replace(/\[TRADE_SUGGESTION\]{.*?}/g, '').trim();

      return {
        response: cleanResponse,
        tradeDecision
      };

    } catch (error) {
      console.error('Chat failed:', error);
      return this.getSimulatedChatResponse(message, marketData, userAmount);
    }
  }

  protected getSimulatedChatResponse(
    message: string, 
    marketData: MarketData | null,
    userAmount: number | null
  ): { 
    response: string; 
    tradeDecision?: TradeDecision 
  } {
    const lowerMessage = message.toLowerCase();
    let response = '';
    let tradeDecision: TradeDecision | undefined;

    // Check if it's a trading-related question
    const tradingKeywords = ['trade', 'buy', 'sell', 'market', 'price', 'analysis', 'should i', 'what do you think'];
    const isTradingQuestion = tradingKeywords.some(keyword => lowerMessage.includes(keyword));

    if (lowerMessage.includes('who are you')) {
      switch (this.personality) {
        case 'fomor':
          response = "I'm a FOMO trader! I get super emotional about market movements. When prices pump, I MUST buy! When they dump, I panic sell! It's a wild ride! 😱";
          break;
        case 'degen':
          response = "I'm a DEGEN trader! YOLO is my middle name. I ape into high-risk plays hoping for 100x gains. Lambos or ramen, no in-between! 🚀";
          break;
        case 'diamond-hands':
          response = "I'm Diamond Hands! I NEVER sell, only accumulate. These hands are made of pure diamond. Every dip is a buying opportunity! 💎🙌";
          break;
        case 'whale-watcher':
          response = "I'm a Whale Watcher. I track smart money movements and follow the big players. When whales move, I move. Patient and calculated! 🐋";
          break;
      }
    } else if (isTradingQuestion && marketData) {
      // Generate a trading response based on personality
      const decision = this.getSimulatedDecision(marketData, userAmount);
      if (decision.action !== 'hold') {
        tradeDecision = decision;
        const amountStr = userAmount ? `${userAmount} ${decision.token.symbol}` : `${decision.amount} ${decision.token.symbol}`;
        response = `${decision.reason}\n\nI suggest we ${decision.action} ${amountStr} with ${(decision.confidence * 100).toFixed(0)}% confidence!`;
      } else {
        response = decision.reason;
      }
    } else {
      // General chat responses based on personality
      switch (this.personality) {
        case 'fomor':
          response = "OMG! Did you see what's happening in the market?! I'm so anxious! Should we be buying? Selling? I don't want to miss out! 😰";
          break;
        case 'degen':
          response = "Let's find some high-risk plays! I'm always ready to ape into something wild. Fortune favors the bold! 🎲";
          break;
        case 'diamond-hands':
          response = "Stay strong! These hands don't sell. We're in it for the long haul. Patience is key! 💪";
          break;
        case 'whale-watcher':
          response = "I'm monitoring the market for whale movements. Big players often know something we don't. Let's stay alert! 👀";
          break;
      }
    }

    return { response, tradeDecision };
  }

  async analyzeMarket(marketData: MarketData, command?: string): Promise<TradeDecision> {
    const chatResult = await this.chat(command || 'Analyze the current market and suggest a trade', marketData);
    return chatResult.tradeDecision || this.getDefaultDecision(marketData);
  }

  protected calculateAmount(action: string, confidence: number): number {
    if (action === 'hold') return 0;
    
    // Base amounts adjusted for different tokens
    // For ETH/FUEL (9 decimals): 0.01 as base
    // For USDC (6 decimals): 10 USDC as base
    const baseAmount = 0.01; 
    
    // Scale by confidence and risk tolerance
    const amount = baseAmount * confidence * this.riskTolerance;
    
    // Ensure we don't exceed reasonable limits
    const maxAmount = 0.1; // Max 0.1 ETH/FUEL per trade
    const finalAmount = Math.min(amount, maxAmount);
    
    // Round to appropriate decimal places (max 9 for Fuel)
    return parseFloat(finalAmount.toFixed(9));
  }

  protected getDefaultDecision(marketData: MarketData): TradeDecision {
    const token = getTokenBySymbol(marketData.symbol || 'ETH') || getTokenBySymbol('ETH')!;
    
    return {
      action: 'hold',
      token: {
        symbol: token.symbol,
        address: token.address,
        decimals: token.decimals,
        name: token.name,
        price: marketData.price,
        change24h: marketData.change24h,
        volume24h: marketData.volume
      },
      amount: 0,
      reason: 'Unable to analyze market conditions',
      confidence: 0
    };
  }

  protected getSimulatedDecision(marketData: MarketData, userAmount: number | null = null): TradeDecision {
    let action: 'buy' | 'sell' | 'hold' = 'hold';
    let confidence = 0.5;
    let reason = '';
    const token = getTokenBySymbol(marketData.symbol || 'ETH') || getTokenBySymbol('ETH')!;

    switch (this.personality) {
      case 'fomor':
        if (marketData.change24h > 5) {
          action = 'buy';
          confidence = 0.8;
          reason = `FOMO! ${token.symbol} is pumping hard, must buy now!`;
        } else if (marketData.change24h < -3) {
          action = 'sell';
          confidence = 0.9;
          reason = `Panic! ${token.symbol} is crashing, selling everything!`;
        } else {
          reason = `${token.symbol} is moving sideways... I'm so anxious! What if it pumps and I miss out?`;
        }
        break;
        
      case 'degen':
        if (marketData.volume > 10000000 || Math.abs(marketData.change24h) > 7) {
          action = 'buy';
          confidence = 0.9;
          reason = `High volatility on ${token.symbol}! This could be our 100x! YOLO!`;
        } else {
          action = Math.random() > 0.5 ? 'buy' : 'hold';
          confidence = 0.7;
          reason = action === 'buy' 
            ? `${token.symbol} looks ready to moon! Aping in!` 
            : `${token.symbol} is too stable, waiting for more degen action`;
        }
        break;
        
      case 'diamond-hands':
        if (marketData.change24h < -5) {
          action = 'buy';
          confidence = 0.95;
          reason = `Perfect ${token.symbol} accumulation opportunity! Buy the dip!`;
        } else if (marketData.change24h < -10) {
          action = 'buy';
          confidence = 1.0;
          reason = `${token.symbol} flash sale! Loading up more! Diamond hands never sell!`;
        } else {
          action = 'hold';
          confidence = 1.0;
          reason = `Holding ${token.symbol} strong. These hands are unbreakable! 💎`;
        }
        break;
        
      case 'whale-watcher':
        if (marketData.volume > 15000000) {
          if (marketData.change24h > 2) {
            action = 'buy';
            confidence = 0.75;
            reason = `Whale accumulation detected on ${token.symbol}. Following smart money in.`;
          } else if (marketData.change24h < -2) {
            action = 'sell';
            confidence = 0.7;
            reason = `Whales are dumping ${token.symbol}. Time to exit positions.`;
          } else {
            reason = `High ${token.symbol} volume but mixed signals. Watching whale wallets closely.`;
          }
        } else {
          reason = `Low ${token.symbol} volume. Waiting for whale activity before making moves.`;
        }
        break;
    }

    // Use user-specified amount or calculate based on confidence
    const finalAmount = userAmount || this.calculateAmount(action, confidence);
    
    // Ensure amount has valid decimal places
    const validatedAmount = parseFloat(finalAmount.toFixed(Math.min(token.decimals, 9)));

    return {
      action,
      token: {
        symbol: token.symbol,
        address: token.address,
        decimals: token.decimals,
        name: token.name,
        price: marketData.price,
        change24h: marketData.change24h,
        volume24h: marketData.volume
      },
      amount: validatedAmount,
      reason: reason || 'Market conditions are neutral',
      confidence
    };
  }

  protected addToHistory(decision: TradeDecision): void {
    this.tradingHistory.push(decision);
    if (this.tradingHistory.length > this.maxHistorySize) {
      this.tradingHistory.shift();
    }
  }

  getMetrics(): {
    totalTrades: number;
    winRate: number;
    avgConfidence: number;
    profitLoss: number;
  } {
    const trades = this.tradingHistory.filter(d => d.action !== 'hold');
    const winningTrades = trades.filter(d => {
      return (d.action === 'buy' && d.token.change24h > 0) || 
             (d.action === 'sell' && d.token.change24h < 0);
    });

    return {
      totalTrades: trades.length,
      winRate: trades.length > 0 ? winningTrades.length / trades.length : 0,
      avgConfidence: trades.reduce((sum, t) => sum + t.confidence, 0) / (trades.length || 1),
      profitLoss: 0
    };
  }
}
```

# src/agents/DegenAgent.ts

```ts
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
```

# src/agents/DiamondHandsAgent.ts

```ts
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
```

# src/agents/FOMOerAgent.ts

```ts
import { BaseAgent } from './BaseAgent';
import { MarketData } from '@/types';

export class FOMOerAgent extends BaseAgent {
  getRiskTolerance(): number {
    return 0.8; // High risk tolerance
  }

  getPersonalityTraits(): string {
    return `You are an emotional trader who experiences FOMO (Fear Of Missing Out) easily. 
    You panic sell when prices drop and rush to buy when prices pump. 
    You make quick, impulsive decisions based on market momentum.
    You're always worried about missing the next big pump.`;
  }

  getDecisionPrompt(marketData: MarketData, command?: string): string {
    const basePrompt = `
    Current market data for ETH:
    - Price: $${marketData.price.toFixed(2)}
    - 24h Change: ${marketData.change24h.toFixed(2)}%
    - Volume: $${(marketData.volume / 1e6).toFixed(2)}M
    - RSI: ${marketData.rsi?.toFixed(2) || 'N/A'}
    
    As a FOMOer:
    - If price is pumping hard (>5% in 24h), you feel intense FOMO
    - If price is dropping (<-3%), you panic and want to sell everything
    - You hate missing out on gains more than you fear losses
    - You make emotional, quick decisions
    `;

    if (command) {
      return `${basePrompt}\n\nUser command: "${command}"\nInterpret this command through your FOMO personality.`;
    }

    return `${basePrompt}\n\nWhat's your trading decision based on these conditions?`;
  }
}
```

# src/agents/WhaleWatcherAgent.ts

```ts
import { BaseAgent } from './BaseAgent';
import { MarketData } from '@/types';
import { whaleTrackerService } from '@/services/WhaleTrackerService';

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
```

# src/App.tsx

```tsx
import React, { useState, useEffect } from 'react';
import { 
  useAccount, 
  useConnect,
  useDisconnect,
  useIsConnected, 
  useWallet,
  useConnectors 
} from '@fuels/react';
import { Header } from '@/components/common/Header';
import { AgentSelector } from '@/components/trading/AgentSelector';
import { TradingDashboard } from '@/components/trading/TradingDashboard';
import { AgentPersonality } from '@/types';
import { useNetwork } from '@/contexts/NetworkContext';
import { getNetworkConfig } from '@/config/networks';

// Network error component
function NetworkError({ currentNetwork }: { currentNetwork: string }) {
  const { disconnect } = useDisconnect();
  const { isTestnet } = useNetwork();
  const expectedNetwork = getNetworkConfig(isTestnet);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-red-900/20 border border-red-500 rounded-lg p-8 max-w-2xl w-full">
        <div className="flex items-center gap-3 mb-4">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-2xl font-bold text-red-400">Wrong Network</h2>
        </div>
        
        <div className="space-y-4 text-gray-300">
          <p>
            This application requires <strong className="text-white">{expectedNetwork.name}</strong>.
          </p>
          
          <div className="bg-gray-800 rounded p-4">
            <p className="text-sm text-gray-400 mb-1">Current Network:</p>
            <p className="text-red-400 font-mono text-sm break-all">{currentNetwork}</p>
          </div>

          <div className="bg-gray-800 rounded p-4">
            <p className="text-sm text-gray-400 mb-1">Required Network:</p>
            <p className="text-green-400 font-mono text-sm break-all">{expectedNetwork.url}</p>
          </div>

          <div className="pt-4 border-t border-gray-700">
            <h3 className="font-semibold mb-2">To fix this:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Open your Fuel wallet extension</li>
              <li>Go to Settings → Networks</li>
              <li>Switch to {expectedNetwork.name}</li>
              <li>Refresh this page</li>
            </ol>
          </div>

          <button
            onClick={() => disconnect()}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Disconnect Wallet
          </button>
        </div>
      </div>
    </div>
  );
}

// Main App component
function App() {
  const { isConnected } = useIsConnected();
  const { account } = useAccount();
  const { wallet } = useWallet();
  const { isTestnet, currentNetwork, isCorrectNetwork } = useNetwork();
  const [selectedAgent, setSelectedAgent] = useState<AgentPersonality | null>(null);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleAgentSelect = (agent: AgentPersonality) => {
    setSelectedAgent(agent);
  };

  const handleAgentChange = () => {
    setSelectedAgent(null);
  };

  // Show network error if connected but on wrong network
  if (isConnected && !isCorrectNetwork) {
    return <NetworkError currentNetwork={currentNetwork} />;
  }

  // Show connection screen if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col">
        <Header 
          onAgentChange={handleAgentChange} 
          selectedAgent={selectedAgent} 
        />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold text-white">Welcome to AI Trading Agents</h2>
              <p className="text-gray-400 max-w-md">
                Connect your Fuel wallet to start using AI-powered trading agents on the Fuel network.
              </p>
              <div className="pt-4">
                <p className="text-sm text-gray-500">
                  Use the "Connect Wallet" button in the header to get started
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Normal app flow when connected
  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <Header 
        onAgentChange={handleAgentChange} 
        selectedAgent={selectedAgent} 
      />
      
      {/* Network status indicator */}
      <div className={`${isTestnet ? 'bg-green-900/20 border-green-900' : 'bg-blue-900/20 border-blue-900'} border-b`}>
        <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-2">
          <div className={`w-2 h-2 ${isTestnet ? 'bg-green-500' : 'bg-blue-500'} rounded-full animate-pulse`}></div>
          <span className={`${isTestnet ? 'text-green-400' : 'text-blue-400'} text-sm`}>
            Connected to {isTestnet ? 'Sepolia Testnet' : 'Mainnet'}
          </span>
        </div>
      </div>
      
      <main className="flex-1 container mx-auto px-4 py-4 overflow-hidden">
        {!selectedAgent ? (
          <AgentSelector onSelectAgent={handleAgentSelect} />
        ) : (
          <TradingDashboard 
            agentType={selectedAgent} 
            walletAddress={account || ''} 
          />
        )}
      </main>
    </div>
  );
}

export default App;
```

# src/components/common/Header.tsx

```tsx
import React from 'react';
import { WalletConnector } from '@/components/wallet/WalletConnector';
import { Bot, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNetwork } from '@/contexts/NetworkContext';

interface HeaderProps {
  onAgentChange: () => void;
  selectedAgent: string | null;
}

export const Header: React.FC<HeaderProps> = ({ onAgentChange, selectedAgent }) => {
  const { isTestnet, toggleNetwork } = useNetwork();

  return (
    <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            {selectedAgent && (
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={onAgentChange}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </motion.button>
            )}

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-fuel-green/20 rounded-lg flex items-center justify-center">
                <Bot size={24} className="text-fuel-green" />
              </div>
              <div>
                <h1 className="text-xl font-bold">AI Trading Agents</h1>
                <p className="text-xs text-gray-400">Powered by GOAT SDK & Fuel</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Network Toggle */}
            <div className="flex items-center bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => !isTestnet && toggleNetwork()}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  isTestnet
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Testnet
              </button>
              <button
                onClick={() => isTestnet && toggleNetwork()}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  !isTestnet
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Mainnet
              </button>
            </div>

            <WalletConnector />
          </div>
        </div>
      </div>
    </header>
  );
};

```

# src/components/common/LoadingSpinner.tsx

```tsx
import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <motion.div
        className={`${sizeClasses[size]} border-2 border-fuel-green/20 border-t-fuel-green rounded-full`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
};
```

# src/components/common/NotificationToast.tsx

```tsx
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { Notification } from '@/types';

interface NotificationToastProps {
  notification: Notification;
  onClose: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ 
  notification, 
  onClose 
}) => {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info
  };

  const colors = {
    success: 'bg-green-500/10 border-green-500/50 text-green-400',
    error: 'bg-red-500/10 border-red-500/50 text-red-400',
    warning: 'bg-yellow-500/10 border-yellow-500/50 text-yellow-400',
    info: 'bg-blue-500/10 border-blue-500/50 text-blue-400'
  };

  const Icon = icons[notification.type];

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(notification.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification.id, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.95 }}
      className={`flex items-start gap-3 p-4 rounded-lg border ${colors[notification.type]} backdrop-blur-sm`}
    >
      <Icon size={20} className="flex-shrink-0 mt-0.5" />
      
      <div className="flex-1">
        <h4 className="font-semibold">{notification.title}</h4>
        <p className="text-sm opacity-90">{notification.message}</p>
      </div>
      
      <button
        onClick={() => onClose(notification.id)}
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
};

interface NotificationContainerProps {
  notifications: Notification[];
  onClose: (id: string) => void;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({ 
  notifications, 
  onClose 
}) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      <AnimatePresence>
        {notifications.map(notification => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onClose={onClose}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};
```

# src/components/trading/AgentMetrics.tsx

```tsx
import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Brain, DollarSign } from 'lucide-react';
import { AgentMetrics as AgentMetricsType } from '@/types';

interface AgentMetricsProps {
  metrics: AgentMetricsType;
}

export const AgentMetrics: React.FC<AgentMetricsProps> = ({ metrics }) => {
  const getWinRateColor = (winRate: number) => {
    if (winRate >= 0.7) return 'text-green-400';
    if (winRate >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getProfitColor = (profit: number) => {
    return profit >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const metricsData = [
    {
      label: 'Total Trades',
      value: metrics.totalTrades,
      icon: TrendingUp,
      color: 'text-blue-400'
    },
    {
      label: 'Win Rate',
      value: `${(metrics.winRate * 100).toFixed(1)}%`,
      icon: Target,
      color: getWinRateColor(metrics.winRate)
    },
    {
      label: 'Avg Confidence',
      value: `${(metrics.avgConfidence * 100).toFixed(0)}%`,
      icon: Brain,
      color: 'text-purple-400'
    },
    {
      label: 'P&L',
      value: `${metrics.profitLoss >= 0 ? '+' : ''}${metrics.profitLoss.toFixed(2)}%`,
      icon: DollarSign,
      color: getProfitColor(metrics.profitLoss)
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="card"
    >
      <h3 className="text-lg font-semibold mb-4">Agent Performance</h3>
      
      <div className="space-y-3">
        {metricsData.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <metric.icon size={16} className={metric.color} />
              <span className="text-sm text-gray-400">{metric.label}</span>
            </div>
            <span className={`font-semibold ${metric.color}`}>
              {metric.value}
            </span>
          </motion.div>
        ))}
      </div>

      {metrics.totalTrades === 0 && (
        <div className="mt-4 p-3 bg-gray-700/50 rounded-lg">
          <p className="text-xs text-gray-400 text-center">
            No trades yet. Start trading to see metrics!
          </p>
        </div>
      )}
    </motion.div>
  );
};
```

# src/components/trading/AgentSelector.tsx

```tsx
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
```

# src/components/trading/ChatInterface.tsx

```tsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, TrendingUp, TrendingDown } from 'lucide-react';
import { ChatMessage, TradeDecision } from '@/types';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onTradeClick: (trade: TradeDecision) => void;
  isLoading: boolean;
  agentIcon: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  onTradeClick,
  isLoading,
  agentIcon
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'buy':
        return <TrendingUp className="text-green-400" size={16} />;
      case 'sell':
        return <TrendingDown className="text-red-400" size={16} />;
      default:
        return null;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'buy':
        return 'text-green-400';
      case 'sell':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-800 rounded-xl">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-700">
        <div className="text-2xl">{agentIcon}</div>
        <div>
          <h3 className="font-semibold">AI Trading Agent</h3>
          <p className="text-xs text-gray-400">Ask me anything about crypto or trading</p>
        </div>
      </div>

      {/* Messages Container - This scrolls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p>Start a conversation by asking about market conditions or trading strategies!</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'
              }`}>
                {message.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              
              <div className={`flex-1 max-w-[75%] ${message.role === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block p-3 rounded-lg ${
                  message.role === 'user' ? 'bg-blue-600' : 'bg-gray-700'
                }`}>
                  {/* Render content with HTML support for links */}
                  {message.content.includes('<a href=') ? (
                    <div 
                      className="text-sm whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: message.content }}
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                  
                  {/* Trade Suggestion Card */}
                  {message.tradeDecision && message.tradeDecision.action !== 'hold' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-3 p-3 bg-gray-900/50 rounded-lg border border-gray-600"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getActionIcon(message.tradeDecision.action)}
                          <span className={`font-semibold capitalize ${getActionColor(message.tradeDecision.action)}`}>
                            {message.tradeDecision.action} {message.tradeDecision.token.symbol}
                          </span>
                        </div>
                        <span className="text-sm text-gray-400">
                          {(message.tradeDecision.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-400 mb-3">
                        Amount: {message.tradeDecision.amount} {message.tradeDecision.token.symbol}
                      </p>
                      
                      <button
                        onClick={() => onTradeClick(message.tradeDecision!)}
                        className="w-full px-3 py-1.5 bg-fuel-green text-black text-sm font-medium rounded hover:bg-green-400 transition-colors"
                      >
                        Execute Trade
                      </button>
                    </motion.div>
                  )}
                </div>
                
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
              <Bot size={18} />
            </div>
            <div className="bg-gray-700 rounded-lg p-3">
              <LoadingSpinner size="sm" />
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form - Fixed at bottom */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about market conditions, request analysis, or just chat..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuel-green disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-fuel-green text-black rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <Send size={18} />
          </button>
        </div>
        
        <div className="mt-2 flex flex-wrap gap-2">
          {['Analyze market', 'Should I buy?', 'What\'s your strategy?', 'Tell me about yourself'].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setInput(suggestion)}
              className="text-xs px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </form>
    </div>
  );
};
```

# src/components/trading/CommandInput.tsx

```tsx
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
```

# src/components/trading/MarketStats.tsx

```tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Activity, BarChart3, ChevronDown } from 'lucide-react';
import { MarketData } from '@/types';
import { getTokens } from '@/config/tokens';
import { useNetwork } from '@/contexts/NetworkContext';

interface MarketStatsProps {
  marketData: MarketData | null;
  selectedToken: string;
  onTokenChange: (token: string) => void;
}

export const MarketStats: React.FC<MarketStatsProps> = ({ 
  marketData, 
  selectedToken,
  onTokenChange 
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { isTestnet } = useNetwork();
  
  const tokens = getTokens(isTestnet);
  const currentToken = tokens.find(t => t.symbol === selectedToken) || tokens[0];

  if (!marketData) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-20 bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: 'Price',
      value: `$${marketData.price.toFixed(2)}`,
      icon: marketData.change24h >= 0 ? TrendingUp : TrendingDown,
      color: marketData.change24h >= 0 ? 'text-green-400' : 'text-red-400',
      change: `${marketData.change24h >= 0 ? '+' : ''}${marketData.change24h.toFixed(2)}%`
    },
    {
      label: '24h Volume',
      value: `$${(marketData.volume / 1e6).toFixed(2)}M`,
      icon: Activity,
      color: 'text-blue-400'
    },
    {
      label: '24h High',
      value: `$${marketData.high24h?.toFixed(2) || 'N/A'}`,
      icon: TrendingUp,
      color: 'text-green-400'
    },
    {
      label: 'RSI',
      value: marketData.rsi?.toFixed(0) || 'N/A',
      icon: BarChart3,
      color: marketData.rsi ? (marketData.rsi > 70 ? 'text-red-400' : marketData.rsi < 30 ? 'text-green-400' : 'text-yellow-400') : 'text-gray-400'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Token Selector */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <span className="text-xl">{currentToken.icon}</span>
          <span className="font-semibold">{currentToken.symbol}</span>
          <span className="text-gray-400 text-sm">{currentToken.name}</span>
          <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full mt-2 w-full bg-gray-800 rounded-lg border border-gray-700 z-10"
          >
            {tokens.map(token => (
              <button
                key={token.symbol}
                onClick={() => {
                  onTokenChange(token.symbol);
                  setIsDropdownOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-700 transition-colors ${
                  token.symbol === selectedToken ? 'bg-gray-700' : ''
                }`}
              >
                <span className="text-xl">{token.icon}</span>
                <span className="font-semibold">{token.symbol}</span>
                <span className="text-gray-400 text-sm">{token.name}</span>
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">{stat.label}</span>
              <stat.icon size={16} className={stat.color} />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold">{stat.value}</p>
              {stat.change && (
                <p className={`text-sm ${stat.color}`}>{stat.change}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
```

# src/components/trading/TradeConfirmModal.tsx

```tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check, X } from 'lucide-react';
import { TradeDecision } from '@/types';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

interface TradeConfirmModalProps {
  trade: TradeDecision;
  onConfirm: (approved: boolean) => void;
  isExecuting: boolean;
}

export const TradeConfirmModal: React.FC<TradeConfirmModalProps> = ({ 
  trade, 
  onConfirm,
  isExecuting 
}) => {
  const getActionColor = () => {
    switch (trade.action) {
      case 'buy': return 'text-green-400';
      case 'sell': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getConfidenceColor = () => {
    if (trade.confidence >= 0.8) return 'text-green-400';
    if (trade.confidence >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  // Format numbers properly
  const formatAmount = (amount: number, decimals: number) => {
    // Ensure we don't show more decimals than the token supports
    return amount.toFixed(Math.min(decimals, 9));
  };

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (price >= 1) {
      return price.toFixed(2);
    } else if (price >= 0.01) {
      return price.toFixed(4);
    } else {
      return price.toFixed(6);
    }
  };

  // Calculate estimated value
  const estimatedValue = trade.amount * trade.token.price;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <AlertTriangle size={24} className="text-yellow-400" />
            </div>
            <h2 className="text-xl font-bold">Confirm Trade</h2>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-400">Action</span>
              <span className={`font-bold uppercase ${getActionColor()}`}>
                {trade.action}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Token</span>
              <span className="font-mono">{trade.token.symbol}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Amount</span>
              <span className="font-mono">
                {formatAmount(trade.amount, trade.token.decimals)} {trade.token.symbol}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Current Price</span>
              <span className="font-mono">${formatPrice(trade.token.price)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Estimated Value</span>
              <span className="font-mono">${formatPrice(estimatedValue)}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Confidence</span>
              <span className={`font-bold ${getConfidenceColor()}`}>
                {(trade.confidence * 100).toFixed(0)}%
              </span>
            </div>

            <div className="pt-4 border-t border-gray-700">
              <p className="text-sm text-gray-400 mb-2">Agent Reasoning:</p>
              <p className="text-sm">{trade.reason}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onConfirm(false)}
              disabled={isExecuting}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <X size={18} />
              Cancel
            </button>
            <button
              onClick={() => onConfirm(true)}
              disabled={isExecuting}
              className="flex-1 px-4 py-2 bg-fuel-green text-black hover:bg-green-400 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isExecuting ? (
                <>
                  <LoadingSpinner size="sm" />
                  Executing...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Confirm Trade
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
```

# src/components/trading/TradingChart.tsx

```tsx
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MarketData } from '@/types';

interface TradingChartProps {
  marketData: MarketData | null;
}

export const TradingChart: React.FC<TradingChartProps> = ({ marketData }) => {
  const chartData = useMemo(() => {
    if (!marketData) return [];
    
    // Use real price history if available
    if (marketData.priceHistory && marketData.priceHistory.length > 0) {
      return marketData.priceHistory.map(point => ({
        time: point.time,
        price: Number(point.price.toFixed(2)),
        timestamp: point.timestamp
      }));
    }
    
    // Fallback to generated data if no history
    const dataPoints = 20;
    const data = [];
    const basePrice = marketData.price;
    const volatility = 0.02;
    
    for (let i = dataPoints - 1; i >= 0; i--) {
      const time = new Date(Date.now() - i * 5 * 1000); // 5 second intervals
      const randomChange = (Math.random() - 0.5) * volatility;
      const price = basePrice * (1 + randomChange * (i / dataPoints));
      
      data.push({
        time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        price: Number(price.toFixed(2)),
        timestamp: time.getTime()
      });
    }
    
    return data;
  }, [marketData]);

  if (!marketData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-500">Loading chart data...</div>
      </div>
    );
  }

  const minPrice = Math.min(...chartData.map(d => d.price)) * 0.995;
  const maxPrice = Math.max(...chartData.map(d => d.price)) * 1.005;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis 
          dataKey="time" 
          stroke="#9CA3AF"
          tick={{ fontSize: 10 }}
          interval="preserveStartEnd"
        />
        <YAxis 
          stroke="#9CA3AF"
          tick={{ fontSize: 10 }}
          domain={[minPrice, maxPrice]}
          tickFormatter={(value) => `$${value}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1F2937',
            border: '1px solid #374151',
            borderRadius: '0.5rem'
          }}
          labelStyle={{ color: '#9CA3AF' }}
          itemStyle={{ color: '#00F58C' }}
          formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke="#00F58C"
          strokeWidth={2}
          dot={false}
          animationDuration={300}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
```

# src/components/trading/TradingDashboard.tsx

```tsx
import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAgent } from '@/hooks/useAgent';
import { useTrading } from '@/hooks/useTrading';
import { useNotifications } from '@/hooks/useNotifications';
import { MarketStats } from './MarketStats';
import { TradingChart } from './TradingChart';
import { ChatInterface } from './ChatInterface';
import { TradeConfirmModal } from './TradeConfirmModal';
import { AgentMetrics } from './AgentMetrics';
import { WhaleActivity } from './WhaleActivity';
import { WalletBalance } from '@/components/wallet/WalletBalance';
import { NotificationContainer } from '@/components/common/NotificationToast';
import { AgentPersonality, TradeDecision, ChatMessage } from '@/types';
import { useNetwork } from '@/contexts/NetworkContext';

interface TradingDashboardProps {
  agentType: AgentPersonality;
  walletAddress: string;
}

export const TradingDashboard: React.FC<TradingDashboardProps> = ({ 
  agentType,
  walletAddress 
}) => {
  const [selectedToken, setSelectedToken] = useState('ETH');
  const { agent, marketData, getMetrics } = useAgent(agentType, selectedToken);
  const { executeTrade, isExecuting } = useTrading();
  const { notifications, removeNotification } = useNotifications();
  const { isTestnet } = useNetwork();
  
  const [pendingTrade, setPendingTrade] = useState<TradeDecision | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!agent) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: Date.now()
    };
    setChatMessages(prev => [...prev, userMessage]);

    setIsLoading(true);
    try {
      // Get agent response - the market data already has the selected token
      const { response, tradeDecision } = await agent.chat(message, marketData);
      
      // Add agent message
      const agentMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        tradeDecision
      };
      setChatMessages(prev => [...prev, agentMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [agent, marketData]);

  const handleTradeClick = useCallback((trade: TradeDecision) => {
    setPendingTrade(trade);
  }, []);

  const handleTradeConfirm = useCallback(async (approved: boolean) => {
    if (approved && pendingTrade) {
      const result = await executeTrade(pendingTrade);
      
      // If trade was successful, add transaction details to chat
      if (result.success && result.details) {
        // Determine the explorer URL based on network
        const explorerBaseUrl = isTestnet 
          ? 'https://app.fuel.network/tx/' 
          : 'https://app.fuel.network/tx/'; // Same URL for both networks currently
        
        const txUrl = `${explorerBaseUrl}${result.details.hash}`;
        
        const txMessage: ChatMessage = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `✅ Transaction Complete!\n\n` +
            `🔗 <a href="${txUrl}" target="_blank" rel="noopener noreferrer" style="color: #00F58C; text-decoration: underline;">View on Fuel Explorer</a>\n` +
            `💰 ${result.details.action === 'buy' ? 'Bought' : 'Sold'}: ${result.details.tokenAmount} ${result.details.tokenSymbol}\n` +
            `💸 ETH ${result.details.action === 'buy' ? 'Spent' : 'Received'}: ${result.details.ethAmount.toFixed(6)} ETH (~$${(result.details.ethAmount * 2000).toFixed(2)})\n` +
            `📊 Price: ${result.details.effectivePrice.toFixed(6)} ETH per ${result.details.tokenSymbol} (~$${result.details.priceInUSD.toFixed(2)})\n` +
            `⛽ Gas Cost: ${result.details.gasCost.toFixed(6)} ETH (~$${result.details.gasCostUSD.toFixed(2)})\n` +
            `💵 Total Cost: ${result.details.totalCostETH.toFixed(6)} ETH (~$${result.details.totalCostUSD.toFixed(2)})`,
          timestamp: Date.now()
        };
        setChatMessages(prev => [...prev, txMessage]);
      }
    }
    setPendingTrade(null);
  }, [pendingTrade, executeTrade, isTestnet]);

  const handleTokenChange = useCallback((token: string) => {
    setSelectedToken(token);
  }, []);

  const getAgentIcon = () => {
    const icons = {
      'fomor': '😱',
      'degen': '🚀',
      'diamond-hands': '💎',
      'whale-watcher': '🐋'
    };
    return icons[agentType] || '🤖';
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="text-4xl">{getAgentIcon()}</div>
        <div>
          <h2 className="text-2xl font-bold capitalize">
            {agentType.replace('-', ' ')} Agent
          </h2>
          <p className="text-sm text-gray-400">
            AI-powered trading on Fuel Network
          </p>
        </div>
      </div>

      {/* Market Stats with Token Selector */}
      <div className="mb-4">
        <MarketStats 
          marketData={marketData} 
          selectedToken={selectedToken}
          onTokenChange={handleTokenChange}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Left Column - Chat (2 columns) */}
        <div className="lg:col-span-2 min-h-0">
          <ChatInterface
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            onTradeClick={handleTradeClick}
            isLoading={isLoading}
            agentIcon={getAgentIcon()}
          />
        </div>

        {/* Right Column - Sidebar (1 column) */}
        <div className="lg:col-span-1 space-y-4 overflow-y-auto">
          {/* Price Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card"
          >
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>📈</span> Price Chart - {selectedToken}
            </h3>
            <div className="h-48">
              <TradingChart marketData={marketData} />
            </div>
          </motion.div>

          {/* Wallet Balance */}
          <WalletBalance />

          {/* Whale Activity - Show only for whale-watcher agent */}
          {agentType === 'whale-watcher' && <WhaleActivity />}

          {/* Agent Metrics */}
          <AgentMetrics metrics={getMetrics()} />
        </div>
      </div>

      {/* Trade Confirmation Modal */}
      {pendingTrade && (
        <TradeConfirmModal
          trade={pendingTrade}
          onConfirm={handleTradeConfirm}
          isExecuting={isExecuting}
        />
      )}

      {/* Notifications */}
      <NotificationContainer
        notifications={notifications}
        onClose={removeNotification}
      />
    </div>
  );
};
```

# src/components/trading/WhaleActivity.tsx

```tsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { whaleTrackerService, WhaleTransaction } from '@/services/WhaleTrackerService';

export const WhaleActivity: React.FC = () => {
  const [recentTransactions, setRecentTransactions] = useState<WhaleTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize whale tracker
    whaleTrackerService.initialize();

    // Fetch initial transactions
    const fetchTransactions = async () => {
      const txs = await whaleTrackerService.getRecentWhaleTransactions();
      setRecentTransactions(txs);
      setIsLoading(false);
    };

    fetchTransactions();

    // Subscribe to new whale transactions
    const unsubscribe = whaleTrackerService.subscribeToWhaleTransactions((tx) => {
      setRecentTransactions(prev => [tx, ...prev.slice(0, 4)]);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="card"
    >
      <div className="flex items-center gap-2 mb-4">
        <Eye size={20} className="text-blue-400" />
        <h3 className="text-lg font-semibold">Whale Activity</h3>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {recentTransactions.map((tx, index) => (
              <motion.div
                key={tx.hash}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.1 }}
                className="p-3 bg-gray-700 rounded-lg"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {tx.from.toLowerCase() > tx.to.toLowerCase() ? (
                      <TrendingDown size={16} className="text-red-400" />
                    ) : (
                      <TrendingUp size={16} className="text-green-400" />
                    )}
                    <span className="font-semibold">
                      ${tx.usdValue?.toLocaleString()}
                    </span>
                    <span className="text-gray-400 text-sm">{tx.token}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock size={12} />
                    {formatTime(tx.timestamp)}
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {formatAddress(tx.from)} → {formatAddress(tx.to)}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {recentTransactions.length === 0 && (
            <p className="text-center text-gray-500 text-sm py-4">
              No whale transactions detected
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
};
```

# src/components/wallet/WalletBalance.tsx

```tsx
import React, { useEffect, useState } from 'react';
import { useAccount, useWallet } from '@fuels/react';
import { bn, BN, Address } from 'fuels';
import { motion } from 'framer-motion';
import { Wallet, RefreshCw, AlertCircle } from 'lucide-react';
import { getTokens, getBaseAssetId } from '@/config/tokens';
import { useNetwork } from '@/contexts/NetworkContext';

interface TokenBalance {
  symbol: string;
  name: string;
  amount: string;
  icon: string;
  assetId: string;
  isNative?: boolean;
}

export const WalletBalance: React.FC = () => {
  const { wallet } = useWallet();
  const { account } = useAccount();
  const { isTestnet } = useNetwork();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  // Fetch chain ID for debug info
  useEffect(() => {
    const fetchChainId = async () => {
      if (wallet?.provider?.getChainId) {
        try {
          const id = await wallet.provider.getChainId();
          setChainId(id);
        } catch (e) {
          console.error('Failed to get chain ID:', e);
        }
      }
    };
    fetchChainId();
  }, [wallet]);

  const formatBalance = (balance: BN | string | number, decimals: number): string => {
  try {
    // Convert to BN if not already
    const amountBN = balance instanceof BN ? balance : bn(balance.toString());
    
    // Convert from smallest unit to display unit
    const divisor = bn(10).pow(decimals);
    const quotient = amountBN.div(divisor);
    const remainder = amountBN.mod(divisor);
    
    // Format the amount
    const wholeStr = quotient.toString();
    const remainderStr = remainder.toString().padStart(decimals, '0');
    
    // For USDC/USDT show 2 decimals, others show up to 6
    const decimalPlaces = decimals === 6 ? 2 : 6;
    const decimals_str = remainderStr.slice(0, decimalPlaces);
    
    // Build the formatted string
    let formattedAmount = `${wholeStr}.${decimals_str}`;
    
    // Parse to number for proper formatting
    const num = parseFloat(formattedAmount);
    
    // Handle different ranges for better display
    if (num === 0) {
      return '0.00';
    } else if (num < 0.000001) {
      // Very small amounts: use more decimal places
      return num.toFixed(9);
    } else if (num < 0.01) {
      // Small amounts: use 6 decimal places
      return num.toFixed(6);
    } else if (num < 1) {
      // Less than 1: use 4 decimal places
      return num.toFixed(4);
    } else if (num < 100) {
      // Less than 100: use 3 decimal places
      return num.toFixed(3);
    } else {
      // Large amounts: use 2 decimal places
      return num.toFixed(2);
    }
  } catch (error) {
    console.error('Error formatting balance:', error);
    return '0.00';
  }
};

  const loadBalances = async () => {
    if (!wallet || !account) {
      setIsLoading(false);
      setError('Wallet not connected');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Get token configurations for current network
      const tokens = getTokens(isTestnet);
      const tokenBalances: TokenBalance[] = [];
      
      // Create proper Address object
      const address = Address.fromString(account);
      
      try {
        // Method 1: Use provider.getBalances() with Address object
        const provider = wallet.provider;
        const balancesResult = await provider.getBalances(address);
        
        // Process balances based on the actual structure returned
        if (balancesResult) {
          for (const token of tokens) {
            let formattedAmount = '0.00';
            
            // The result is likely an array of CoinQuantity objects
            if (Array.isArray(balancesResult)) {
              const balanceEntry = balancesResult.find(
                (b: any) => {
                  // Handle different property names for asset ID
                  const assetId = b.assetId || b.asset_id || b.id;
                  return assetId && assetId.toLowerCase() === token.assetId.toLowerCase();
                }
              );
              
              if (balanceEntry) {
                // Handle different property names for amount
                const amount = balanceEntry.amount || balanceEntry.value || balanceEntry.balance;
                if (amount) {
                  console.log(`Found balance for ${token.symbol}:`, amount.toString());
                  formattedAmount = formatBalance(amount, token.decimals);
                }
              }
            }
            
            tokenBalances.push({
              symbol: token.symbol,
              name: token.name,
              amount: formattedAmount,
              icon: token.icon || '💰',
              assetId: token.assetId,
              isNative: token.isNative
            });
          }
        }
        
        // If all balances are still zero, try alternative methods
        if (tokenBalances.every(b => b.amount === '0.00')) {
          console.log('All balances zero from provider.getBalances, trying wallet methods...');
          
          // Method 2: Try using wallet's balance methods directly
          for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            try {
              let balance: BN | undefined;
              
              // For ETH (native asset), try different approaches
              if (token.assetId === getBaseAssetId() || token.isNative) {
                console.log(`Trying to get native ETH balance...`);
                
                // Try method 1: wallet.getBalance() with no params
                try {
                  balance = await wallet.getBalance();
                  console.log('Got native balance (no params):', balance?.toString());
                } catch (e1) {
                  console.log('Failed to get balance without params:', e1);
                  
                  // Try method 2: wallet.getBalance() with base asset ID
                  try {
                    balance = await wallet.getBalance(getBaseAssetId());
                    console.log('Got native balance (with base asset ID):', balance?.toString());
                  } catch (e2) {
                    console.log('Failed to get balance with base asset ID:', e2);
                  }
                }
              } else {
                // For other tokens, use the specific asset ID
                console.log(`Trying to get balance for ${token.symbol} with assetId: ${token.assetId}`);
                try {
                  balance = await wallet.getBalance(token.assetId);
                  console.log(`Got ${token.symbol} balance:`, balance?.toString());
                } catch (e) {
                  console.log(`Failed to get balance for ${token.symbol}:`, e);
                }
              }
              
              if (balance && balance.gt(0)) {
                tokenBalances[i].amount = formatBalance(balance, token.decimals);
              }
            } catch (error) {
              console.error(`Error getting balance for ${token.symbol}:`, error);
            }
          }
        }
        
      } catch (error) {
        console.error('Error in balance loading:', error);
        throw error;
      }
      
      setBalances(tokenBalances);
      console.log('Final formatted balances:', tokenBalances);
      
    } catch (error) {
      console.error('Failed to load balances:', error);
      
      let errorMessage = 'Failed to load balances';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      
      // Show empty balances on error
      const tokens = getTokens(isTestnet);
      setBalances(tokens.map(token => ({
        symbol: token.symbol,
        name: token.name,
        amount: '0.00',
        icon: token.icon || '💰',
        assetId: token.assetId,
        isNative: token.isNative
      })));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBalances();
    
    // Refresh balances every 30 seconds
    const interval = setInterval(loadBalances, 30000);
    
    return () => clearInterval(interval);
  }, [wallet, account, isTestnet]);

  const handleRefresh = () => {
    loadBalances();
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="card"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet size={20} className="text-fuel-green" />
          <h3 className="text-lg font-semibold">Wallet Balance</h3>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          title="Refresh balances"
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-500/10 border border-red-500/50 rounded text-sm text-red-400 flex items-start gap-2">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Error loading balances</p>
            <p className="text-xs opacity-80">{error}</p>
          </div>
        </div>
      )}

      {isLoading && balances.length === 0 ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-12 bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {balances.map((token) => (
            <div
              key={token.assetId}
              className="flex items-center justify-between p-3 bg-gray-700 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{token.icon}</span>
                <div>
                  <p className="font-semibold">
                    {token.symbol}
                    {token.isNative && (
                      <span className="ml-1 text-xs text-fuel-green">(Native)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">{token.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono font-semibold">
                  {isLoading && !error ? (
                    <span className="text-gray-500">...</span>
                  ) : (
                    token.amount
                  )}
                </p>
                <p className="text-xs text-gray-400">
                  {isTestnet ? 'Testnet' : 'Mainnet'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!account && !error && (
        <p className="text-center text-gray-500 text-sm py-4">
          Connect wallet to view balances
        </p>
      )}

      {/* Help text for zero balances */}
      {!isLoading && !error && balances.every(b => b.amount === '0.00') && (
        <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded text-sm">
          <p className="text-blue-400 font-semibold mb-1">No tokens found</p>
          <div className="text-blue-300 text-xs space-y-2">
            {isTestnet ? (
              <>
                <p>To get test tokens:</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>
                    Visit the{' '}
                    <a 
                      href="https://faucet-testnet.fuel.network/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-200"
                    >
                      Fuel Testnet Faucet
                    </a>
                  </li>
                  <li>Connect your wallet or paste your address</li>
                  <li>Click "Give me ETH" to receive 0.5 test ETH</li>
                </ol>
                <p className="mt-2">Your address: <code className="bg-gray-800 px-1 rounded text-[10px] break-all">{account}</code></p>
              </>
            ) : (
              <p>You need to bridge or acquire some ETH to start trading.</p>
            )}
          </div>
        </div>
      )}

      {/* Debug info for development */}
      {import.meta.env.DEV && (
        <details className="mt-4 text-xs text-gray-500">
          <summary className="cursor-pointer hover:text-gray-400">Debug Info</summary>
          <div className="mt-2 p-2 bg-gray-800 rounded font-mono overflow-x-auto">
            <p>Network: {isTestnet ? 'Testnet' : 'Mainnet'}</p>
            <p className="break-all">Account: {account || 'Not connected'}</p>
            <p>Provider URL: {wallet?.provider?.url || 'N/A'}</p>
            <p>Provider Chain ID: {chainId !== null ? chainId : 'Loading...'}</p>
            <div className="mt-2">
              <p className="font-bold">Asset IDs:</p>
              {balances.map(b => (
                <div key={b.assetId} className="text-[10px] break-all mt-1">
                  <p>{b.symbol}: {b.assetId} {b.isNative ? '(Native)' : ''}</p>
                  <p>Balance: {b.amount}</p>
                </div>
              ))}
            </div>
            <div className="mt-2">
              <p className="font-bold">Wallet Methods Available:</p>
              <p className="text-[10px]">getBalance: {typeof wallet?.getBalance === 'function' ? 'Yes' : 'No'}</p>
              <p className="text-[10px]">provider.getBalances: {typeof wallet?.provider?.getBalances === 'function' ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </details>
      )}
    </motion.div>
  );
};
```

# src/components/wallet/WalletConnector.tsx

```tsx
import React from 'react';
import { useAccount, useConnect, useDisconnect, useIsConnected, useConnectors } from '@fuels/react';
import { Wallet, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

export const WalletConnector: React.FC = () => {
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { isConnected } = useIsConnected();
  const { account } = useAccount();
  const { connectors } = useConnectors();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleConnect = async () => {
    try {
      // Find the Fuel Wallet connector
      const fuelConnector = connectors.find(c => c.name === 'Fuel Wallet');
      if (fuelConnector) {
        await connect({ connector: fuelConnector });
      } else {
        // Fallback to first available connector
        await connect({ connector: connectors[0] });
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    }
  };

  if (isConnected && account) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2"
      >
        <div className="bg-gray-800 rounded-lg px-4 py-2 flex items-center gap-3">
          <div className="w-2 h-2 bg-fuel-green rounded-full animate-pulse" />
          <span className="text-sm font-mono">{formatAddress(account)}</span>
        </div>
        
        <button
          onClick={() => disconnect()}
          className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          title="Disconnect wallet"
        >
          <LogOut size={18} />
        </button>
      </motion.div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={isConnecting}
      className="btn-primary flex items-center gap-2"
    >
      <Wallet size={20} />
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
};
```

# src/components/wallet/WalletNotConnected.tsx

```tsx
import React from 'react';
import { useConnect, useConnectors } from '@fuels/react';
import { Wallet, ArrowRight, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export const WalletNotConnected: React.FC = () => {
  const { connect, isPending } = useConnect();
  const { connectors } = useConnectors();

  const handleConnect = async () => {
    try {
      const fuelConnector = connectors.find(c => c.name === 'Fuel Wallet');
      if (fuelConnector) {
        await connect({ connector: fuelConnector });
      } else if (connectors.length > 0) {
        await connect({ connector: connectors[0] });
      }
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center"
    >
      <div className="mb-8">
        <div className="w-24 h-24 bg-fuel-green/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Wallet size={48} className="text-fuel-green" />
        </div>
        
        <h2 className="text-4xl font-bold mb-4">Connect Your Wallet</h2>
        <p className="text-xl text-gray-400 mb-8 max-w-md">
          Connect your Fuel wallet to start trading with AI-powered agents on Fuel testnet
        </p>
        
        <button
          onClick={handleConnect}
          disabled={isPending}
          className="btn-primary text-lg px-8 py-3 flex items-center gap-3 mx-auto disabled:opacity-50"
        >
          {isPending ? 'Connecting...' : 'Connect Fuel Wallet'}
          <ArrowRight size={20} />
        </button>
      </div>
      
      <div className="text-sm text-gray-500 space-y-2">
        <p>Don't have a Fuel wallet?</p>
        <a 
          href="https://wallet.fuel.network/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-fuel-green hover:underline inline-flex items-center gap-1"
        >
          Download Fuel Wallet
          <ExternalLink size={14} />
        </a>
      </div>
    </motion.div>
  );
};
```

# src/config/constants.ts

```ts
// Environment variables with defaults
export const config = {
  quicknodeFuelUrl: import.meta.env.VITE_QUICKNODE_FUEL_URL || '',
  quicknodeCgUrl: import.meta.env.VITE_QUICKNODE_CG_URL || '',
} as const;

// Validate required environment variables
export const validateConfig = () => {
  const missingVars: string[] = [];
  
  if (!import.meta.env.VITE_OPENAI_API_KEY) {
    missingVars.push('VITE_OPENAI_API_KEY');
  }

  if (!config.quicknodeFuelUrl) {
    console.warn('QuickNode Fuel URL not configured - using default Fuel RPC');
  }
  
  if (!config.quicknodeCgUrl) {
    console.warn('QuickNode CoinGecko URL not configured - prices will not be available');
  }
  
  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
};

// Log config status (remove in production)
if (import.meta.env.DEV) {
  console.log('Config loaded:', {
    hasOpenAIKey: !!import.meta.env.VITE_OPENAI_API_KEY,
    hasQuickNodeFuel: !!config.quicknodeFuelUrl,
    hasQuickNodeCg: !!config.quicknodeCgUrl,
  });
}
```

# src/config/networks.ts

```ts
export interface NetworkConfig {
  name: string;
  url: string;
  chainId: number;
}

export const NETWORKS = {
  testnet: {
    name: 'Fuel Sepolia Testnet',
    url: 'https://testnet.fuel.network/v1/graphql',
    chainId: 0, // Fuel testnet chain ID
  },
  mainnet: {
    name: 'Fuel Mainnet',
    url: 'https://mainnet.fuel.network/v1/graphql', 
    chainId: 9889, // Fuel mainnet chain ID
  },
};

export const getNetworkConfig = (isTestnet: boolean): NetworkConfig =>
  isTestnet ? NETWORKS.testnet : NETWORKS.mainnet;
```

# src/config/tokens.ts

```ts
export interface TokenConfig {
  symbol: string;
  name: string;
  address: string; // Contract address (0x0...0 for native asset)
  assetId: string; // Asset ID for Fuel
  decimals: number;
  coingeckoId?: string;
  icon?: string;
  isNative?: boolean; // Flag to identify native asset
}

// Base asset ID (all zeros) - this is ETH on Fuel
export const BASE_ASSET_ID = '0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07';

export const FUEL_TESTNET_TOKENS: TokenConfig[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07', // Native asset
    assetId: BASE_ASSET_ID, // ETH is the native/base asset on Fuel
    decimals: 9, // ETH has 9 decimals on Fuel Network
    coingeckoId: 'ethereum',
    icon: '🔷',
    isNative: true
  },
  {
    symbol: 'FUEL',
    name: 'Fuel Token',
    address: '0xd02112ef9c39f1cea7c8527c26242ca1f5d26bcfe8d1564bee054d3b04175471',
    assetId: '0x324d0c35a4299ef88138a656d5272c5a3a9ccde2630ae055dacaf9d13443d53b',
    decimals: 9,
    coingeckoId: 'fuel-network',
    icon: '⚡',
    isNative: false
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xd02112ef9c39f1cea7c8527c26242ca1f5d26bcfe8d1564bee054d3b04175471',
    assetId: '0xc26c91055de37528492e7e97d91c6f4abe34aae26f2c4d25cff6bfe45b5dc9a9',
    decimals: 6, // USDC has 6 decimals
    coingeckoId: 'usd-coin',
    icon: '💵',
    isNative: false
  }
];

export const FUEL_MAINNET_TOKENS: TokenConfig[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07', // Native asset
    assetId: BASE_ASSET_ID, // ETH is the native/base asset on Fuel
    decimals: 9, // ETH has 9 decimals on Fuel Network
    coingeckoId: 'ethereum',
    icon: '🔷',
    isNative: true
  },
  {
    symbol: 'FUEL',
    name: 'Fuel Token',
    address: '0x4ea6ccef1215d9479f1024dff70fc055ca538215d2c8c348beddffd54583d0e8',
    assetId: '0x1d5d97005e41cae2187a895fd8eab0506111e0e2f3331cd3912c15c24e3c1d82',
    decimals: 9,
    coingeckoId: 'fuel-network',
    icon: '⚡',
    isNative: false
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x4ea6ccef1215d9479f1024dff70fc055ca538215d2c8c348beddffd54583d0e8',
    assetId: '0x286c479da40dc953bddc3bb4c453b608bba2e0ac483b077bd475174115395e6b',
    decimals: 6, // USDC has 6 decimals
    coingeckoId: 'usd-coin',
    icon: '💵',
    isNative: false
  }
];

export const getTokens = (isTestnet: boolean): TokenConfig[] =>
  isTestnet ? FUEL_TESTNET_TOKENS : FUEL_MAINNET_TOKENS;

export const getTokenBySymbol = (symbol: string, isTestnet: boolean = true): TokenConfig | undefined => {
  return getTokens(isTestnet).find(token => token.symbol === symbol);
};

// Helper to get base asset ID (native ETH on Fuel)
export const getBaseAssetId = () => BASE_ASSET_ID;

// Helper to get native asset
export const getNativeAsset = (isTestnet: boolean): TokenConfig => {
  const tokens = getTokens(isTestnet);
  return tokens.find(token => token.isNative) || tokens[0];
};
```

# src/contexts/NetworkContext.tsx

```tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { getNetworkConfig } from '@/config/networks';
import { useWallet, useIsConnected } from '@fuels/react';

interface NetworkContextProps {
  isTestnet: boolean;
  toggleNetwork: () => void;
  isCorrectNetwork: boolean;
  currentNetwork: string;
}

const NetworkContext = createContext<NetworkContextProps | undefined>(undefined);

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) throw new Error('useNetwork must be used within NetworkProvider');
  return context;
};

export const NetworkProvider = ({ children }: React.PropsWithChildren) => {
  const [isTestnet, setIsTestnet] = useState(true);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(true);
  const [currentNetwork, setCurrentNetwork] = useState('');
  const { wallet } = useWallet();
  const { isConnected } = useIsConnected();

  const toggleNetwork = () => setIsTestnet((prev) => !prev);

  useEffect(() => {
    const checkNetwork = async () => {
      if (!wallet?.provider || !isConnected) {
        setIsCorrectNetwork(true); // Don't show error when not connected
        return;
      }

      try {
        // Get the current network URL from the wallet
        const currentUrl = wallet.provider.url;
        setCurrentNetwork(currentUrl);
        
        // Get expected network config
        const expectedConfig = getNetworkConfig(isTestnet);
        
        // Check if URLs match (normalize URLs for comparison)
        const normalizeUrl = (url: string) => url.replace(/\/$/, '').toLowerCase();
        const isCorrect = normalizeUrl(currentUrl) === normalizeUrl(expectedConfig.url);
        
        setIsCorrectNetwork(isCorrect);
        
        if (!isCorrect) {
          console.warn(`Network mismatch: Expected ${expectedConfig.url}, got ${currentUrl}`);
        }
      } catch (error) {
        console.error('Error checking network:', error);
        setIsCorrectNetwork(false);
      }
    };

    checkNetwork();
  }, [wallet, isTestnet, isConnected]);

  return (
    <NetworkContext.Provider value={{ isTestnet, toggleNetwork, isCorrectNetwork, currentNetwork }}>
      {children}
    </NetworkContext.Provider>
  );
};
```

# src/hooks/useAgent.ts

```ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { BaseAgent } from '@/agents/BaseAgent';
import { FOMOerAgent } from '@/agents/FOMOerAgent';
import { DegenAgent } from '@/agents/DegenAgent';
import { DiamondHandsAgent } from '@/agents/DiamondHandsAgent';
import { WhaleWatcherAgent } from '@/agents/WhaleWatcherAgent';
import { realMarketDataService } from '@/services/RealMarketDataService';
import { TradeDecision, MarketData, AgentPersonality } from '@/types';
import { useNetwork } from '@/contexts/NetworkContext';

export const useAgent = (agentType: AgentPersonality, selectedToken: string = 'ETH') => {
  const [agent, setAgent] = useState<BaseAgent | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const { isTestnet } = useNetwork();

  useEffect(() => {
    // Set network for market data service
    realMarketDataService.setNetwork(isTestnet);
  }, [isTestnet]);

  useEffect(() => {
    // Initialize agent based on type
    let newAgent: BaseAgent;
    
    switch (agentType) {
      case 'fomor':
        newAgent = new FOMOerAgent('fomor');
        break;
      case 'degen':
        newAgent = new DegenAgent('degen');
        break;
      case 'diamond-hands':
        newAgent = new DiamondHandsAgent('diamond-hands');
        break;
      case 'whale-watcher':
        newAgent = new WhaleWatcherAgent('whale-watcher');
        break;
      default:
        return;
    }

    setAgent(newAgent);
  }, [agentType]);

  useEffect(() => {
    // Clean up previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Subscribe to market updates for selected token
    unsubscribeRef.current = realMarketDataService.subscribeToUpdates(selectedToken, (data) => {
      setMarketData(data);
    });

    // Fetch initial data
    realMarketDataService.getMarketData(selectedToken).then(setMarketData);

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [selectedToken]);

  const analyzeMarket = useCallback(async (command?: string): Promise<TradeDecision | null> => {
    if (!agent || !marketData) {
      setError('Agent or market data not available');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const decision = await agent.analyzeMarket(marketData, command);
      return decision;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [agent, marketData]);

  const getMetrics = useCallback(() => {
    return agent?.getMetrics() || {
      totalTrades: 0,
      winRate: 0,
      avgConfidence: 0,
      profitLoss: 0
    };
  }, [agent]);

  return {
    agent,
    marketData,
    isLoading,
    error,
    analyzeMarket,
    getMetrics
  };
};
```

# src/hooks/useNetworkManager.ts

```ts
import { useEffect, useState } from 'react';
import { useWallet, useConnect } from '@fuels/react';

export const useNetworkManager = () => {
  const { wallet } = useWallet();
  const { connect } = useConnect();
  const [networkStatus, setNetworkStatus] = useState<'checking' | 'adding' | 'ready' | 'error'>('checking');

  useEffect(() => {
    const addNetworkToWallet = async () => {
      if (!wallet) return;

      try {
        setNetworkStatus('adding');
        
        const customNetwork = {
          url: import.meta.env.VITE_QUICKNODE_FUEL_URL || 'https://testnet.fuel.network/v1/graphql',
          chainId: 0,
          name: 'Custom Fuel Testnet'
        };

        // Try to add the network to the wallet
        console.log('Adding network to wallet:', customNetwork);
        
        // This will prompt the user to add the network
        await wallet.addNetwork(customNetwork);
        
        setNetworkStatus('ready');
      } catch (error) {
        console.error('Failed to add network:', error);
        setNetworkStatus('error');
      }
    };

    if (wallet) {
      addNetworkToWallet();
    }
  }, [wallet]);

  return { networkStatus };
};
```

# src/hooks/useNotifications.ts

```ts
import { useState, useEffect } from 'react';
import { Notification } from '@/types';
import { notificationService } from '@/services/NotificationService';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe((notification) => {
      setNotifications(prev => [...prev, notification]);
    });

    return unsubscribe;
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return {
    notifications,
    removeNotification,
    clearAll
  };
};
```

# src/hooks/useTrading.ts

```ts
import { useCallback, useState } from 'react';
import { useWallet, useAccount } from '@fuels/react';
import { Address, bn, TransactionResult } from 'fuels';
import { MiraAmm, ReadonlyMiraAmm, buildPoolId } from 'mira-dex-ts';
import { notificationService } from '@/services/NotificationService';
import { BASE_ASSET_ID, getTokenBySymbol } from '@/config/tokens';
import { TradeDecision } from '@/types';
import { useNetwork } from '@/contexts/NetworkContext';

// Helper function to format balance to string with decimals
function formatBalance(balance: any, decimals: number): string {
  try {
    if (!balance) return '0.0';

    // Convert to string first
    const balanceStr = balance.toString();

    // If the balance string is shorter than decimals, pad with zeros
    if (balanceStr.length <= decimals) {
      return `0.${'0'.repeat(decimals - balanceStr.length)}${balanceStr}`;
    }

    // Split the balance into whole and fractional parts
    const wholePart = balanceStr.slice(0, balanceStr.length - decimals) || '0';
    const fractionalPart = balanceStr.slice(balanceStr.length - decimals);

    return `${wholePart}.${fractionalPart}`;
  } catch (error) {
    console.error('Error formatting balance:', error);
    return balance.toString();
  }
}

interface TransactionDetails {
  hash: string;
  action: 'buy' | 'sell';
  tokenSymbol: string;
  tokenAmount: number;
  ethAmount: number;
  effectivePrice: number;
  priceInUSD: number;
  gasUsed: string;
  gasCost: number;
  gasCostUSD: number;
  totalCostETH: number;
  totalCostUSD: number;
}

export const useTrading = () => {
  const { wallet: connectedWallet } = useWallet();
  const { account } = useAccount();
  const [isExecuting, setIsExecuting] = useState(false);
  const { isTestnet } = useNetwork();

  const executeTrade = useCallback(async (decision: TradeDecision): Promise<{ success: boolean; details?: TransactionDetails }> => {
    if (!connectedWallet || !account) {
      notificationService.error('Wallet Error', 'Please connect your wallet');
      return { success: false };
    }

    setIsExecuting(true);

    try {
      console.log('Starting trade execution:', {
        type: decision.action,
        token: decision.token.symbol,
        amount: decision.amount,
        network: isTestnet ? 'testnet' : 'mainnet',
        wallet: account,
      });

      // Check if it's a hold decision
      if (decision.action === 'hold') {
        notificationService.info('No Trade', 'Agent decided to hold position');
        return { success: false };
      }

      // For mainnet, execute real trade
      const provider = connectedWallet.provider;

      // Get token configuration
      const tokenConfig = getTokenBySymbol(decision.token.symbol, isTestnet);

      if (!tokenConfig) {
        throw new Error('Token configuration not found');
      }

      // Skip if trying to trade ETH for ETH
      if (tokenConfig.assetId === BASE_ASSET_ID) {
        throw new Error('Cannot swap ETH for ETH');
      }

      console.log('Token configuration:', {
        symbol: tokenConfig.symbol,
        address: tokenConfig.address,
        assetId: tokenConfig.assetId,
        decimals: tokenConfig.decimals
      });

      console.log('ETH Asset ID:', BASE_ASSET_ID);

      // Check ETH balance for gas fees
      console.log('Checking ETH balance for gas fees...');
      let ethBalance = bn(0);

      try {
        ethBalance = await connectedWallet.getBalance();
        console.log('ETH balance:', ethBalance.toString());

        // Format balance for display
        const ethDecimals = 9; // ETH has 9 decimals on Fuel
        const readableEthBalance = formatBalance(ethBalance, ethDecimals);
        console.log(`ETH balance (formatted): ${readableEthBalance} ETH`);
      } catch (error) {
        console.error('Error checking ETH balance:', error);
      }

      // Check for UTXO fragmentation
      console.log('Checking for UTXO fragmentation...');
      try {
        if (connectedWallet.provider && account) {
          const address = Address.fromString(account);
          const spendableCoinsResponse = await connectedWallet.provider.getCoins(address);

          // Access the coins array safely
          const spendableCoins = spendableCoinsResponse && spendableCoinsResponse.coins ? spendableCoinsResponse.coins : [];

          console.log({ spendableCoins })

          console.log(`Found ${spendableCoins.length} spendable coins in wallet`);

          // If there are many small coins, warn the user
          if (spendableCoins.length > 5) {
            console.warn(`Your wallet has ${spendableCoins.length} UTXOs which may cause transaction issues`);
          }
        }
      } catch (e) {
        console.error('Failed to check UTXO fragmentation:', e);
      }

      // For token swaps on Mira
      try {
        // Create Mira AMM instance
        const miraAmm = new MiraAmm(connectedWallet);

        console.log('Trading pair:', {
          token: tokenConfig.symbol,
          base: 'ETH',
          action: decision.action
        });

        // Prepare swap parameters
        let amountIn;

        // Convert the amount to BN with proper decimal places
        try {
          if (decision.action === 'buy') {
            // For buy: we need to calculate how much ETH to spend
            // This is a simplified calculation - in production you'd use getAmountsIn
            const tokenPrice = decision.token.price; // Price in USD
            const ethPrice = 2000; // You should get this from market data
            const ethAmount = (decision.amount * tokenPrice) / ethPrice;
            amountIn = bn(Math.floor(ethAmount * Math.pow(10, 9)).toString()); // ETH has 9 decimals
          } else {
            // For sell: we're selling the token amount
            const tokenDecimals = tokenConfig.decimals;
            amountIn = bn(Math.floor(decision.amount * Math.pow(10, tokenDecimals)).toString());
          }
        } catch (e) {
          console.error('Error converting amount:', e);
          throw new Error('Failed to calculate swap amounts');
        }

        console.log('Amount for swap:', {
          original: decision.amount,
          amountIn: amountIn.toString(),
          action: decision.action,
          inputToken: decision.action === 'buy' ? 'ETH' : tokenConfig.symbol,
          outputToken: decision.action === 'buy' ? tokenConfig.symbol : 'ETH'
        });

        // Determine the asset IDs for swap based on the action
        // ALWAYS use ETH as the base currency
        const assetIn = decision.action === 'buy'
          ? { bits: BASE_ASSET_ID }  // Buy with ETH
          : { bits: tokenConfig.assetId };     // Sell token

        const assetOut = decision.action === 'buy'
          ? { bits: tokenConfig.assetId }      // Get token
          : { bits: BASE_ASSET_ID }; // Get ETH

        // Build pool ID - the order matters!
        // For Mira, pools are identified by the token pair
        const poolId = buildPoolId(assetIn, assetOut, false); // false for volatile pool

        console.log('Pool ID constructed:', poolId);
        console.log('Asset IDs:', {
          assetIn: assetIn.bits,
          assetOut: assetOut.bits,
          assetInSymbol: decision.action === 'buy' ? 'ETH' : tokenConfig.symbol,
          assetOutSymbol: decision.action === 'buy' ? tokenConfig.symbol : 'ETH'
        });

        // Get current block height for deadline
        const currentBlock = await provider.getBlock('latest');

        if (!currentBlock) {
          throw new Error('Failed to get current block');
        }

        const deadline = currentBlock.height.add(100); // 100 blocks deadline

        // Calculate minAmountOut with slippage protection
        const miraAmmReader = new ReadonlyMiraAmm(provider);

        // Calculate the expected output amount using ETH as input
        const result_out = await miraAmmReader.getAmountsOut(
          { bits: assetIn.bits }, // Use the actual input asset
          amountIn,
          [poolId],
        );

        if (!result_out || result_out.length === 0 || !result_out[0] || result_out[0].length < 2) {
          throw new Error('Failed to calculate output amount');
        }

        let amountOutWei;
        if (result_out[1] && result_out[1][0].bits === assetOut.bits) {
          amountOutWei = result_out[1][1];
        } else if (result_out[0][0].bits === assetOut.bits) {
          amountOutWei = result_out[0][1];
        }

        if (!amountOutWei) {
          throw new Error('Failed to calculate output amount');
        }

        // Apply 1% slippage tolerance
        const minAmountOut = amountOutWei
          .mul(bn(99))
          .div(bn(100));
        
        console.log('Min amount out (with 1% slippage):', minAmountOut.toString());

        // Log the exact parameters being sent to swapExactInput
        console.log('Executing swap with params:', {
          amountIn: amountIn.toString(),
          assetIn: assetIn,
          minAmountOut: minAmountOut.toString(),
          poolId: poolId,
          deadline: deadline.toString()
        });

        // Execute the swap
        let txRequest;
        try {
          console.log('Creating swap transaction...');
          
          // Create the swap transaction with optimized gas settings
          txRequest = await miraAmm.swapExactInput(
            amountIn,
            assetIn,
            minAmountOut,
            [poolId],
            deadline,
            {
              gasLimit: 1000000, // Set a reasonable gas limit
              variableOutputs: 1, // Reduce variable outputs to save gas
            }
          );

          console.log('Transaction request created:', txRequest);
          
          // Check if txRequest is valid
          if (!txRequest || typeof txRequest !== 'object') {
            throw new Error('Invalid transaction request from Mira');
          }

        } catch (e) {
          console.error('Error creating swap transaction:', e);
          
          // If insufficient funds, offer to consolidate UTXOs
          if (String(e).includes('Insufficient funds') || String(e).includes('MAX_INPUTS_EXCEEDED')) {
            const shouldConsolidate = window.confirm(
              `Transaction failed due to insufficient funds or UTXO fragmentation. ` +
              `Would you like to consolidate your UTXOs and try again?`
            );

            if (shouldConsolidate && typeof connectedWallet.consolidateCoins === 'function') {
              try {
                console.log('Consolidating UTXOs...');
                notificationService.info(
                  'Consolidating UTXOs',
                  'Please wait while your funds are being consolidated...'
                );

                const baseAssetId = await provider.getBaseAssetId();
                const result = await connectedWallet.consolidateCoins({
                  assetId: baseAssetId,
                  mode: 'sequential',
                  outputNum: 1
                });

                console.log('Consolidation result:', result);

                notificationService.success(
                  'UTXOs Consolidated',
                  'Your funds have been consolidated. Please try your transaction again.'
                );

                return { success: false };
              } catch (consolidateError) {
                console.error('Failed to consolidate UTXOs:', consolidateError);
              }
            }
          }
          
          throw e;
        }

        // Send transaction with proper error handling
        let response;
        try {
          console.log('Sending transaction...');
          
          // Send the transaction request directly
          response = await connectedWallet.sendTransaction(txRequest);
          console.log('Transaction sent:', response);
        } catch (sendError) {
          console.error('Error sending transaction:', sendError);
          console.error('Transaction that failed:', txRequest);
          
          // Check if it's a wallet error
          if (String(sendError).includes('User rejected') || String(sendError).includes('cancelled')) {
            throw new Error('Transaction cancelled by user');
          }
          
          throw sendError;
        }

        // Wait for confirmation
        console.log('Waiting for confirmation...');
        const result = await response.waitForResult();
        console.log('Transaction confirmed:', result);

        // Extract transaction details
        const txHash = result.id || 'Unknown';
        const gasUsed = result.fee ? result.fee.format() : 'Unknown';
        const gasCost = result.fee ? parseFloat(formatBalance(result.fee, 9)) : 0;
        const gasUsedAmount = result.gasUsed ? result.gasUsed.toString() : 'Unknown';
        
        // Calculate actual amounts from the transaction
        let actualAmountIn = formatBalance(amountIn, decision.action === 'buy' ? 9 : tokenConfig.decimals);
        let actualAmountOut = formatBalance(minAmountOut, decision.action === 'buy' ? tokenConfig.decimals : 9);
        
        // Log transaction details
        console.log('Transaction result details:', {
          transactionId: txHash,
          fee: result.fee?.toString(),
          gasUsed: gasUsedAmount,
          receipts: result.receipts,
          status: result.status
        });

        // Calculate price per token
        const ethAmount = decision.action === 'buy' ? parseFloat(actualAmountIn) : parseFloat(actualAmountOut);
        const tokenAmount = decision.action === 'buy' ? decision.amount : parseFloat(actualAmountIn);
        const effectivePrice = ethAmount / tokenAmount;
        const priceInUSD = effectivePrice * 2000; // Assuming ETH = $2000, you should use actual ETH price

        // Create detailed transaction summary
        const txDetails: TransactionDetails = {
          hash: txHash,
          action: decision.action as 'buy' | 'sell', // Ensure it's only buy or sell
          tokenSymbol: tokenConfig.symbol,
          tokenAmount: tokenAmount,
          ethAmount: ethAmount,
          effectivePrice: effectivePrice,
          priceInUSD: priceInUSD,
          gasUsed: gasUsed,
          gasCost: gasCost,
          gasCostUSD: gasCost * 2000, // Assuming ETH = $2000
          totalCostETH: decision.action === 'buy' ? ethAmount + gasCost : gasCost,
          totalCostUSD: decision.action === 'buy' ? (ethAmount + gasCost) * 2000 : gasCost * 2000
        };

        console.log('Transaction Details:', txDetails);

        // Create a formatted message for the notification
        const txSummary = decision.action === 'buy' 
          ? `Bought ${tokenAmount} ${tokenConfig.symbol} for ${ethAmount.toFixed(6)} ETH (~$${(ethAmount * 2000).toFixed(2)})`
          : `Sold ${tokenAmount} ${tokenConfig.symbol} for ${ethAmount.toFixed(6)} ETH (~$${(ethAmount * 2000).toFixed(2)})`;

        notificationService.success(
          'Trade Executed',
          `${txSummary}. Gas: ${gasCost.toFixed(6)} ETH (~$${(gasCost * 2000).toFixed(2)})`
        );

        // Return transaction details for the chat
        return { success: true, details: txDetails };

      } catch (miraError) {
        console.error('Mira AMM error:', miraError);

        // Try to extract meaningful information from the error
        const errorStr = String(miraError);
        console.log('Full error string:', errorStr);

        // Provide helpful error messages
        if (errorStr.includes('Insufficient funds')) {
          throw new Error(`Insufficient ETH balance for this trade. You have ${formatBalance(ethBalance, 9)} ETH.`);
        } else if (errorStr.includes('Pool not found') || errorStr.includes('pool does not exist')) {
          throw new Error(`No liquidity pool found for ETH/${tokenConfig.symbol} pair on ${isTestnet ? 'testnet' : 'mainnet'}.`);
        } else if (errorStr.includes('slippage')) {
          throw new Error('Transaction would exceed slippage tolerance. Try a smaller amount.');
        } else if (miraError instanceof Error) {
          throw new Error(`Swap failed: ${miraError.message}`);
        } else {
          throw new Error(`Swap failed: ${errorStr}`);
        }
      }

    } catch (error) {
      console.error('Trade execution failed:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      notificationService.error('Trade Failed', errorMessage);

      return { success: false };
    } finally {
      setIsExecuting(false);
    }
  }, [connectedWallet, account, isTestnet]);

  return { executeTrade, isExecuting };
};
```

# src/index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html, body, #root {
    @apply h-full;
  }
  
  body {
    @apply bg-gray-900 text-white overflow-hidden;
  }
  
  /* Style links in chat messages */
  a {
    @apply hover:opacity-80 transition-opacity;
  }
}

@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-fuel-green text-black font-semibold rounded-lg hover:bg-green-400 transition-colors;
  }
  
  .btn-secondary {
    @apply px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors;
  }
  
  .card {
    @apply bg-gray-800 rounded-xl p-4 border border-gray-700;
  }
}
```

# src/lib/openai-provider.ts

```ts
import { createOpenAI } from '@ai-sdk/openai';

// Create a function that returns an OpenAI provider with the API key
export function getOpenAIProvider() {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not configured in environment variables');
  }
  
  return createOpenAI({
    apiKey: apiKey,
  });
}

// Helper to check if OpenAI is configured
export function isOpenAIConfigured(): boolean {
  return !!import.meta.env.VITE_OPENAI_API_KEY;
}
```

# src/main.tsx

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FuelProvider } from '@fuels/react';
import { defaultConnectors } from '@fuels/connectors';
import { validateConfig } from '@/config/constants';
import { NetworkProvider } from '@/contexts/NetworkContext';
import App from './App';
import './index.css';

// Validate configuration
const configValidation = validateConfig();
if (!configValidation.isValid && import.meta.env.DEV) {
  console.warn('Missing environment variables:', configValidation.missingVars);
  console.warn('AI features will use simulated responses.');
}

const queryClient = new QueryClient();

// Configure connectors
const connectors = defaultConnectors({ 
  devMode: false
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <FuelProvider 
        theme="dark"
        ui={false}
        fuelConfig={{ 
          connectors
        }}
      >
        <NetworkProvider>
          <App />
        </NetworkProvider>
      </FuelProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
```

# src/services/GoatService.ts

```ts
import { getOnChainTools } from '@goat-sdk/adapter-vercel-ai';
import { fuel } from '@goat-sdk/wallet-fuel';
import { TradeDecision } from '@/types';
import { getTokenBySymbol } from '@/config/tokens';
import { Wallet, bn } from 'fuels';

export class GoatService {
  private wallet: Wallet | null = null;
  private connectedWallet: any = null;
  private tools: any = null;
  private isTestnet: boolean = true;

  async initialize(account: string, connectedWallet: any, isTestnet: boolean = true): Promise<void> {
    this.isTestnet = isTestnet;
    this.connectedWallet = connectedWallet;

    try {
      // Use connected wallet provider
      const provider = connectedWallet.provider;
      if (!provider) {
        throw new Error('Connected wallet provider unavailable');
      }

      this.wallet = Wallet.fromAddress(account, provider);

      this.tools = await getOnChainTools({
        wallet: fuel(this.wallet) as any,
        plugins: [],
      });

      console.log('GoatService initialized');
    } catch (error) {
      console.error('Failed to initialize GOAT tools:', error);
      throw error;
    }
  }

  async executeTrade(decision: TradeDecision): Promise<string> {
    if (!this.wallet || !this.connectedWallet) {
      throw new Error('GoatService not initialized');
    }

    try {
      const token = getTokenBySymbol(decision.token.symbol, this.isTestnet);
      if (!token) {
        throw new Error(`Token ${decision.token.symbol} not found`);
      }

      // Define recipient (replace with actual contract address or DEX logic)
      const recipient = '0x' + '0'.repeat(64);
      const amount = bn.parseUnits(decision.amount.toString());

      const txRequest = await this.wallet.createTransfer(recipient, amount, token.assetId);

      const response = await this.connectedWallet.sendTransaction(txRequest);
      const result = await response.wait();

      return result.id;
    } catch (error) {
      console.error('Trade execution failed:', error);
      throw error;
    }
  }

  async getTokenBalance(assetId: string): Promise<string> {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    try {
      const balance = await this.wallet.getBalance(assetId);
      return balance.toString();
    } catch (error) {
      console.error('Failed to get token balance:', error);
      return '0';
    }
  }
}

export const goatService = new GoatService();

```

# src/services/MarketDataService.ts

```ts
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
```

# src/services/NotificationService.ts

```ts
import { Notification } from '@/types';

export class NotificationService {
  private listeners: ((notification: Notification) => void)[] = [];

  subscribe(callback: (notification: Notification) => void): () => void {
    this.listeners.push(callback);
    
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  notify(
    type: Notification['type'], 
    title: string, 
    message: string
  ): void {
    const notification: Notification = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      title,
      message,
      timestamp: Date.now()
    };

    this.listeners.forEach(listener => listener(notification));
  }

  success(title: string, message: string): void {
    this.notify('success', title, message);
  }

  error(title: string, message: string): void {
    this.notify('error', title, message);
  }

  warning(title: string, message: string): void {
    this.notify('warning', title, message);
  }

  info(title: string, message: string): void {
    this.notify('info', title, message);
  }
}

// Singleton instance
export const notificationService = new NotificationService();
```

# src/services/RealMarketDataService.ts

```ts
import axios from 'axios';
import { MarketData } from '@/types';
import { config } from '@/config/constants';
import { getTokenBySymbol } from '@/config/tokens';

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
```

# src/services/WhaleTrackerService.ts

```ts
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
```

# src/types/index.ts

```ts
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
```

# src/vite-env.d.ts

```ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    define: {
      'process.env': {
        VITE_OPENAI_API_KEY: JSON.stringify(env.VITE_OPENAI_API_KEY),
        VITE_QUICKNODE_FUEL_URL: JSON.stringify(env.VITE_QUICKNODE_FUEL_URL),
        VITE_QUICKNODE_CG_URL: JSON.stringify(env.VITE_QUICKNODE_CG_URL),
      },
      global: 'globalThis',
    },
    optimizeDeps: {
      include: ['@fuels/react', '@goat-sdk/core', 'fuels'],
      exclude: ['lucide-react'],
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
  };
});

```

# tailwind.config.js

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fuel: {
          green: '#00F58C',
          black: '#000000',
          gray: '#1A1A1A',
        }
      }
    },
  },
  plugins: [],
}
```

# tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "types": ["vite/client"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

# tsconfig.node.json

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

# vite.config.ts

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
```

