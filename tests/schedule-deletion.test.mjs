import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'

const bundle = await build({
  entryPoints: ['src/features/schedule/controlledProgramme.ts'],
  bundle: true, write: false, platform: 'node', format: 'esm',
})
const { applyControlledProgramme } = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
)

test('renumbering keeps the original activity dates and remapped links on the active revision', () => {
  const revision = { id: 'r1', block_id: 'p1', programme_activities: [
    { task_number: 3, name: 'Removed activity', finish_date: '2026-11-28', dependencies: '2' },
    { task_number: 4, name: 'Commissioning', finish_date: '2026-12-08', dependencies: '3' },
    { task_number: 5, name: 'Handover', finish_date: '2026-12-10', dependencies: '4' },
  ] }
  const result = applyControlledProgramme([
    { name: 'Commissioning', task_number: 3, delivery_package_id: 'p1', dependencies: null, compacted_revision_id: 'r1', compacted_revision_task_number: 4 },
    { name: 'Handover', task_number: 4, delivery_package_id: 'p1', dependencies: '3', compacted_revision_id: 'r1', compacted_revision_task_number: 5 },
  ], [revision])
  assert.deepEqual(result.map(task => [task.task_number, task.finish_date, task.dependencies]), [
    [3, '2026-12-08', null], [4, '2026-12-10', '3'],
  ])
  assert.equal(revision.programme_activities[0].name, 'Removed activity')
})

test('a different approved revision uses the current activity numbers and its own dependency links', () => {
  const [task] = applyControlledProgramme([
    { name: 'Commissioning', task_number: 3, delivery_package_id: 'p1', dependencies: null, compacted_revision_id: 'r1', compacted_revision_task_number: 4 },
  ], [{ id: 'r2', block_id: 'p1', programme_activities: [
    { task_number: 3, name: 'Commissioning', finish_date: '2027-01-08', dependencies: '2' },
  ] }])
  assert.equal(task.finish_date, '2027-01-08')
  assert.equal(task.dependencies, '2')
})
