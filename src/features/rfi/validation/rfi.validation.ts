import type { CreateRFIInput } from '../types'

export type RFIFormErrors = Partial<Record<'title' | 'question' | 'due_date', string>>

export function validateRFIInput(input: CreateRFIInput): RFIFormErrors {
  const errors: RFIFormErrors = {}

  if (!input.title.trim()) errors.title = 'Enter a clear RFI title.'
  if (input.title.trim().length > 160) errors.title = 'Keep the title under 160 characters.'
  if (!input.question.trim()) errors.question = 'Describe the clarification required.'
  if (input.question.trim().length < 10) errors.question = 'Provide a little more detail.'

  if (input.due_date) {
    const dueDate = new Date(`${input.due_date}T23:59:59`)
    if (Number.isNaN(dueDate.getTime())) errors.due_date = 'Enter a valid due date.'
  }

  return errors
}

export function hasRFIFormErrors(errors: RFIFormErrors) {
  return Object.values(errors).some(Boolean)
}
