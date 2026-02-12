import { TierBadge } from '@/lib/badges';
import { Award } from 'lucide-react';

interface UserBadgeProps {
  tier: TierBadge;
  size?: 'sm' | 'md';
}

export default function UserBadge({ tier, size = 'sm' }: UserBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${tier.color} ${tier.bgColor} ${size === 'md' ? 'text-sm px-3 py-1' : ''}`}>
      <Award className={size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
      {tier.name}
    </span>
  );
}
