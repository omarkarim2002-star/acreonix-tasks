import { supabaseAdmin } from './supabase'
import { PLAN_LIMITS, Plan } from './plans'

export async function getUserPlan(userId: string): Promise<Plan> {
  const { data } = await supabaseAdmin
    .from('user_subscriptions')
    .select('plan, status')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .single()
  return (data?.plan as Plan) ?? 'free'
}

export async function getPlanLimits(userId: string) {
  const plan = await getUserPlan(userId)
  return { plan, limits: PLAN_LIMITS[plan] }
}

export async function getMonthlyUsage(userId: string, metric: 'ai_extracts' | 'ai_schedules') {
  const periodStart = new Date()
  periodStart.setDate(1)
  periodStart.setHours(0, 0, 0, 0)

  const { data } = await supabaseAdmin
    .from('usage_tracking')
    .select('count')
    .eq('user_id', userId)
    .eq('metric', metric)
    .eq('period_start', periodStart.toISOString().split('T')[0])
    .single()

  return data?.count ?? 0
}

export async function incrementUsage(userId: string, metric: 'ai_extracts' | 'ai_schedules') {
  const periodStart = new Date()
  periodStart.setDate(1)
  periodStart.setHours(0, 0, 0, 0)
  const periodStartStr = periodStart.toISOString().split('T')[0]

  await supabaseAdmin.rpc('increment_usage', {
    p_user_id: userId,
    p_metric: metric,
    p_period_start: periodStartStr,
  })
}

export async function checkProjectLimit(userId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const { plan, limits } = await getPlanLimits(userId)
  if (limits.projects === Infinity) return { allowed: true, current: 0, limit: Infinity }

  const { count } = await supabaseAdmin
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'active')

  const current = count ?? 0
  return { allowed: current < limits.projects, current, limit: limits.projects }
}

export async function checkTaskLimit(userId: string, projectId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const { plan, limits } = await getPlanLimits(userId)
  if (limits.tasksPerProject === Infinity) return { allowed: true, current: 0, limit: Infinity }

  const { count } = await supabaseAdmin
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .neq('status', 'done')

  const current = count ?? 0
  return { allowed: current < limits.tasksPerProject, current, limit: limits.tasksPerProject }
}

export async function checkAiExtractLimit(userId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const { plan, limits } = await getPlanLimits(userId)
  if (limits.aiExtractsPerMonth === Infinity) return { allowed: true, used: 0, limit: Infinity }

  const used = await getMonthlyUsage(userId, 'ai_extracts')
  return { allowed: used < limits.aiExtractsPerMonth, used, limit: limits.aiExtractsPerMonth }
}

export async function checkAiScheduleLimit(userId: string): Promise<{ allowed: boolean }> {
  const { plan, limits } = await getPlanLimits(userId)
  if (limits.aiSchedulesPerWeek === Infinity) return { allowed: true }

  // Check schedules this week
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  weekStart.setHours(0, 0, 0, 0)

  const { count } = await supabaseAdmin
    .from('calendar_events')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', 'ai_generated')
    .gte('created_at', weekStart.toISOString())

  return { allowed: (count ?? 0) === 0 }
}
