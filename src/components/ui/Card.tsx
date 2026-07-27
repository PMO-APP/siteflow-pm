import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('ui-card', className)} {...props} /> }
export function DarkCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn('ui-card ui-card--dark', className)} {...props} /> }
