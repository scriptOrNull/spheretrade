import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, TrendingUp, TrendingDown, Activity, BarChart3, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Stock {
  id: string;
  symbol: string;
  company_name: string;
  current_price: number;
  price_change_pct: number;
}

type SortMode = 'name' | 'price' | 'change';
type FilterMode = 'all' | 'gainers' | 'losers';

export default function Market() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [updatedIds, setUpdatedIds] = useState<Set<string>>(new Set());

  // Initial fetch
  useEffect(() => {
    const fetchStocks = async () => {
      const { data } = await supabase.from('stocks').select('*').order('symbol');
      if (data) setStocks(data as Stock[]);
    };
    fetchStocks();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('stocks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stocks' },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const updated = payload.new as Stock;
            setStocks(prev => {
              const exists = prev.find(s => s.id === updated.id);
              if (exists) {
                return prev.map(s => s.id === updated.id ? updated : s);
              }
              return [...prev, updated];
            });
            // Flash effect for updated stock
            setUpdatedIds(prev => new Set(prev).add(updated.id));
            setTimeout(() => {
              setUpdatedIds(prev => {
                const next = new Set(prev);
                next.delete(updated.id);
                return next;
              });
            }, 1500);
          } else if (payload.eventType === 'DELETE') {
            const deleted = payload.old as { id: string };
            setStocks(prev => prev.filter(s => s.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Derived stats
  const marketStats = useMemo(() => {
    if (stocks.length === 0) return { totalStocks: 0, avgPrice: 0, gainers: 0, losers: 0, topGainer: null as Stock | null, topLoser: null as Stock | null };
    const gainers = stocks.filter(s => s.price_change_pct > 0);
    const losers = stocks.filter(s => s.price_change_pct < 0);
    const sorted = [...stocks].sort((a, b) => b.price_change_pct - a.price_change_pct);
    return {
      totalStocks: stocks.length,
      avgPrice: stocks.reduce((s, st) => s + Number(st.current_price), 0) / stocks.length,
      gainers: gainers.length,
      losers: losers.length,
      topGainer: sorted[0] || null,
      topLoser: sorted[sorted.length - 1] || null,
    };
  }, [stocks]);

  // Filter + sort + search
  const filtered = useMemo(() => {
    let result = stocks.filter(s =>
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      s.company_name.toLowerCase().includes(search.toLowerCase())
    );
    if (filterMode === 'gainers') result = result.filter(s => s.price_change_pct > 0);
    if (filterMode === 'losers') result = result.filter(s => s.price_change_pct < 0);

    result.sort((a, b) => {
      if (sortMode === 'name') return a.symbol.localeCompare(b.symbol);
      if (sortMode === 'price') return Number(b.current_price) - Number(a.current_price);
      return Number(b.price_change_pct) - Number(a.price_change_pct);
    });
    return result;
  }, [stocks, search, sortMode, filterMode]);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Market</h1>
            <Badge variant="outline" className="border-accent/50 text-accent text-[10px] gap-1 animate-pulse">
              <Zap className="h-3 w-3" /> LIVE
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">Real-time stock prices &amp; trading</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search stocks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
        </div>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
          className="bg-gradient-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-primary/10"><BarChart3 className="h-3.5 w-3.5 text-primary" /></div>
            <span className="text-xs text-muted-foreground">Total Stocks</span>
          </div>
          <div className="text-xl font-bold text-foreground font-mono">{marketStats.totalStocks}</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-gradient-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-primary/10"><Activity className="h-3.5 w-3.5 text-primary" /></div>
            <span className="text-xs text-muted-foreground">Avg Price</span>
          </div>
          <div className="text-xl font-bold text-foreground font-mono">${marketStats.avgPrice.toFixed(2)}</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-gradient-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-accent/10"><ArrowUpRight className="h-3.5 w-3.5 text-accent" /></div>
            <span className="text-xs text-muted-foreground">Gainers</span>
          </div>
          <div className="text-xl font-bold text-accent font-mono">{marketStats.gainers}</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-gradient-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-destructive/10"><ArrowDownRight className="h-3.5 w-3.5 text-destructive" /></div>
            <span className="text-xs text-muted-foreground">Losers</span>
          </div>
          <div className="text-xl font-bold text-destructive font-mono">{marketStats.losers}</div>
        </motion.div>
      </div>

      {/* Top Movers */}
      {(marketStats.topGainer || marketStats.topLoser) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {marketStats.topGainer && (
            <motion.div initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
              className="bg-accent/5 border border-accent/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-accent font-medium mb-1">🔥 Top Gainer</div>
                <div className="font-bold text-foreground font-mono">{marketStats.topGainer.symbol}</div>
                <div className="text-xs text-muted-foreground">{marketStats.topGainer.company_name}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-foreground font-mono">${Number(marketStats.topGainer.current_price).toFixed(2)}</div>
                <div className="text-accent text-sm font-mono">+{Number(marketStats.topGainer.price_change_pct).toFixed(2)}%</div>
              </div>
            </motion.div>
          )}
          {marketStats.topLoser && marketStats.topLoser.price_change_pct < 0 && (
            <motion.div initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}
              className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-destructive font-medium mb-1">📉 Top Loser</div>
                <div className="font-bold text-foreground font-mono">{marketStats.topLoser.symbol}</div>
                <div className="text-xs text-muted-foreground">{marketStats.topLoser.company_name}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-foreground font-mono">${Number(marketStats.topLoser.current_price).toFixed(2)}</div>
                <div className="text-destructive text-sm font-mono">{Number(marketStats.topLoser.price_change_pct).toFixed(2)}%</div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Filters & Sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Tabs value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)} className="w-full sm:w-auto">
          <TabsList className="bg-secondary">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="gainers" className="text-xs">Gainers</TabsTrigger>
            <TabsTrigger value="losers" className="text-xs">Losers</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)} className="w-full sm:w-auto">
          <TabsList className="bg-secondary">
            <TabsTrigger value="name" className="text-xs">A–Z</TabsTrigger>
            <TabsTrigger value="price" className="text-xs">Price</TabsTrigger>
            <TabsTrigger value="change" className="text-xs">% Change</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="text-xs text-muted-foreground self-center ml-auto">{filtered.length} stocks</div>
      </div>

      {/* Stock List */}
      <div className="grid gap-2.5">
        <AnimatePresence>
          {filtered.map((stock, i) => {
            const isUp = stock.price_change_pct >= 0;
            const isFlashing = updatedIds.has(stock.id);
            return (
              <motion.div
                key={stock.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                className={`bg-card border rounded-xl p-3 sm:p-4 flex items-center justify-between transition-all duration-300 ${
                  isFlashing
                    ? isUp
                      ? 'border-accent/50 shadow-[0_0_15px_hsl(145_65%_42%/0.15)]'
                      : 'border-destructive/50 shadow-[0_0_15px_hsl(0_72%_51%/0.15)]'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    isUp ? 'bg-accent/10' : 'bg-destructive/10'
                  }`}>
                    <span className={`text-xs font-bold font-mono ${isUp ? 'text-accent' : 'text-destructive'}`}>
                      {stock.symbol.slice(0, 2)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground font-mono text-sm">{stock.symbol}</span>
                      {isFlashing && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className={`w-1.5 h-1.5 rounded-full ${isUp ? 'bg-accent' : 'bg-destructive'}`}
                        />
                      )}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-none">{stock.company_name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                  <div className="text-right">
                    <div className={`font-semibold font-mono text-sm transition-colors ${isFlashing ? (isUp ? 'text-accent' : 'text-destructive') : 'text-foreground'}`}>
                      ${Number(stock.current_price).toFixed(2)}
                    </div>
                    <div className={`flex items-center justify-end gap-1 text-xs font-mono ${isUp ? 'text-accent' : 'text-destructive'}`}>
                      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {isUp ? '+' : ''}{Number(stock.price_change_pct).toFixed(2)}%
                    </div>
                  </div>
                  <Link to={`/stock/${stock.id}`}>
                    <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90 text-xs sm:text-sm">
                      Trade
                    </Button>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No stocks found matching your criteria</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
