import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  FolderKanban,
  Pencil,
  Plus,
  Search,
  Shield,
  SlidersHorizontal,
  UserCircle,
  Archive,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useProjectStore } from '@/store/project'
import { PMOCorexLogo } from '@/components/brand/PMOCorexLogo'
import { PMOCorexDialog, type PMOCorexDialogVariant } from '@/components/ui/PMOCorexDialog'
import PersonalWorkspacePanel from '@/components/personalization/PersonalWorkspacePanel'
import {
  canAccessAdminConsole,
  canCreateWorkspaceItems,
  canEditProjectInfo,
  canManageWorkspace,
  canViewInternalPages,
  isExternalRole,
} from '@/lib/permissions'

const PROJECT_STATUSES = [
  'Planning',
  'Active',
  'On Hold',
  'Inactive',
  'Delayed',
  'Completed',
  'Cancelled',
]

const PROJECT_PHASES = [
  'Concept',
  'Design',
  'Procurement',
  'Mobilization',
  'Execution',
  'Finishing',
  'Testing & Commissioning',
  'Handover',
  'Defects Liability',
  'Closed Out',
]

type DialogRequest = {
  variant?: PMOCorexDialogVariant
  eyebrow?: string
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  showCancel?: boolean
  inputLabel?: string
  inputPlaceholder?: string
  expectedValue?: string
}

type DialogState = DialogRequest & {
  open: boolean
  inputValue: string
  busy: boolean
}

