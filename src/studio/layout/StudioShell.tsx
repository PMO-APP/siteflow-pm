import { Outlet } from 'react-router-dom'
import StudioHeader from '../components/StudioHeader'
import StudioSidebar from '../components/StudioSidebar'

export default function StudioShell(){
  return (
    <div className="studio-shell">
      <StudioHeader />
      <div className="studio-body">
        <StudioSidebar />
        <main className="studio-workspace">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
