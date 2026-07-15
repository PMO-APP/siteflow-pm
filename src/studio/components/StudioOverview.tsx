import { studioTools } from '../registry/studioTools'
import { useStudioAccess } from '../access/useStudioAccess'
import StudioToolCard from './StudioToolCard'

const categories = [
  {
    id: 'intelligence',
    title: 'Intelligence',
  },
  {
    id: 'simulation',
    title: 'Simulation',
  },
  {
    id: 'platform',
    title: 'Platform',
  },
  {
    id: 'design',
    title: 'Design System',
  },
] as const

export default function StudioOverview() {
  const { can } = useStudioAccess()

  return (
    <div className="space-y-8">
      {categories.map(category => {
        const tools = studioTools.filter(
          tool =>
            tool.category === category.id &&
            tool.id !== 'overview'
        )

        return (
          <section key={category.id}>
            <div className="pmx-eyebrow">
              {category.title}
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {tools.map(tool => (
                <StudioToolCard
                  key={tool.id}
                  tool={tool}
                  allowed={can(tool.capability)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
