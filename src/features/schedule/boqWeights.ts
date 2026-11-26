import type {WeightRow} from './constructionWeights'
export type BOQScopeItem={task_id:string;quantity:number|string;rate:number|string;code:string}
export function deriveBOQDraft(items:BOQScopeItem[], tasks:{id:string;name:string}[]) {
 const values=new Map(tasks.map(t=>[t.id,0])), seen=new Set<string>(); let unmatched=0
 if(!items.length)throw new Error('Import an approved BOQ first')
 for(const item of items){const q=Number(item.quantity),r=Number(item.rate),v=q*r;if(!item.code||seen.has(item.code)||!Number.isFinite(v)||q<=0||r<0)throw new Error('Invalid or duplicate BOQ scope');seen.add(item.code);if(!values.has(item.task_id)){unmatched++;continue}values.set(item.task_id,values.get(item.task_id)!+v)}
 if(unmatched)throw new Error(`${unmatched} BOQ items refer to activities outside the current programme. Reconcile historical and remaining scope before weighting.`)
 const rows:WeightRow[]=tasks.map(t=>({id:t.id,category:'',value:values.get(t.id)!}));if(!rows.some(r=>r.value>0))throw new Error('No positive mapped scope value');return rows
}
