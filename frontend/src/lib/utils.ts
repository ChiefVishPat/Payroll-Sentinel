import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

export function getRiskColor(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'low':
      return 'text-[var(--c-success)] bg-[var(--c-surface-3)]'
    case 'medium':
      return 'text-[var(--c-warning)] bg-[var(--c-surface-3)]'
    case 'high':
      return 'text-[var(--c-error)] bg-[var(--c-surface-3)]'
    default:
      return 'text-[var(--c-text-subtle)] bg-[var(--c-surface-3)]'
  }
}

export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
    case 'healthy':
    case 'connected':
    case 'approved':
      return 'text-[var(--c-success)] bg-[var(--c-surface-3)]'
    case 'pending':
    case 'processing':
      return 'text-[var(--c-warning)] bg-[var(--c-surface-3)]'
    case 'error':
    case 'failed':
    case 'disconnected':
      return 'text-[var(--c-error)] bg-[var(--c-surface-3)]'
    default:
      return 'text-[var(--c-text-subtle)] bg-[var(--c-surface-3)]'
  }
}
