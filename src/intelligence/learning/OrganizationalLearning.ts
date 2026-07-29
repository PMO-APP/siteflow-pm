import type { IntelligenceEvent } from '../models/IntelligenceEvent'
import { buildProjectBenchmarks } from './BenchmarkEngine'
import { generateProjectLessons } from './LessonsEngine'
import { matchDeliveryPatterns } from './PatternMatcher'
import { buildProjectDNA } from './ProjectDNA'

export function buildOrganizationalLearning(events: IntelligenceEvent[]) {
  const projectDNA = buildProjectDNA(events)
  const patterns = matchDeliveryPatterns(events)
  const lessons = generateProjectLessons(events, patterns)
  const benchmarks = buildProjectBenchmarks(events)

  return {
    projectDNA,
    patterns,
    lessons,
    benchmarks,
    reusableKnowledge: lessons.filter(lesson => lesson.applicability === 'future_projects'),
  }
}
