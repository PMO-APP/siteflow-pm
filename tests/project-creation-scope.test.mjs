import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'

const bundle = await build({
  entryPoints: ['src/workspace/projectCreationScope.ts'],
  bundle: true, write: false, platform: 'node', format: 'esm',
})
const { projectCreationScope, workspaceOrganizations } = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
)

test('creation uses an explicit organization link or a verified project or portfolio link in the current workspace', () => {
  const organizations = [
    { id: 1, workspace_id: 'mixta' },
    { id: 2 },
    { id: 3, workspace_id: 'other' },
    { id: 4 },
  ]
  const links = [
    { workspace_id: 'mixta', organization_id: '2' },
    { workspace_id: 'mixta', organization_id: 3 },
    { workspace_id: null, organization_id: 4 },
  ]
  assert.deepEqual(workspaceOrganizations('mixta', organizations, links).map(org => org.id), [1, 2])
  assert.deepEqual(workspaceOrganizations(null, organizations, links), [])
})

test('a project can be added to Infrastructure after its workspace link is repaired', () => {
  const portfolio = { id: 8, organization_id: 2, workspace_id: null }
  assert.throws(() => projectCreationScope('mixta', 2, '8', [portfolio]), /workspace link restored/)
  const repaired = { ...portfolio, workspace_id: 'mixta' }
  assert.deepEqual(projectCreationScope('mixta', '2', '8', [repaired]), {
    workspace_id: 'mixta', organization_id: '2', portfolio_id: 8,
  })
})

test('project creation rejects a different workspace or organization and supports unassigned projects', () => {
  const portfolio = { id: 8, organization_id: 2, workspace_id: 'mixta' }
  assert.throws(() => projectCreationScope('other', 2, 8, [portfolio]), /Select a portfolio/)
  assert.throws(() => projectCreationScope('mixta', 3, 8, [portfolio]), /Select a portfolio/)
  assert.throws(() => projectCreationScope('mixta', 2, 9, [portfolio]), /Select a portfolio/)
  assert.deepEqual(projectCreationScope('mixta', 2, '', [portfolio]), {
    workspace_id: 'mixta', organization_id: 2, portfolio_id: null,
  })
})
