import { useProjectStore } from '@/store/project'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  ProcurementItem, Approval, SiteReport, Snag,
  Document, FinancialItem, Risk, Comment, Meeting,
  ContractorScore, Notification
} from '@/types'

// ─── PROCUREMENT ───────────────────────────────────────
export const useProcurement = () => {
  const { projectId } =
    useProjectStore()

  return useQuery({
    queryKey: [
      'procurement',
      projectId
    ],

    enabled:
      !!projectId,

    queryFn: async () => {
      const { data, error } =
        await supabase
          .from(
            'procurement_items'
          )
          .select('*')
          .eq(
            'project_id',
            projectId
          )
          .order(
            'order_by_date'
          )

      if (error)
        throw error

      return data as ProcurementItem[]
    },
  })
}

export const useUpsertProcurement = () => {
  const qc = useQueryClient()

  const { projectId } =
    useProjectStore()
  return useMutation({
    mutationFn: async (item: Partial<ProcurementItem> & { id?: string }) => {
      const { id, ...rest } = item
      if (id) {
        const { data, error } = await supabase.from('procurement_items').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id).select().single()
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase.from('procurement_items').insert({
  ...rest,
  project_id: projectId
}).select().single()
        if (error) throw error
        return data
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['procurement', projectId] }),
  })
}

export const useDeleteProcurement = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('procurement_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['procurement'] }),
  })
}

// ─── APPROVALS ─────────────────────────────────────────
export const useApprovals = () => {
  const { projectId } =
    useProjectStore()

  return useQuery({
    queryKey: [
      'approvals',
      projectId
    ],

    enabled:
      !!projectId,

    queryFn: async () => {
      const { data, error } =
        await supabase
          .from('approvals')
          .select('*')
          .eq(
            'project_id',
            projectId
          )
          .order(
            'deadline'
          )

      if (error)
        throw error

      return data as Approval[]
    },
  })
}

export const useUpsertApproval = () => {
  const qc = useQueryClient()

  const { projectId } =
    useProjectStore()
  return useMutation({
    mutationFn: async (item: Partial<Approval> & { id?: string }) => {
      const { id, ...rest } = item
      if (id) {
        const { data, error } = await supabase.from('approvals').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id).select().single()
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase.from('approvals').insert({
  ...rest,
  project_id: projectId
}).select().single()
        if (error) throw error
        return data
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals', projectId] }),
  })
}

// ─── SITE REPORTS ──────────────────────────────────────
export const useSiteReports = () => useQuery({
  queryKey: ['site_reports'],
  queryFn: async () => {
    const { data, error } = await supabase.from('site_reports').select('*').order('report_date', { ascending: false })
    if (error) throw error
    return data as SiteReport[]
  },
})

export const useUpsertSiteReport = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: Partial<SiteReport> & { id?: string }) => {
      const { id, ...rest } = item
      if (id) {
        const { data, error } = await supabase.from('site_reports').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id).select().single()
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase.from('site_reports').insert(rest).select().single()
        if (error) throw error
        return data
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['site_reports'] }),
  })
}

// ─── SNAGS ─────────────────────────────────────────────
export const useSnags = () => {
  const { projectId } =
    useProjectStore()

  return useQuery({
    queryKey: [
      'snags',
      projectId
    ],

    enabled:
      !!projectId,

    queryFn: async () => {
      const { data, error } =
        await supabase
          .from('snags')
          .select(
            '*, profiles(full_name, role)'
          )
          .eq(
            'project_id',
            projectId
          )
          .order(
            'created_at',
            {
              ascending: false
            }
          )

      if (error)
        throw error

      return data as Snag[]
    },
  })
}

export const useUpsertSnag = () => {
  const qc = useQueryClient()

  const { projectId } =
    useProjectStore()
  return useMutation({
    mutationFn: async (item: Partial<Snag> & { id?: string }) => {
      const { id, profiles, ...rest } = item as any
      if (id) {
        const { data, error } = await supabase.from('snags').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id).select().single()
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase.from('snags').insert({
  ...rest,
  project_id: projectId
}).select().single()
        if (error) throw error
        return data
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snags', projectId] }),
  })
}

// ─── DOCUMENTS ─────────────────────────────────────────
export const useDocuments = () => useQuery({
  queryKey: ['documents'],
  queryFn: async () => {
    const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data as Document[]
  },
})

export const useUpsertDocument = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: Partial<Document> & { id?: string }) => {
      const { id, ...rest } = item
      if (id) {
        const { data, error } = await supabase.from('documents').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id).select().single()
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase.from('documents').insert(rest).select().single()
        if (error) throw error
        return data
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

// ─── FINANCIAL ─────────────────────────────────────────
export const useFinancial = () => {
  const { projectId } =
    useProjectStore()

  return useQuery({
    queryKey: [
      'financial',
      projectId
    ],

    enabled:
      !!projectId,

    queryFn: async () => {
      const { data, error } =
        await supabase
          .from('financial_items')
          .select('*')
          .eq(
            'project_id',
            projectId
          )
          .order(
            'created_at'
          )

      if (error)
        throw error

      return data as FinancialItem[]
    },
  })
}

export const useUpsertFinancial = () => {
  const qc = useQueryClient()

  const { projectId } =
    useProjectStore()
  return useMutation({
    mutationFn: async (item: Partial<FinancialItem> & { id?: string }) => {
      const { id, ...rest } = item
      if (id) {
        const { data, error } = await supabase.from('financial_items').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id).select().single()
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase.from('financial_items').insert({
  ...rest,
  project_id: projectId
}).select().single()
        if (error) throw error
        return data
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['financial', projectId] }),
  })
}

