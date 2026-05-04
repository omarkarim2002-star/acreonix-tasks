export type Plan = 'free' | 'pro' | 'team'

// Sharing types
// 'pro_share'  — Pro user shares with another Pro user (purple, up to 5 shared lists)
// 'team_share' — Team plan shares within the team workspace (blue)

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
    proSharedLists: 0,        // cross-user sharing with other Pro users
    teamSharedProjects: false, // intra-team sharing
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
    sharedProjects: true,
    proSharedLists: 5,         // up to 5 shared lists with other Pro users (purple)
    teamSharedProjects: false, // no team workspace
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
    proSharedLists: 0,         // team users share within team only
    teamSharedProjects: true,  // intra-team sharing (blue)
  },
} as const

export const PLAN_PRICES = {
  free:  { monthly: 0,  label: 'Free' },
  pro:   { monthly: 12, label: 'Pro',  stripePriceId: process.env.STRIPE_PRO_PRICE_ID! },
  team:  { monthly: 29, label: 'Team', stripePriceId: process.env.STRIPE_TEAM_PRICE_ID! },
}

// Sharing highlight colours
export const SHARE_COLOURS = {
  pro_share:  '#7c3aed', // purple — Pro ↔ Pro cross-user sharing
  team_share: '#2563eb', // blue   — Team intra-team sharing
  own:        null,      // no highlight — personal private project
}

export const UPGRADE_REASONS = {
  projects:    "You've reached the 3-project limit on the free plan.",
  tasks:       "You've reached the 20-task limit for this project.",
  aiExtract:   "You've used your 3 AI extracts this month.",
  aiSchedule:  "You've used your weekly AI schedule.",
  calendarWeek:"Week and month views are available on Pro and above.",
  history:     "Completed task history is limited to 30 days on the free plan.",
  timeTracker: "Time tracking is available on Pro and above.",
  insights:    "AI insights are available on Pro and above.",
  mindMap:     "Interactive mind maps are available on Pro and above.",
  proShare:    "Sharing lists with other Pro users requires a Pro plan.",
  team:        "Team collaboration requires the Team plan.",
  proShareLimit: "You've reached your 5 shared list limit on the Pro plan.",
} as const

export function canUseFeature(plan: Plan, feature: keyof typeof UPGRADE_REASONS): boolean {
  const l = PLAN_LIMITS[plan]
  switch (feature) {
    case 'timeTracker':  return l.timeTracker
    case 'insights':     return l.insights
    case 'mindMap':      return l.mindMapInteractive
    case 'calendarWeek': return l.calendarViews.includes('week')
    case 'team':         return l.teamSharedProjects
    case 'proShare':     return l.proSharedLists > 0
    default:             return true
  }
}
