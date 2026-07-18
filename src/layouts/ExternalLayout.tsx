import { Outlet } from 'react-router-dom'
export default function ExternalLayout(){
  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r p-4">External Navigation</aside>
      <main className="flex-1 p-6">
        <Outlet/>
      </main>
    </div>
  )
}
