import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/DashboardLayout';
import StatsCard from '@/components/StatsCard';
import { supabase } from '@/integrations/supabase/client';
import { Wallet, TrendingUp, Percent, ArrowDownToLine, ArrowUpFromLine, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const { profile, user, refreshProfile } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [portfolioValue, setPortfolioValue] = useState(0);

  useEffect(() => {
    if (!user) return;
    refreshProfile();

    const fetchData = async () => {
      const { data: txns } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      setTransactions(txns || []);

      const { data: portfolio } = await supabase
        .from('portfolio')
        .select('quantity, average_price, stock_id')
        .eq('user_id', user.id);

      if (portfolio && portfolio.length > 0) {
        const stockIds = portfolio.map(p => p.stock_id);
        const { data: stocks } = await supabase
          .from('stocks')
          .select('id, current_price')
          .in('id', stockIds);

        const value = portfolio.reduce((sum, p) => {
          const stock = stocks?.find(s => s.id === p.stock_id);
          return sum + (stock ? Number(stock.current_price) * Number(p.quantity) : 0);
        }, 0);
        setPortfolioValue(value);
      }
    };
    fetchData();
  }, [user]);

  const totalPL = portfolioValue > 0 && profile
    ? (((portfolioValue + Number(profile.wallet_balance)) / 10000 - 1) * 100).toFixed(2)
    : '0.00';

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Welcome back, {profile?.full_name || 'Trader'}</h1>
        <p className="text-muted-foreground text-sm mt-1">Here's your trading overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatsCard title="Wallet Balance" value={`$${Number(profile?.wallet_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`} icon={Wallet} delay={0} />
        <StatsCard title="Portfolio Value" value={`$${portfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`} icon={TrendingUp} delay={0.1} />
        <StatsCard title="Total P/L" value={`${totalPL}%`} icon={Percent} trend={`${totalPL}%`} trendUp={Number(totalPL) >= 0} delay={0.2} />
      </div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-wrap gap-3 mb-8">
        <Link to="/market"><Button className="bg-gradient-primary text-primary-foreground hover:opacity-90"><ShoppingCart className="h-4 w-4 mr-2" /> Buy Stocks</Button></Link>
        <Link to="/deposit"><Button variant="outline" className="border-border"><ArrowDownToLine className="h-4 w-4 mr-2" /> Deposit</Button></Link>
        <Link to="/withdraw"><Button variant="outline" className="border-border"><ArrowUpFromLine className="h-4 w-4 mr-2" /> Withdraw</Button></Link>
      </motion.div>

      {/* Recent Transactions */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Transactions</h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Type</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Stock</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Amount</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No transactions yet</td></tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          tx.type === 'buy' ? 'bg-accent/10 text-accent' :
                          tx.type === 'sell' ? 'bg-destructive/10 text-destructive' :
                          'bg-primary/10 text-primary'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground font-mono">{tx.stock_symbol || '—'}</td>
                      <td className="px-4 py-3 text-right text-foreground">${Number(tx.amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-xs ${tx.status === 'completed' ? 'text-accent' : tx.status === 'pending' ? 'text-chart-yellow' : 'text-destructive'}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground text-xs">{new Date(tx.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
