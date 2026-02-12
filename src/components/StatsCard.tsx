import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  delay?: number;
}

export default function StatsCard({ title, value, icon: Icon, trend, trendUp, delay = 0 }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-gradient-card rounded-xl border border-border p-5 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      {trend && (
        <div className={`text-xs mt-1 ${trendUp ? 'text-accent' : 'text-destructive'}`}>
          {trendUp ? '↑' : '↓'} {trend}
        </div>
      )}
    </motion.div>
  );
}
