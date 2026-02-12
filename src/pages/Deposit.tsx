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
import { Copy, Check } from 'lucide-react';

const WALLET_ADDRESSES: Record<string, string> = {
  BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  ETH: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  USDT: 'TN2x5hJkgLxXPjQo6nS8ThvwAGj2zYnH1p',
  DOGE: 'DH5yaieqoZN36fDVciNyRueRGvGLR3mr7L',
  XRP: 'rEb8TK3gBgk5auZkwc6sHnwrGVJH8DuaLh',
};

export default function Deposit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [crypto, setCrypto] = useState('BTC');
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deposits, setDeposits] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('deposits').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setDeposits(data || []));
  }, [user]);

  const copyAddress = () => {
    navigator.clipboard.writeText(WALLET_ADDRESSES[crypto]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || !txHash) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('deposits').insert({
        user_id: user.id,
        crypto_type: crypto,
        amount: Number(amount),
        transaction_hash: txHash,
        status: 'pending',
      });
      if (error) throw error;

      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'deposit',
        amount: Number(amount),
        status: 'pending',
      });

      toast({ title: 'Deposit submitted', description: 'Awaiting admin approval.' });
      setAmount('');
      setTxHash('');
      const { data } = await supabase.from('deposits').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setDeposits(data || []);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Deposit Funds</h1>
        <p className="text-muted-foreground text-sm">Send crypto to fund your account</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-6">
          <form onSubmit={handleDeposit} className="space-y-4">
            <div>
              <Label>Cryptocurrency</Label>
              <Select value={crypto} onValueChange={setCrypto}>
                <SelectTrigger className="mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.keys(WALLET_ADDRESSES).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Platform Wallet Address</Label>
              <div className="flex mt-1 gap-2">
                <Input value={WALLET_ADDRESSES[crypto]} readOnly className="bg-secondary border-border font-mono text-xs" />
                <Button type="button" variant="outline" size="icon" onClick={copyAddress} className="border-border shrink-0">
                  {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label>Amount (USD)</Label>
              <Input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} required className="mt-1 bg-secondary border-border font-mono" placeholder="100.00" />
            </div>

            <div>
              <Label>Transaction Hash</Label>
              <Input value={txHash} onChange={e => setTxHash(e.target.value)} required className="mt-1 bg-secondary border-border font-mono" placeholder="0x..." />
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
              {loading ? 'Submitting...' : 'Submit Deposit'}
            </Button>
          </form>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-lg font-semibold text-foreground mb-4">Deposit History</h2>
          <div className="space-y-3">
            {deposits.length === 0 ? (
              <p className="text-muted-foreground text-sm">No deposits yet</p>
            ) : deposits.map(d => (
              <div key={d.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <span className="font-mono text-foreground text-sm">{d.crypto_type}</span>
                  <span className="text-muted-foreground text-sm ml-2">${Number(d.amount).toFixed(2)}</span>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(d.created_at).toLocaleDateString()}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${
                  d.status === 'approved' ? 'bg-accent/10 text-accent' :
                  d.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                  'bg-chart-yellow/10 text-chart-yellow'
                }`}>
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
