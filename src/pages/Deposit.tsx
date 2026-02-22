import { useState, useEffect, useCallback, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, Clock, ArrowRight, ArrowLeft, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';

const TIMER_DURATION = 30 * 60; // 30 minutes in seconds

type Step = 'select' | 'payment' | 'confirm' | 'done';

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
  const [step, setStep] = useState<Step>('select');
  const [secondsLeft, setSecondsLeft] = useState(TIMER_DURATION);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    supabase.functions.invoke('get-wallets').then(({ data, error }) => {
      if (!error && data) {
        const walletData = Array.isArray(data) ? data : [];
        const map: Record<string, string> = {};
        const available: string[] = [];
        walletData.forEach((w: any) => {
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

  // Timer logic
  const startTimer = useCallback(() => {
    setSecondsLeft(TIMER_DURATION);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const timerPercent = (secondsLeft / TIMER_DURATION) * 100;

  const copyAddress = () => {
    if (!wallets[crypto]) return;
    navigator.clipboard.writeText(wallets[crypto]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const goToPayment = () => {
    if (!crypto || !wallets[crypto]) return;
    setStep('payment');
    startTimer();
  };

  const goToConfirm = () => {
    if (secondsLeft <= 0) {
      toast({ title: 'Session expired', description: 'Please start a new deposit.', variant: 'destructive' });
      resetFlow();
      return;
    }
    setStep('confirm');
  };

  const resetFlow = () => {
    setStep('select');
    setAmount('');
    setTxHash('');
    setSecondsLeft(TIMER_DURATION);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleSubmit = async () => {
    if (!user || !amount || !txHash || !wallets[crypto]) return;
    if (Number(amount) <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }
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

      if (timerRef.current) clearInterval(timerRef.current);
      setStep('done');
      const { data } = await supabase.from('deposits').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      setDeposits(data || []);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const stepIndicator = (
    <div className="flex items-center justify-center gap-2 mb-8">
      {(['select', 'payment', 'confirm'] as const).map((s, i) => {
        const stepNames = ['Select', 'Send', 'Confirm'];
        const isActive = ['select', 'payment', 'confirm'].indexOf(step === 'done' ? 'confirm' : step) >= i;
        return (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
            }`}>
              {step === 'done' && i === 2 ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:inline ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{stepNames[i]}</span>
            {i < 2 && <div className={`w-8 sm:w-12 h-0.5 ${isActive ? 'bg-primary' : 'bg-border'}`} />}
          </div>
        );
      })}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Deposit Funds</h1>
        <p className="text-muted-foreground text-sm">Fund your account with cryptocurrency</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Main Flow */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-3 bg-card border border-border rounded-xl p-5 sm:p-8">
          {cryptoOptions.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No deposit wallets are currently available.</p>
              <p className="text-muted-foreground text-sm mt-1">Please contact support.</p>
            </div>
          ) : (
            <>
              {stepIndicator}

              <AnimatePresence mode="wait">
                {/* Step 1: Select Crypto */}
                {step === 'select' && (
                  <motion.div key="select" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground mb-1">Choose Cryptocurrency</h2>
                      <p className="text-sm text-muted-foreground">Select which cryptocurrency you'd like to deposit.</p>
                    </div>
                    <div>
                      <Label>Cryptocurrency</Label>
                      <Select value={crypto} onValueChange={setCrypto}>
                        <SelectTrigger className="mt-1 bg-secondary border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {cryptoOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={goToPayment} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90" disabled={!crypto}>
                      Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </motion.div>
                )}

                {/* Step 2: Show Address + Timer */}
                {step === 'payment' && (
                  <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground mb-1">Send {crypto}</h2>
                      <p className="text-sm text-muted-foreground">Enter the amount and send your {crypto} to the address below within 30 minutes.</p>
                    </div>

                    {/* Amount */}
                    <div>
                      <Label>Amount to Send (USD equivalent)</Label>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                        className="mt-1 bg-secondary border-border font-mono"
                        placeholder="e.g. 500.00"
                      />
                    </div>

                    {/* Timer */}
                    <div className={`flex items-center gap-3 p-4 rounded-lg border ${
                      secondsLeft <= 300 ? 'border-destructive/30 bg-destructive/5' : 'border-chart-yellow/30 bg-chart-yellow/5'
                    }`}>
                      <Clock className={`h-5 w-5 shrink-0 ${secondsLeft <= 300 ? 'text-destructive' : 'text-chart-yellow'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${secondsLeft <= 300 ? 'text-destructive' : 'text-chart-yellow'}`}>
                            {secondsLeft <= 0 ? 'Session expired' : 'Time remaining'}
                          </span>
                          <span className={`font-mono font-bold text-sm ${secondsLeft <= 300 ? 'text-destructive' : 'text-chart-yellow'}`}>
                            {formatTime(secondsLeft)}
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ${secondsLeft <= 300 ? 'bg-destructive' : 'bg-chart-yellow'}`}
                            style={{ width: `${timerPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Address */}
                    <div>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wider">Send {crypto} to this address</Label>
                      <div className="mt-2 p-4 rounded-lg bg-secondary/50 border border-border">
                        <div className="flex items-center gap-2">
                          <code className="text-xs sm:text-sm text-foreground font-mono break-all flex-1">{wallets[crypto]}</code>
                          <Button type="button" variant="outline" size="icon" onClick={copyAddress} className="border-border shrink-0 h-8 w-8">
                            {copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">Important:</strong> Only send <strong>{crypto}</strong> to this address. Sending any other cryptocurrency may result in permanent loss of funds.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={resetFlow} className="border-border">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <Button
                        onClick={goToConfirm}
                        disabled={secondsLeft <= 0 || !amount || Number(amount) <= 0}
                        className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90"
                      >
                        I've Sent the Payment <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Enter TX Details */}
                {step === 'confirm' && (
                  <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground mb-1">Confirm Your Payment</h2>
                      <p className="text-sm text-muted-foreground">Enter the transaction hash so our team can verify your <strong className="text-foreground">${Number(amount).toFixed(2)}</strong> {crypto} deposit.</p>
                    </div>

                    <div>
                      <Label>Transaction Hash / ID</Label>
                      <Input
                        value={txHash}
                        onChange={e => setTxHash(e.target.value)}
                        required
                        className="mt-1 bg-secondary border-border font-mono text-xs"
                        placeholder="e.g. 0x1a2b3c4d5e6f..."
                      />
                      <p className="text-xs text-muted-foreground mt-1">You can find this in your wallet's transaction history.</p>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep('payment')} className="border-border">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={loading || !amount || !txHash}
                        className="flex-1 bg-gradient-primary text-primary-foreground hover:opacity-90"
                      >
                        {loading ? 'Submitting...' : 'Submit for Review'}
                        {!loading && <Upload className="ml-2 h-4 w-4" />}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step Done */}
                {step === 'done' && (
                  <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8 space-y-4">
                    <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="h-8 w-8 text-accent" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">Deposit Submitted!</h2>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      Your deposit is now pending review. Our team will verify the transaction and credit your account shortly.
                    </p>
                    <Button onClick={resetFlow} variant="outline" className="border-border mt-2">
                      Make Another Deposit
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </motion.div>

        {/* Deposit History */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-foreground mb-4">Deposit History</h2>
          <div className="space-y-3">
            {deposits.length === 0 ? (
              <p className="text-muted-foreground text-sm">No deposits yet</p>
            ) : deposits.map(d => (
              <div key={d.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                <div className="min-w-0">
                  <span className="font-mono text-foreground text-sm">{d.crypto_type}</span>
                  <span className="text-muted-foreground text-sm ml-2">${Number(d.amount).toFixed(2)}</span>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(d.created_at).toLocaleDateString()}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded shrink-0 ${
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
