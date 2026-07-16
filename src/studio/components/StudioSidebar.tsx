import { NavLink } from 'react-router-dom'

const items=[
['/app/studio/intelligence','Intelligence'],
['/app/studio/project-state','Project State'],
['/app/studio/performance','Performance'],
['/app/studio/recovery','Recovery'],
['/app/studio/design-system','Design System'],
]

export default function StudioSidebar(){
 return (
  <aside className="studio-sidebar">
   {items.map(([to,label])=>(
    <NavLink key={to} to={to} className="studio-nav-item">
      {label}
    </NavLink>
   ))}
  </aside>
 )
}
