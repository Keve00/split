/* Pure comparison of a generated composition with a later version. */
'use strict';
globalThis.SplitComparison=(()=>{
 const finite=n=>typeof n==='number'&&Number.isFinite(n);
 const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(id);
 const roles=['image','text','offer','logo','cta'];
 const reasons=['content','style','structure','state','constraints','background','planning','dimensions','unknown-content','inherited-layout'];
 const rounded=n=>Math.round(n*1e8)/1e8;
 function delta(before,after){
  const result={};
  for(const key of ['x','y','w','h','fontSize','rotation']){
   const a=before[key]??(key==='rotation'?0:undefined),b=after[key]??(key==='rotation'?0:undefined);
   if(finite(a)&&finite(b)&&Math.abs(b-a)>(['fontSize','rotation'].includes(key)?.01:1e-6))result[key]=rounded(b-a);
  }
  if(before.align!==after.align&&before.align&&after.align)result.align={from:before.align,to:after.align};
  return result;
 }
 function compare(baseline,current,baselineId){
  const report={formatId:current.formatId,baselineId:baselineId||null,status:'no-baseline',reasons:[],changes:[],eligibleCount:0};
  if(!baseline)return report;
  const before=new Map(baseline.layers.map(l=>[l.id,l])),after=new Map(current.layers.map(l=>[l.id,l])),context=new Set();
  if(baseline.w!==current.w||baseline.h!==current.h)context.add('dimensions');
  if(baseline.planned!==current.planned||baseline.planKey!==current.planKey)context.add('planning');
  if(baseline.backgroundKey!==current.backgroundKey)context.add('background');
  for(const id of new Set([...before.keys(),...after.keys()])){
   const a=before.get(id),b=after.get(id),change={id,role:(b||a).role,kind:'layout',eligible:false,delta:{}};
   if(!a||!b||a.type!==b.type||a.role!==b.role){change.kind='structure';context.add('structure');}
   else{
    change.delta=delta(a,b);
    const known=!!a.contentKey&&!!b.contentKey;
    if((known&&a.contentKey!==b.contentKey)||a.textLength!==b.textLength||a.aspect!==b.aspect){change.kind='content';context.add('content');}
    else if(a.styleKey!==b.styleKey){change.kind='style';context.add('style');}
    else if(a.constraintsKey!==b.constraintsKey){change.kind='constraints';context.add('constraints');}
    else if(a.locked!==b.locked||a.hidden!==b.hidden||a.groupId!==b.groupId){change.kind='state';context.add('state');}
    else if(!known){context.add('unknown-content');if(Object.keys(change.delta).length)change.kind='uncertain';}
    if(change.kind==='layout'&&!Object.keys(change.delta).length)continue;
    if(change.kind==='layout'&&(a.manualLayout||a.locked||a.hidden||a.groupId))change.reason='inherited-layout';
   }
   report.changes.push(change);
  }
  report.reasons=[...context];
  for(const change of report.changes){
   change.eligible=change.kind==='layout'&&context.size===0&&!change.reason;
   if(change.eligible)report.eligibleCount++;
  }
  report.status=context.size?'context-changed':report.changes.length?'adjusted':'unchanged';
  return report;
 }
 function clean(value){
  if(!value||!validId(value.formatId)||(value.baselineId!==null&&!validId(value.baselineId))||!['no-baseline','unchanged','adjusted','context-changed'].includes(value.status)||!Array.isArray(value.reasons)||value.reasons.some(r=>!reasons.includes(r))||!Array.isArray(value.changes)||value.changes.length>1000)throw Error('Invalid comparison');
  const changes=value.changes.map(c=>{
   if(!c||!validId(c.id)||!roles.includes(c.role)||!['layout','content','style','structure','state','constraints','uncertain'].includes(c.kind)||!c.delta||typeof c.delta!=='object')throw Error('Invalid change');
   const d={};for(const key of ['x','y','w','h','fontSize','rotation'])if(c.delta[key]!=null){if(!finite(c.delta[key])||Math.abs(c.delta[key])>2000000)throw Error('Invalid delta');d[key]=c.delta[key];}
   if(c.delta.align){if(!['left','center','right'].includes(c.delta.align.from)||!['left','center','right'].includes(c.delta.align.to))throw Error('Invalid alignment');d.align={from:c.delta.align.from,to:c.delta.align.to};}
   const change={id:c.id,role:c.role,kind:c.kind,eligible:c.eligible===true&&c.kind==='layout'&&value.status==='adjusted'&&value.reasons.length===0&&Object.keys(d).length>0,delta:d};
   if(c.reason==='inherited-layout'){change.reason=c.reason;change.eligible=false;}return change;
  });
  if(new Set(changes.map(c=>c.id)).size!==changes.length)throw Error('Duplicate comparison layer');
  return{formatId:value.formatId,baselineId:value.baselineId,status:value.status,reasons:[...new Set(value.reasons)],changes,eligibleCount:changes.filter(c=>c.eligible).length};
 }
 return{compare,clean};
})();
