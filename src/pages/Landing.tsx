import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { TrendingUp, Shield, Zap, ArrowRight, BarChart3, Globe, Users, Star, ChevronRight, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroBg from '@/assets/hero-bg.jpg';
import { useRef } from 'react';

const stats = [
  { value: '$2.4B+', label: 'Assets Under Management' },
  { value: '150K+', label: 'Active Traders' },
  { value: '99.9%', label: 'Platform Uptime' },
  { value: '50+', label: 'Markets Available' },
];

const features = [
  { icon: TrendingUp, title: 'Live Market Data', desc: 'Real-time stock prices and market trends powered by institutional-grade data feeds.' },
  { icon: Shield, title: 'Bank-Grade Security', desc: 'AES-256 encryption, 2FA authentication, and cold storage for maximum fund protection.' },
  { icon: Zap, title: 'Instant Execution', desc: 'Sub-millisecond order execution with smart order routing across multiple venues.' },
  { icon: BarChart3, title: 'Advanced Analytics', desc: 'Professional charting, P/L tracking, and portfolio analytics with real-time insights.' },
  { icon: Globe, title: 'Global Markets', desc: 'Access equities, crypto, and commodities from exchanges worldwide, 24/7.' },
  { icon: Headphones, title: '24/7 Dedicated Support', desc: 'Expert support team available around the clock via live chat, email, and phone.' },
];

const testimonials = [
  { name: 'James K.', role: 'Day Trader', text: 'TradeSphere transformed my trading. The execution speed and analytics are unmatched.', rating: 5 },
  { name: 'Sarah M.', role: 'Portfolio Manager', text: 'Finally a platform that combines professional tools with an intuitive interface. Highly recommend.', rating: 5 },
  { name: 'David L.', role: 'Crypto Investor', text: 'The multi-asset support and security features give me total confidence in my investments.', rating: 5 },
];

const steps = [
  { step: '01', title: 'Create Your Account', desc: 'Sign up in under 2 minutes with just your email. No paperwork required.' },
  { step: '02', title: 'Fund Your Wallet', desc: 'Deposit securely using Bitcoin, Ethereum, USDT, or other supported cryptocurrencies.' },
  { step: '03', title: 'Start Trading', desc: 'Browse markets, analyze charts, and execute trades with professional-grade tools.' },
];

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">TradeSphere</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg})`, y: heroY, opacity: 0.25 }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-20">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-8">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              Markets are open — Start trading now
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[1.05] tracking-tight mb-8">
              <span className="text-foreground">Invest in</span>
              <br />
              <span className="text-gradient-primary">Your Future</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Professional-grade trading platform with real-time data, instant execution, and bank-level security. Join 150,000+ traders worldwide.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Link to="/register">
                <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 px-10 h-13 text-base glow-primary">
                  Create Free Account <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-secondary px-10 h-13 text-base">
                  Sign In
                </Button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground">No credit card required · Free to sign up · Cancel anytime</p>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1.5">
            <div className="w-1 h-2 rounded-full bg-muted-foreground/50" />
          </div>
        </motion.div>
      </section>

      {/* Stats bar */}
      <section className="relative z-10 -mt-16 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass rounded-2xl p-8 grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-2xl md:text-3xl font-bold text-gradient-primary mb-1">{s.value}</div>
                <div className="text-xs md:text-sm text-muted-foreground">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-20">
            <span className="text-primary text-sm font-semibold uppercase tracking-widest">Platform Features</span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-3 mb-5">Built for Serious Traders</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">Every tool you need to analyze, execute, and manage — all in one platform.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="group relative bg-gradient-card rounded-2xl border border-border p-8 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute inset-0 rounded-2xl bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="p-3 rounded-xl bg-primary/10 w-fit mb-5 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-28 px-6 bg-secondary/30">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-20">
            <span className="text-primary text-sm font-semibold uppercase tracking-widest">Getting Started</span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-3 mb-5">Start Trading in Minutes</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">Three simple steps to go from signup to your first trade.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={s.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative"
              >
                <span className="text-6xl font-black text-primary/10 absolute -top-4 -left-2">{s.step}</span>
                <div className="relative pt-10">
                  <h3 className="text-xl font-bold text-foreground mb-3">{s.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
                {i < steps.length - 1 && (
                  <ChevronRight className="hidden md:block absolute top-12 -right-6 h-6 w-6 text-muted-foreground/30" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-20">
            <span className="text-primary text-sm font-semibold uppercase tracking-widest">Testimonials</span>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mt-3 mb-5">Trusted by Traders Worldwide</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-gradient-card rounded-2xl border border-border p-8"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-chart-yellow text-chart-yellow" />
                  ))}
                </div>
                <p className="text-foreground mb-6 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative rounded-3xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-primary opacity-90" />
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            <div className="relative z-10 py-20 px-8 text-center">
              <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-5">Ready to Start Investing?</h2>
              <p className="text-primary-foreground/80 mb-10 text-lg max-w-xl mx-auto">
                Join thousands of traders who trust TradeSphere. Create your free account and start trading in minutes.
              </p>
              <Link to="/register">
                <Button size="lg" className="bg-background text-foreground hover:bg-background/90 px-12 h-13 text-base font-semibold">
                  Get Started — It's Free <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-primary flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground">TradeSphere</span>
            </div>
            <div className="flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
              <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
            </div>
            <span className="text-sm text-muted-foreground">© 2026 TradeSphere. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
