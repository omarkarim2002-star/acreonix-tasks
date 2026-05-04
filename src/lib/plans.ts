export type Plan = 'free' | 'pro' | 'team'

export const PLAN_LIMITS = {
  free: {
    projects: 3,
    tasksPerProject: 20,
    aiExtractsPerMonth: 3,
    aiSchedulesPerWeek: 1,
    calendarViews: ['day'] as string[],
    completedHistoryDays: 30,
    timeTracker: false,
    insights: false,
    mindMapInteractive: false,
    teamMembers: 1,
    sharedProjects: false,
  },
  pro: {
    projects: Infinity,
    tasksPerProject: Infinity,
    aiExtractsPerMonth: Infinity,
    aiSchedulesPerWeek: Infinity,
    calendarViews: ['day', 'week', 'month'] as string[],
    completedHistoryDays: Infinity,
    timeTracker: true,
    insights: true,
    mindMapInteractive: true,
    teamMembers: 1,
    sharedProjects: false,
  },
  team: {
    projects: Infinity,
    tasksPerProject: Infinity,
    aiExtractsPerMonth: Infinity,
    aiSchedulesPerWeek: Infinity,
    calendarViews: ['day', 'week', 'month'] as string[],
    completedHistoryDays: Infinity,
    timeTracker: true,
    insights: true,
    mindMapInteractive: true,
    teamMembers: 5,
    sharedProjects: true,
  },
} as const

export const PLAN_PRICES = {
  free: { monthly: 0, label: 'Free' },
  pro: { monthly: 12, label: 'Pro', stripePriceId: process.env.STRIPE_PRO_PRICE_ID! },
  team: { monthly: 29, label: 'Team', stripePriceId: process.env.STRIPE_TEAM_PRICE_ID! },
}

export const UPGRADE_REASONS = {
  projects: 'You\'ve reached the 3-project limit on the free plan.',
  tasks: 'You\'ve reached the 20-task limit for this project on the free plan.',
  aiExtract: 'You\'ve used your 3 AI extracts this month on the free plan.',
  aiSchedule: 'You\'ve used your weekly AI schedule on the free plan.',
  calendarWeek: 'Week and month views are available on Pro and above.',
  history: 'Your completed task history is limited to 30 days on the free plan.',
  timeTracker: 'Time tracking is available on Pro and above.',
  insights: 'AI insights are available on Pro and above.',
  mindMap: 'Interactive mind maps are available on Pro and above.',
  team: 'Team collaboration is available on the Team plan.',
}

export function canUseFeature(plan: Plan, feature: keyof typeof UPGRADE_REASONS): boolean {
  switch (feature) {
    case 'timeTracker': return PLAN_LIMITS[plan].timeTracker
    case 'insights': return PLAN_LIMITS[plan].insights
    case 'mindMap': return PLAN_LIMITS[plan].mindMapInteractive
    case 'calendarWeek': return PLAN_LIMITS[plan].calendarViews.includes('week')
    case 'team': return PLAN_LIMITS[plan].sharedProjects
    default: return true
  }
}
