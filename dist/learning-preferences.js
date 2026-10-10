/* Local, bounded evidence consolidation. Never changes a generated composition. */
'use strict';
globalThis.SplitPreferences=(()=>{
 const VERSION=1,MAX_EVIDENCE=128,MAX_EVIDENCE_BYTES=128*1024,MAX_PROJECT_ENTRIES=128,MAX_GENERAL_ENTRIES=256;
 const metrics=['x','y','widthScale','heightScale','fontScale','rotation','align'];
 const numericBounds={x:.35,y:.35,widthScale:1,heightScale:1,fontScale:1,rotation:45};
 const roles=['logo','text','image','offer','cta'],types=['image','text','offer','cta'];
 const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(id);
 const finite=n=>typeof n==='number'&&Number.isFinite(n),round=n=>Math.round(n*1e8)/1e8;
 const empty=()=>({version:VERSION,entries:[]});
 function signature(value){const s=JSON.stringify(value);let a=2166136261,b=2246822519;for(let i=0;i<s.length;i++){a=Math.imul(a^s.charCodeAt(i),16777619);b=Math.imul(b^s.charCodeAt(i),3266489917);}return `p_${(a>>>0).toString(16).padStart(8,'0')}${(b>>>0).toString(16).padStart(8,'0')}`;}
 const contextKeys=new WeakMap();
 const contextKey=context=>{if(!contextKeys.has(context))contextKeys.set(context,signature(context));return contextKeys.get(context);};
 function context(output,layer,algorithmVersion){
  const counts=roles.map(role=>Math.min(3,output.layers.filter(l=>!l.hidden&&l.role===role).length));
  return{algorithmVersion,ratio:Math.round(Math.log2(output.w/output.h)*2),planned:!!output.planned,role:layer.role,type:layer.type,counts,textBand:layer.type==='image'?-1:layer.textLength<=40?0:layer.textLength<=120?1:2,imageRatio:layer.type==='image'&&layer.aspect>0?Math.max(-8,Math.min(8,Math.round(Math.log2(layer.aspect)*2))):null,startAlign:layer.align||null,constraintsKey:layer.constraintsKey||null};
 }
 function cleanContext(c){
  if(!c||typeof c.algorithmVersion!=='string'||c.algorithmVersion.length>40||!Number.isInteger(c.ratio)||Math.abs(c.ratio)>16||!roles.includes(c.role)||!types.includes(c.type)||!Array.isArray(c.counts)||c.counts.length!==5||c.counts.some(n=>!Number.isInteger(n)||n<0||n>3)||![-1,0,1,2].includes(c.textBand)||(c.imageRatio!==null&&(!Number.isInteger(c.imageRatio)||Math.abs(c.imageRatio)>8))||(c.startAlign!==null&&!['left','center','right'].includes(c.startAlign))||(c.constraintsKey!==null&&!validId(c.constraintsKey)))throw Error('Invalid preference context');
  return{algorithmVersion:c.algorithmVersion,ratio:c.ratio,planned:!!c.planned,role:c.role,type:c.type,counts:[...c.counts],textBand:c.textBand,imageRatio:c.imageRatio,startAlign:c.startAlign,constraintsKey:c.constraintsKey};
 }
 function inside(layer,output){
  if(![layer.x,layer.y,layer.w,layer.h].every(finite)||layer.w<=0||layer.h<=0)return false;
  const r=(layer.rotation||0)*Math.PI/180,w=layer.w*output.w,h=layer.h*output.h;
  const ex=(Math.abs(Math.cos(r))*w+Math.abs(Math.sin(r))*h)/2/output.w,ey=(Math.abs(Math.sin(r))*w+Math.abs(Math.cos(r))*h)/2/output.h;
  const x=layer.x+layer.w/2,y=layer.y+layer.h/2;return x-ex>=-1e-6&&y-ey>=-1e-6&&x+ex<=1+1e-6&&y+ey<=1+1e-6;
 }
 function values(before,after){
  const v={x:round(after.x-before.x),y:round(after.y-before.y),widthScale:round(after.w/before.w-1),heightScale:round(after.h/before.h-1),rotation:round((after.rotation||0)-(before.rotation||0))};
  if(before.type!=='image'){if(before.fontSize>0&&after.fontSize>0)v.fontScale=round(after.fontSize/before.fontSize-1);if(before.align&&after.align)v.align=after.align;}
  for(const key of Object.keys(v))if(key!=='align'&&(!finite(v[key])||Math.abs(v[key])>numericBounds[key]))delete v[key];return v;
 }
 function samples(baseline,current,algorithmVersion,report){
  if(!['adjusted','unchanged'].includes(report.status)||report.reasons.length)return [];
  const changes=new Map(report.changes.map(c=>[c.id,c])),byId=new Map(current.layers.map(l=>[l.id,l])),groups=new Map();
  for(const before of baseline.layers){
   const after=byId.get(before.id),change=changes.get(before.id);
   if(!after||before.manualLayout||before.locked||before.hidden||before.groupId||after.locked||after.hidden||after.groupId||!before.contentKey||before.contentKey!==after.contentKey||(change&&!change.eligible)||!inside(before,baseline)||!inside(after,current))continue;
   const c=context(baseline,before,algorithmVersion),key=contextKey(c);if(!groups.has(key))groups.set(key,{context:c,rows:[]});const row=values(before,after);for(const metric of baseline.applied?.find(entry=>entry.id===before.id)?.metrics||[])if(metric==='align'?row[metric]===before.align:Math.abs(row[metric]||0)<=(metric==='rotation'?.01:1e-6))delete row[metric];groups.get(key).rows.push(row);
  }
  return [...groups.values()].slice(0,32).map(group=>{
   const result={};for(const metric of metrics){const rows=group.rows.map(r=>r[metric]).filter(v=>v!=null);if(!rows.length)continue;if(metric==='align'){const counts=new Map();for(const v of rows)counts.set(v,(counts.get(v)||0)+1);result[metric]=[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0][0];}else{rows.sort((a,b)=>a-b);const half=Math.floor(rows.length/2);result[metric]=round(rows.length%2?rows[half]:(rows[half-1]+rows[half])/2);}}
   return{context:group.context,values:result};
  });
 }
 function cleanEvidence(input){
  if(!Array.isArray(input)||input.length>MAX_EVIDENCE||new TextEncoder().encode(JSON.stringify(input)).length>MAX_EVIDENCE_BYTES)return [];
  try{
   const keys=new Set();return input.map(e=>{
    if(!e||!validId(e.originId)||!validId(e.formatId)||!validId(e.recordId)||!Number.isSafeInteger(e.ordinal)||e.ordinal<1||!['save','export'].includes(e.kind)||typeof e.at!=='string'||e.at.length>40||!Number.isFinite(Date.parse(e.at))||!Array.isArray(e.samples)||e.samples.length>32)throw Error('Invalid evidence');
    const key=`${e.originId}|${e.formatId}`;if(keys.has(key))throw Error('Duplicate evidence');keys.add(key);
    const entries=e.samples.map(s=>{const c=cleanContext(s.context),v={};for(const metric of metrics)if(s.values?.[metric]!=null){const n=s.values[metric];if(metric==='align'){if(!['left','center','right'].includes(n))throw Error('Invalid alignment');}else if(!finite(n)||Math.abs(n)>numericBounds[metric])throw Error('Invalid preference value');v[metric]=n;}return{context:c,values:v};});
    if(new Set(entries.map(s=>contextKey(s.context))).size!==entries.length)throw Error('Duplicate context');
    return{originId:e.originId,formatId:e.formatId,recordId:e.recordId,ordinal:e.ordinal,kind:e.kind,at:e.at,samples:entries};
   });
  }catch{return [];}
 }
 function consolidate(memory){
  const result=new Map(cleanEvidence(memory.evidence).map(e=>[`${e.originId}|${e.formatId}`,e]));
  const generations=new Map(memory.records.filter(r=>r.kind==='generation').map((r)=>[r.id,r]));
  for(const record of memory.records){
   if(!['save','export'].includes(record.kind))continue;
   for(const current of record.outputs){
    const reference=record.comparisons?.find(c=>c.formatId===current.formatId)?.baselineId,base=generations.get(reference),baseline=base?.outputs.find(o=>o.formatId===current.formatId);
    if(!baseline||base.ordinal>=record.ordinal)continue;
    const key=`${reference}|${current.formatId}`,previous=result.get(key);if(previous&&previous.ordinal>record.ordinal)continue;
    const report=SplitComparison.compare(baseline,current,reference);
    const nextSamples=samples(baseline,current,base.algorithmVersion,report),kind=previous?.kind==='export'&&JSON.stringify(previous.samples)===JSON.stringify(nextSamples)?'export':record.kind;
    result.set(key,{originId:reference,formatId:current.formatId,recordId:record.id,ordinal:record.ordinal,kind,at:record.at,samples:nextSamples});
   }
  }
  const evidence=[...result.values()].sort((a,b)=>a.ordinal-b.ordinal||a.formatId.localeCompare(b.formatId));
  while(evidence.length>MAX_EVIDENCE||new TextEncoder().encode(JSON.stringify(evidence)).length>MAX_EVIDENCE_BYTES)evidence.shift();return evidence;
 }
 const weight=kind=>kind==='export'?.6:.4;
 const threshold=metric=>metric==='rotation'?.01:1e-6;
 function statistic(rows,metric,scope,c){
  const evidence=rows.reduce((sum,r)=>sum+r.weight,0),support=rows.length;let value,agreement,consistency;
  if(metric==='align'){
   const buckets=new Map();for(const row of rows)buckets.set(row.value,(buckets.get(row.value)||0)+row.weight);
   const winner=[...buckets].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0];value=winner[0];agreement=winner[1]/evidence;consistency=1;
  }else{
   // Winsorization contains isolated outliers without discarding contradictory evidence.
   const ordered=rows.map(r=>r.value).sort((a,b)=>a-b),lo=ordered[rows.length>=5?Math.floor((rows.length-1)*.1):0],hi=ordered[rows.length>=5?Math.ceil((rows.length-1)*.9):ordered.length-1];
   value=rows.reduce((sum,r)=>sum+Math.max(lo,Math.min(hi,r.value))*r.weight,0)/evidence;
   const sign=n=>Math.abs(n)<=threshold(metric)?0:Math.sign(n);
   agreement=rows.filter(r=>sign(r.value)===sign(value)).reduce((sum,r)=>sum+r.weight,0)/evidence;
   const deviation=rows.reduce((sum,r)=>sum+Math.abs(Math.max(lo,Math.min(hi,r.value))-value)*r.weight,0)/evidence;
   consistency=1/(1+deviation/(Math.abs(value)+(metric==='rotation'?1:.005)));value=round(value);
  }
  const changed=rows.some(r=>r.changed),active=changed&&(metric==='align'?value!==c.startAlign:Math.abs(value)>threshold(metric));
  const confidence=round(Math.min(scope==='project'?.75:.9,evidence/(evidence+1.5)*agreement*consistency));
  return{key:`${contextKey(c)}_${metric}`,context:c,metric,value,confidence,support,projectCount:scope==='project'?1:support,evidence:round(evidence),agreement:round(agreement),consistency:round(consistency),changed,active,ready:active&&support>=3&&confidence>=.5};
 }
 function certificateKey(e){return `${e.recordId}|${e.formatId}`;}
 function proof(e){return signature({originId:e.originId,formatId:e.formatId,samples:e.samples});}
 function project(memory,{certificates}={}){
  const allowed=certificates?new Map(certificates.map(c=>[c.key,c])):null,origins=new Map();
  for(const e of memory.evidence||[]){
   const certificate=allowed?.get(certificateKey(e));if(allowed&&(!certificate||certificate.proof!==proof(e)))continue;
   const signal=certificate?.kind||e.kind;
   for(const sample of e.samples){
    const c=sample.context;
    for(const metric of metrics){if(sample.values[metric]==null)continue;const key=`${e.originId}|${contextKey(c)}_${metric}`;
     if(!origins.has(key))origins.set(key,{context:c,metric,rows:[]});origins.get(key).rows.push({value:sample.values[metric],weight:weight(signal)});
    }
   }
  }
  const groups=new Map();
  for(const origin of origins.values()){
   const key=`${contextKey(origin.context)}_${origin.metric}`;if(!groups.has(key))groups.set(key,{context:origin.context,metric:origin.metric,rows:[]});
   const row=statistic(origin.rows,origin.metric,'project',origin.context);
   groups.get(key).rows.push({value:row.value,weight:Math.max(...origin.rows.map(r=>r.weight)),changed:origin.metric==='align'?row.value!==origin.context.startAlign:Math.abs(row.value)>threshold(origin.metric)});
  }
  const entries=[...groups.values()].map(g=>statistic(g.rows,g.metric,'project',g.context));return{version:VERSION,entries:limit(entries,MAX_PROJECT_ENTRIES)};
 }
 function limit(entries,max){return entries.sort((a,b)=>Number(b.active)-Number(a.active)||b.confidence-a.confidence||b.support-a.support||a.key.localeCompare(b.key)).slice(0,max);}
 function cleanModel(model,max=MAX_PROJECT_ENTRIES){
  if(!model||model.version!==VERSION||!Array.isArray(model.entries)||model.entries.length>max)throw Error('Invalid preferences');
  const entries=model.entries.map(e=>{
   const c=cleanContext(e.context);if(!metrics.includes(e.metric)||e.key!==`${contextKey(c)}_${e.metric}`||!Number.isSafeInteger(e.support)||e.support<1||!Number.isSafeInteger(e.projectCount)||e.projectCount<1||![e.confidence,e.evidence,e.agreement,e.consistency].every(finite)||e.confidence<0||e.confidence>1||e.evidence<=0||e.agreement<0||e.agreement>1||e.consistency<0||e.consistency>1)throw Error('Invalid preference statistics');
   if(e.metric==='align'){if(!['left','center','right'].includes(e.value))throw Error('Invalid alignment');}else if(!finite(e.value)||Math.abs(e.value)>numericBounds[e.metric])throw Error('Invalid preference');
   return{key:e.key,context:c,metric:e.metric,value:e.value,confidence:e.confidence,support:e.support,projectCount:e.projectCount,evidence:e.evidence,agreement:e.agreement,consistency:e.consistency,changed:!!e.changed,active:!!e.active,ready:!!e.active&&e.support>=3&&e.confidence>=.5};
  });if(new Set(entries.map(e=>e.key)).size!==entries.length)throw Error('Duplicate preference');return{version:VERSION,entries};
 }
 function general(contributions){
  const projects=new Map();for(const row of contributions)if(validId(row.projectId))projects.set(row.projectId,row);
  const groups=new Map();
  for(const row of projects.values()){
   let model;try{model=cleanModel(row.preferences);}catch{continue;}
   for(const e of model.entries){const w=Math.min(1,e.evidence)*e.consistency;if(w<=0)continue;if(!groups.has(e.key))groups.set(e.key,{context:e.context,metric:e.metric,rows:[]});groups.get(e.key).rows.push({value:e.value,weight:w,changed:e.changed});}
  }
  return{version:VERSION,entries:limit([...groups.values()].map(g=>statistic(g.rows,g.metric,'general',g.context)),MAX_GENERAL_ENTRIES)};
 }
 function certify(memory,refs,prior=[]){
  const certificates=new Map(),exported=new Set();for(const c of Array.isArray(prior)?prior:[])if(c&&typeof c.key==='string'&&c.key.length<=201&&validId(c.proof)&&['save','export'].includes(c.kind)){certificates.set(c.key,c);if(c.kind==='export')exported.add(c.proof);}
  for(const ref of refs||[]){const e=memory.evidence.find(e=>e.recordId===ref.recordId&&e.formatId===ref.formatId);if(!e||!['save','export'].includes(ref.kind))continue;const key=certificateKey(e),p=proof(e);certificates.delete(key);certificates.set(key,{key,proof:p,kind:exported.has(p)?'export':ref.kind});if(ref.kind==='export')exported.add(p);}
  return [...certificates.values()].slice(-1024);
 }
 return{VERSION,MAX_EVIDENCE,MAX_EVIDENCE_BYTES,MAX_PROJECT_ENTRIES,MAX_GENERAL_ENTRIES,empty,context,contextKey,cleanEvidence,consolidate,project,general,cleanModel,certify};
})();
