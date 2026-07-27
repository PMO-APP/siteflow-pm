import { colors } from './colors'
import { spacing } from './spacing'
import { radius } from './radius'
import { shadows } from './shadows'
import { typography } from './typography'
export const pmocorexTheme = { colors, spacing, radius, shadows, typography } as const
export type PMOCorexTheme = typeof pmocorexTheme
