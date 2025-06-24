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
const BASE_ASSET_ID = '0x0000000000000000000000000000000000000000000000000000000000000000';

export const FUEL_TESTNET_TOKENS: TokenConfig[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0x0000000000000000000000000000000000000000', // Native asset
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
    address: '0x0000000000000000000000000000000000000000', // Native asset
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