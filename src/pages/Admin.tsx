import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import StatsCard from '@/components/StatsCard';
import { Users, ArrowDownToLine, ArrowUpFromLine, TrendingUp, Wallet } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

export default function Admin() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [balanceEdit, setBalanceEdit] = useState<Record<string, string>>({});
  const [adminWallets, setAdminWallets] = useState<any[]>([]);
  const [walletEdits, setWalletEdits] = useState<Record<string, string>>({});

  const fetchAll = async () => {
    const [u, d, w, t, aw] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('deposits').select('*').order('created_at', { ascending: false }),
      supabase.from('withdrawals').select('*').order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('admin_wallets').select('*').order('crypto_type'),
    ]);
    setUsers(u.data || []);
    setDeposits(d.data || []);
    setWithdrawals(w.data || []);
    setTransactions(t.data || []);
    setAdminWallets(aw.data || []);
    // Init wallet edits
    const edits: Record<string, string> = {};
    (aw.data || []).forEach((w: any) => { edits[w.id] = w.wallet_address; });
    setWalletEdits(edits);
  };

  useEffect(() => { if (isAdmin) fetchAll(); }, [isAdmin]);

  if (!isAdmin) return <DashboardLayout><p className="text-destructive">Access denied</p></DashboardLayout>;

  const handleDepositAction = async (id: string, userId: string, amount: number, action: 'approved' | 'rejected') => {
    await supabase.from('deposits').update({ status: action }).eq('id', id);
    if (action === 'approved') {
      const user = users.find(u => u.id === userId);
      if (user) {
        await supabase.from('profiles').update({ wallet_balance: Number(user.wallet_balance) + amount }).eq('id', userId);
      }
    }
    toast({ title: `Deposit ${action}` });
    fetchAll();
  };

  const handleWithdrawalAction = async (id: string, userId: string, amount: number, action: 'approved' | 'rejected') => {
    await supabase.from('withdrawals').update({ status: action }).eq('id', id);
    if (action === 'approved') {
      const user = users.find(u => u.id === userId);
      if (user) {
        await supabase.from('profiles').update({ wallet_balance: Math.max(0, Number(user.wallet_balance) - amount) }).eq('id', userId);
      }
    }
    toast({ title: `Withdrawal ${action}` });
    fetchAll();
  };

  const handleBalanceUpdate = async (userId: string) => {
    const newBal = Number(balanceEdit[userId]);
    if (isNaN(newBal)) return;
    await supabase.from('profiles').update({ wallet_balance: newBal }).eq('id', userId);
    toast({ title: 'Balance updated' });
    fetchAll();
  };

  const handleWalletUpdate = async (walletId: string) => {
    const addr = walletEdits[walletId]?.trim();
    if (addr === undefined) return;
    await supabase.from('admin_wallets').update({ wallet_address: addr, updated_at: new Date().toISOString() }).eq('id', walletId);
    toast({ title: 'Wallet address updated' });
    fetchAll();
  };

  const totalDeposits = deposits.filter(d => d.status === 'approved').reduce((s, d) => s + Number(d.amount), 0);
  const totalWithdrawals = withdrawals.filter(w => w.status === 'approved').reduce((s, w) => s + Number(w.amount), 0);
  const totalVolume = transactions.filter(t => t.type === 'buy' || t.type === 'sell').reduce((s, t) => s + Number(t.amount), 0);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm">Manage users, deposits, withdrawals, and wallets</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Total Users" value={String(users.length)} icon={Users} />
        <StatsCard title="Total Deposits" value={`$${totalDeposits.toFixed(2)}`} icon={ArrowDownToLine} delay={0.1} />
        <StatsCard title="Total Withdrawals" value={`$${totalWithdrawals.toFixed(2)}`} icon={ArrowUpFromLine} delay={0.2} />
        <StatsCard title="Trading Volume" value={`$${totalVolume.toFixed(2)}`} icon={TrendingUp} delay={0.3} />
      </div>

      <Tabs defaultValue="deposits" className="space-y-4">
        <TabsList className="bg-secondary border border-border">
          <TabsTrigger value="deposits">Deposits ({deposits.filter(d => d.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals ({withdrawals.filter(w => w.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="deposits">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">User</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Crypto</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Hash</th>
                <th className="text-center px-4 py-3 text-muted-foreground font-medium">Status</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {deposits.map(d => {
                  const u = users.find(u => u.id === d.user_id);
                  return (
                    <tr key={d.id} className="border-b border-border/50">
                      <td className="px-4 py-3 text-foreground">{u?.email || d.user_id.slice(0, 8)}</td>
                      <td className="px-4 py-3 font-mono text-foreground">{d.crypto_type}</td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">${Number(d.amount).toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-[120px] truncate">{d.transaction_hash}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded ${d.status === 'approved' ? 'bg-accent/10 text-accent' : d.status === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-chart-yellow/10 text-chart-yellow'}`}>{d.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {d.status === 'pending' && (
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" onClick={() => handleDepositAction(d.id, d.user_id, Number(d.amount), 'approved')} className="bg-accent/10 text-accent hover:bg-accent/20 text-xs h-7">Approve</Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDepositAction(d.id, d.user_id, Number(d.amount), 'rejected')} className="text-destructive text-xs h-7">Reject</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="withdrawals">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">User</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Crypto</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Wallet</th>
                <th className="text-center px-4 py-3 text-muted-foreground font-medium">Status</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {withdrawals.map(w => {
                  const u = users.find(u => u.id === w.user_id);
                  return (
                    <tr key={w.id} className="border-b border-border/50">
                      <td className="px-4 py-3 text-foreground">{u?.email || w.user_id.slice(0, 8)}</td>
                      <td className="px-4 py-3 font-mono text-foreground">{w.crypto_type}</td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">${Number(w.amount).toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground max-w-[120px] truncate">{w.wallet_address}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-1 rounded ${w.status === 'approved' ? 'bg-accent/10 text-accent' : w.status === 'rejected' ? 'bg-destructive/10 text-destructive' : 'bg-chart-yellow/10 text-chart-yellow'}`}>{w.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {w.status === 'pending' && (
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" onClick={() => handleWithdrawalAction(w.id, w.user_id, Number(w.amount), 'approved')} className="bg-accent/10 text-accent hover:bg-accent/20 text-xs h-7">Approve</Button>
                            <Button size="sm" variant="ghost" onClick={() => handleWithdrawalAction(w.id, w.user_id, Number(w.amount), 'rejected')} className="text-destructive text-xs h-7">Reject</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Name</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Email</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Balance</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Adjust</th>
              </tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-border/50">
                    <td className="px-4 py-3 text-foreground">{u.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3 text-right font-mono text-foreground">${Number(u.wallet_balance).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 items-center justify-end">
                        <Input
                          type="number"
                          value={balanceEdit[u.id] || ''}
                          onChange={e => setBalanceEdit(prev => ({ ...prev, [u.id]: e.target.value }))}
                          className="w-24 h-7 text-xs bg-secondary border-border font-mono"
                          placeholder="New bal"
                        />
                        <Button size="sm" onClick={() => handleBalanceUpdate(u.id)} className="text-xs h-7 bg-primary/10 text-primary hover:bg-primary/20">Set</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="wallets">
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Deposit Wallet Addresses</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-6">Set the wallet addresses users will send deposits to. Leave empty to disable a crypto type.</p>
            <div className="space-y-4">
              {adminWallets.map(w => (
                <div key={w.id} className="flex items-end gap-3">
                  <div className="w-20">
                    <Label className="text-xs text-muted-foreground">{w.crypto_type}</Label>
                  </div>
                  <div className="flex-1">
                    <Input
                      value={walletEdits[w.id] || ''}
                      onChange={e => setWalletEdits(prev => ({ ...prev, [w.id]: e.target.value }))}
                      className="bg-secondary border-border font-mono text-xs h-9"
                      placeholder={`Enter ${w.crypto_type} wallet address`}
                    />
                  </div>
                  <Button size="sm" onClick={() => handleWalletUpdate(w.id)} className="h-9 bg-primary/10 text-primary hover:bg-primary/20 text-xs">
                    Save
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Type</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">User</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Stock</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Amount</th>
                <th className="text-center px-4 py-3 text-muted-foreground font-medium">Status</th>
                <th className="text-right px-4 py-3 text-muted-foreground font-medium">Date</th>
              </tr></thead>
              <tbody>
                {transactions.map(t => {
                  const u = users.find(u => u.id === t.user_id);
                  return (
                    <tr key={t.id} className="border-b border-border/50">
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded ${t.type === 'buy' ? 'bg-accent/10 text-accent' : t.type === 'sell' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>{t.type}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u?.email || t.user_id.slice(0, 8)}</td>
                      <td className="px-4 py-3 font-mono text-foreground">{t.stock_symbol || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">${Number(t.amount).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs ${t.status === 'completed' ? 'text-accent' : t.status === 'pending' ? 'text-chart-yellow' : 'text-destructive'}`}>{t.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
