import { useEffect, useState, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import StatsCard from '@/components/StatsCard';
import {
  Users, ArrowDownToLine, ArrowUpFromLine, TrendingUp, Wallet,
  Search, Trash2, AlertTriangle, BarChart3, Clock, Send, MessageCircle,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import UserBadge from '@/components/UserBadge';
import { getTierByTrades } from '@/lib/badges';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import AdminSupportChat from '@/components/AdminSupportChat';

export default function Admin() {
  const { isAdmin, profile } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [balanceEdit, setBalanceEdit] = useState<Record<string, string>>({});
  const [adminWallets, setAdminWallets] = useState<any[]>([]);
  const [walletEdits, setWalletEdits] = useState<Record<string, string>>({});
  const [userTradeCounts, setUserTradeCounts] = useState<Record<string, number>>({});
  const [deletionRequests, setDeletionRequests] = useState<any[]>([]);

  // Transfer
  const [transferCode, setTransferCode] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  // Filters
  const [userSearch, setUserSearch] = useState('');
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('all');
  const [depositFilter, setDepositFilter] = useState('all');
  const [withdrawalFilter, setWithdrawalFilter] = useState('all');

  const fetchAll = async () => {
    const [u, d, w, t, aw, dr] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('deposits').select('*').order('created_at', { ascending: false }),
      supabase.from('withdrawals').select('*').order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('admin_wallets').select('*').order('crypto_type'),
      supabase.from('account_deletions').select('*').order('requested_at', { ascending: false }),
    ]);
    setUsers(u.data || []);
    setDeposits(d.data || []);
    setWithdrawals(w.data || []);
    setTransactions(t.data || []);
    setAdminWallets(aw.data || []);
    setDeletionRequests(dr.data || []);
    const edits: Record<string, string> = {};
    (aw.data || []).forEach((w: any) => { edits[w.id] = w.wallet_address; });
    setWalletEdits(edits);

    const allTx = t.data || [];
    const counts: Record<string, number> = {};
    allTx.filter((tx: any) => tx.type === 'buy' || tx.type === 'sell').forEach((tx: any) => {
      counts[tx.user_id] = (counts[tx.user_id] || 0) + 1;
    });
    setUserTradeCounts(counts);
  };

  useEffect(() => { if (isAdmin) fetchAll(); }, [isAdmin]);

  // Filtered data
  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    const q = userSearch.toLowerCase();
    return users.filter(u => u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  }, [users, userSearch]);

  const filteredDeposits = useMemo(() => {
    if (depositFilter === 'all') return deposits;
    return deposits.filter(d => d.status === depositFilter);
  }, [deposits, depositFilter]);

  const filteredWithdrawals = useMemo(() => {
    if (withdrawalFilter === 'all') return withdrawals;
    return withdrawals.filter(w => w.status === withdrawalFilter);
  }, [withdrawals, withdrawalFilter]);

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;
    if (txTypeFilter !== 'all') filtered = filtered.filter(t => t.type === txTypeFilter);
    if (txSearch) {
      const q = txSearch.toLowerCase();
      filtered = filtered.filter(t => {
        const u = users.find(u => u.id === t.user_id);
        return u?.email?.toLowerCase().includes(q) || t.stock_symbol?.toLowerCase().includes(q);
      });
    }
    return filtered;
  }, [transactions, txTypeFilter, txSearch, users]);

  // Analytics
  const totalDeposits = deposits.filter(d => d.status === 'approved').reduce((s, d) => s + Number(d.amount), 0);
  const totalWithdrawals = withdrawals.filter(w => w.status === 'approved').reduce((s, w) => s + Number(w.amount), 0);
  const totalVolume = transactions.filter(t => t.type === 'buy' || t.type === 'sell').reduce((s, t) => s + Number(t.amount), 0);
  const pendingDeletions = deletionRequests.filter(d => d.status === 'pending').length;

  const txTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    transactions.forEach(t => { counts[t.type] = (counts[t.type] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  const monthlyVolumeData = useMemo(() => {
    const months: Record<string, number> = {};
    transactions.forEach(t => {
      const month = new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      months[month] = (months[month] || 0) + Number(t.amount);
    });
    return Object.entries(months).slice(-6).map(([month, volume]) => ({ month, volume }));
  }, [transactions]);

  const PIE_COLORS = [
    'hsl(210, 100%, 52%)', 'hsl(145, 65%, 42%)',
    'hsl(0, 72%, 51%)', 'hsl(45, 93%, 58%)', 'hsl(280, 60%, 50%)',
  ];

  if (!isAdmin) return <AdminLayout><p className="text-destructive">Access denied</p></AdminLayout>;

  const handleDepositAction = async (id: string, userId: string, amount: number, action: 'approved' | 'rejected') => {
    await supabase.from('deposits').update({ status: action }).eq('id', id);
    if (action === 'approved') {
      const user = users.find(u => u.id === userId);
      if (user) {
        await supabase.from('profiles').update({ wallet_balance: Number(user.wallet_balance) + amount }).eq('id', userId);
      }
    }
    // Also update the corresponding transaction status
    const txStatus = action === 'approved' ? 'completed' : 'rejected';
    await supabase.from('transactions').update({ status: txStatus })
      .eq('user_id', userId)
      .eq('type', 'deposit')
      .eq('amount', amount)
      .eq('status', 'pending');
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
    // Also update the corresponding transaction status
    const txStatus = action === 'approved' ? 'completed' : 'rejected';
    await supabase.from('transactions').update({ status: txStatus })
      .eq('user_id', userId)
      .eq('type', 'withdrawal')
      .eq('amount', amount)
      .eq('status', 'pending');
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

  const handleDeleteUser = async (userId: string) => {
    try {
      const res = await supabase.functions.invoke('delete-user', { body: { userId } });
      if (res.error) throw res.error;
      toast({ title: 'User deleted successfully' });
      fetchAll();
    } catch {
      toast({ title: 'Failed to delete user', variant: 'destructive' });
    }
  };

  const handleDeletionRequestAction = async (id: string, userId: string, action: 'approve' | 'cancel') => {
    if (action === 'approve') {
      await handleDeleteUser(userId);
      await supabase.from('account_deletions').delete().eq('id', id);
    } else {
      await supabase.from('account_deletions').update({ status: 'cancelled' }).eq('id', id);
    }
    toast({ title: action === 'approve' ? 'User deleted' : 'Deletion cancelled' });
    fetchAll();
  };
  const handleTransfer = async () => {
    const amount = Number(transferAmount);
    if (!transferCode.trim() || isNaN(amount) || amount <= 0) {
      toast({ title: 'Enter a valid user ID and amount', variant: 'destructive' });
      return;
    }
    setTransferLoading(true);
    try {
      const { data: recipient } = await supabase
        .from('profiles')
        .select('id, full_name, email, wallet_balance')
        .eq('id', transferCode.trim())
        .single();
      if (!recipient) {
        toast({ title: 'User not found with that ID', variant: 'destructive' });
        setTransferLoading(false);
        return;
      }
      await supabase.from('profiles').update({
        wallet_balance: Number(recipient.wallet_balance) + amount,
      }).eq('id', recipient.id);
      
      await supabase.from('transactions').insert({
        user_id: recipient.id,
        type: 'transfer',
        amount,
        status: 'completed',
        stock_symbol: null,
      });

      toast({ title: `$${amount.toLocaleString()} sent to ${recipient.full_name || recipient.email}` });
      setTransferCode('');
      setTransferAmount('');
      fetchAll();
    } catch {
      toast({ title: 'Transfer failed', variant: 'destructive' });
    }
    setTransferLoading(false);
  };



  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm">Manage users, deposits, withdrawals, and wallets</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
        <StatsCard title="Admin Wallet" value={`$${Number(profile?.wallet_balance || 0).toLocaleString()}`} icon={Wallet} />
        <StatsCard title="Total Users" value={String(users.length)} icon={Users} delay={0.1} />
        <StatsCard title="Total Deposits" value={`$${totalDeposits.toFixed(2)}`} icon={ArrowDownToLine} delay={0.2} />
        <StatsCard title="Total Withdrawals" value={`$${totalWithdrawals.toFixed(2)}`} icon={ArrowUpFromLine} delay={0.3} />
        <StatsCard title="Trading Volume" value={`$${totalVolume.toFixed(2)}`} icon={TrendingUp} delay={0.4} />
        <StatsCard title="Pending Deletions" value={String(pendingDeletions)} icon={AlertTriangle} delay={0.5} />
      </div>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList className="bg-secondary border border-border flex-wrap h-auto gap-1">
          <TabsTrigger value="analytics" className="text-xs sm:text-sm">Analytics</TabsTrigger>
          <TabsTrigger value="deposits" className="text-xs sm:text-sm">Deposits ({deposits.filter(d => d.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="withdrawals" className="text-xs sm:text-sm">Withdrawals ({withdrawals.filter(w => w.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
          <TabsTrigger value="wallets" className="text-xs sm:text-sm">Wallets</TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs sm:text-sm">Transactions</TabsTrigger>
          <TabsTrigger value="transfer" className="text-xs sm:text-sm">Transfer</TabsTrigger>
           <TabsTrigger value="deletions" className="text-xs sm:text-sm">Deletions ({pendingDeletions})</TabsTrigger>
          <TabsTrigger value="support" className="text-xs sm:text-sm"><MessageCircle className="h-3.5 w-3.5 mr-1" />Support</TabsTrigger>
         </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Monthly Volume</h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyVolumeData}>
                    <XAxis dataKey="month" tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'hsl(215, 15%, 55%)', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip
                      contentStyle={{ background: 'hsl(220, 18%, 11%)', border: '1px solid hsl(220, 16%, 18%)', borderRadius: '8px', color: 'hsl(210, 20%, 95%)' }}
                      formatter={(v: number) => [`$${v.toFixed(2)}`, 'Volume']}
                    />
                    <Bar dataKey="volume" fill="hsl(210, 100%, 52%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Transaction Types</h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={txTypeData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {txTypeData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'hsl(220, 18%, 11%)', border: '1px solid hsl(220, 16%, 18%)', borderRadius: '8px', color: 'hsl(210, 20%, 95%)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Deposits Tab */}
        <TabsContent value="deposits">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-3 border-b border-border flex items-center gap-2">
              <Select value={depositFilter} onValueChange={setDepositFilter}>
                <SelectTrigger className="w-32 h-8 text-xs bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead><tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">User</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Crypto</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Amount</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Hash</th>
                  <th className="text-center px-4 py-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Actions</th>
                </tr></thead>
                <tbody>
                  {filteredDeposits.map(d => {
                    const u = users.find(u => u.id === d.user_id);
                    return (
                      <tr key={d.id} className="border-b border-border/50">
                        <td className="px-4 py-3 text-foreground text-xs sm:text-sm">{u?.email || d.user_id.slice(0, 8)}</td>
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
                  {filteredDeposits.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No deposits found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Withdrawals Tab */}
        <TabsContent value="withdrawals">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-3 border-b border-border flex items-center gap-2">
              <Select value={withdrawalFilter} onValueChange={setWithdrawalFilter}>
                <SelectTrigger className="w-32 h-8 text-xs bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead><tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">User</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Crypto</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Amount</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Wallet</th>
                  <th className="text-center px-4 py-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Actions</th>
                </tr></thead>
                <tbody>
                  {filteredWithdrawals.map(w => {
                    const u = users.find(u => u.id === w.user_id);
                    return (
                      <tr key={w.id} className="border-b border-border/50">
                        <td className="px-4 py-3 text-foreground text-xs sm:text-sm">{u?.email || w.user_id.slice(0, 8)}</td>
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
                  {filteredWithdrawals.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No withdrawals found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="pl-9 h-8 text-xs bg-secondary border-border"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead><tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Email</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">User ID</th>
                  <th className="text-center px-4 py-3 text-muted-foreground font-medium">Tier</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Balance</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Adjust</th>
                  <th className="text-center px-4 py-3 text-muted-foreground font-medium">Actions</th>
                </tr></thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="border-b border-border/50">
                      <td className="px-4 py-3 text-foreground">{u.full_name}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs sm:text-sm">{u.email}</td>
                      <td className="px-4 py-3 font-mono text-xs text-primary">{u.user_code}</td>
                      <td className="px-4 py-3 text-center">
                        <UserBadge tier={getTierByTrades(userTradeCounts[u.id] || 0)} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-foreground">${Number(u.wallet_balance).toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 items-center justify-end">
                          <Input
                            type="number"
                            value={balanceEdit[u.id] || ''}
                            onChange={e => setBalanceEdit(prev => ({ ...prev, [u.id]: e.target.value }))}
                            className="w-20 sm:w-24 h-7 text-xs bg-secondary border-border font-mono"
                            placeholder="New bal"
                          />
                          <Button size="sm" onClick={() => handleBalanceUpdate(u.id)} className="text-xs h-7 bg-primary/10 text-primary hover:bg-primary/20">Set</Button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Permanently delete <strong>{u.email}</strong> and all their data? This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteUser(u.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No users found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Wallets Tab */}
        <TabsContent value="wallets">
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Deposit Wallet Addresses</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-6">Set the wallet addresses users will send deposits to. Leave empty to disable a crypto type.</p>
            <div className="space-y-4">
              {adminWallets.map(w => (
                <div key={w.id} className="flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-3">
                  <div className="w-20 shrink-0">
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
                  <Button size="sm" onClick={() => handleWalletUpdate(w.id)} className="h-9 bg-primary/10 text-primary hover:bg-primary/20 text-xs shrink-0">
                    Save
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-3 border-b border-border flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[150px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={txSearch}
                  onChange={e => setTxSearch(e.target.value)}
                  placeholder="Search user or stock..."
                  className="pl-9 h-8 text-xs bg-secondary border-border"
                />
              </div>
              <Select value={txTypeFilter} onValueChange={setTxTypeFilter}>
                <SelectTrigger className="w-28 h-8 text-xs bg-secondary border-border"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead><tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Type</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">User</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Stock</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Amount</th>
                  <th className="text-center px-4 py-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Date</th>
                </tr></thead>
                <tbody>
                  {filteredTransactions.map(t => {
                    const u = users.find(u => u.id === t.user_id);
                    return (
                      <tr key={t.id} className="border-b border-border/50">
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded ${t.type === 'buy' ? 'bg-accent/10 text-accent' : t.type === 'sell' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>{t.type}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs sm:text-sm">{u?.email || t.user_id.slice(0, 8)}</td>
                        <td className="px-4 py-3 font-mono text-foreground">{t.stock_symbol || '—'}</td>
                        <td className="px-4 py-3 text-right font-mono text-foreground">${Number(t.amount).toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs ${t.status === 'completed' ? 'text-accent' : t.status === 'pending' ? 'text-chart-yellow' : 'text-destructive'}`}>{t.status}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</td>
                      </tr>
                    );
                  })}
                  {filteredTransactions.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No transactions found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Transfer Tab */}
        <TabsContent value="transfer">
          <div className="bg-card border border-border rounded-xl p-4 sm:p-6 max-w-lg">
            <div className="flex items-center gap-2 mb-4">
              <Send className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Send Balance to User</h3>
            </div>
            <p className="text-muted-foreground text-sm mb-6">Transfer funds to any user. Select a recipient and enter the amount.</p>
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Select User</Label>
                <Select value={transferCode} onValueChange={setTransferCode}>
                  <SelectTrigger className="bg-secondary border-border text-sm h-10">
                    <SelectValue placeholder="Choose a user..." />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border z-50">
                    {users.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || 'No name'} — {u.email} (${Number(u.wallet_balance).toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Amount ($)</Label>
                <Input
                  type="number"
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  placeholder="0.00"
                  className="bg-secondary border-border font-mono text-sm h-10"
                  min={0}
                />
              </div>
              <Button
                onClick={handleTransfer}
                disabled={transferLoading || !transferCode || !transferAmount}
                className="w-full bg-gradient-primary text-primary-foreground"
              >
                {transferLoading ? 'Sending...' : 'Send Transfer'}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Deletion Requests Tab */}
        <TabsContent value="deletions">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[500px]">
                <thead><tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">User</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Requested</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Delete After</th>
                  <th className="text-center px-4 py-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Actions</th>
                </tr></thead>
                <tbody>
                  {deletionRequests.map(dr => {
                    const u = users.find(u => u.id === dr.user_id);
                    const isExpired = new Date(dr.delete_after) <= new Date();
                    return (
                      <tr key={dr.id} className="border-b border-border/50">
                        <td className="px-4 py-3 text-foreground text-xs sm:text-sm">{u?.email || dr.user_id.slice(0, 8)}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(dr.requested_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-xs">
                          <span className={isExpired ? 'text-destructive' : 'text-chart-yellow'}>
                            <Clock className="inline h-3 w-3 mr-1" />
                            {new Date(dr.delete_after).toLocaleDateString()}
                            {isExpired && ' (expired)'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-1 rounded ${dr.status === 'pending' ? 'bg-chart-yellow/10 text-chart-yellow' : 'bg-muted text-muted-foreground'}`}>{dr.status}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {dr.status === 'pending' && (
                            <div className="flex gap-2 justify-end">
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" className="bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs h-7">Delete Now</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Permanently delete {u?.email || 'this user'} and all their data?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeletionRequestAction(dr.id, dr.user_id, 'approve')} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                              <Button size="sm" variant="ghost" onClick={() => handleDeletionRequestAction(dr.id, dr.user_id, 'cancel')} className="text-xs h-7">Cancel Request</Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {deletionRequests.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No deletion requests</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Support Chat Tab */}
        <TabsContent value="support">
          <AdminSupportChat users={users} />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
