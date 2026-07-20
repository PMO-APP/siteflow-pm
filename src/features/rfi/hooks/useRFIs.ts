import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createRFI, getRFI, listRFIs, transitionRFI, updateRFI } from '../services/rfi.service'
import type { CreateRFIInput, RFI, RFIStatus } from '../types'

export const rfiKeys = { all: ['rfis'] as const, list: (p:number)=>['rfis','list',p] as const, detail:(id:string)=>['rfis','detail',id] as const }
export const useRFIs=(projectId:number|null)=>useQuery({queryKey:rfiKeys.list(projectId||0),queryFn:()=>listRFIs(projectId as number),enabled:!!projectId})
export const useRFI=(id?:string)=>useQuery({queryKey:rfiKeys.detail(id||''),queryFn:()=>getRFI(id as string),enabled:!!id})
export function useCreateRFI(){const q=useQueryClient();return useMutation({mutationFn:(v:CreateRFIInput)=>createRFI(v),onSuccess:()=>q.invalidateQueries({queryKey:rfiKeys.all})})}
export function useUpdateRFI(){const q=useQueryClient();return useMutation({mutationFn:({id,values}:{id:string;values:Partial<RFI>})=>updateRFI(id,values),onSuccess:r=>{q.invalidateQueries({queryKey:rfiKeys.all});q.setQueryData(rfiKeys.detail(r.id),r)}})}
export function useTransitionRFI(){const q=useQueryClient();return useMutation({mutationFn:({id,status,response}:{id:string;status:RFIStatus;response?:string})=>transitionRFI(id,status,response),onSuccess:r=>{q.invalidateQueries({queryKey:rfiKeys.all});q.setQueryData(rfiKeys.detail(r.id),r)}})}
