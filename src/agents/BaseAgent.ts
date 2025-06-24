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