import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';
const b=await build({entryPoints:['src/features/schedule/boqWeights.ts'],bundle:true,write:false,platform:'node',format:'esm'});const {deriveBOQDraft}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const tasks=[{id:'a',name:'Earthworks'},{id:'b',name:'Drainage'}];const item={code:'1',task_id:'a',quantity:2,rate:10};
test('aggregates multiple items and retains zero rows',()=>assert.deepEqual(deriveBOQDraft([item,{...item,code:'2',quantity:3}],tasks).map(x=>x.value),[50,0]));
test('rejects duplicate code',()=>assert.throws(()=>deriveBOQDraft([item,item],tasks)));
test('rejects historical unmapped scope',()=>assert.throws(()=>deriveBOQDraft([{...item,task_id:'old'}],tasks)));
test('rejects invalid or empty scope',()=>{assert.throws(()=>deriveBOQDraft([],tasks));assert.throws(()=>deriveBOQDraft([{...item,rate:-1}],tasks))});
