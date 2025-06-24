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