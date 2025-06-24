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
