import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface Stock {
  id: string;
  symbol: string;
  company_name: string;
  current_price: number;
  price_change_pct: number;
}

export default function Market() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [search, setSearch] = useState('');

  const fetchStocks = async () => {
    const { data } = await supabase.from('stocks').select('*').order('symbol');
    if (data) setStocks(data as Stock[]);
  };

  useEffect(() => {
    fetchStocks();
    const interval = setInterval(() => {
      // Simulate price changes
      setStocks(prev => prev.map(s => {
        const change = (Math.random() - 0.5) * 2;
        const newPrice = Math.max(1, Number(s.current_price) + change);
        return { ...s, current_price: Number(newPrice.toFixed(2)), price_change_pct: Number(change.toFixed(2)) };
      }));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const filtered = stocks.filter(s =>
    s.symbol.toLowerCase().includes(search.toLowerCase()) ||
    s.company_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Market</h1>
          <p className="text-muted-foreground text-sm">Browse and trade stocks</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search stocks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
        </div>
      </div>

      <div className="grid gap-3">
        {filtered.map((stock, i) => (
          <motion.div
            key={stock.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:border-primary/30 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-bold text-primary font-mono">{stock.symbol.slice(0, 2)}</span>
              </div>
              <div>
                <div className="font-semibold text-foreground font-mono">{stock.symbol}</div>
                <div className="text-sm text-muted-foreground">{stock.company_name}</div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="font-semibold text-foreground font-mono">${Number(stock.current_price).toFixed(2)}</div>
                <div className={`flex items-center gap-1 text-xs ${stock.price_change_pct >= 0 ? 'text-accent' : 'text-destructive'}`}>
                  {stock.price_change_pct >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {stock.price_change_pct >= 0 ? '+' : ''}{Number(stock.price_change_pct).toFixed(2)}%
                </div>
              </div>
              <Link to={`/stock/${stock.id}`}>
                <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                  Trade
                </Button>
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </DashboardLayout>
  );
}
