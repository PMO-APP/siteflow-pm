import { useMembershipStore } from '@/store/membership'
import { getCommandCenterRoleConfig } from '@/core/roles/commandCenterConfig'
import TodaysFocusPanel from './TodaysFocusPanel'
import DecisionPanel from './DecisionPanel'

export default function RoleAwareCommandSections({
  project,
}: {
  project?: any
}) {
  const role = useMembershipStore(
    state => state.role
  )

  const config =
    getCommandCenterRoleConfig(role)

  const showFocus =
    config.defaultSections.includes(
      'todaysFocus'
    )

  const showDecisions = [
    'workspace_admin',
    'admin',
    'pmo',
    'portfolio_manager',
    'project_owner',
    'design',
    'costing',
  ].includes(role || '')

  if (!showFocus && !showDecisions) {
    return null
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {showFocus ? (
        <TodaysFocusPanel
          project={project}
        />
      ) : null}

      {showDecisions ? (
        <DecisionPanel />
      ) : null}
    </div>
  )
}
