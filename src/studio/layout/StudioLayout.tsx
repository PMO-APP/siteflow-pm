import {
  ArrowLeft,
  Search,
} from 'lucide-react'
import {
  NavLink,
  Navigate,
  Outlet,
  useNavigate,
} from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useStudioAccess } from '../access/useStudioAccess'
import { studioTools } from '../registry/studioTools'

export default function StudioLayout() {
  const navigate = useNavigate()
  const {
    canAccessStudio,
    can,
    role,
  } = useStudioAccess()

  const [query, setQuery] = useState('')

  const visibleTools = useMemo(
    () =>
      studioTools.filter(
        tool =>
          can(tool.capability) &&
          tool.title
            .toLowerCase()
            .includes(query.toLowerCase())
      ),
    [can, query]
  )

  if (!canAccessStudio) {
    return (
      <Navigate
        to="/app"
        replace
      />
    )
  }

  return (
    <div className="pmx-studio-shell">
      <aside className="pmx-studio-sidebar">
        <button
          type="button"
          className="pmx-btn-ghost pmx-btn-sm w-full justify-start"
          onClick={() => navigate('/app')}
        >
          <ArrowLeft size={15} />
          Back to application
        </button>

        <div className="mt-5">
          <div className="pmx-eyebrow">
            Internal workspace
          </div>

          <div className="mt-2 text-lg font-semibold text-[var(--pmx-text)]">
            PMOCorex Studio
          </div>

          <div className="mt-1 text-xs text-[var(--pmx-muted)]">
            Role: {role || 'Unknown'}
          </div>
        </div>

        <div className="pmx-studio-search">
          <Search size={14} />
          <input
            value={query}
            onChange={event =>
              setQuery(event.target.value)
            }
            placeholder="Search Studio"
          />
        </div>

        <nav className="pmx-studio-nav pmx-scrollbar">
          {visibleTools.map(tool => {
            const Icon = tool.icon

            return (
              <NavLink
                key={tool.id}
                to={tool.route}
                end={tool.id === 'overview'}
                className={({ isActive }) =>
                  isActive
                    ? 'pmx-studio-nav-link is-active'
                    : 'pmx-studio-nav-link'
                }
              >
                <Icon size={15} />
                <span>{tool.title}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="mt-auto rounded-xl border border-[var(--pmx-border)] bg-[var(--pmx-surface-2)] p-3 text-xs leading-5 text-[var(--pmx-muted)]">
          Studio is isolated from production workflows. New tools should be validated here before they are connected to live pages.
        </div>
      </aside>

      <main className="pmx-studio-main">
        <Outlet />
      </main>
    </div>
  )
}
