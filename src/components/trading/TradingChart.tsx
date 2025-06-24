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