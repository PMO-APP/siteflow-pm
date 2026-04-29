import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, differenceInDays, parseISO, isValid } from 'date-fns'
import type { RAG, Task } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const fdate = (d?: string | null, fmt = 'dd MMM yy'): string => {
  if (!d) return '—'
  try {
    const parsed = typeof d === 'string' ? parseISO(d) : d
    return isValid(parsed) ? format(parsed, fmt) : '—'
  } catch { return '—' }
}

export const fdateLong = (d?: string | null): string => fdate(d, 'dd MMM yyyy')

export const daysUntil = (d?: string | null): number | null => {
  if (!d) return null
  try {
    return differenceInDays(parseISO(d), new Date())
  } catch { return null }
}

export const computeRAG = (task: Partial<Task>): RAG => {
  if (task.status === 'Completed') return ''
  if (!task.finish_date) return 'GREEN'
  const today = new Date()
  const finish = parseISO(task.finish_date)
  const start = task.start_date ? parseISO(task.start_date) : null
  if (finish < today) return 'RED'
  if (start && start <= today) return 'AMBER'
  return 'GREEN'
}

export const ragColor = (rag: RAG | undefined) => {
  switch (rag) {
    case 'RED': return 'text-red-400 bg-red-400/10 border-red-400/20'
    case 'AMBER': return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
    case 'GREEN': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
    default: return 'text-slate-400 bg-slate-400/10 border-slate-400/20'
  }
}

export const urgencyColor = (days: number | null): string => {
  if (days === null) return 'text-slate-400'
  if (days < 0) return 'text-red-400'
  if (days <= 7) return 'text-red-400'
  if (days <= 14) return 'text-amber-400'
  return 'text-emerald-400'
}

export const formatCurrency = (amount: number, currency = 'NGN'): string => {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString()}`
  }
}

export const riskLevel = (score: number): { label: string; color: string } => {
  if (score >= 15) return { label: 'Critical', color: 'text-red-400 bg-red-400/10' }
  if (score >= 10) return { label: 'High', color: 'text-orange-400 bg-orange-400/10' }
  if (score >= 5)  return { label: 'Medium', color: 'text-amber-400 bg-amber-400/10' }
  return { label: 'Low', color: 'text-emerald-400 bg-emerald-400/10' }
}

export const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export const PROJECT_END = new Date('2026-09-18')
export const PROJECT_START = new Date('2026-04-13')
