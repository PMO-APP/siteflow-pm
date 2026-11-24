import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
const compiled = await build({entryPoints:['src/core/metrics/progressMetrics.ts'],bundle:true,write:false,platform:'node',format:'esm'})
const {calculateProgressPosition} = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)
const today = new Date('2026-11-24T08:00:00+01:00')
test('late commencement is not overdue completion; duration weights are consistent',()=>{
 const p=calculateProgressPosition([{status:'Completed',duration:1,planned_start:'2026-11-20',planned_finish:'2026-11-20'}, {status:'Not Started',duration:3,planned_start:'2026-11-23',planned_finish:'2026-11-25'}],today)
 assert.equal(p.actual,25); assert.equal(p.planned,75); assert.equal(p.lateStarts,1); assert.equal(p.overdue,0)
})
test('partial explicit weights never mix with durations; summary excluded',()=>{
 const p=calculateProgressPosition([{status:'Completed',duration:1,weight_pct:80},{status:'Not Started',duration:9},{status:'Completed',is_summary:true,duration:100}],today)
 assert.equal(p.actual,10); assert.equal(p.basis,'Duration-weighted estimate')
})
test('complete explicit weights retain zero weight and exclude milestones',()=>{
 const p=calculateProgressPosition([{status:'Completed',weight_pct:0},{status:'Completed',weight_pct:20},{status:'Not Started',weight_pct:80},{status:'Completed',is_milestone:true}],today)
 assert.equal(p.actual,20); assert.equal(p.basis,'Recorded activity weights')
})
