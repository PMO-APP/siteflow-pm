import {
  Code2,
} from 'lucide-react'
import { SectionHeader } from '@/components/ui'
import StudioOverview from '../components/StudioOverview'

export default function StudioHome() {
  return (
    <div className="pmx-page-stack">
      <SectionHeader
        eyebrow="PMOCorex Engineering"
        title="Studio"
        description="Validate intelligence, inspect project state and test future platform capabilities without changing production pages."
        action={
          <div className="pmx-studio-environment">
            <Code2 size={14} />
            Internal
          </div>
        }
      />

      <StudioOverview />
    </div>
  )
}
