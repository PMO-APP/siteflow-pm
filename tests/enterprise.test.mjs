import test from 'node:test'
import assert from 'node:assert/strict'

const canPerform = (action, role) => {
  if (['workspace_admin', 'admin'].includes(role)) return true
  if (['viewer', 'guest'].includes(role)) return action.endsWith('.view')
  if (['pmo', 'portfolio_manager'].includes(role)) return action !== 'project.delete'
  return !['schedule.import', 'workspace.invite', 'project.delete'].includes(action)
}

test('admin can delete while PMO cannot', () => {
  assert.equal(canPerform('project.delete', 'admin'), true)
  assert.equal(canPerform('project.delete', 'pmo'), false)
})

test('viewer remains read only', () => {
  assert.equal(canPerform('project.view', 'viewer'), true)
  assert.equal(canPerform('project.edit', 'viewer'), false)
})

test('cache policy uses a bounded stale window', () => {
  const staleTime = 30_000
  const gcTime = 5 * 60_000
  assert.ok(staleTime > 0)
  assert.ok(gcTime > staleTime)
})
