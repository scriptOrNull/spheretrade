import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, Shield, Zap, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroBg from '@/assets/hero-bg.jpg';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-gradient-primary">TradeSphere</span>
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
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-block px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-sm font-medium mb-6">
              Next-Gen Trading Simulation
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6">
              <span className="text-foreground">Invest in </span>
              <span className="text-gradient-primary">Strategy</span>
              <span className="text-foreground">.</span>
              <br />
              <span className="text-foreground">Secure Your </span>
              <span className="text-gradient-gold">Future</span>
              <span className="text-foreground">.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Master the art of trading with our professional simulation platform. 
              Practice strategies, build portfolios, and gain confidence — risk-free.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 px-8 glow-primary">
                  Start Trading <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-secondary px-8">
                  Sign In
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Why TradeSphere?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">Everything you need to learn, practice, and master stock trading.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: TrendingUp, title: 'Real-Time Simulation', desc: 'Trade with simulated market data that updates every 10 seconds. Experience realistic market conditions.' },
              { icon: Shield, title: 'Risk-Free Practice', desc: 'Build and test your strategies without risking real money. Learn from your mistakes safely.' },
              { icon: Zap, title: 'Instant Execution', desc: 'Buy and sell stocks instantly. Manage your portfolio with professional-grade tools.' },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="bg-gradient-card rounded-xl border border-border p-8 hover:border-primary/30 transition-all group"
              >
                <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4 group-hover:glow-primary transition-all">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">© 2026 TradeSphere. All rights reserved.</span>
          <span className="text-sm text-muted-foreground">Trading simulation platform — not real financial advice.</span>
        </div>
      </footer>
    </div>
  );
}
