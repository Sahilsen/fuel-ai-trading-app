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