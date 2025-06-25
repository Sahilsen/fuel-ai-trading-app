// ============= Constants =============
export const config = {
  quicknodeCgUrl: import.meta.env.VITE_QUICKNODE_CG_URL || '',
} as const;

export const validateConfig = () => {
  const missingVars: string[] = [];
  
  if (!import.meta.env.VITE_OPENAI_API_KEY) {
    missingVars.push('VITE_OPENAI_API_KEY');
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
    hasQuickNodeCg: !!config.quicknodeCgUrl,
  });
}

// ============= Networks =============
export interface NetworkConfig {
  name: string;
  url: string;
  chainId: number;
}

export const NETWORKS = {
  testnet: {
    name: 'Fuel Sepolia Testnet',
    url: 'https://testnet.fuel.network/v1/graphql',
    chainId: 0,
  },
  mainnet: {
    name: 'Fuel Mainnet',
    url: 'https://mainnet.fuel.network/v1/graphql', 
    chainId: 9889,
  },
};

export const getNetworkConfig = (isTestnet: boolean): NetworkConfig =>
  isTestnet ? NETWORKS.testnet : NETWORKS.mainnet;

// ============= Tokens =============
export interface TokenConfig {
  symbol: string;
  name: string;
  address: string;
  assetId: string;
  decimals: number;
  coingeckoId?: string;
  icon?: string;
  isNative?: boolean;
}

// Base asset ID (ETH on Fuel)
export const BASE_ASSET_ID = '0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07';

export const FUEL_TESTNET_TOKENS: TokenConfig[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07',
    assetId: BASE_ASSET_ID,
    decimals: 9,
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
    decimals: 6,
    coingeckoId: 'usd-coin',
    icon: '💵',
    isNative: false
  }
];

export const FUEL_MAINNET_TOKENS: TokenConfig[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0xf8f8b6283d7fa5b672b530cbb84fcccb4ff8dc40f8176ef4544ddb1f1952ad07',
    assetId: BASE_ASSET_ID,
    decimals: 9,
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
    decimals: 6,
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

export const getBaseAssetId = () => BASE_ASSET_ID;

export const getNativeAsset = (isTestnet: boolean): TokenConfig => {
  const tokens = getTokens(isTestnet);
  return tokens.find(token => token.isNative) || tokens[0];
};