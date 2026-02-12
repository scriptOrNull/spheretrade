export interface TierBadge {
  name: string;
  color: string;
  bgColor: string;
  minTrades: number;
}

export const TIERS: TierBadge[] = [
  { name: 'Beginner', color: 'text-muted-foreground', bgColor: 'bg-muted', minTrades: 0 },
  { name: 'Bronze', color: 'text-chart-yellow', bgColor: 'bg-chart-yellow/10', minTrades: 5 },
  { name: 'Silver', color: 'text-muted-foreground', bgColor: 'bg-secondary', minTrades: 15 },
  { name: 'Gold', color: 'text-chart-yellow', bgColor: 'bg-chart-yellow/15', minTrades: 30 },
  { name: 'Platinum', color: 'text-primary', bgColor: 'bg-primary/10', minTrades: 60 },
  { name: 'Pro', color: 'text-accent', bgColor: 'bg-accent/10', minTrades: 100 },
];

export function getTierByTrades(tradeCount: number): TierBadge {
  let tier = TIERS[0];
  for (const t of TIERS) {
    if (tradeCount >= t.minTrades) tier = t;
  }
  return tier;
}