const INTERNAL_ROLE_LABELS: Record<string, string> = {
  workspace_admin: 'Workspace Admin',
  admin: 'Admin',
  pmo: 'PMO',
  portfolio_manager: 'Portfolio Manager',
  design: 'Design',
  housebuild: 'Housebuild',
  costing: 'Costing',
  infrastructure: 'Infrastructure',
  mep: 'MEP',
  hse: 'HSE',
  hse_lead: 'HSE Lead',
  hse_manager: 'HSE Manager',
  viewer: 'Viewer',
  guest: 'Guest',
  consultant: 'Consultant',
  contractor: 'Contractor',
  vendor: 'Vendor',
  subcontractor: 'Subcontractor',
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [projectTasks, setProjectTasks] = useState<any[]>([])
  const [archivedProjects, setArchivedProjects] = useState<any[]>([])
  const [showArchivedProjects, setShowArchivedProjects] = useState(false)
  const [organizations, setOrganizations] = useState<any[]>([])
  const [portfolios, setPortfolios] = useState<any[]>([])
  const [memberships, setMemberships] = useState<any[]>([])
  const [currentUserEmail, setCurrentUserEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)

  const [canAccessAdmin, setCanAccessAdmin] = useState(false)
  const [canCreateItems, setCanCreateItems] = useState(false)
  const [canEditProjects, setCanEditProjects] = useState(false)
  const [canDeleteItems, setCanDeleteItems] = useState(false)

  const [showProjectModal, setShowProjectModal] = useState(false)
  const [showPortfolioModal, setShowPortfolioModal] = useState(false)
  const [showEditProjectModal, setShowEditProjectModal] = useState(false)
  const [showEditPortfolioModal, setShowEditPortfolioModal] = useState(false)
  const [editingProject, setEditingProject] = useState<any>(null)
  const [editingPortfolio, setEditingPortfolio] = useState<any>(null)

  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectStatus, setNewProjectStatus] = useState('Planning')
  const [newProjectPhase, setNewProjectPhase] = useState('Concept')
  const [newPortfolioName, setNewPortfolioName] = useState('')
  const [editPortfolioName, setEditPortfolioName] = useState('')
  const [editPortfolioDescription, setEditPortfolioDescription] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState<string | number | ''>('')
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string | number | ''>('')

  const [newOverallOwnerEmail, setNewOverallOwnerEmail] = useState('')
  const [newHousebuildOwnerEmail, setNewHousebuildOwnerEmail] = useState('')
  const [newMepOwnerEmail, setNewMepOwnerEmail] = useState('')
  const [newInfrastructureOwnerEmail, setNewInfrastructureOwnerEmail] = useState('')

  const [editProjectName, setEditProjectName] = useState('')
  const [editProjectStatus, setEditProjectStatus] = useState('Planning')
  const [editProjectPhase, setEditProjectPhase] = useState('Concept')
  const [editProjectLocation, setEditProjectLocation] = useState('')
  const [editProjectHandoverDate, setEditProjectHandoverDate] = useState('')
  const [editProjectPortfolioId, setEditProjectPortfolioId] = useState<string | number | ''>('')
  const [editOverallOwnerEmail, setEditOverallOwnerEmail] = useState('')
  const [editHousebuildOwnerEmail, setEditHousebuildOwnerEmail] = useState('')
  const [editMepOwnerEmail, setEditMepOwnerEmail] = useState('')
  const [editInfrastructureOwnerEmail, setEditInfrastructureOwnerEmail] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [portfolioFilter, setPortfolioFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [phaseFilter, setPhaseFilter] = useState('All')
  const [attentionFilter, setAttentionFilter] = useState<'All' | 'Attention' | 'Healthy'>('All')

  const [dialog, setDialog] = useState<DialogState>({ open: false, title: '', message: '', inputValue: '', busy: false })
  const dialogResolver = useRef<((value: boolean) => void) | null>(null)

  function showNotice(request: DialogRequest) {
    setDialog({ ...request, open: true, inputValue: '', busy: false, showCancel: false })
  }

  function requestDecision(request: DialogRequest) {
    return new Promise<boolean>(resolve => {
      dialogResolver.current = resolve
      setDialog({ ...request, open: true, inputValue: '', busy: false, showCancel: true })
    })
  }

  function closeDialog(result = false) {
    dialogResolver.current?.(result)
    dialogResolver.current = null
    setDialog(current => ({ ...current, open: false, inputValue: '', busy: false }))
  }

  const navigate = useNavigate()
  const { setProject } = useProjectStore()

  useEffect(() => {
    loadHub()
  }, [])

  async function loadHub() {
    setLoading(true)

    const { data: sessionData } = await supabase.auth.getSession()
    const currentUser = sessionData.session?.user

    if (!currentUser?.email) {
      setLoading(false)
      return
    }

    const cleanEmail = currentUser.email.toLowerCase().trim()
    setCurrentUserEmail(cleanEmail)
    const rawDisplayName =
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      cleanEmail.split('@')[0].split(/[._-]/)[0]
    setDisplayName(String(rawDisplayName).trim().split(/\s+/)[0] || 'there')

    const { data: membershipRows, error: membershipError } = await supabase
      .from('memberships')
      .select('*')
      .or(`user_id.eq.${currentUser.id},email.eq.${cleanEmail}`)

    if (membershipError) {
      showNotice({ variant: 'danger', title: 'Unable to load access', message: membershipError.message, confirmLabel: 'Close' })
      setLoading(false)
      return
    }

    const memberRows = membershipRows || []
    setMemberships(memberRows)

    if (memberRows.length === 0) {
      setOrganizations([])
      setPortfolios([])
      setProjects([])
      setArchivedProjects([])
      setCanAccessAdmin(false)
      setCanCreateItems(false)
      setCanEditProjects(false)
      setCanDeleteItems(false)
      setLoading(false)
      return
    }

    const userRoles = memberRows.map(membership =>
      String(membership.role || '').toLowerCase().trim()
    )

    const isInternalUser = userRoles.some(role => canViewInternalPages(role))
    const isExternalUser = userRoles.some(role => isExternalRole(role))

    setCanAccessAdmin(userRoles.some(role => canAccessAdminConsole(role)))
    setCanCreateItems(userRoles.some(role => canCreateWorkspaceItems(role)))
    setCanEditProjects(userRoles.some(role => canEditProjectInfo(role)))
    setCanDeleteItems(userRoles.some(role => canManageWorkspace(role)))

    const [
      { data: orgs, error: orgError },
      { data: ports, error: portError },
      { data: projs, error: projectError },
      { data: tasks, error: taskError },
    ] = await Promise.all([
      supabase.from('organizations').select('*').order('created_at'),
      supabase.from('portfolios').select('*').order('created_at'),
      supabase.from('projects').select('*').order('id'),
      supabase.from('tasks').select('project_id,status,finish_date,progress_pct'),
    ])

    if (orgError || portError || projectError || taskError) {
      showNotice({ variant: 'danger', title: 'Workspace could not be loaded', message: orgError?.message || portError?.message || projectError?.message || taskError?.message || 'Unable to load workspace.', confirmLabel: 'Close' })
      setLoading(false)
      return
    }

    setProjectTasks(tasks || [])

    if (isInternalUser) {
      setOrganizations(orgs || [])
      setPortfolios(ports || [])
      const allProjects = projs || []
      setProjects(allProjects.filter(project => !project.archived_at))
      setArchivedProjects(allProjects.filter(project => Boolean(project.archived_at)))
      setLoading(false)
      return
    }

    if (isExternalUser) {
      const allowedProjectIds = memberRows
        .filter(membership => membership.access_scope === 'project')
        .flatMap(membership => [membership.project_id, ...(membership.project_ids || [])])
        .filter(Boolean)

      const visibleProjects = (projs || []).filter(project =>
        allowedProjectIds.includes(project.id) && !project.archived_at
      )
      const visiblePortfolioIds = [
        ...new Set(visibleProjects.map(project => project.portfolio_id).filter(Boolean)),
      ]
      const visibleOrgIds = [
        ...new Set(visibleProjects.map(project => project.organization_id).filter(Boolean)),
      ]

      setOrganizations((orgs || []).filter(org => visibleOrgIds.includes(org.id)))
      setPortfolios((ports || []).filter(portfolio => visiblePortfolioIds.includes(portfolio.id)))
      setProjects(visibleProjects)
      setArchivedProjects([])
      setLoading(false)
      return
    }

    setOrganizations([])
    setPortfolios([])
    setProjects([])
    setArchivedProjects([])
    setLoading(false)
  }

  function openProject(project: any) {
    setProject(
      Number(project.id),
      project.project_name,
      project.organization_id ?? null,
      project.portfolio_id ?? null,
      project.overall_owner_email ?? null,
      project.housebuild_owner_email ?? null,
      project.mep_owner_email ?? null,
      project.infrastructure_owner_email ?? null
    )
    navigate('/app')
  }

  function openEditProject(project: any) {
    setEditingProject(project)
    setEditProjectName(project.project_name || '')
    setEditProjectStatus(project.status || 'Planning')
    setEditProjectPhase(project.phase || 'Concept')
    setEditProjectLocation(project.location || '')
    setEditProjectHandoverDate(project.handover_date || '')
    setEditProjectPortfolioId(project.portfolio_id || '')
    setEditOverallOwnerEmail(project.overall_owner_email || '')
    setEditHousebuildOwnerEmail(project.housebuild_owner_email || '')
    setEditMepOwnerEmail(project.mep_owner_email || '')
    setEditInfrastructureOwnerEmail(project.infrastructure_owner_email || '')
    setShowEditProjectModal(true)
  }

  async function updateProject() {
    if (!canEditProjects || !editingProject || !editProjectName.trim()) return

    const { error } = await supabase
      .from('projects')
      .update({
        project_name: editProjectName.trim(),
        status: editProjectStatus,
        phase: editProjectPhase,
        location: editProjectLocation.trim() || null,
        handover_date: editProjectHandoverDate || null,
        portfolio_id: editProjectPortfolioId || null,
        overall_owner_email: editOverallOwnerEmail.trim().toLowerCase() || null,
        housebuild_owner_email: editHousebuildOwnerEmail.trim().toLowerCase() || null,
        mep_owner_email: editMepOwnerEmail.trim().toLowerCase() || null,
        infrastructure_owner_email:
          editInfrastructureOwnerEmail.trim().toLowerCase() || null,
      })
      .eq('id', editingProject.id)

    if (error) {
      showNotice({ variant: 'danger', title: 'Action could not be completed', message: error.message, confirmLabel: 'Close' })
      return
    }

    setEditingProject(null)
    setShowEditProjectModal(false)
    await loadHub()
  }


  function openEditPortfolio(portfolio: any) {
    if (!canDeleteItems) return
    setEditingPortfolio(portfolio)
    setEditPortfolioName(portfolio.name || '')
    setEditPortfolioDescription(portfolio.description || '')
    setShowEditPortfolioModal(true)
  }

  async function updatePortfolio() {
    if (!canDeleteItems || !editingPortfolio || !editPortfolioName.trim()) return

    const { error } = await supabase
      .from('portfolios')
      .update({
        name: editPortfolioName.trim(),
        description: editPortfolioDescription.trim() || null,
      })
      .eq('id', editingPortfolio.id)

    if (error) {
      showNotice({ variant: 'danger', title: 'Action could not be completed', message: error.message, confirmLabel: 'Close' })
      return
    }

    setEditingPortfolio(null)
    setShowEditPortfolioModal(false)
    await loadHub()
  }

  async function archiveProject(project: any) {
    if (!canDeleteItems) return
    const confirmed = await requestDecision({
      variant: 'archive',
      title: `Archive ${project.project_name}?`,
      message: 'The project will disappear from active workspace views, while its tasks, approvals, documents and other records remain safely stored. An Admin can restore it later.',
      confirmLabel: 'Archive project',
      cancelLabel: 'Keep active',
    })
    if (!confirmed) return

    const { data: archivedRows, error } = await supabase
      .from('projects')
      .update({
        archived_at: new Date().toISOString(),
        archived_by: currentUserEmail || null,
      })
      .eq('id', project.id)
      .select('*')

    if (error) {
      showNotice({ variant: 'danger', title: 'Project could not be archived', message: error.message, confirmLabel: 'Close' })
      return
    }

    if (!archivedRows || archivedRows.length === 0) {
      showNotice({ variant: 'warning', title: 'Archive was not completed', message: 'Confirm that the soft_delete_projects.sql migration has been run and that Admin UPDATE access is enabled.', confirmLabel: 'Understood' })
      return
    }

    setProjects(current => current.filter(item => item.id !== project.id))
    setArchivedProjects(current => [archivedRows[0], ...current])
    showNotice({ variant: 'success', title: 'Project archived', message: `“${project.project_name}” was moved to Archived Projects. Its linked records remain safely stored.`, confirmLabel: 'Done' })
  }

  async function restoreProject(project: any) {
    if (!canDeleteItems) return

    const { data: restoredRows, error } = await supabase
      .from('projects')
      .update({ archived_at: null, archived_by: null })
      .eq('id', project.id)
      .select('*')

    if (error) {
      showNotice({ variant: 'danger', title: 'Project could not be restored', message: error.message, confirmLabel: 'Close' })
      return
    }

    if (!restoredRows || restoredRows.length === 0) {
      showNotice({ variant: 'warning', title: 'Restore was not completed', message: 'Check the project update policy in Supabase, then try again.', confirmLabel: 'Understood' })
      return
    }

    setArchivedProjects(current => current.filter(item => item.id !== project.id))
    setProjects(current => [...current, restoredRows[0]].sort((a, b) => Number(a.id) - Number(b.id)))
    showNotice({ variant: 'success', title: 'Project restored', message: `“${project.project_name}” is active and visible in the workspace again.`, confirmLabel: 'Done' })
  }

  async function permanentlyDeleteProject(project: any) {
    if (!canDeleteItems) return
    const confirmed = await requestDecision({
      variant: 'danger',
      eyebrow: 'Permanent deletion',
      title: `Delete ${project.project_name} permanently?`,
      message: 'This will permanently remove the project and every linked record. This action cannot be undone.',
      confirmLabel: 'Permanently delete',
      cancelLabel: 'Cancel',
      inputLabel: `Type “${project.project_name}” to confirm`,
      inputPlaceholder: project.project_name,
      expectedValue: String(project.project_name || ''),
    })
    if (!confirmed) return

    const { error } = await supabase.rpc('permanently_delete_project', {
      target_project_id: project.id,
    })

    if (error) {
      showNotice({ variant: 'danger', title: 'Permanent deletion failed', message: error.message, confirmLabel: 'Close' })
      return
    }

    setArchivedProjects(current => current.filter(item => item.id !== project.id))
    showNotice({ variant: 'success', title: 'Project permanently deleted', message: `“${project.project_name}” and all linked records have been removed.`, confirmLabel: 'Done' })
  }

  async function deletePortfolio(portfolio: any) {
    if (!canDeleteItems) return

    const linkedProjects = projects.filter(project => String(project.portfolio_id ?? '') === String(portfolio.id ?? ''))
    if (linkedProjects.length > 0) {
      showNotice({ variant: 'warning', title: 'Portfolio still contains projects', message: `This portfolio contains ${linkedProjects.length} project${linkedProjects.length === 1 ? '' : 's'}. Move or archive those projects before deleting the portfolio.`, confirmLabel: 'Understood' })
      return
    }

    const confirmed = await requestDecision({
      variant: 'danger',
      title: `Delete ${portfolio.name}?`,
      message: 'The empty portfolio will be permanently removed from the workspace. This action cannot be undone.',
      confirmLabel: 'Delete portfolio',
      cancelLabel: 'Cancel',
    })
    if (!confirmed) return

    const { data: deletedRows, error } = await supabase
      .from('portfolios')
      .delete()
      .eq('id', portfolio.id)
      .select('id')

    if (error) {
      showNotice({ variant: 'danger', title: 'Portfolio could not be deleted', message: error.message, confirmLabel: 'Close' })
      return
    }

    if (!deletedRows || deletedRows.length === 0) {
      showNotice({ variant: 'warning', title: 'Portfolio deletion blocked', message: 'Row Level Security is still blocking DELETE operations. Run admin_delete_policies.sql in the Supabase SQL Editor, then try again.', confirmLabel: 'Understood' })
      return
    }

    setPortfolios(current => current.filter(item => item.id !== portfolio.id))
    if (portfolioFilter === String(portfolio.id)) setPortfolioFilter('All')
    showNotice({ variant: 'success', title: 'Portfolio deleted', message: `“${portfolio.name}” was deleted successfully.`, confirmLabel: 'Done' })
    await loadHub()
  }

  async function createPortfolio() {
    const organizationId = selectedOrgId || organizations[0]?.id || null

    if (!canCreateItems || !newPortfolioName.trim()) return

    if (!organizationId) {
      showNotice({ variant: 'warning', title: 'Workspace organization missing', message: 'Run portfolio_recovery.sql in the Supabase SQL Editor, then refresh this page.', confirmLabel: 'Understood' })
      return
    }

    const { data: createdPortfolio, error } = await supabase
      .from('portfolios')
      .insert({
        name: newPortfolioName.trim(),
        organization_id: organizationId,
      })
      .select('*')
      .single()

    if (error) {
      showNotice({ variant: 'danger', title: 'Portfolio could not be created', message: error.message, confirmLabel: 'Close' })
      return
    }

    if (createdPortfolio) {
      setPortfolios(current => [...current, createdPortfolio])
      setSelectedPortfolioId(createdPortfolio.id)
    }

    setNewPortfolioName('')
    setSelectedOrgId(organizationId)
    setShowPortfolioModal(false)
    await loadHub()
  }

  async function createProject() {
    if (!canCreateItems || !newProjectName.trim()) return

    const { error } = await supabase.from('projects').insert({
      project_name: newProjectName.trim(),
      status: newProjectStatus,
      phase: newProjectPhase,
      organization_id: selectedOrgId || organizations[0]?.id || null,
      portfolio_id: selectedPortfolioId || null,
      overall_owner_email: newOverallOwnerEmail.trim().toLowerCase() || null,
      housebuild_owner_email: newHousebuildOwnerEmail.trim().toLowerCase() || null,
      mep_owner_email: newMepOwnerEmail.trim().toLowerCase() || null,
      infrastructure_owner_email:
        newInfrastructureOwnerEmail.trim().toLowerCase() || null,
    })

    if (error) {
      showNotice({ variant: 'danger', title: 'Action could not be completed', message: error.message, confirmLabel: 'Close' })
      return
    }

    setNewProjectName('')
    setNewProjectStatus('Planning')
    setNewProjectPhase('Concept')
    setSelectedOrgId('')
    setSelectedPortfolioId('')
    setNewOverallOwnerEmail('')
    setNewHousebuildOwnerEmail('')
    setNewMepOwnerEmail('')
    setNewInfrastructureOwnerEmail('')
    setShowProjectModal(false)
    loadHub()
  }

  const userRoles = memberships.map(m => String(m.role || '').toLowerCase().trim())
  const workspaceName = organizations[0]?.name || portfolios[0]?.organization_name || 'Workspace'
  const activeProjects = projects.filter(project => project.status === 'Active').length
  const hasWorkspaceVisibility = memberships.length > 0 && (organizations.length > 0 || portfolios.length > 0 || projects.length > 0)

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const projectAttentionMap = useMemo(() => {
    const map = new Map<string, {
      needsAttention: boolean
      overdueTasks: number
      totalTasks: number
      healthScore: number
      healthBand: 'Healthy' | 'Watch' | 'At Risk' | 'Critical'
    }>()

    projects.forEach(project => {
      const projectRows = projectTasks.filter(
        task => String(task.project_id) === String(project.id)
      )

      let overdueTasks = 0
      let weightedOverdueLoad = 0

      projectRows.forEach(task => {
        const status = String(task.status || '').toLowerCase()
        const progress = Math.min(100, Math.max(0, Number(task.progress_pct || 0)))
        if (status === 'completed' || progress >= 100 || !task.finish_date) return

        const finishDate = new Date(task.finish_date)
        if (Number.isNaN(finishDate.getTime())) return
        finishDate.setHours(0, 0, 0, 0)
        if (finishDate >= todayStart) return

        overdueTasks += 1

        const daysOverdue = Math.max(
          1,
          Math.floor((todayStart.getTime() - finishDate.getTime()) / 86_400_000)
        )
        const remainingWork = Math.max(0.15, (100 - progress) / 100)
        const delaySeverity = 1 + Math.min(daysOverdue, 90) / 90
        weightedOverdueLoad += remainingWork * delaySeverity
      })

      const totalTasks = projectRows.length
      const overdueRatio = totalTasks > 0 ? weightedOverdueLoad / totalTasks : 0
      const schedulePenalty = Math.min(85, 65 * Math.sqrt(Math.max(0, overdueRatio)))
      const projectStatus = String(project.status || '')
      const statusPenalty = projectStatus === 'On Hold' ? 15 : projectStatus === 'Delayed' ? 10 : 0
      const healthScore = Math.max(0, Math.min(100, Math.round(100 - schedulePenalty - statusPenalty)))
      const healthBand = healthScore >= 85
        ? 'Healthy'
        : healthScore >= 70
          ? 'Watch'
          : healthScore >= 50
            ? 'At Risk'
            : 'Critical'

      map.set(String(project.id), {
        needsAttention: healthScore < 85 || ['Delayed', 'On Hold'].includes(projectStatus),
        overdueTasks,
        totalTasks,
        healthScore,
        healthBand,
      })
    })

    return map
  }, [projects, projectTasks])

  const filteredProjects = useMemo(
    () =>
      projects.filter(project => {
        const search = searchTerm.toLowerCase().trim()
        const needsAttention = Boolean(projectAttentionMap.get(String(project.id))?.needsAttention)
        return (
          (!search ||
            String(project.project_name || '').toLowerCase().includes(search) ||
            String(project.location || '').toLowerCase().includes(search)) &&
          (portfolioFilter === 'All' ||
            String(project.portfolio_id || '') === portfolioFilter) &&
          (statusFilter === 'All' ||
            String(project.status || 'Not set') === statusFilter) &&
          (phaseFilter === 'All' || String(project.phase || 'Not set') === phaseFilter) &&
          (attentionFilter === 'All' ||
            (attentionFilter === 'Attention' && needsAttention) ||
            (attentionFilter === 'Healthy' && !needsAttention))
        )
      }),
    [projects, searchTerm, portfolioFilter, statusFilter, phaseFilter, attentionFilter, projectAttentionMap]
  )

  function showProjects(filter: { portfolioId?: string | number; status?: string; attention?: 'All' | 'Attention' | 'Healthy' }) {
    setPortfolioFilter(filter.portfolioId !== undefined ? String(filter.portfolioId) : 'All')
    setStatusFilter(filter.status || 'All')
    setAttentionFilter(filter.attention || 'All')
    requestAnimationFrame(() => {
      document.getElementById('projects-register')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const attentionProjects = projects.filter(project =>
    projectAttentionMap.get(String(project.id))?.needsAttention
  ).length
  const healthyProjects = projects.filter(project =>
    !projectAttentionMap.get(String(project.id))?.needsAttention
  ).length
  const missingTargets = projects.filter(
    project => !project.handover_date && !['Completed', 'Cancelled'].includes(project.status)
  ).length

  const myAssignedProjects = projects.filter(project => {
    const capacity = resolveProjectCapacity(project, currentUserEmail, userRoles, memberships)
    return capacity !== 'Viewer' && capacity !== 'Guest'
  })

  const greeting = getGreeting()

  return (
    <div className="min-h-dvh bg-[#f7f8f6] text-[#183044]">
      <header className="sticky top-0 z-30 border-b border-[#dfe7e6] bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between gap-4 px-5 py-4 sm:px-7 lg:px-10">
          <button type="button" onClick={() => navigate('/')} className="text-left">
            <PMOCorexLogo size={40} />
          </button>

          <div className="flex shrink-0 items-center rounded-2xl border border-[#d8e4ee] bg-[#f7fafb] p-1.5 shadow-sm">
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#173f5f] transition hover:bg-white hover:shadow-sm"
              title="My profile"
              aria-label="Open my profile"
            >
              <UserCircle size={19} />
            </button>

            {canAccessAdmin && (
              <>
                <span className="mx-1 hidden h-6 w-px bg-[#d8e4ee] sm:block" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="hidden h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-bold text-[#173f5f] transition hover:bg-white hover:shadow-sm sm:inline-flex"
                >
                  <Shield size={16} />
                  <span>Admin Console</span>
                </button>
              </>
            )}

          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] space-y-7 px-5 py-7 pb-24 sm:px-7 lg:px-10 lg:py-9">
        <section className="overflow-hidden rounded-[28px] border border-[#d8e4ee] bg-white shadow-[0_18px_60px_rgba(30,67,101,0.08)]">
          <div className="grid lg:grid-cols-[1.3fr_0.7fr]">
            <div className="relative overflow-hidden px-6 py-8 sm:px-9 lg:px-11 lg:py-10">
              <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#ef8354]/10" />
              <div className="absolute right-20 top-8 h-28 w-28 rounded-full border border-[#ef8354]/20" />
              <div className="relative">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#f0c4b2] bg-[#fff0e9] px-3 py-1.5 text-xs font-semibold text-[#d86335]">
                  <CircleDot size={13} /> Workspace control tower
                </div>
                <p className="text-sm font-medium text-[#607580]">{greeting}</p>
                <h1 className="mt-1 text-3xl font-black tracking-[-0.035em] text-[#173f5f] sm:text-4xl">
                  {capitalize(displayName || 'there')}, here is your delivery position.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-[#607580] sm:text-base">
                  See what needs attention, understand your capacity on each project, and move directly into the work you can control.
                </p>
              </div>
            </div>

            <div className="border-t border-[#dfe7e6] bg-[#eef3f4] p-6 sm:p-8 lg:border-l lg:border-t-0">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#6d8396]">Workspace</div>
              <div className="mt-2 text-2xl font-black text-[#173f5f]">{workspaceName}</div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <MiniMetric label="Portfolios" value={portfolios.length} />
                <MiniMetric label="Projects" value={projects.length} />
                <MiniMetric label="Healthy" value={healthyProjects} />
                <MiniMetric label="Need attention" value={attentionProjects} accent onClick={() => showProjects({ attention: 'Attention' })} />
              </div>
            </div>
          </div>
        </section>

        <PersonalWorkspacePanel />

        <section className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="hub-panel p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="hub-eyebrow">My work today</div>
                <h2 className="mt-1 text-xl font-extrabold text-[#173f5f]">Your immediate delivery focus</h2>
              </div>
              <span className="rounded-full bg-[#eaf1f4] px-3 py-1 text-xs font-semibold text-[#2f6f91]">
                {primaryRoleLabel(userRoles)}
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <FocusItem icon={FolderKanban} value={myAssignedProjects.length} label="Projects within your working scope" />
              <FocusItem icon={AlertTriangle} value={attentionProjects} label="Projects requiring attention" urgent={attentionProjects > 0} onClick={() => showProjects({ attention: 'Attention' })} />
              <FocusItem icon={CalendarClock} value={missingTargets} label="Projects without a target date" urgent={missingTargets > 0} />
              <FocusItem icon={Activity} value={activeProjects} label="Projects currently active" />
            </div>

            <button onClick={() => navigate('/portfolio-dashboard')} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#2f6f91] hover:text-[#ef8354]">
              Open portfolio command centre <ArrowRight size={16} />
            </button>
          </div>

          <div className="hub-panel p-6 sm:p-7">
            <div className="hub-eyebrow">Permission principle</div>
            <h2 className="mt-1 text-xl font-extrabold text-[#173f5f]">One truth. Relevant controls.</h2>
            <p className="mt-4 text-sm leading-6 text-[#607580]">
              Everyone can see the delivery position. Editing tools appear only where your responsibility gives you control.
            </p>
            <div className="mt-6 space-y-3">
              <PermissionLine icon={CheckCircle2} title="Workspace visibility" text="See every project available to your membership." />
              <PermissionLine icon={Shield} title="Contextual access" text="Work only within your project or discipline permissions." />
              <PermissionLine icon={SlidersHorizontal} title="Cleaner interface" text="Irrelevant controls stay out of your way." />
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="hub-eyebrow">Portfolio overview</div>
              <h2 className="mt-1 text-2xl font-black text-[#173f5f]">Choose a delivery environment</h2>
            </div>
            <button onClick={() => navigate('/portfolio-dashboard')} className="hub-secondary-button">
              <BarChart3 size={16} /> Portfolio Dashboard
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {portfolios.map(portfolio => {
              const portfolioProjects = projects.filter(p => String(p.portfolio_id ?? '') === String(portfolio.id ?? ''))
              const attention = portfolioProjects.filter(p => projectAttentionMap.get(String(p.id))?.needsAttention).length
              const active = portfolioProjects.filter(p => p.status === 'Active').length
              const portfolioHealthRows = portfolioProjects.map(project => ({
                score: projectAttentionMap.get(String(project.id))?.healthScore ?? 100,
                weight: Math.max(1, projectAttentionMap.get(String(project.id))?.totalTasks ?? 0),
              }))
              const simpleAverage = portfolioHealthRows.length
                ? portfolioHealthRows.reduce((sum, row) => sum + row.score, 0) / portfolioHealthRows.length
                : 0
              const weightedAverage = portfolioHealthRows.length
                ? portfolioHealthRows.reduce((sum, row) => sum + row.score * row.weight, 0) /
                  portfolioHealthRows.reduce((sum, row) => sum + row.weight, 0)
                : 0
              const health = portfolioHealthRows.length
                ? Math.round(simpleAverage * 0.7 + weightedAverage * 0.3)
                : 0

              return (
                <div
                  key={portfolio.id}
                  className="group rounded-[22px] border border-[#dbe5ee] bg-white p-5 text-left shadow-[0_10px_32px_rgba(31,70,104,0.06)] transition hover:-translate-y-1 hover:border-[#b9cedd] hover:shadow-[0_16px_40px_rgba(31,70,104,0.1)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eaf1f4] text-[#2f6f91]">
                      <Briefcase size={21} />
                    </div>
                    <div className="flex items-center gap-2">
                      {canDeleteItems && (
                        <>
                          <button type="button" onClick={() => openEditPortfolio(portfolio)} className="hub-icon-button h-9 w-9" title="Edit portfolio"><Pencil size={15} /></button>
                          <button type="button" onClick={() => deletePortfolio(portfolio)} className="hub-icon-button h-9 w-9 text-[#c94f3b] hover:border-[#efb8ad] hover:bg-[#fff0ed]" title="Delete portfolio"><Trash2 size={15} /></button>
                        </>
                      )}
                      <ChevronRight className="text-[#9fb4bd] transition group-hover:translate-x-1 group-hover:text-[#ef8354]" size={20} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => showProjects({ portfolioId: portfolio.id })}
                    className="block w-full text-left"
                  >
                    <h3 className="mt-5 text-lg font-extrabold text-[#173f5f]">{portfolio.name}</h3>
                    <p className="mt-1 min-h-10 text-sm leading-5 text-[#6d7f8b]">
                      {portfolio.description || 'Project delivery portfolio'}
                    </p>
                  </button>
                  <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[#e6edf3] pt-4">
                    <PortfolioMetric label="Projects" value={portfolioProjects.length} onClick={() => showProjects({ portfolioId: portfolio.id })} />
                    <PortfolioMetric label="Active" value={active} onClick={() => showProjects({ portfolioId: portfolio.id, status: 'Active' })} />
                    <PortfolioMetric label="Need attention" value={attention} attention={attention > 0} onClick={() => showProjects({ portfolioId: portfolio.id, attention: 'Attention' })} />
                  </div>
                  <button type="button" onClick={() => showProjects({ portfolioId: portfolio.id, attention: attention > 0 ? 'Attention' : 'Healthy' })} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#2f6f91] hover:text-[#ef8354]">
                    {health}% portfolio health <ArrowRight size={13} />
                  </button>
                </div>
              )
            })}

            {portfolios.length === 0 && (
              <div className="rounded-[22px] border border-[#f0c4b2] bg-[#fff8f4] p-6 md:col-span-2 xl:col-span-3">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#d86335] shadow-sm">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#173f5f]">No portfolios are currently visible</h3>
                    <p className="mt-1 text-sm leading-6 text-[#607580]">
                      Your existing portfolios may be hidden by Supabase access policies, or they may need to be restored. Run the included portfolio_recovery.sql file once, then refresh this page.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {canCreateItems && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrgId(organizations[0]?.id || '')
                    setShowPortfolioModal(true)
                  }}
                  className="flex min-h-[210px] flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-[#cfdde2] bg-[#f9fbfb] p-6 text-center transition hover:-translate-y-1 hover:border-[#ffad89] hover:bg-[#fff7f3]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#ef8354] shadow-sm">
                    <Briefcase size={22} />
                  </div>
                  <div className="mt-4 font-extrabold text-[#173f5f]">Create portfolio</div>
                  <div className="mt-1 max-w-[220px] text-sm leading-5 text-[#71838d]">Add a separate delivery environment for a group of projects.</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrgId(organizations[0]?.id || '')
                    setSelectedPortfolioId('')
                    setShowProjectModal(true)
                  }}
                  className="flex min-h-[210px] flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-[#c9dce8] bg-[#f7fafc] p-6 text-center transition hover:-translate-y-1 hover:border-[#74a5c3] hover:bg-[#f0f7fb]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#2f6f91] shadow-sm">
                    <FolderKanban size={22} />
                  </div>
                  <div className="mt-4 font-extrabold text-[#173f5f]">Create project</div>
                  <div className="mt-1 max-w-[220px] text-sm leading-5 text-[#71838d]">Create a project and assign it to the appropriate portfolio.</div>
                </button>
              </>
            )}
          </div>
        </section>

        <section id="projects-register" className="hub-panel overflow-hidden">
          <div className="border-b border-[#e1e9f0] p-5 sm:p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <div className="hub-eyebrow">Project register</div>
                <h2 className="mt-1 text-2xl font-black text-[#173f5f]">Projects and working capacity</h2>
                <p className="mt-1 text-sm text-[#6d7f8b]">Your role is resolved project by project, not from one generic title.</p>
              </div>

              <div className="flex w-full flex-col gap-2 xl:w-auto xl:items-end">
                {attentionFilter !== 'All' && (
                  <button type="button" onClick={() => setAttentionFilter('All')} className="inline-flex self-start items-center gap-2 rounded-full border border-[#f0c4b2] bg-[#fff0e9] px-3 py-1.5 text-xs font-bold text-[#d86335] xl:self-end">
                    Showing {attentionFilter === 'Attention' ? 'projects requiring attention' : 'healthy projects'} <X size={13} />
                  </button>
                )}
                {canDeleteItems && archivedProjects.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowArchivedProjects(value => !value)}
                    className="hub-secondary-button self-start xl:self-end"
                  >
                    <Archive size={16} />
                    {showArchivedProjects ? 'Hide archived projects' : `Archived projects (${archivedProjects.length})`}
                  </button>
                )}
                <div className="grid w-full gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <div className="relative sm:col-span-2 xl:col-span-1 xl:w-72">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#82939c]" />
                  <input className="hub-input pl-9" placeholder="Search project or location" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <select className="hub-input" value={portfolioFilter} onChange={e => setPortfolioFilter(e.target.value)}>
                  <option value="All">All portfolios</option>
                  {portfolios.map(portfolio => <option key={portfolio.id} value={String(portfolio.id)}>{portfolio.name}</option>)}
                </select>
                <select className="hub-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="All">All statuses</option>
                  {PROJECT_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                </select>
                <select className="hub-input" value={phaseFilter} onChange={e => setPhaseFilter(e.target.value)}>
                  <option value="All">All phases</option>
                  {PROJECT_PHASES.map(phase => <option key={phase} value={phase}>{phase}</option>)}
                </select>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-[#75899a]">Loading workspace…</div>
          ) : !hasWorkspaceVisibility ? (
            <EmptyHub title="No workspace access" message="You do not currently have access to an organization, portfolio, or project." action={() => navigate('/mixta-admin-login')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-collapse">
                <thead>
                  <tr className="bg-[#f3f6f6] text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#71838d]">
                    <th className="px-6 py-4">Project</th>
                    <th className="px-5 py-4">Portfolio</th>
                    <th className="px-5 py-4">Health</th>
                    <th className="px-5 py-4">My capacity</th>
                    <th className="px-5 py-4">Phase</th>
                    <th className="px-5 py-4">Target</th>
                    <th className="px-5 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map(project => {
                    const portfolio = portfolios.find(p => p.id === project.portfolio_id)
                    const capacity = resolveProjectCapacity(project, currentUserEmail, userRoles, memberships)
                    return (
                      <ProjectRow
                        key={project.id}
                        project={project}
                        attentionInfo={projectAttentionMap.get(String(project.id))}
                        portfolioName={portfolio?.name || 'Unassigned'}
                        capacity={capacity}
                        canEdit={canEditProjects}
                        canDelete={canDeleteItems}
                        onOpen={() => openProject(project)}
                        onEdit={() => openEditProject(project)}
                        onDelete={() => archiveProject(project)}
                      />
                    )
                  })}
                </tbody>
              </table>
              {filteredProjects.length === 0 && (
                <div className="p-12 text-center">
                  <div className="text-sm font-bold text-[#173f5f]">No projects match the selected filters.</div>
                  <p className="mt-1 text-sm text-[#71838d]">Your workspace access is active, but the current search or filters exclude every visible project.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('')
                      setPortfolioFilter('All')
                      setStatusFilter('All')
                      setPhaseFilter('All')
                      setAttentionFilter('All')
                    }}
                    className="hub-secondary-button mt-4"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {canDeleteItems && showArchivedProjects && (
          <section className="hub-panel overflow-hidden border-[#efc3af]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f0ddd4] bg-[#fff8f4] p-5 sm:p-6">
              <div>
                <div className="hub-eyebrow">Admin archive</div>
                <h2 className="mt-1 text-2xl font-black text-[#173f5f]">Archived Projects</h2>
                <p className="mt-1 text-sm text-[#6d7f8b]">Restore a project to active work or permanently remove it and all linked records.</p>
              </div>
              <span className="rounded-full border border-[#efc3af] bg-white px-3 py-1 text-xs font-bold text-[#b85d39]">{archivedProjects.length} archived</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] border-collapse">
                <thead>
                  <tr className="bg-[#f8f4f1] text-left text-[11px] font-bold uppercase tracking-[0.12em] text-[#71838d]">
                    <th className="px-6 py-4">Project</th>
                    <th className="px-5 py-4">Portfolio</th>
                    <th className="px-5 py-4">Archived</th>
                    <th className="px-5 py-4">Archived by</th>
                    <th className="px-5 py-4 text-right">Admin action</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedProjects.map(project => {
                    const portfolio = portfolios.find(item => String(item.id ?? '') === String(project.portfolio_id ?? ''))
                    return (
                      <tr key={project.id} className="border-t border-[#eadfd9] bg-white">
                        <td className="px-6 py-4"><div className="font-bold text-[#173f5f]">{project.project_name}</div><div className="mt-1 text-xs text-[#7c8d97]">{project.location || 'No location set'}</div></td>
                        <td className="px-5 py-4 text-sm text-[#536974]">{portfolio?.name || 'Unassigned'}</td>
                        <td className="px-5 py-4 text-sm text-[#536974]">{project.archived_at ? new Date(project.archived_at).toLocaleString() : '—'}</td>
                        <td className="px-5 py-4 text-sm text-[#536974]">{project.archived_by || 'Admin'}</td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => restoreProject(project)} className="hub-secondary-button py-2"><RotateCcw size={14} /> Restore</button>
                            <button onClick={() => permanentlyDeleteProject(project)} className="inline-flex items-center gap-2 rounded-xl border border-[#efb8ad] bg-[#fff0ed] px-3 py-2 text-sm font-bold text-[#b74835] transition hover:bg-[#ffe5df]"><Trash2 size={14} /> Permanently delete</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {showPortfolioModal && canCreateItems && (
        <Modal title="Create Portfolio" onClose={() => setShowPortfolioModal(false)}>
          <FieldLabel>Organization</FieldLabel>
          <div className="hub-readonly-field mb-4">{workspaceName}</div>
          <FieldLabel>Portfolio name</FieldLabel>
          <input className="hub-input mb-5" placeholder="e.g. Luxury Projects" value={newPortfolioName} onChange={e => setNewPortfolioName(e.target.value)} />
          <button className="hub-primary-button w-full justify-center" onClick={createPortfolio}>Create Portfolio</button>
        </Modal>
      )}

      {showProjectModal && canCreateItems && (
        <Modal title="Create Project" onClose={() => setShowProjectModal(false)}>
          <FieldLabel>Organization</FieldLabel>
          <div className="hub-readonly-field mb-4">{workspaceName}</div>
          <FieldLabel>Portfolio</FieldLabel>
          <select className="hub-input mb-4" value={selectedPortfolioId} onChange={e => setSelectedPortfolioId(e.target.value || '')}>
            <option value="">Select portfolio</option>
            {portfolios.filter(p => !selectedOrgId || !p.organization_id || String(p.organization_id) === String(selectedOrgId)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <FieldLabel>Project name</FieldLabel>
          <input className="hub-input mb-4" placeholder="Project name" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Status</FieldLabel><select className="hub-input mb-4" value={newProjectStatus} onChange={e => setNewProjectStatus(e.target.value)}>{PROJECT_STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
            <div><FieldLabel>Phase</FieldLabel><select className="hub-input mb-4" value={newProjectPhase} onChange={e => setNewProjectPhase(e.target.value)}>{PROJECT_PHASES.map(p => <option key={p}>{p}</option>)}</select></div>
          </div>
          <OwnerFields values={[newOverallOwnerEmail, newHousebuildOwnerEmail, newMepOwnerEmail, newInfrastructureOwnerEmail]} setters={[setNewOverallOwnerEmail, setNewHousebuildOwnerEmail, setNewMepOwnerEmail, setNewInfrastructureOwnerEmail]} />
          <button className="hub-primary-button mt-5 w-full justify-center" onClick={createProject}>Create Project</button>
        </Modal>
      )}

      {showEditPortfolioModal && editingPortfolio && canDeleteItems && (
        <Modal title="Edit Portfolio" onClose={() => setShowEditPortfolioModal(false)}>
          <FieldLabel>Portfolio name</FieldLabel>
          <input className="hub-input mb-4" value={editPortfolioName} onChange={e => setEditPortfolioName(e.target.value)} />
          <FieldLabel>Description</FieldLabel>
          <textarea className="hub-input min-h-24 resize-y" value={editPortfolioDescription} onChange={e => setEditPortfolioDescription(e.target.value)} placeholder="Optional portfolio description" />
          <button className="hub-primary-button mt-5 w-full justify-center" onClick={updatePortfolio}>Save Portfolio Changes</button>
        </Modal>
      )}

      {showEditProjectModal && editingProject && canEditProjects && (
        <Modal title="Edit Project" onClose={() => setShowEditProjectModal(false)}>
          <FieldLabel>Project name</FieldLabel>
          <input className="hub-input mb-4" value={editProjectName} onChange={e => setEditProjectName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <div><FieldLabel>Status</FieldLabel><select className="hub-input mb-4" value={editProjectStatus} onChange={e => setEditProjectStatus(e.target.value)}>{PROJECT_STATUSES.map(s => <option key={s}>{s}</option>)}</select></div>
            <div><FieldLabel>Phase</FieldLabel><select className="hub-input mb-4" value={editProjectPhase} onChange={e => setEditProjectPhase(e.target.value)}>{PROJECT_PHASES.map(p => <option key={p}>{p}</option>)}</select></div>
          </div>
          <FieldLabel>Location</FieldLabel>
          <input className="hub-input mb-4" value={editProjectLocation} onChange={e => setEditProjectLocation(e.target.value)} />
          <FieldLabel>Target handover date</FieldLabel>
          <input className="hub-input mb-4" type="date" value={editProjectHandoverDate} onChange={e => setEditProjectHandoverDate(e.target.value)} />
          <FieldLabel>Portfolio</FieldLabel>
          <select className="hub-input mb-4" value={editProjectPortfolioId} onChange={e => setEditProjectPortfolioId(e.target.value || '')}>
            <option value="">Unassigned</option>
            {portfolios.map(portfolio => <option key={portfolio.id} value={portfolio.id}>{portfolio.name}</option>)}
          </select>
          <OwnerFields values={[editOverallOwnerEmail, editHousebuildOwnerEmail, editMepOwnerEmail, editInfrastructureOwnerEmail]} setters={[setEditOverallOwnerEmail, setEditHousebuildOwnerEmail, setEditMepOwnerEmail, setEditInfrastructureOwnerEmail]} />
          <button className="hub-primary-button mt-5 w-full justify-center" onClick={updateProject}>Save Project Changes</button>
        </Modal>
      )}

      <PMOCorexDialog
        open={dialog.open}
        variant={dialog.variant}
        eyebrow={dialog.eyebrow}
        title={dialog.title}
        message={dialog.message}
        confirmLabel={dialog.confirmLabel}
        cancelLabel={dialog.cancelLabel}
        showCancel={dialog.showCancel}
        inputLabel={dialog.inputLabel}
        inputPlaceholder={dialog.inputPlaceholder}
        inputValue={dialog.inputValue}
        expectedValue={dialog.expectedValue}
        busy={dialog.busy}
        onInputChange={value => setDialog(current => ({ ...current, inputValue: value }))}
        onConfirm={() => closeDialog(true)}
        onClose={() => closeDialog(false)}
      />
    </div>
  )
}

function MiniMetric({ label, value, accent = false, onClick }: any) {
  const Component = onClick ? 'button' : 'div'
  return (
    <Component type={onClick ? 'button' : undefined} onClick={onClick} className={`rounded-2xl border p-4 text-left transition ${accent ? 'border-[#f0c4b2] bg-[#fff0e9]' : 'border-[#d7e1e4] bg-white'} ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-sm' : ''}`}>
      <div className={`text-2xl font-black ${accent ? 'text-[#d86335]' : 'text-[#173f5f]'}`}>{value}</div>
      <div className="mt-1 text-xs font-medium text-[#71838d]">{label}</div>
    </Component>
  )
}

function FocusItem({ icon: Icon, value, label, urgent = false, onClick }: any) {
  const Component = onClick ? 'button' : 'div'
  return (
    <Component type={onClick ? 'button' : undefined} onClick={onClick} className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${urgent ? 'border-[#f0c4b2] bg-[#fff7f3]' : 'border-[#dfe7e6] bg-[#f9fbfb]'} ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-sm' : ''}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${urgent ? 'bg-[#fff0e9] text-[#d86335]' : 'bg-[#eaf1f4] text-[#2f6f91]'}`}><Icon size={19} /></div>
      <div><div className="text-xl font-black text-[#173f5f]">{value}</div><div className="text-xs leading-5 text-[#71838d]">{label}</div></div>
    </Component>
  )
}

function PermissionLine({ icon: Icon, title, text }: any) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eaf1f4] text-[#2f6f91]"><Icon size={16} /></div>
      <div><div className="text-sm font-bold text-[#405b69]">{title}</div><div className="mt-0.5 text-xs leading-5 text-[#778b9c]">{text}</div></div>
    </div>
  )
}

function PortfolioMetric({ label, value, attention = false, onClick }: any) {
  return (
    <button type="button" onClick={onClick} className="rounded-xl px-2 py-1.5 text-left transition hover:bg-[#f3f7f8]">
      <div className={`text-base font-extrabold ${attention ? 'text-[#d86335]' : 'text-[#405b69]'}`}>{value}</div>
      <div className="text-[11px] leading-4 text-[#7c8d97]">{label}</div>
    </button>
  )
}

function ProjectRow({ project, attentionInfo, portfolioName, capacity, canEdit, canDelete, onOpen, onEdit, onDelete }: any) {
  const status = project.status || 'Not set'
  const overdueTasks = Number(attentionInfo?.overdueTasks || 0)
  const healthScore = Number(attentionInfo?.healthScore ?? 100)
  const healthBand = String(attentionInfo?.healthBand || 'Healthy')
  const isAttention = Boolean(attentionInfo?.needsAttention)
  const healthLabel = status === 'Completed'
    ? 'Complete'
    : overdueTasks > 0
      ? `${healthScore}% · ${overdueTasks} overdue`
      : `${healthScore}% · ${healthBand}`

  return (
    <tr className="border-t border-[#e2e9ed] bg-white transition hover:bg-[#f9fbfb]">
      <td className="px-6 py-4">
        <button onClick={onOpen} className="text-left">
          <div className="font-bold text-[#173f5f] hover:text-[#e87545]">{project.project_name}</div>
          <div className="mt-1 text-xs text-[#7c8d97]">{project.location || 'No location set'}</div>
        </button>
      </td>
      <td className="px-5 py-4 text-sm text-[#536974]">{portfolioName}</td>
      <td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${healthScore < 50 ? 'border-[#efb1ae] bg-[#fff0ef] text-[#b83f3b]' : healthScore < 70 ? 'border-[#f0c4b2] bg-[#fff0e9] text-[#d86335]' : healthScore < 85 ? 'border-[#ead08b] bg-[#fff8df] text-[#9a6a00]' : 'border-[#bfe0d0] bg-[#edf9f3] text-[#2f7b59]'}`}><span className={`h-1.5 w-1.5 rounded-full ${healthScore < 50 ? 'bg-[#d84a45]' : healthScore < 70 ? 'bg-[#e56d47]' : healthScore < 85 ? 'bg-[#d79b16]' : 'bg-[#41a878]'}`} />{healthLabel}</span></td>
      <td className="px-5 py-4"><span className="rounded-full bg-[#eaf1f4] px-2.5 py-1 text-xs font-semibold text-[#2f6f91]">{capacity}</span></td>
      <td className="px-5 py-4 text-sm text-[#536974]">{project.phase || 'Not set'}</td>
      <td className="px-5 py-4 text-sm text-[#536974]">{formatDate(project.handover_date)}</td>
      <td className="w-[190px] px-5 py-4">
        <div className="flex flex-nowrap items-center justify-end gap-2">
          {canEdit && <button onClick={onEdit} className="hub-icon-button h-9 w-9" title="Edit project"><Pencil size={15} /></button>}
          {canDelete && <button onClick={onDelete} className="hub-icon-button h-9 w-9 text-[#c56b43] hover:border-[#efc3af] hover:bg-[#fff4ee]" title="Archive project"><Archive size={15} /></button>}
          <button onClick={onOpen} className="hub-secondary-button flex-shrink-0 whitespace-nowrap py-2">Open <ArrowRight size={14} className="shrink-0" /></button>
        </div>
      </td>
    </tr>
  )
}

function OwnerFields({ values, setters }: any) {
  const labels = ['Overall Project Owner', 'Housebuild Owner', 'MEP Owner', 'Infrastructure Owner']
  return (
    <div className="rounded-2xl border border-[#dfe7e6] bg-[#f9fbfb] p-4">
      <div className="mb-3 text-sm font-bold text-[#405b69]">Project ownership</div>
      <div className="space-y-3">
        {labels.map((label, index) => (
          <div key={label}><FieldLabel>{label}</FieldLabel><input className="hub-input" type="email" placeholder={`${label} email`} value={values[index]} onChange={e => setters[index](e.target.value)} /></div>
        ))}
      </div>
    </div>
  )
}

function FieldLabel({ children }: any) {
  return <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.1em] text-[#71838d]">{children}</label>
}

function EmptyHub({ title, message, action }: any) {
  return (
    <div className="p-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eaf1f4] text-[#2f6f91]"><Building2 size={24} /></div>
      <div className="mt-4 text-xl font-bold text-[#173f5f]">{title}</div>
      <div className="mt-2 text-sm text-[#71838d]">{message}</div>
      <button onClick={action} className="hub-primary-button mt-5">Back to Login</button>
    </div>
  )
}

function Modal({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#183044]/45 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[24px] border border-[#dbe5ed] bg-white p-6 shadow-[0_30px_90px_rgba(18,50,76,0.25)]">
        <div className="mb-6 flex items-center justify-between">
          <div><div className="hub-eyebrow">Workspace setup</div><h2 className="mt-1 text-xl font-black text-[#173f5f]">{title}</h2></div>
          <button onClick={onClose} className="hub-icon-button"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function resolveProjectCapacity(project: any, email: string, roles: string[], memberships: any[]) {
  const clean = (value: unknown) => String(value || '').toLowerCase().trim()
  if (email && clean(project.overall_owner_email) === email) return 'Project Owner'
  if (email && clean(project.housebuild_owner_email) === email) return 'Housebuild Owner'
  if (email && clean(project.mep_owner_email) === email) return 'MEP Owner'
  if (email && clean(project.infrastructure_owner_email) === email) return 'Infrastructure Owner'

  const projectMembership = memberships.find(m => {
    const ids = [m.project_id, ...(m.project_ids || [])].filter(Boolean)
    return m.access_scope === 'project' && ids.includes(project.id)
  })
  if (projectMembership?.role) return INTERNAL_ROLE_LABELS[clean(projectMembership.role)] || String(projectMembership.role)

  const priority = ['workspace_admin', 'admin', 'pmo', 'portfolio_manager', 'design', 'costing', 'hse_manager', 'hse_lead', 'hse', 'housebuild', 'infrastructure', 'mep', 'viewer', 'guest']
  const role = priority.find(item => roles.includes(item))
  return INTERNAL_ROLE_LABELS[role || 'viewer'] || 'Viewer'
}

function primaryRoleLabel(roles: string[]) {
  const priority = ['workspace_admin', 'admin', 'pmo', 'portfolio_manager', 'design', 'costing', 'hse_manager', 'hse_lead', 'hse', 'housebuild', 'infrastructure', 'mep', 'viewer', 'guest']
  const role = priority.find(item => roles.includes(item)) || roles[0] || 'viewer'
  return INTERNAL_ROLE_LABELS[role] || capitalize(role.split('_').join(' '))
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value
}

function formatDate(value: string | null) {
  if (!value) return 'Not set'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}
