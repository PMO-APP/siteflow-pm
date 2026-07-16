export default function StudioHeader(){
  return (
    <header className="studio-header">
      <div>
        <div className="pmx-eyebrow">PMOCorex Studio</div>
        <h1>Workspace</h1>
      </div>
      <div className="studio-header-actions">
        <input placeholder="Search… (Ctrl + K)" />
        <button className="pmx-btn-secondary">Project</button>
        <button className="pmx-btn-secondary">Profile</button>
      </div>
    </header>
  )
}
