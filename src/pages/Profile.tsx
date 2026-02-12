import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { User, Mail, Wallet, Calendar, Award } from 'lucide-react';
import UserBadge from '@/components/UserBadge';
import { getTierByTrades, TIERS } from '@/lib/badges';

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [tradeCount, setTradeCount] = useState(0);

  useEffect(() => {
    if (profile) setFullName(profile.full_name);
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('type', ['buy', 'sell'])
      .then(({ count }) => setTradeCount(count || 0));
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      toast({ title: 'Profile updated' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const tier = getTierByTrades(tradeCount);
  const nextTier = TIERS.find(t => t.minTrades > tradeCount);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <p className="text-muted-foreground text-sm">Manage your account settings</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">Personal Information</h2>
          <div className="space-y-4">
            <div>
              <Label className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> Full Name</Label>
              <Input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="mt-1 bg-secondary border-border"
                placeholder="Your full name"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Email</Label>
              <Input value={profile?.email || ''} readOnly className="mt-1 bg-secondary border-border text-muted-foreground" />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
            </div>
            <Button onClick={handleSave} disabled={loading} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </motion.div>

        {/* Stats Sidebar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
          {/* Tier Card */}
          <div className="bg-gradient-card border border-border rounded-xl p-6 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Award className="h-8 w-8 text-primary" />
            </div>
            <UserBadge tier={tier} size="md" />
            <p className="text-xs text-muted-foreground mt-3">
              {tradeCount} trades completed
            </p>
            {nextTier && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{tier.name}</span>
                  <span>{nextTier.name}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-primary transition-all"
                    style={{ width: `${Math.min(100, ((tradeCount - (TIERS[TIERS.indexOf(tier)]?.minTrades || 0)) / (nextTier.minTrades - (TIERS[TIERS.indexOf(tier)]?.minTrades || 0))) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{nextTier.minTrades - tradeCount} trades to {nextTier.name}</p>
              </div>
            )}
            {!nextTier && <p className="text-xs text-accent mt-2">🎉 Max tier reached!</p>}
          </div>

          {/* Account Info */}
          <div className="bg-gradient-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Wallet className="h-4 w-4 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Wallet Balance</div>
                <div className="text-foreground font-bold font-mono">${Number(profile?.wallet_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-primary" />
              <div>
                <div className="text-xs text-muted-foreground">Member Since</div>
                <div className="text-foreground text-sm">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
