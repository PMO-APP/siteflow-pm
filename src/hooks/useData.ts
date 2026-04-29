import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  ProcurementItem, Approval, SiteReport, Snag,
  Document, FinancialItem, Risk, Comment, Meeting,
  ContractorScore, Notification
} from '@/types'

// ─── PROCUREMENT ───────────────────────────────────────
export const useProcurement = () => useQuery({
  queryKey: ['procurement'],
  queryFn: async () => {
    const { data, error } = await supabase.from('procurement_items').select('*').order('order_by_date')
    if (error) throw error
    return data as ProcurementItem[]
  },
})

export const useUpsertProcurement = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: Partial<ProcurementItem> & { id?: string }) => {
      const { id, ...rest } = item
      if (id) {
        const { data, error } = await supabase.from('procurement_items').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id).select().single()
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase.from('procurement_items').insert(rest).select().single()
        if (error) throw error
        return data
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['procurement'] }),
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
export const useApprovals = () => useQuery({
  queryKey: ['approvals'],
  queryFn: async () => {
    const { data, error } = await supabase.from('approvals').select('*').order('deadline')
    if (error) throw error
    return data as Approval[]
  },
})

export const useUpsertApproval = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: Partial<Approval> & { id?: string }) => {
      const { id, ...rest } = item
      if (id) {
        const { data, error } = await supabase.from('approvals').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id).select().single()
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase.from('approvals').insert(rest).select().single()
        if (error) throw error
        return data
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
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
export const useSnags = () => useQuery({
  queryKey: ['snags'],
  queryFn: async () => {
    const { data, error } = await supabase.from('snags').select('*, profiles(full_name, role)').order('created_at', { ascending: false })
    if (error) throw error
    return data as Snag[]
  },
})

export const useUpsertSnag = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: Partial<Snag> & { id?: string }) => {
      const { id, profiles, ...rest } = item as any
      if (id) {
        const { data, error } = await supabase.from('snags').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id).select().single()
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase.from('snags').insert(rest).select().single()
        if (error) throw error
        return data
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['snags'] }),
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
export const useFinancial = () => useQuery({
  queryKey: ['financial'],
  queryFn: async () => {
    const { data, error } = await supabase.from('financial_items').select('*').order('created_at')
    if (error) throw error
    return data as FinancialItem[]
  },
})

export const useUpsertFinancial = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: Partial<FinancialItem> & { id?: string }) => {
      const { id, ...rest } = item
      if (id) {
        const { data, error } = await supabase.from('financial_items').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id).select().single()
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase.from('financial_items').insert(rest).select().single()
        if (error) throw error
        return data
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['financial'] }),
  })
}

// ─── RISKS ─────────────────────────────────────────────
export const useRisks = () => useQuery({
  queryKey: ['risks'],
  queryFn: async () => {
    const { data, error } = await supabase.from('risks').select('*').order('risk_score', { ascending: false })
    if (error) throw error
    return data as Risk[]
  },
})

export const useUpsertRisk = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: Partial<Risk> & { id?: string }) => {
      const { id, ...rest } = item
      if (id) {
        const { data, error } = await supabase.from('risks').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id).select().single()
        if (error) throw error
        return data
      } else {
        const { data, error } = await supabase.from('risks').insert(rest).select().single()
        if (error) throw error
        return data
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['risks'] }),
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
