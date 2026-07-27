import type { TableHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) { return <div className="ui-table-wrap"><table className={cn('ui-table', className)} {...props} /></div> }
