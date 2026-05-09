import { useProjectStore } from '@/store/project'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  ProcurementItem, Approval, SiteReport, Snag,
  Document, FinancialItem, Risk, Comment, Meeting,
  ContractorScore, Notification
} from '@/types'

// ─── HELPERS ───────────────────────────────────────────
const requireProject = (projectId: number | null) => {
  if (!projectId) throw new Error('No project selected')
  return projectId
}

// ─── PROCUREMENT ───────────────────────────────────────
export const useProcurement = () => {
  const { projectId } = useProjectStore()

  return useQuery({
    queryKey: ['procurement', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('procurement_items')
        .select('*')
        .eq('project_id', projectId)
        .order('order_by_date')

      if (error) throw error
      return data as ProcurementItem[]
    },
  })
}

export const useUpsertProcurement = () => {
  const qc = useQueryClient()
  const { projectId } = useProjectStore()

  return useMutation({
    mutationFn: async (item: Partial<ProcurementItem> & { id?: string }) => {
      const pid = requireProject(projectId)
      const { id, ...rest } = item

      const query = id
        ? supabase
            .from('procurement_items')
            .update({ ...rest, project_id: pid, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('project_id', pid)
        : supabase
            .from('procurement_items')
            .insert({ ...rest, project_id: pid })

      const { data, error } = await query.select().single()

      if (error) {
        console.error('Procurement save error:', error)
        alert(error.message)
        throw error
      }

      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['procurement', projectId] }),
  })
}

export const useDeleteProcurement = () => {
  const qc = useQueryClient()
  const { projectId } = useProjectStore()

  return useMutation({
    mutationFn: async (id: string) => {
      const pid = requireProject(projectId)

      const { error } = await supabase
        .from('procurement_items')
        .delete()
        .eq('id', id)
        .eq('project_id', pid)

      if (error) {
        console.error('Procurement delete error:', error)
        alert(error.message)
        throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['procurement', projectId] }),
  })
}

// ─── APPROVALS ─────────────────────────────────────────
export const useApprovals = () => {
  const { projectId } = useProjectStore()

  return useQuery({
    queryKey: ['approvals', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('approvals')
        .select('*')
        .eq('project_id', projectId)
        .order('deadline')

      if (error) throw error
      return data as Approval[]
    },
  })
}

export const useUpsertApproval = () => {
  const qc = useQueryClient()
  const { projectId } = useProjectStore()

  return useMutation({
    mutationFn: async (item: Partial<Approval> & { id?: string }) => {
      const pid = requireProject(projectId)
      const { id, ...rest } = item

      const query = id
        ? supabase
            .from('approvals')
            .update({ ...rest, project_id: pid, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('project_id', pid)
        : supabase
            .from('approvals')
            .insert({ ...rest, project_id: pid })

      const { data, error } = await query.select().single()

      if (error) {
        console.error('Approval save error:', error)
        alert(error.message)
        throw error
      }

      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals', projectId] }),
  })
}

// ─── SITE REPORTS ──────────────────────────────────────
export const useSiteReports = () => {
  const { projectId } = useProjectStore()

  return useQuery({
    queryKey: ['site_reports', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_reports')
        .select('*')
        .eq('project_id', projectId)
        .order('report_date', { ascending: false })

      if (error) throw error
      return data as SiteReport[]
    },
  })
}

export const useUpsertSiteReport = () => {
  const qc = useQueryClient()
  const { projectId } = useProjectStore()

  return useMutation({
    mutationFn: async (item: Partial<SiteReport> & { id?: string }) => {
      const pid = requireProject(projectId)
      const { id, ...rest } = item

      const query = id
        ? supabase
            .from('site_reports')
            .update({ ...rest, project_id: pid, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('project_id', pid)
        : supabase
            .from('site_reports')
            .insert({ ...rest, project_id: pid })

      const { data, error } = await query.select().single()

      if (error) {
        console.error('Site report save error:', error)
        alert(error.message)
        throw error
      }

      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['site_reports', projectId] }),
  })
}

// ─── SNAGS ─────────────────────────────────────────────
export const useSnags = () => {
  const { projectId } = useProjectStore()

  return useQuery({
    queryKey: ['snags', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('snags')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('SNAGS FETCH ERROR:', error)
        throw error
      }

      return data as Snag[]
    },
  })
}

export const useUpsertSnag = () => {
  const qc = useQueryClient()
  const { projectId } = useProjectStore()

  return useMutation({
    mutationFn: async (item: Partial<Snag> & { id?: string }) => {
      const pid = requireProject(projectId)
      const { id, profiles, ...rest } = item as any

      const query = id
        ? supabase
            .from('snags')
            .update({ ...rest, project_id: pid, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('project_id', pid)
        : supabase
            .from('snags')
            .insert({ ...rest, project_id: pid })

      const { data, error } = await query.select().single()

      if (error) {
        console.error('Snag save error:', error)
        alert(error.message)
        throw error
      }

      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snags', projectId] }),
  })
}

// ─── DOCUMENTS ─────────────────────────────────────────
export const useDocuments = () => {
  const { projectId } = useProjectStore()

  return useQuery({
    queryKey: ['documents', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Document[]
    },
  })
}

export const useUpsertDocument = () => {
  const qc = useQueryClient()
  const { projectId } = useProjectStore()

  return useMutation({
    mutationFn: async (item: Partial<Document> & { id?: string }) => {
      const pid = requireProject(projectId)
      const { id, ...rest } = item

      const query = id
        ? supabase
            .from('documents')
            .update({ ...rest, project_id: pid, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('project_id', pid)
        : supabase
            .from('documents')
            .insert({ ...rest, project_id: pid })

      const { data, error } = await query.select().single()

      if (error) {
        console.error('Document save error:', error)
        alert(error.message)
        throw error
      }

      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', projectId] }),
  })
}

// ─── FINANCIAL ─────────────────────────────────────────
export const useFinancial = () => {
  const { projectId } = useProjectStore()

  return useQuery({
    queryKey: ['financial', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_items')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at')

      if (error) throw error
      return data as FinancialItem[]
    },
  })
}

export const useUpsertFinancial = () => {
  const qc = useQueryClient()
  const { projectId } = useProjectStore()

  return useMutation({
    mutationFn: async (item: Partial<FinancialItem> & { id?: string }) => {
      const pid = requireProject(projectId)
      const { id, ...rest } = item

      const query = id
        ? supabase
            .from('financial_items')
            .update({ ...rest, project_id: pid, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('project_id', pid)
        : supabase
            .from('financial_items')
            .insert({ ...rest, project_id: pid })

      const { data, error } = await query.select().single()

      if (error) {
        console.error('Financial save error:', error)
        alert(error.message)
        throw error
      }

      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['financial', projectId] }),
  })
}

// ─── RISKS ─────────────────────────────────────────────
export const useRisks = () => {
  const { projectId } = useProjectStore()

  return useQuery({
    queryKey: ['risks', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('risks')
        .select('*')
        .eq('project_id', projectId)
        .order('risk_score', { ascending: false })

      if (error) throw error
      return data as Risk[]
    },
  })
}

export const useUpsertRisk = () => {
  const qc = useQueryClient()
  const { projectId } = useProjectStore()

  return useMutation({
    mutationFn: async (item: Partial<Risk> & { id?: string }) => {
      const pid = requireProject(projectId)
      const { id, ...rest } = item

      const query = id
        ? supabase
            .from('risks')
            .update({ ...rest, project_id: pid, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('project_id', pid)
        : supabase
            .from('risks')
            .insert({ ...rest, project_id: pid })

      const { data, error } = await query.select().single()

      if (error) {
        console.error('Risk save error:', error)
        alert(error.message)
        throw error
      }

      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks', projectId] }),
  })
}

// ─── MEETINGS ──────────────────────────────────────────
export const useMeetings = () => {
  const { projectId } = useProjectStore()

  return useQuery({
    queryKey: ['meetings', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('project_id', projectId)
        .order('meeting_date', { ascending: false })

      if (error) throw error
      return data as Meeting[]
    },
  })
}

export const useUpsertMeeting = () => {
  const qc = useQueryClient()
  const { projectId } = useProjectStore()

  return useMutation({
    mutationFn: async (item: Partial<Meeting> & { id?: string }) => {
      const pid = requireProject(projectId)
      const { id, ...rest } = item

      const query = id
        ? supabase
            .from('meetings')
            .update({ ...rest, project_id: pid, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('project_id', pid)
        : supabase
            .from('meetings')
            .insert({ ...rest, project_id: pid })

      const { data, error } = await query.select().single()

      if (error) {
        console.error('Meeting save error:', error)
        alert(error.message)
        throw error
      }

      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meetings', projectId] }),
  })
}

// ─── COMMENTS ──────────────────────────────────────────
export const useComments = (filter: Record<string, string>) => {
  const { projectId } = useProjectStore()

  return useQuery({
    queryKey: ['comments', projectId, filter],
    enabled: !!projectId && Object.keys(filter).length > 0,
    queryFn: async () => {
      let q = supabase
        .from('comments')
        .select('*, profiles(full_name, avatar_url, role)')
        .eq('project_id', projectId)
        .order('created_at')

      Object.entries(filter).forEach(([k, v]) => {
        q = q.eq(k, v)
      })

      const { data, error } = await q

      if (error) throw error
      return data as Comment[]
    },
  })
}

export const useAddComment = () => {
  const qc = useQueryClient()
  const { projectId } = useProjectStore()

  return useMutation({
    mutationFn: async (comment: Omit<Comment, 'id' | 'created_at' | 'updated_at' | 'profiles'>) => {
      const pid = requireProject(projectId)

      const { data, error } = await supabase
        .from('comments')
        .insert({
          ...comment,
          project_id: pid,
        })
        .select()
        .single()

      if (error) {
        console.error('Comment save error:', error)
        alert(error.message)
        throw error
      }

      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments', projectId] }),
  })
}

// ─── CONTRACTOR SCORES ─────────────────────────────────
export const useContractorScores = () => {
  const { projectId } = useProjectStore()

  return useQuery({
    queryKey: ['contractor_scores', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contractor_scores')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as ContractorScore[]
    },
  })
}

export const useUpsertContractorScore = () => {
  const qc = useQueryClient()
  const { projectId } = useProjectStore()

  return useMutation({
    mutationFn: async (item: Partial<ContractorScore> & { id?: string }) => {
      const pid = requireProject(projectId)
      const { id, ...rest } = item

      const query = id
        ? supabase
            .from('contractor_scores')
            .update({ ...rest, project_id: pid, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('project_id', pid)
        : supabase
            .from('contractor_scores')
            .insert({ ...rest, project_id: pid })

      const { data, error } = await query.select().single()

      if (error) {
        console.error('Contractor score save error:', error)
        alert(error.message)
        throw error
      }

      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contractor_scores', projectId] }),
  })
}

// ─── NOTIFICATIONS ─────────────────────────────────────
export const useNotifications = (userId?: string) => {
  const { projectId } = useProjectStore()

  return useQuery({
    queryKey: ['notifications', userId, projectId],
    enabled: !!userId && !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId!)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return data as Notification[]
    },
  })
}

// ─── PHOTOS ────────────────────────────────────────────
export const usePhotos = (filter: Record<string, string>) => {
  const { projectId } = useProjectStore()

  return useQuery({
    queryKey: ['photos', projectId, filter],
    enabled: !!projectId,
    queryFn: async () => {
      let q = supabase
        .from('photos')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      Object.entries(filter).forEach(([k, v]) => {
        q = q.eq(k, v)
      })

      const { data, error } = await q

      if (error) throw error
      return data
    },
  })
}

// ─── PROJECTS ──────────────────────────────────────────
export const useProjects = () =>
  useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('id')

      if (error) throw error
      return data
    },
  })