// ─── RISKS ─────────────────────────────────────────────
export const useRisks = () => {
  const { projectId } =
    useProjectStore()

  return useQuery({
    queryKey: [
      'risks',
      projectId
    ],

    enabled:
      !!projectId,

    queryFn: async () => {
      const { data, error } =
        await supabase
          .from('risks')
          .select('*')
          .eq(
            'project_id',
            projectId
          )
          .order(
            'risk_score',
            {
              ascending: false
            }
          )

      if (error)
        throw error

      return data as Risk[]
    },
  })
}

export const useUpsertRisk = () => {
  const qc = useQueryClient()
  const { projectId } =
    useProjectStore()
  return useMutation({
    mutationFn: async (item: Partial<Risk> & { id?: string }) => {
      const { id, ...rest } = item
      if (id) {
        const { data, error } = await supabase.from('risks').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id).select().single()
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase.from('risks').insert({
  ...rest,
  project_id: projectId
}).select().single()
        if (error) throw error
        return data
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks', projectId] }),
  })
}

// ─── MEETINGS ──────────────────────────────────────────
export const useMeetings = () => useQuery({
  queryKey: ['meetings'],
  queryFn: async () => {
    const { data, error } = await supabase.from('meetings').select('*').order('meeting_date', { ascending: false })
    if (error) throw error
    return data as Meeting[]
  },
})

export const useUpsertMeeting = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: Partial<Meeting> & { id?: string }) => {
      const { id, ...rest } = item
      if (id) {
        const { data, error } = await supabase.from('meetings').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id).select().single()
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase.from('meetings').insert(rest).select().single()
        if (error) throw error
        return data
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meetings'] }),
  })
}

// ─── COMMENTS ──────────────────────────────────────────
export const useComments = (filter: Record<string, string>) => useQuery({
  queryKey: ['comments', filter],
  queryFn: async () => {
    let q = supabase.from('comments').select('*, profiles(full_name, avatar_url, role)').order('created_at')
    Object.entries(filter).forEach(([k, v]) => { q = q.eq(k, v) })
    const { data, error } = await q
    if (error) throw error
    return data as Comment[]
  },
  enabled: Object.keys(filter).length > 0,
})

export const useAddComment = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (comment: Omit<Comment, 'id' | 'created_at' | 'updated_at' | 'profiles'>) => {
      const { data, error } = await supabase.from('comments').insert(comment).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comments'] }),
  })
}

// ─── CONTRACTOR SCORES ─────────────────────────────────
export const useContractorScores = () => useQuery({
  queryKey: ['contractor_scores'],
  queryFn: async () => {
    const { data, error } = await supabase.from('contractor_scores').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data as ContractorScore[]
  },
})

export const useUpsertContractorScore = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: Partial<ContractorScore> & { id?: string }) => {
      const { id, ...rest } = item
      if (id) {
        const { data, error } = await supabase.from('contractor_scores').update(rest).eq('id', id).select().single()
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase.from('contractor_scores').insert(rest).select().single()
        if (error) throw error
        return data
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contractor_scores'] }),
  })
}

// ─── NOTIFICATIONS ─────────────────────────────────────
export const useNotifications = (userId?: string) => useQuery({
  queryKey: ['notifications', userId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId!)
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) throw error
    return data as Notification[]
  },
  enabled: !!userId,
})

// ─── PHOTOS ────────────────────────────────────────────
export const usePhotos = (filter: Record<string, string>) => useQuery({
  queryKey: ['photos', filter],
  queryFn: async () => {
    let q = supabase.from('photos').select('*').order('created_at', { ascending: false })
    Object.entries(filter).forEach(([k, v]) => { q = q.eq(k, v) })
    const { data, error } = await q
    if (error) throw error
    return data
  },
})
export const useProjects = () =>
  useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')

      if (error) throw error
      return data
    }
  })
