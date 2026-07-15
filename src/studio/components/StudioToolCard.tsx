import {
  ArrowRight,
  LockKeyhole,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { StudioTool } from '../registry/studioTools'

export default function StudioToolCard({
  tool,
  allowed,
}: {
  tool: StudioTool
  allowed: boolean
}) {
  const navigate = useNavigate()
  const Icon = tool.icon

  const available =
    allowed && tool.status === 'available'

  return (
    <button
      type="button"
      disabled={!available}
      onClick={() => navigate(tool.route)}
      className="pmx-studio-tool"
    >
      <div className="pmx-studio-tool-icon">
        {allowed ? (
          <Icon size={18} />
        ) : (
          <LockKeyhole size={18} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <div className="pmx-studio-tool-title">
            {tool.title}
          </div>

          <span
            className={
              tool.status === 'available'
                ? 'pmx-studio-badge is-available'
                : 'pmx-studio-badge is-planned'
            }
          >
            {allowed
              ? tool.status
              : 'restricted'}
          </span>
        </div>

        <div className="pmx-studio-tool-copy">
          {tool.description}
        </div>
      </div>

      {available ? (
        <ArrowRight
          size={16}
          className="pmx-studio-tool-arrow"
        />
      ) : null}
    </button>
  )
}
