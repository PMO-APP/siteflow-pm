import {
  Activity,
  Bot,
  Boxes,
  Braces,
  Database,
  FileCog,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Workflow,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { StudioCapability } from '../access/studioCapabilities'

export type StudioToolStatus =
  | 'available'
  | 'planned'
  | 'disabled'

export type StudioTool = {
  id: string
  title: string
  description: string
  route: string
  icon: LucideIcon
  capability: StudioCapability
  status: StudioToolStatus
  category:
    | 'intelligence'
    | 'simulation'
    | 'platform'
    | 'design'
}

export const studioTools: StudioTool[] = [
  {
    id: 'overview',
    title: 'Studio Overview',
    description:
      'Internal workspace for validating PMOCorex intelligence and platform behavior.',
    route: '/app/studio',
    icon: LayoutDashboard,
    capability: 'studio.access',
    status: 'available',
    category: 'platform',
  },
  {
    id: 'intelligence',
    title: 'Intelligence Lab',
    description:
      'Compare stable production intelligence with the V6 orchestration pipeline.',
    route: '/app/studio/intelligence',
    icon: FlaskConical,
    capability: 'studio.intelligence',
    status: 'available',
    category: 'intelligence',
  },
  {
    id: 'project-state',
    title: 'Project State Explorer',
    description:
      'Inspect the normalized ProjectState used by V6 intelligence.',
    route: '/app/studio/project-state',
    icon: Braces,
    capability: 'studio.project-state',
    status: 'available',
    category: 'intelligence',
  },
  {
    id: 'recovery-validator',
    title: 'Recovery Validator',
    description:
      'Validate delay, forecast and recovery calculations against the live schedule.',
    route: '/app/studio/recovery-validator',
    icon: Workflow,
    capability: 'studio.recovery-validator',
    status: 'planned',
    category: 'intelligence',
  },
  {
    id: 'project-twin',
    title: 'Project Twin Inspector',
    description:
      'Inspect stage mapping, readiness and blocker assignment for the Digital Project Twin.',
    route: '/app/studio/project-twin',
    icon: Boxes,
    capability: 'studio.project-twin',
    status: 'planned',
    category: 'intelligence',
  },
  {
    id: 'portfolio-simulator',
    title: 'Portfolio Simulator',
    description:
      'Test portfolio-wide changes without altering production project data.',
    route: '/app/studio/portfolio-simulator',
    icon: Sparkles,
    capability: 'studio.portfolio-simulator',
    status: 'planned',
    category: 'simulation',
  },
  {
    id: 'scenario-builder',
    title: 'Scenario Builder',
    description:
      'Model delays, productivity changes, approval dates and recovery actions.',
    route: '/app/studio/scenario-builder',
    icon: SlidersHorizontal,
    capability: 'studio.scenario-builder',
    status: 'planned',
    category: 'simulation',
  },
  {
    id: 'executive-preview',
    title: 'Executive Brief Preview',
    description:
      'Preview executive narratives and project briefings before production rollout.',
    route: '/app/studio/executive-preview',
    icon: FileCog,
    capability: 'studio.executive-preview',
    status: 'planned',
    category: 'intelligence',
  },
  {
    id: 'ai-preview',
    title: 'AI Recommendation Preview',
    description:
      'Inspect generated recommendations, reasoning and confidence outputs.',
    route: '/app/studio/ai-preview',
    icon: Bot,
    capability: 'studio.ai-preview',
    status: 'planned',
    category: 'intelligence',
  },
  {
    id: 'events',
    title: 'Event Monitor',
    description:
      'Inspect typed domain events and downstream reactions.',
    route: '/app/studio/events',
    icon: Activity,
    capability: 'studio.events',
    status: 'planned',
    category: 'platform',
  },
  {
    id: 'performance',
    title: 'Performance Center',
    description:
      'Track query timings, render duration and intelligence execution time.',
    route: '/app/studio/performance',
    icon: Gauge,
    capability: 'studio.performance',
    status: 'planned',
    category: 'platform',
  },
  {
    id: 'permissions',
    title: 'Permission Inspector',
    description:
      'Review effective permissions for the current user and selected project.',
    route: '/app/studio/permissions',
    icon: ShieldCheck,
    capability: 'studio.permissions',
    status: 'planned',
    category: 'platform',
  },
  {
    id: 'design-system',
    title: 'Design System',
    description:
      'Preview PMOCorex components, tokens and interaction patterns.',
    route: '/app/studio/design-system',
    icon: Palette,
    capability: 'studio.design-system',
    status: 'planned',
    category: 'design',
  },
  {
    id: 'database',
    title: 'Database Inspector',
    description:
      'Review schema mappings, project-scoped counts and data quality checks.',
    route: '/app/studio/database',
    icon: Database,
    capability: 'studio.database',
    status: 'planned',
    category: 'platform',
  },
]
