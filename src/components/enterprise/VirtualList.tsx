import { useMemo, useState } from 'react'

type Props<T> = {
  items: T[]
  rowHeight: number
  height: number
  overscan?: number
  renderRow: (item: T, index: number) => React.ReactNode
  getKey: (item: T, index: number) => React.Key
}
export default function VirtualList<T>({ items, rowHeight, height, overscan = 6, renderRow, getKey }: Props<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const range = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
    const end = Math.min(items.length, Math.ceil((scrollTop + height) / rowHeight) + overscan)
    return { start, end }
  }, [scrollTop, rowHeight, height, overscan, items.length])
  return <div style={{ height, overflow: 'auto' }} onScroll={e => setScrollTop(e.currentTarget.scrollTop)}><div style={{ height: items.length * rowHeight, position: 'relative' }}>{items.slice(range.start, range.end).map((item, localIndex) => { const index = range.start + localIndex; return <div key={getKey(item, index)} style={{ position: 'absolute', top: index * rowHeight, left: 0, right: 0, height: rowHeight }}>{renderRow(item, index)}</div> })}</div></div>
}
