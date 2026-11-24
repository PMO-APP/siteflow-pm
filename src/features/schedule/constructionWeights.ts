export const constructionTemplates = {
  Roads: {'Preliminaries':0,'Earthworks':15,'Drainage':30,'Compaction':10,'Base course':20,'Surfacing':20,'Testing':5},
  Residential: {'Preliminaries':0,'Substructure':15,'Superstructure':25,'Roofing':8,'MEP':20,'Finishes':25,'External works':5,'Testing':2},
  'High-rise': {'Preliminaries':0,'Substructure':15,'Structure':30,'Facade':15,'MEP':20,'Finishes':15,'External works':3,'Testing':2},
} as const
export type WeightRow = {id:string; category:string; value:number}
export function proposeWeights(rows:WeightRow[], groups?:Record<string,number>) {
  if (!rows.length || new Set(rows.map(r=>r.id)).size !== rows.length || rows.some(r=>!Number.isFinite(r.value)||r.value<0)) throw new Error('Invalid activity values')
  const total=rows.reduce((s,r)=>s+r.value,0)
  if (!groups && total<=0) throw new Error('Enter positive scope values')
  if (groups) {
    if (rows.some(r=>!(r.category in groups))) throw new Error('Assign every activity to a category')
    for (const [g,w] of Object.entries(groups)) if(w>0 && !rows.some(r=>r.category===g&&r.value>0)) throw new Error(`Missing scope allocation: ${g}`)
  }
  const raw=rows.map(r=>groups ? (groups[r.category]===0?0:groups[r.category]*r.value/rows.filter(x=>x.category===r.category).reduce((s,x)=>s+x.value,0)):100*r.value/total)
  const units=raw.map(w=>Math.floor(w*10000)); let remainder=1000000-units.reduce((s,w)=>s+w,0)
  const order=raw.map((w,i)=>({i,f:w*10000-units[i]})).sort((a,b)=>b.f-a.f)
  for(let i=0;i<remainder;i++) units[order[i%order.length].i]++
  return rows.map((r,i)=>({id:r.id,weight_pct:units[i]/10000}))
}

// Package scope values are converted to project-level activity weights.
export function proposePackageWeights(rows:(WeightRow & {packageId:string})[], packageValues:Record<string,number>, groups?:Record<string,number>) {
 const ids=[...new Set(rows.map(r=>r.packageId))];
 const packageWeights=proposeWeights(ids.map(id=>({id,category:'',value:packageValues[id]??0})));
 if(packageWeights.some(p=>p.weight_pct<=0)) throw new Error('Enter positive scope values for every package');
 const combined=packageWeights.flatMap(p=>proposeWeights(rows.filter(r=>r.packageId===p.id),groups).map(r=>({id:r.id,category:'',value:r.weight_pct*p.weight_pct/100})));
 const byId=new Map(proposeWeights(combined).map(r=>[r.id,r]));
 return rows.map(r=>byId.get(r.id)!);
}
