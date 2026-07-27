import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
type Tone='success'|'warning'|'danger'|'info'|'neutral'
export function Badge({ className, tone='neutral', ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) { return <span className={cn('ui-badge', `ui-badge--${tone}`, className)} {...props} /> }
