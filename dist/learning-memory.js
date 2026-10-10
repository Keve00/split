/* Local observations and consolidated comparisons. No layout ranking changes. */
'use strict';
globalThis.SplitMemory=(()=>{
 const VERSION=3,ALGORITHM_VERSION='layout-1',MAX_RECORDS=40,MAX_BYTES=512*1024,MAX_PROJECTS=50;
 const copy=value=>JSON.parse(JSON.stringify(value));
 const validId=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(value);
 const uuid=()=>globalThis.crypto?.randomUUID?.()||`m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
 const fresh=projectId=>({version:VERSION,projectId:validId(projectId)?projectId:uuid(),revisionId:uuid(),eventSequence:0,records:[],drafts:[],evidence:[],preferences:SplitPreferences.empty()});
 const finite=value=>typeof value==='number'&&Number.isFinite(value);
 const dimension=value=>Number.isInteger(value)&&value>=32&&value<=4096;
 const text=(value,max)=>typeof value==='string'&&value.length<=max;
 const encodedSize=value=>new TextEncoder().encode(JSON.stringify(value)).length;
 function baselines(records){const result=new Map();for(const record of records)if(record.kind==='generation')for(const output of record.outputs)result.set(output.formatId,{id:record.id,output});return result;}
 function trim(value,{consolidate=false}={}){
  if(consolidate)value.evidence=SplitPreferences.consolidate(value);
  if(consolidate)value.preferences=SplitPreferences.project(value);
  const protectedIds=new Set([...baselines(value.records).values()].map(b=>b.id));
  const prune=()=>{const index=value.records.findIndex(r=>!protectedIds.has(r.id));value.records.splice(index<0?0:index,1);};
  while(value.records.length>MAX_RECORDS)prune();while(value.records.length&&encodedSize(value)>MAX_BYTES)prune();
  const ids=new Set(value.records.filter(r=>r.kind==='generation').map(r=>r.id));
  for(const record of value.records)if(record.comparisons)record.comparisons=record.comparisons.filter(c=>c.baselineId===null||ids.has(c.baselineId));
  value.drafts=value.drafts.filter(c=>ids.has(c.baselineId));
  if(encodedSize(value)>MAX_BYTES)value.drafts=[];
  while(value.evidence.length&&encodedSize(value)>MAX_BYTES){value.evidence.shift();value.preferences=SplitPreferences.project(value);}return value;
 }
 function fingerprint(value){
  // A compact change detector, not encryption. Raw copy is never kept in memory.
  const input=typeof value==='string'?value:JSON.stringify(value);let a=2166136261,b=2246822519;
  for(let i=0;i<input.length;i++){const c=input.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b^c,3266489917);}
  return `k_${(a>>>0).toString(16).padStart(8,'0')}${(b>>>0).toString(16).padStart(8,'0')}`;
 }
 function constraintsKey(layer){const rules={position:'auto',align:'auto',margin:5,minWidth:0,maxWidth:0,priority:3,overflow:false,...layer.rules};return fingerprint(Object.keys(rules).sort().map(key=>[key,rules[key]]));}
 function layoutContext(output,layer,planned=false){return SplitPreferences.context({...output,planned},{...layer,textLength:typeof layer.text==='string'?layer.text.length:layer.textLength,constraintsKey:constraintsKey(layer)},ALGORITHM_VERSION);}
 function layoutLearning(){return{project:copy(memory.preferences),general:copy(generalModel)};}
 const appliedLayouts=new WeakMap();
 function markLayout(output,applied=[]){appliedLayouts.set(output,copy(applied));}
 function layoutInput(output,layer){
  if(layer.locked||layer.groupId||layer.hidden)return layer;
  const baseline=baselines(memory.records).get(output.id)?.output,applied=baseline?.applied?.find(entry=>entry.id===layer.id),before=baseline?.layers.find(item=>item.id===layer.id);
  if(!applied?.original||!before)return layer;const result={...layer};
  for(const metric of ['rotation','align'])if(applied.metrics.includes(metric)&&applied.original[metric]!=null&&(metric==='rotation'?(layer.rotation||0)===(before.rotation||0):layer.align===before.align))result[metric]=applied.original[metric];
  return result;
 }
 const imageKeys=new WeakMap();
 function imageKey(image){if(!image||typeof image!=='object')return undefined;if(!imageKeys.has(image))imageKeys.set(image,uuid());return imageKeys.get(image);}
 function registerImage(image,key){if(image&&typeof image==='object'&&validId(key))imageKeys.set(image,key);return imageKey(image);}
 function planningKey(out,planned){
  if(!planned)return fingerprint(null);
  const template=globalThis.SplitBlueprint?.template(out)||null;
  // Legacy role areas and their equivalent normalized source bindings mean the same plan.
  if(template&&globalThis.SplitBlueprintModel?.entries){
   const entries=SplitBlueprintModel.entries(template,out.layers,true).map(e=>[e.key,e.area.x,e.area.y,e.area.w,e.area.h,e.item.blueprintSourceId||e.item.id]);
   entries.sort((a,b)=>a[0].localeCompare(b[0]));return fingerprint(entries);
  }
  return fingerprint(template);
 }
 function cleanLayer(l){
  if(!l||!validId(l.id)||!['image','text','offer','cta'].includes(l.type)||!['image','text','offer','logo','cta'].includes(l.role))throw Error('Invalid observation');
  const result={id:l.id,type:l.type,role:l.role};
  for(const key of ['x','y','w','h']){if(!finite(l[key])||Math.abs(l[key])>10000||((key==='w'||key==='h')&&l[key]<=0))throw Error('Invalid geometry');result[key]=l[key];}
  for(const key of ['fontSize','rotation','aspect'])if(l[key]!=null){if(!finite(l[key])||Math.abs(l[key])>1000000)throw Error('Invalid geometry');result[key]=l[key];}
  if(l.textLength!=null){if(!Number.isInteger(l.textLength)||l.textLength<0||l.textLength>3000)throw Error('Invalid length');result.textLength=l.textLength;}
  if(['left','center','right'].includes(l.align))result.align=l.align;
  for(const key of ['contentKey','styleKey','constraintsKey','groupId'])if(l[key]!=null){if(!validId(l[key]))throw Error('Invalid context');result[key]=l[key];}
  for(const key of ['locked','hidden','manualLayout'])result[key]=!!l[key];
  return result;
 }
 function cleanOutput(out){
  if(!out||!validId(out.formatId)||!dimension(out.w)||!dimension(out.h)||out.w*out.h>16000000||!text(out.template,200)||!Array.isArray(out.layers)||out.layers.length>500)throw Error('Invalid output');
  const layers=out.layers.map(cleanLayer);if(new Set(layers.map(l=>l.id)).size!==layers.length)throw Error('Duplicate layer');
  const result={formatId:out.formatId,w:out.w,h:out.h,template:out.template,planned:!!out.planned,layers};
  if(out.applied!=null){if(!Array.isArray(out.applied)||out.applied.length>500)throw Error('Invalid applied preferences');const seen=new Set();result.applied=out.applied.map(entry=>{if(!entry||!layers.some(l=>l.id===entry.id)||seen.has(entry.id)||!Array.isArray(entry.metrics)||!entry.metrics.length||entry.metrics.length>7||new Set(entry.metrics).size!==entry.metrics.length||entry.metrics.some(metric=>!['x','y','widthScale','heightScale','fontScale','rotation','align'].includes(metric)))throw Error('Invalid applied preferences');seen.add(entry.id);const original={};if(entry.original!=null){if(typeof entry.original!=='object'||Array.isArray(entry.original))throw Error('Invalid original preference');if(entry.original.rotation!=null){if(!entry.metrics.includes('rotation')||!finite(entry.original.rotation)||Math.abs(entry.original.rotation)>1000000)throw Error('Invalid original rotation');original.rotation=entry.original.rotation;}if(entry.original.align!=null){if(!entry.metrics.includes('align')||!['left','center','right'].includes(entry.original.align))throw Error('Invalid original alignment');original.align=entry.original.align;}}return{id:entry.id,metrics:[...entry.metrics],...(Object.keys(original).length?{original}:{})};});}
  for(const key of ['planKey','backgroundKey'])if(out[key]!=null){if(!validId(out[key]))throw Error('Invalid context');result[key]=out[key];}return result;
 }
 function normalize(value){
  const empty=fresh(value?.projectId);
  try{
   if(!value||![1,2,VERSION].includes(value.version)||!validId(value.projectId)||!validId(value.revisionId)||!Array.isArray(value.records)||value.records.length>MAX_RECORDS||encodedSize(value)>MAX_BYTES)return empty;
   const ids=new Set(),revisions=new Set();
   const ordinals=new Set();const records=value.records.map((record,index)=>{
    if(!record||!validId(record.id)||ids.has(record.id)||!validId(record.revisionId)||revisions.has(record.revisionId)||!['generation','save','export'].includes(record.kind)||!text(record.at,40)||!Number.isFinite(Date.parse(record.at))||!text(record.algorithmVersion,40)||!Array.isArray(record.outputs)||record.outputs.length>100)throw Error('Invalid record');
    ids.add(record.id);revisions.add(record.revisionId);
    const outputs=record.outputs.map(cleanOutput);if(new Set(outputs.map(o=>o.formatId)).size!==outputs.length)throw Error('Duplicate format');
    const ordinal=value.version===VERSION?record.ordinal:index+1;if(!Number.isSafeInteger(ordinal)||ordinal<1||ordinals.has(ordinal))throw Error('Invalid event ordinal');ordinals.add(ordinal);
    const result={id:record.id,revisionId:record.revisionId,ordinal,kind:record.kind,at:record.at,algorithmVersion:record.algorithmVersion,outputs};
    if(value.version>=2&&record.comparisons!=null){if(!Array.isArray(record.comparisons)||record.comparisons.length>100)throw Error('Invalid comparisons');result.comparisons=record.comparisons.map(SplitComparison.clean);}
    return result;
   });
   let drafts=[];if(value.version>=2&&value.drafts!=null){if(!Array.isArray(value.drafts)||value.drafts.length>100)throw Error('Invalid drafts');drafts=value.drafts.map(SplitComparison.clean);}
   const evidence=value.version===VERSION?SplitPreferences.cleanEvidence(value.evidence):[];
   const minimum=Math.max(0,...records.map(r=>r.ordinal),...evidence.map(e=>e.ordinal));
   const eventSequence=value.version===VERSION&&Number.isSafeInteger(value.eventSequence)&&value.eventSequence>=minimum?value.eventSequence:minimum;
   return trim({version:VERSION,projectId:value.projectId,revisionId:value.revisionId,eventSequence,records,drafts,evidence,preferences:SplitPreferences.empty()},{consolidate:true});
  }catch{return empty;}
 }
 let memory=fresh(),database,queue=Promise.resolve(),generalModel=SplitPreferences.empty();
 function identity(){return{version:VERSION,projectId:memory.projectId,revisionId:memory.revisionId};}
 function snapshot(){return copy(memory);}
 function restore(value,{persist=false}={}){memory=normalize(value);if(persist)persistLocal();return snapshot();}
 function observations(outputs,{images,planned=false}={}){
  if(!Array.isArray(outputs)||outputs.length>100||new Set(outputs.map(o=>o.id)).size!==outputs.length)throw Error('Invalid formats');
  return outputs.map(out=>cleanOutput({formatId:out.id,w:out.w,h:out.h,template:out.composition||'Personalizada',planned,...(appliedLayouts.get(out)?.length?{applied:appliedLayouts.get(out)}:{}),planKey:planningKey(out,planned),backgroundKey:fingerprint([out.bg||null,out.background?{mode:out.background.mode||'auto',focusX:out.background.focusX??50,focusY:out.background.focusY??50,zoom:out.background.zoom??100,feather:out.background.feather??12,content:imageKey(images?.get(out.background.asset))||null}:null]),layers:out.layers.filter(l=>l.role!=='reference').map(l=>{
   const item={...l};if(typeof l.text==='string')item.textLength=l.text.length;
   const image=l.type==='image'&&images?.get(l.asset);if(image?.width&&image?.height)item.aspect=image.width/image.height;
   item.contentKey=l.type==='image'?imageKey(image):fingerprint(l.text||'');
   item.styleKey=fingerprint([l.weight??null,l.color??null,l.fill??null,l.cornerRadius??null,l.type==='image'?(l.fit||'contain'):null]);
   item.constraintsKey=constraintsKey(l);
   return item;
  })}));
 }
 function prepare(outputs,options){try{const observed=observations(outputs,options),base=baselines(memory.records);return{projectId:memory.projectId,observed,baselines:observed.map(o=>base.get(o.formatId)||null)};}catch{return null;}}
 function reports(context){return context.observed.map((out,i)=>SplitComparison.compare(context.baselines[i]?.output,out,context.baselines[i]?.id));}
 function trackEdits(outputs,options){
  try{
   const context=prepare(outputs,options);if(!context)return false;
   const drafts=reports(context).filter(c=>c.status!=='unchanged'&&c.status!=='no-baseline');
   if(JSON.stringify(drafts)===JSON.stringify(memory.drafts))return false;
   memory.drafts=drafts;memory.revisionId=uuid();trim(memory);persistLocal();return true;
  }catch{return false;}
 }
 function record(kind,outputs,options){
  try{
   if(!['generation','save','export'].includes(kind))return false;
   const context=options?.prepared||prepare(outputs,options);if(!context||context.projectId!==memory.projectId)return false;
   const observed=kind==='generation'?context.observed:context.observed.map(({applied,...out})=>out),comparisons=kind==='generation'?[]:reports(context);
   // A reverted version is a new confirmation; repeating the latest version is not.
   if(kind!=='generation'){
    const matching=observed.map((out,i)=>{
     const previous=memory.records.findLast(r=>r.kind!=='generation'&&r.outputs.some(o=>o.formatId===out.formatId)&&r.comparisons?.some(c=>c.formatId===out.formatId&&c.baselineId===comparisons[i].baselineId));
     return previous&&JSON.stringify(previous.outputs.find(o=>o.formatId===out.formatId))===JSON.stringify(out)&&(previous.kind===kind||previous.kind==='export'&&kind==='save')?{recordId:previous.id,formatId:out.formatId,kind}:null;
    });
    if(matching.length&&matching.every(Boolean)){persistLocal({authorize:matching});return false;}
   }
   const revisionId=uuid(),id=uuid(),ordinal=++memory.eventSequence;memory.records.push({id,revisionId,ordinal,kind,at:new Date().toISOString(),algorithmVersion:ALGORITHM_VERSION,outputs:observed,...(kind==='generation'?{}:{comparisons})});
   if(kind==='generation'){const generated=new Set(observed.map(o=>o.formatId));memory.drafts=memory.drafts.filter(c=>!generated.has(c.formatId));}
   memory.revisionId=revisionId;trim(memory,{consolidate:kind!=='generation'});persistLocal({authorize:kind==='generation'?[]:observed.map(o=>({recordId:id,formatId:o.formatId,kind}))});return true;
  }catch{return false;}
 }
 function db(){
  if(database)return database;
  database=new Promise((resolve,reject)=>{
   if(!globalThis.indexedDB){reject(Error('Local memory unavailable'));return;}
   const request=indexedDB.open('split-learning',2);let settled=false;
   const rejectOnce=error=>{settled=true;reject(error||Error('Local memory unavailable'));};
   request.onupgradeneeded=()=>{const d=request.result;for(const name of ['projects','contributions'])if(!d.objectStoreNames.contains(name)){const store=d.createObjectStore(name,{keyPath:'projectId'});store.createIndex('updatedAt','updatedAt');}if(!d.objectStoreNames.contains('general'))d.createObjectStore('general');};
   request.onsuccess=()=>{const d=request.result;if(settled){d.close();return;}d.onversionchange=()=>{d.close();database=null;};resolve(d);};
   request.onerror=()=>rejectOnce(request.error);request.onblocked=()=>rejectOnce();
  });
  database.catch(()=>{database=null;});return database;
 }
 async function put(value,authorize=[]){
  const d=await db();
  return new Promise((resolve,reject)=>{
   const tx=d.transaction(['projects','contributions','general'],'readwrite'),store=tx.objectStore('projects'),contributions=tx.objectStore('contributions');let nextModel;
   store.put({projectId:value.projectId,updatedAt:Date.now(),memory:value});
   const aggregate=()=>{const request=contributions.getAll();request.onsuccess=()=>{try{nextModel=SplitPreferences.general(request.result);tx.objectStore('general').put(nextModel,'current');}catch{tx.abort();}};};
   const previous=contributions.get(value.projectId);previous.onsuccess=()=>{try{
    const certificates=SplitPreferences.certify(value,authorize,previous.result?.certificates||[]),preferences=SplitPreferences.project(value,{certificates});
    contributions.put({projectId:value.projectId,updatedAt:Date.now(),certificates,preferences});
    const count=store.count();count.onsuccess=()=>{let excess=count.result-MAX_PROJECTS;if(excess<=0){aggregate();return;}const cursor=store.index('updatedAt').openCursor();cursor.onsuccess=()=>{const row=cursor.result;if(!row||excess<=0){aggregate();return;}if(row.primaryKey!==value.projectId){row.delete();contributions.delete(row.primaryKey);excess--;}row.continue();};};
   }catch{tx.abort();}};
   tx.oncomplete=()=>{if(nextModel)generalModel=nextModel;resolve(true);};tx.onabort=tx.onerror=()=>reject(tx.error||Error('Local memory unavailable'));
  });
 }
 function persistLocal({authorize=[]}={}){const value=snapshot();queue=queue.then(()=>put(value,authorize)).catch(()=>false);return queue;}
 async function readLocal(projectId){try{if(!validId(projectId))return null;await queue;const d=await db();return await new Promise((resolve,reject)=>{const tx=d.transaction('projects','readonly'),request=tx.objectStore('projects').get(projectId);let result;request.onsuccess=()=>{result=request.result;};tx.oncomplete=()=>resolve(result?normalize(result.memory):null);tx.onabort=tx.onerror=()=>reject(tx.error);});}catch{return null;}}
 async function readGeneral(){try{await queue;const d=await db();const model=await new Promise((resolve,reject)=>{const tx=d.transaction('general','readonly'),request=tx.objectStore('general').get('current');let result;request.onsuccess=()=>{result=request.result;};tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(tx.error);});generalModel=model?SplitPreferences.cleanModel(model,SplitPreferences.MAX_GENERAL_ENTRIES):SplitPreferences.empty();return copy(generalModel);}catch{return copy(generalModel);}}
 const generalInitialized=readGeneral();
 return{VERSION,ALGORITHM_VERSION,MAX_RECORDS,MAX_BYTES,MAX_PROJECTS,normalize,identity,snapshot,restore,imageKey,registerImage,prepare,trackEdits,record,persistLocal,readLocal,readGeneral,layoutContext,layoutLearning,markLayout,layoutInput,generalSnapshot:()=>copy(generalModel),generalInitialized,settled:async()=>{await generalInitialized;return queue;}};
})();
