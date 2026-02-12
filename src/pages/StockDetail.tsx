import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StockDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, refreshProfile, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stock, setStock] = useState<any>(null);
  const [quantity, setQuantity] = useState('1');
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [loading, setLoading] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);
  const [owned, setOwned] = useState(0);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      const { data } = await supabase.from('stocks').select('*').eq('id', id).single();
      if (data) {
        setStock(data);
        // Generate mock chart data
        const price = Number(data.current_price);
        const points = Array.from({ length: 24 }, (_, i) => ({
          time: `${i}:00`,
          price: Number((price + (Math.random() - 0.5) * price * 0.05).toFixed(2)),
        }));
        points[23] = { time: '23:00', price };
        setChartData(points);
      }

      if (user) {
        const { data: pf } = await supabase.from('portfolio').select('quantity').eq('user_id', user.id).eq('stock_id', id).single();
        if (pf) setOwned(Number(pf.quantity));
      }
    };
    fetch();
  }, [id, user]);

  if (!stock) return <DashboardLayout><div className="text-muted-foreground">Loading...</div></DashboardLayout>;

  const total = Number(quantity) * Number(stock.current_price);

  const handleTrade = async () => {
    if (!user || !profile) return;
    const qty = Number(quantity);
    if (qty <= 0) { toast({ title: 'Invalid quantity', variant: 'destructive' }); return; }

    setLoading(true);
    try {
      if (mode === 'buy') {
        if (total > Number(profile.wallet_balance)) {
          toast({ title: 'Insufficient funds', variant: 'destructive' });
          setLoading(false);
          return;
        }

        // Deduct balance
        await supabase.from('profiles').update({ wallet_balance: Number(profile.wallet_balance) - total }).eq('id', user.id);

        // Update or insert portfolio
        const { data: existing } = await supabase.from('portfolio').select('*').eq('user_id', user.id).eq('stock_id', stock.id).single();
        if (existing) {
          const newQty = Number(existing.quantity) + qty;
          const newAvg = ((Number(existing.average_price) * Number(existing.quantity)) + total) / newQty;
          await supabase.from('portfolio').update({ quantity: newQty, average_price: newAvg }).eq('id', existing.id);
        } else {
          await supabase.from('portfolio').insert({ user_id: user.id, stock_id: stock.id, quantity: qty, average_price: Number(stock.current_price) });
        }

        // Log transaction
        await supabase.from('transactions').insert({ user_id: user.id, type: 'buy', stock_symbol: stock.symbol, quantity: qty, amount: total, status: 'completed' });

        toast({ title: `Bought ${qty} ${stock.symbol}` });
      } else {
        if (qty > owned) {
          toast({ title: 'Insufficient shares', variant: 'destructive' });
          setLoading(false);
          return;
        }

        await supabase.from('profiles').update({ wallet_balance: Number(profile.wallet_balance) + total }).eq('id', user.id);

        const newQty = owned - qty;
        if (newQty === 0) {
          await supabase.from('portfolio').delete().eq('user_id', user.id).eq('stock_id', stock.id);
        } else {
          await supabase.from('portfolio').update({ quantity: newQty }).eq('user_id', user.id).eq('stock_id', stock.id);
        }

        await supabase.from('transactions').insert({ user_id: user.id, type: 'sell', stock_symbol: stock.symbol, quantity: qty, amount: total, status: 'completed' });

        toast({ title: `Sold ${qty} ${stock.symbol}` });
        setOwned(owned - qty);
      }

      await refreshProfile();
    } catch (err: any) {
      toast({ title: 'Trade failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <button onClick={() => navigate('/market')} className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block">← Back to Market</button>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-bold text-primary font-mono">{stock.symbol.slice(0, 2)}</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{stock.symbol}</h1>
                <p className="text-sm text-muted-foreground">{stock.company_name}</p>
              </div>
              <div className="ml-auto text-right">
                <div className="text-2xl font-bold font-mono text-foreground">${Number(stock.current_price).toFixed(2)}</div>
                <div className={`flex items-center gap-1 text-sm ${stock.price_change_pct >= 0 ? 'text-accent' : 'text-destructive'}`}>
                  {stock.price_change_pct >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {stock.price_change_pct >= 0 ? '+' : ''}{Number(stock.price_change_pct).toFixed(2)}%
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: 'hsl(215 15% 55%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(215 15% 55%)' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ background: 'hsl(220 18% 11%)', border: '1px solid hsl(220 16% 18%)', borderRadius: '8px', color: 'hsl(210 20% 95%)' }} />
                <Line type="monotone" dataKey="price" stroke="hsl(210 100% 52%)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Trade Panel */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex gap-2 mb-6">
              <Button onClick={() => setMode('buy')} className={`flex-1 ${mode === 'buy' ? 'bg-gradient-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground'}`}>Buy</Button>
              <Button onClick={() => setMode('sell')} className={`flex-1 ${mode === 'sell' ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-secondary-foreground'}`}>Sell</Button>
            </div>

            {owned > 0 && <p className="text-sm text-muted-foreground mb-4">You own: <span className="text-foreground font-mono">{owned} shares</span></p>}

            <div className="space-y-4">
              <div>
                <Label>Quantity</Label>
                <Input type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} className="mt-1 bg-secondary border-border font-mono" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price per share</span>
                <span className="text-foreground font-mono">${Number(stock.current_price).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-border pt-3">
                <span className="text-muted-foreground font-medium">Total</span>
                <span className="text-foreground font-bold font-mono">${total.toFixed(2)}</span>
              </div>
              <Button onClick={handleTrade} disabled={loading} className={`w-full ${mode === 'buy' ? 'bg-gradient-accent text-accent-foreground hover:opacity-90' : 'bg-destructive text-destructive-foreground hover:opacity-90'}`}>
                {loading ? 'Processing...' : `${mode === 'buy' ? 'Buy' : 'Sell'} ${stock.symbol}`}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
