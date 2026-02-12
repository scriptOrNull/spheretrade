import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface PortfolioItem {
  id: string;
  stock_id: string;
  quantity: number;
  average_price: number;
  symbol: string;
  company_name: string;
  current_price: number;
}

export default function Portfolio() {
  const { user } = useAuth();
  const [items, setItems] = useState<PortfolioItem[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data: portfolio } = await supabase.from('portfolio').select('*').eq('user_id', user.id);
      if (!portfolio || portfolio.length === 0) return;

      const stockIds = portfolio.map(p => p.stock_id);
      const { data: stocks } = await supabase.from('stocks').select('*').in('id', stockIds);

      const merged = portfolio.map(p => {
        const s = stocks?.find(st => st.id === p.stock_id);
        return {
          ...p,
          quantity: Number(p.quantity),
          average_price: Number(p.average_price),
          symbol: s?.symbol || '',
          company_name: s?.company_name || '',
          current_price: Number(s?.current_price || 0),
        };
      });
      setItems(merged);
    };
    fetch();
  }, [user]);

  const totalValue = items.reduce((s, i) => s + i.current_price * i.quantity, 0);
  const totalCost = items.reduce((s, i) => s + i.average_price * i.quantity, 0);
  const totalPL = totalCost > 0 ? ((totalValue - totalCost) / totalCost * 100).toFixed(2) : '0.00';

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Portfolio</h1>
        <p className="text-muted-foreground text-sm">Your stock holdings</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-card border border-border rounded-xl p-4">
          <div className="text-sm text-muted-foreground">Total Value</div>
          <div className="text-xl font-bold text-foreground font-mono">${totalValue.toFixed(2)}</div>
        </div>
        <div className="bg-gradient-card border border-border rounded-xl p-4">
          <div className="text-sm text-muted-foreground">Total Cost</div>
          <div className="text-xl font-bold text-foreground font-mono">${totalCost.toFixed(2)}</div>
        </div>
        <div className="bg-gradient-card border border-border rounded-xl p-4">
          <div className="text-sm text-muted-foreground">Total P/L</div>
          <div className={`text-xl font-bold font-mono ${Number(totalPL) >= 0 ? 'text-accent' : 'text-destructive'}`}>
            {Number(totalPL) >= 0 ? '+' : ''}{totalPL}%
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Stock</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Qty</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Avg Price</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Current</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">P/L</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No holdings yet. <Link to="/market" className="text-primary hover:underline">Browse Market</Link></td></tr>
              ) : items.map((item, i) => {
                const pl = ((item.current_price - item.average_price) / item.average_price * 100).toFixed(2);
                return (
                  <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground font-mono">{item.symbol}</div>
                      <div className="text-xs text-muted-foreground">{item.company_name}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-foreground font-mono">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-foreground font-mono">${item.average_price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-foreground font-mono">${item.current_price.toFixed(2)}</td>
                    <td className={`px-4 py-3 text-right font-mono ${Number(pl) >= 0 ? 'text-accent' : 'text-destructive'}`}>
                      {Number(pl) >= 0 ? '+' : ''}{pl}%
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/stock/${item.stock_id}`}>
                        <Button size="sm" variant="outline" className="border-border text-xs">Trade</Button>
                      </Link>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
