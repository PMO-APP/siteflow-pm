import {
  Construction,
} from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { studioTools } from '../registry/studioTools'
import { SectionHeader } from '@/components/ui'

export default function StudioPlaceholderPage() {
  const location = useLocation()

  const tool =
    studioTools.find(
      item => item.route === location.pathname
    ) || null

  return (
    <div className="pmx-page-stack">
      <SectionHeader
        eyebrow="PMOCorex Studio"
        title={tool?.title || 'Studio Tool'}
        description={
          tool?.description ||
          'This internal tool is under development.'
        }
      />

      <div className="pmx-studio-placeholder">
        <Construction size={24} />

        <div>
          <div className="text-sm font-semibold text-[var(--pmx-text)]">
            Planned for a future Studio release
          </div>

          <div className="mt-1 text-xs text-[var(--pmx-muted)]">
            The route and capability are already registered, but the tool is not connected to production logic.
          </div>
        </div>
      </div>
    </div>
  )
}
