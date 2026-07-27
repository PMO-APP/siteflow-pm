import type { ReactNode } from 'react'
import { Card, DarkCard } from './Card'
export function StatCard({ label, value, helper, icon, dark=false }: { label:string; value:ReactNode; helper?:string; icon?:ReactNode; dark?:boolean }) { const C=dark?DarkCard:Card; return <C className="ui-stat-card"><div className="ui-stat-card__top"><span>{label}</span>{icon}</div><strong>{value}</strong>{helper&&<small>{helper}</small>}</C> }
