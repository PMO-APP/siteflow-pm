import type { Task } from '@/types'

export type ProjectControlDiscipline = 'Housebuild' | 'Mechanical' | 'Electrical' | 'MEP' | 'Infrastructure'

const normalise = (value?: string | null) => String(value || '').trim().toLowerCase()

const electricalWords = [
  'electrical', 'wiring', 'cable', 'conduit', 'socket', 'switch', 'lighting', 'light fitting',
  'db ', 'distribution board', 'earthing', 'earth', 'elv', 'fire alarm', 'data point', 'power point',
  'transformer', 'generator', 'panel', 'containment', 'cable tray', 'trunking',
]
const mechanicalWords = [
  'mechanical', 'plumbing', 'pipe', 'piping', 'water supply', 'drainage pipe', 'soil pipe', 'waste pipe',
  'sanitary', 'hvac', 'a/c', 'air conditioning', 'duct', 'ducting', 'ventilation', 'sprinkler', 'fire fighting',
  'fcu', 'ahu', 'pump', 'cold water', 'hot water', 'rainwater', 'rwp', 'sleeve',
]

function containsAny(text: string, words: string[]) {
  return words.some(word => text.includes(word))
}

/**
 * Returns the delivery stream that should see a task in PMOCorex.
 * It never changes the master task. Housebuild keeps the embedded activity,
 * while Mechanical/Electrical receive a projected view of their deliverables.
 */
export function projectedTaskDiscipline(task: Partial<Task> & Record<string, any>): ProjectControlDiscipline {
  const explicit = normalise(task.discipline)
  const text = normalise([
    task.name,
    task.phase,
    task.category,
    task.responsible,
    task.notes,
  ].filter(Boolean).join(' '))

  if (explicit === 'infrastructure') return 'Infrastructure'
  if (explicit === 'mechanical') return 'Mechanical'
  if (explicit === 'electrical') return 'Electrical'

  if (explicit === 'mep') {
    if (containsAny(text, electricalWords)) return 'Electrical'
    if (containsAny(text, mechanicalWords)) return 'Mechanical'
    return 'MEP'
  }

  // Imported housebuild programmes often contain embedded services without a
  // separate discipline field. Mirror those activities to the MEP workstream.
  if (containsAny(text, electricalWords)) return 'Electrical'
  if (containsAny(text, mechanicalWords)) return 'Mechanical'

  return 'Housebuild'
}

export function taskVisibleInDiscipline(
  task: Partial<Task> & Record<string, any>,
  discipline: ProjectControlDiscipline | 'Overall'
) {
  if (discipline === 'Overall') return true
  const explicit = String(task.discipline || 'Housebuild')
  const projected = projectedTaskDiscipline(task)

  // Housebuild remains the overall building owner, so embedded services remain
  // visible in its master building programme as well as their MEP projection.
  if (discipline === 'Housebuild') return explicit === 'Housebuild'
  if (discipline === 'MEP') return ['MEP', 'Mechanical', 'Electrical'].includes(projected)
  return projected === discipline
}
