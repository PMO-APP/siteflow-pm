import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: 'sm'|'md'|'lg'; icon?: ReactNode }
export function Button({ variant='primary', size='md', icon, className, children, ...props }: ButtonProps) {
  return <button className={cn('ui-button', `ui-button--${variant}`, `ui-button--${size}`, className)} {...props}>{icon}{children}</button>
}
