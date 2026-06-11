import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PlanTier = 'free' | 'pro' | 'enterprise';

interface PremiumStore {
  tier: PlanTier;
  setPlan: (tier: PlanTier) => void;
}

export const usePremiumStore = create<PremiumStore>()(
  persist(
    (set) => ({
      tier: 'free',
      setPlan: (tier) => set({ tier }),
    }),
    { name: 'quiz-premium' }
  )
);

export const tierLabel: Record<PlanTier, string> = {
  free: 'Free',
  pro: 'Pro',
  enterprise: 'Enterprise',
};
