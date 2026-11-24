import test from 'node:test'; import assert from 'node:assert/strict'; import {build} from 'esbuild';
const b=await build({entryPoints:['src/features/schedule/constructionWeights.ts'],bundle:true,write:false,platform:'node',format:'esm'});const {proposeWeights,constructionTemplates}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
test('BOQ weights exclude zero scope and sum to 100',()=>{assert.deepEqual(proposeWeights([{id:'a',category:'',value:0},{id:'b',category:'',value:20},{id:'c',category:'',value:80}]).map(x=>x.weight_pct),[0,20,80])});
test('templates total 100',()=>{for(const g of Object.values(constructionTemplates))assert.equal(Object.values(g).reduce((a,b)=>a+b,0),100)});
test('missing category rejected',()=>assert.throws(()=>proposeWeights([{id:'a',category:'Earthworks',value:1}],constructionTemplates.Roads)));
test('rounding preserves total',()=>assert.equal(Math.round(proposeWeights(['a','b','c'].map(id=>({id,category:'',value:1}))).reduce((s,r)=>s+r.weight_pct,0)*10000),1000000));
