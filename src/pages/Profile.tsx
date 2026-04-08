import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import { User, Mail, Wallet, Calendar, Award, Lock, Trash2, AlertTriangle, Copy } from 'lucide-react';
import UserBadge from '@/components/UserBadge';
import { getEffectiveTier, TIERS } from '@/lib/badges';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [tradeCount, setTradeCount] = useState(0);
  const [userCode, setUserCode] = useState('');

  // Password change
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  // Account deletion
  const [deletionRequest, setDeletionRequest] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

    supabase
      .from('profiles')
      .select('user_code')
      .eq('id', user.id)
      .single()
      .then(({ data }) => { if (data?.user_code) setUserCode(data.user_code); });

    // Check for existing deletion request
    supabase
      .from('account_deletions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle()
      .then(({ data }) => setDeletionRequest(data));
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

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Must be at least 6 characters', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setPwLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Password updated successfully' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setPwLoading(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!user) return;
    setDeleteLoading(true);
    try {
      const { error } = await supabase.from('account_deletions').insert({ user_id: user.id });
      if (error) throw error;
      const { data } = await supabase
        .from('account_deletions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .single();
      setDeletionRequest(data);
      setShowDeleteConfirm(false);
      toast({ title: 'Account deletion scheduled', description: 'Your account will be deleted in 7 days. You can cancel anytime before then.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    if (!user || !deletionRequest) return;
    setDeleteLoading(true);
    try {
      await supabase.from('account_deletions').delete().eq('id', deletionRequest.id);
      setDeletionRequest(null);
      toast({ title: 'Deletion cancelled', description: 'Your account will not be deleted.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleConfirmDeletion = async () => {
    if (!user || !deletionRequest) return;
    setDeleteLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await signOut();
      navigate('/');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setDeleteLoading(false);
    }
  };

  const tier = getEffectiveTier(tradeCount, profile?.assigned_tier);
  const nextTier = TIERS.find(t => t.minTrades > tradeCount);

  const getDeletionCountdown = () => {
    if (!deletionRequest) return null;
    const deleteAfter = new Date(deletionRequest.delete_after);
    const now = new Date();
    const diff = deleteAfter.getTime() - now.getTime();
    if (diff <= 0) return { days: 0, hours: 0, ready: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return { days, hours, ready: false };
  };

  const countdown = getDeletionCountdown();

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <p className="text-muted-foreground text-sm">Manage your account settings</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6 order-last lg:order-first">
          {/* Profile Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-xl p-4 sm:p-6">
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
              <div>
                <Label className="flex items-center gap-2"><Copy className="h-3.5 w-3.5" /> Your User ID</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input value={userCode} readOnly className="bg-secondary border-border font-mono text-primary tracking-widest" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(userCode);
                      toast({ title: 'User ID copied!' });
                    }}
                    className="shrink-0"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Share this code to receive transfers</p>
              </div>
              <Button onClick={handleSave} disabled={loading} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </motion.div>

          {/* Change Password */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-xl p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2"><Lock className="h-4 w-4" /> Change Password</h2>
            <p className="text-sm text-muted-foreground mb-6">Update your account password</p>
            <div className="space-y-4">
              <div>
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="mt-1 bg-secondary border-border"
                  placeholder="Min. 6 characters"
                />
              </div>
              <div>
                <Label>Confirm New Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="mt-1 bg-secondary border-border"
                  placeholder="Re-enter new password"
                />
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={pwLoading || !newPassword || !confirmPassword}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90"
              >
                {pwLoading ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </motion.div>

          {/* Delete Account */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-destructive/30 rounded-xl p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-destructive mb-1 flex items-center gap-2"><Trash2 className="h-4 w-4" /> Delete Account</h2>

            {!deletionRequest ? (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  Once you request account deletion, there will be a <strong className="text-foreground">7-day waiting period</strong> before your account is permanently deleted. You can cancel anytime during this period.
                </p>
                {!showDeleteConfirm ? (
                  <Button variant="outline" onClick={() => setShowDeleteConfirm(true)} className="border-destructive/30 text-destructive hover:bg-destructive/10">
                    Request Account Deletion
                  </Button>
                ) : (
                  <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Are you sure?</p>
                        <p className="text-xs text-muted-foreground mt-1">This will schedule your account for permanent deletion in 7 days. All your data, portfolio, and transaction history will be removed.</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)} className="text-muted-foreground">Cancel</Button>
                      <Button size="sm" onClick={handleRequestDeletion} disabled={deleteLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        {deleteLoading ? 'Processing...' : 'Yes, Delete My Account'}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">Account deletion scheduled</p>
                      {countdown && !countdown.ready ? (
                        <p className="text-sm text-muted-foreground mt-1">
                          Your account will be deleted in <strong className="text-foreground">{countdown.days} days and {countdown.hours} hours</strong>. You can cancel this request anytime before then.
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground mt-1">
                          The waiting period is over. You can now permanently delete your account.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={handleCancelDeletion} disabled={deleteLoading} className="border-border">
                    Cancel Deletion
                  </Button>
                  {countdown?.ready && (
                    <Button size="sm" onClick={handleConfirmDeletion} disabled={deleteLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {deleteLoading ? 'Deleting...' : 'Permanently Delete Account'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Stats Sidebar - shows first on mobile */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="order-first lg:order-last space-y-4">
          {/* Tier Card */}
          <div className="bg-gradient-card border border-border rounded-xl p-4 sm:p-6 text-center">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Award className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            </div>
            <UserBadge tier={tier} size="md" />
            <p className="text-xs text-muted-foreground mt-3">
              {profile?.assigned_tier ? 'Assigned by admin' : `${tradeCount} trades completed`}
            </p>
            {!profile?.assigned_tier && nextTier && (
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
            {(profile?.assigned_tier || !nextTier) && <p className="text-xs text-accent mt-2">🎉 {profile?.assigned_tier ? `${tier.name} tier` : 'Max tier reached!'}</p>}
          </div>

          {/* Account Info */}
          <div className="bg-gradient-card border border-border rounded-xl p-4 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Wallet className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Wallet Balance</div>
                <div className="text-foreground font-bold font-mono">${Number(profile?.wallet_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
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
