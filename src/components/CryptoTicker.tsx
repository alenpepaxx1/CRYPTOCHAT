import { useState, useEffect } from 'react';
import { Bitcoin } from 'lucide-react';

export default function CryptoTicker() {
  const [price, setPrice] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        if (data.price) {
            setPrice(parseFloat(data.price).toFixed(2));
        }
      } catch (error) {
        console.error("Ticker error:", error);
      }
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center sm:justify-start gap-2 px-2 py-1.5 border border-[var(--border)] rounded-sm bg-black/50 text-[var(--accent)] font-mono text-[9px] uppercase tracking-widest font-bold w-full sm:w-auto">
      <Bitcoin size={10} className="shrink-0" />
      <span className="hidden sm:inline">BTC: </span>
      <span>{price ? `$${price}` : '---'}</span>
    </div>
  );
}
