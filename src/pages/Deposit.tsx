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

export default function Deposit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wallets, setWallets] = useState<Record<string, string>>({});
  const [cryptoOptions, setCryptoOptions] = useState<string[]>([]);
  const [crypto, setCrypto] = useState('');
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deposits, setDeposits] = useState<any[]>([]);

  useEffect(() => {
    // Fetch admin-configured wallets
    supabase.from('admin_wallets').select('crypto_type, wallet_address').then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        const available: string[] = [];
        data.forEach(w => {
          if (w.wallet_address) {
            map[w.crypto_type] = w.wallet_address;
            available.push(w.crypto_type);
          }
        });
        setWallets(map);
        setCryptoOptions(available);
        if (available.length > 0 && !crypto) setCrypto(available[0]);
      }
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from('deposits').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).then(({ data }) => setDeposits(data || []));
  }, [user]);

  const copyAddress = () => {
    if (!wallets[crypto]) return;
    navigator.clipboard.writeText(wallets[crypto]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || !txHash || !wallets[crypto]) return;
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

      toast({ title: 'Deposit submitted', description: 'Awaiting approval.' });
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
          {cryptoOptions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No deposit wallets are currently available.</p>
              <p className="text-muted-foreground text-sm mt-1">Please contact support.</p>
            </div>
          ) : (
            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <Label>Cryptocurrency</Label>
                <Select value={crypto} onValueChange={setCrypto}>
                  <SelectTrigger className="mt-1 bg-secondary border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {cryptoOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Wallet Address</Label>
                <div className="flex mt-1 gap-2">
                  <Input value={wallets[crypto] || ''} readOnly className="bg-secondary border-border font-mono text-xs" />
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
          )}
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
