import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

export default function Withdraw() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [crypto, setCrypto] = useState('BTC');
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  const fetchWithdrawals = async () => {
    if (!user) return;
    const { data } = await supabase.from('withdrawals').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setWithdrawals(data || []);
  };

  useEffect(() => {
    fetchWithdrawals();
  }, [user]);

  // Realtime subscription for withdrawal status updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('user-withdrawals')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'withdrawals', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const updated = payload.new as any;
          setWithdrawals(prev => prev.map(w => w.id === updated.id ? updated : w));
          if (updated.status === 'approved') {
            refreshProfile();
            toast({ title: 'Withdrawal approved!', description: `Your ${updated.crypto_type} withdrawal of $${Number(updated.amount).toFixed(2)} has been approved.` });
          } else if (updated.status === 'rejected') {
            toast({ title: 'Withdrawal rejected', description: `Your ${updated.crypto_type} withdrawal was rejected.`, variant: 'destructive' });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || !walletAddress || !profile) return;
    if (Number(amount) > Number(profile.wallet_balance)) {
      toast({ title: 'Insufficient balance', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await supabase.from('withdrawals').insert({
        user_id: user.id,
        crypto_type: crypto,
        amount: Number(amount),
        wallet_address: walletAddress,
        status: 'pending',
      });

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'withdrawal',
        amount: Number(amount),
        status: 'pending',
      });

      toast({ title: 'Withdrawal submitted', description: 'Awaiting admin approval.' });
      setAmount('');
      setWalletAddress('');
      fetchWithdrawals();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Withdraw Funds</h1>
        <p className="text-muted-foreground text-sm">Request a withdrawal to your wallet</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-6">
          <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground">Available: <span className="text-foreground font-mono font-bold">${Number(profile?.wallet_balance || 0).toFixed(2)}</span></p>
          </div>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div>
              <Label>Cryptocurrency</Label>
              <Select value={crypto} onValueChange={setCrypto}>
                <SelectTrigger className="mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['BTC', 'ETH', 'USDT', 'DOGE', 'XRP'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (USD)</Label>
              <Input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} required className="mt-1 bg-secondary border-border font-mono" placeholder="100.00" />
            </div>
            <div>
              <Label>Your Wallet Address</Label>
              <Input value={walletAddress} onChange={e => setWalletAddress(e.target.value)} required className="mt-1 bg-secondary border-border font-mono" placeholder="Enter your wallet address" />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
              {loading ? 'Submitting...' : 'Request Withdrawal'}
            </Button>
          </form>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-lg font-semibold text-foreground mb-4">Withdrawal History</h2>
          <div className="space-y-3">
            {withdrawals.length === 0 ? (
              <p className="text-muted-foreground text-sm">No withdrawals yet</p>
            ) : withdrawals.map(w => (
              <div key={w.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <span className="font-mono text-foreground text-sm">{w.crypto_type}</span>
                  <span className="text-muted-foreground text-sm ml-2">${Number(w.amount).toFixed(2)}</span>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(w.created_at).toLocaleDateString()}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  w.status === 'approved' ? 'bg-accent/10 text-accent' :
                  w.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                  'bg-chart-yellow/10 text-chart-yellow'
                }`}>
                  {w.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
