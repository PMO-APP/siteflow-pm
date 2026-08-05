
export type WizardStepStatus='pending'|'current'|'completed'|'skipped'|'blocked'

export type WorkspaceSetupStepKey=
  | 'organization' | 'workspace' | 'branding' | 'team'
  | 'portfolio' | 'project' | 'schedule' | 'finish'

export type WorkspaceSetupStep={
  key:WorkspaceSetupStepKey
  title:string
  shortTitle:string
  description:string
  optional:boolean
  status:WizardStepStatus
}

export type WorkspaceSetupDraft={
  id?:string
  userId:string
  workspaceId:string|null
  currentStep:WorkspaceSetupStepKey
  completedSteps:WorkspaceSetupStepKey[]
  skippedSteps:WorkspaceSetupStepKey[]
  data:Record<string,unknown>
  startedAt:string
  lastSavedAt:string
  completedAt:string|null
}

export type WizardValidationResult={
  valid:boolean
  message?:string
}
