import * as XLSX from 'xlsx'
export type Extracted = {code:string; description:string; unit:string; quantity:number; rate:number; source:string}
const norm=(x:unknown)=>String(x??'').trim().toLowerCase()
const num=(x:unknown)=>typeof x==='number'?x: norm(x)===''?NaN:Number(String(x).replace(/,/g,''))
export function extractBOQ(buffer:ArrayBuffer, block:number){
 const book=XLSX.read(buffer,{type:'array'}), rows:Extracted[]=[], warnings:string[]=[]
 for(const name of book.SheetNames){
  if(/summary|cover|tender|preamble|general notes|prelim/i.test(name))continue
  const grid=XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[name],{header:1,defval:''})
  const h=grid.findIndex(r=>r.some(x=>/^descriptions?$/.test(norm(x)))&&r.some(x=>/^(qty|quantity)$/.test(norm(x)))&&r.some(x=>/^units?$/.test(norm(x))))
  if(h<0)continue
  const header=grid[h].map(norm), desc=header.findIndex(x=>/^descriptions?$/.test(x)), starts=header.flatMap((x,i)=>/^(qty|quantity)$/.test(x)?[i]:[])
  if(starts.length>1)warnings.push(`${name}: ${starts.length} parallel pricing blocks; confirm selected block ${block+1}.`)
  const q=starts[block]; if(q===undefined){warnings.push(`${name}: selected pricing block absent`);continue}
  const end=starts[block+1]??header.length, u=header.findIndex((x,i)=>i>q&&i<end&&/^units?$/.test(x)), rate=header.findIndex((x,i)=>i>q&&i<end&&x==='rate'), amount=header.findIndex((x,i)=>i>q&&i<end&&/^(amount|cost|total)$/.test(x))
  if(u<0||(rate<0&&amount<0)){warnings.push(`${name}: unsupported pricing layout`);continue}
  grid.slice(h+1).forEach((r,i)=>{const d=String(r[desc]??'').trim(), unit=String(r[u]??'').trim(), quantity=num(r[q]), a=amount<0?NaN:num(r[amount]), v=rate<0?a/quantity:num(r[rate]);if(!d||/^(sub.?total|grand total|total\b|carried|brought|vat\b|contingency|provisional sum)/i.test(d)||!unit||!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(v)||v<=0)return; if(Number.isFinite(a)&&Math.abs(a-quantity*v)>Math.max(1,Math.abs(a)*0.01)){warnings.push(`${name} row ${h+i+2}: amount mismatch; excluded`);return} rows.push({code:`${name}:${h+i+2}`,description:d,unit,quantity,rate:v,source:name})})
 }
 return {rows,warnings}
}
const words=(s:string)=>new Set(norm(s).replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(x=>x.length>3&&!['works','installation','supply','complete','including'].includes(x)))
export function proposeMapping(description:string,tasks:{id:string|number;name:string}[]){const a=words(description);const scores=tasks.map(t=>{const b=words(t.name);return {id:String(t.id),score:[...b].filter(x=>a.has(x)).length/Math.max(1,b.size)}}).sort((x,y)=>y.score-x.score);return scores[0]&&scores[0].score>=0.8&&scores[0].score>(scores[1]?.score??0)?scores[0].id:''}
