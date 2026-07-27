export const colors = {
  navy: '#173F5F', navyHover: '#0F334E', coral: '#EF8354', coralSoft: '#FFF2EC',
  success: '#2E8B57', warning: '#F4A261', danger: '#E63946', info: '#337EA9',
  background: '#F7F9FA', surface: '#FFFFFF', surfaceAlt: '#EEF3F4', border: '#DCE7EF',
  heading: '#173F5F', body: '#516779', muted: '#7A8C99', white: '#FFFFFF',
} as const
export type ColorToken = keyof typeof colors
