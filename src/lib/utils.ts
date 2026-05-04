import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, isPast, isToday, isTomorrow } from 'date-fns'

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

export function formatDeadline(deadline?: string): string {
  if (!deadline) return ''
  const date = new Date(deadline)
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  if (isPast(date)) return `Overdue · ${format(date, 'd MMM')}`
  return format(date, 'd MMM yyyy')
}

export function deadlineColour(deadline?: string): string {
  if (!deadline) return 'text-gray-400'
  const date = new Date(deadline)
  if (isPast(date)) return 'text-red-500'
  if (isToday(date)) return 'text-orange-500'
  if (isTomorrow(date)) return 'text-yellow-600'
  return 'text-gray-500'
}

export const PRIORITY_COLOURS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-50 text-blue-700',
  high: 'bg-orange-50 text-orange-700',
  urgent: 'bg-red-50 text-red-700',
}

export const STATUS_COLOURS: Record<string, string> = {
  todo: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-green-50 text-green-700',
  done: 'bg-green-100 text-green-800',
  blocked: 'bg-red-50 text-red-700',
}

export const STATUS_LABELS: Record<string, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
  blocked: 'Blocked',
}
