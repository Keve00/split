/* Deterministic transfer of an approved composition. Groups are rigid, proportional units. */
'use strict';
globalThis.SplitAdaptation=(()=>{
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const defaults={position:'auto',align:'auto',margin:5,minWidth:0,maxWidth:0,priority:3,overflow:false};
 const rules=l=>({...defaults,...l.rules});
 const rect=(l,f)=>({x:l.x*f.w,y:l.y*f.h,w:l.w*f.w,h:l.h*f.h});
 const bounds=items=>{const x=Math.min(...items.map(l=>l.x)),y=Math.min(...items.map(l=>l.y));return{x,y,w:Math.max(...items.map(l=>l.x+l.w))-x,h:Math.max(...items.map(l=>l.y+l.h))-y};};
 const overlap=(a,b,g=0)=>a.x<b.x+b.w+g&&a.x+a.w+g>b.x&&a.y<b.y+b.h+g&&a.y+a.h+g>b.y;
 function capture(output){return JSON.parse(JSON.stringify(output));}
 function atoms(base){const groups=new Map();for(const l of base.layers.filter(l=>!l.hidden)){const key=l.groupId?`group_${l.groupId}`:`layer_${l.id}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(l);}const units=[...groups].map(([id,layers])=>{const box=bounds(layers.map(l=>rect(l,base)));return{id,layers,box,rules:rules(layers[0])};});const rows=[];for(const unit of units.sort((a,b)=>a.box.y-b.box.y||a.box.x-b.box.x)){let row=rows.find(r=>Math.min(r.y+r.h,unit.box.y+unit.box.h)-Math.max(r.y,unit.box.y)>Math.min(r.h,unit.box.h)*.4);if(!row){row={y:unit.box.y,h:unit.box.h,units:[]};rows.push(row);}row.units.push(unit);}return rows.sort((a,b)=>a.y-b.y).flatMap(row=>row.units.sort((a,b)=>a.box.x-b.box.x));}
 function adapt(base,target,options={}){
  const result=JSON.parse(JSON.stringify(target)),existing=new Map(result.layers.map(l=>[l.id,l])),protectManual=options.protectManual!==false;
  const protectedIds=new Set(result.layers.filter(l=>l.locked||(protectManual&&l.manualLayout)).map(l=>l.id));
  // An existing group, or a group in the base, is protected as a whole.
  for(const list of [result.layers,base.layers]){const groupIds=new Set(list.filter(l=>protectedIds.has(l.id)&&l.groupId).map(l=>l.groupId));for(const l of list)if(groupIds.has(l.groupId))protectedIds.add(l.id);}
  const occupied=result.layers.filter(l=>protectedIds.has(l.id)&&!l.hidden).map(l=>rect(l,target)),all=atoms(base),units=[];
  for(const atom of all){if(atom.layers.some(l=>protectedIds.has(l.id)))continue;const layers=atom.layers.map(source=>{const old=existing.get(source.id);const l=old?{...old,groupId:source.groupId,rules:{...rules(source),...old.rules}}:{...source,locked:false};if(old&&!source.groupId)delete l.groupId;existing.set(l.id,l);return l;}).filter(l=>!l.hidden);if(!layers.length)continue;units.push({...atom,layers,rules:rules(layers[0])});}
  const small=Math.min(target.w,target.h),gap=small*.024,margin=small*.05,area={x:margin,y:margin,w:target.w-2*margin,h:target.h-2*margin},baseBounds=all.length?bounds(all.map(a=>a.box)):{x:0,y:0,w:base.w,h:base.h};
  const similar=Math.abs(Math.log((target.w/target.h)/(base.w/base.h)))<.25,horizontal=target.w/target.h>1.25;
  let naturalScale=Math.min(area.w/Math.max(baseBounds.w,1),area.h/Math.max(baseBounds.h,1));
  function limit(unit,desired){const r=unit.rules,b=unit.box,min=r.minWidth? r.minWidth/b.w:0,max=r.maxWidth? r.maxWidth/b.w:Infinity;const fit=r.overflow?Infinity:Math.min((target.w-2*small*r.margin/100)/b.w,(target.h-2*small*r.margin/100)/b.h);unit.minScale=Math.max(.001,min);unit.maxScale=Math.max(.001,Math.min(max,fit));unit.constraintConflict=unit.minScale>unit.maxScale;return Math.max(unit.minScale,Math.min(desired,unit.maxScale));}
  if(!similar&&units.length){const available=(horizontal?area.w:area.h)-gap*Math.max(0,units.length-1);const total=units.reduce((s,u)=>s+(horizontal?u.box.w:u.box.h)*(.8+u.rules.priority*.1),0);naturalScale=Math.max(.001,available/Math.max(total,1));}
  const plannedScales=new Map(units.map(u=>[u.id,limit(u,naturalScale*(similar?1:.8+u.rules.priority*.1))]));const used=units.reduce((sum,u)=>sum+(horizontal?u.box.w:u.box.h)*plannedScales.get(u.id),0)+gap*Math.max(0,units.length-1);let cursor=horizontal?area.x+Math.max(0,(area.w-used)/2):area.y+Math.max(0,(area.h-used)/2);const desired=[];
  for(const unit of units){const r=unit.rules,b=unit.box,s=plannedScales.get(unit.id);let box={x:0,y:0,w:b.w*s,h:b.h*s};const m=small*r.margin/100,align=r.align==='auto'?(Math.abs(b.x-baseBounds.x)<base.w*.025?'start':Math.abs(b.x+b.w-baseBounds.x-baseBounds.w)<base.w*.025?'end':'center'):r.align;
   if(similar){box.x=area.x+(area.w-baseBounds.w*naturalScale)/2+(b.x-baseBounds.x)*naturalScale;box.y=area.y+(area.h-baseBounds.h*naturalScale)/2+(b.y-baseBounds.y)*naturalScale;}else if(horizontal){box.x=cursor;box.y=(target.h-box.h)/2;cursor+=box.w+gap;}else{box.x=align==='start'?m:align==='end'?target.w-m-box.w:(target.w-box.w)/2;box.y=cursor;cursor+=box.h+gap;}
   const alongX=align==='start'?m:align==='end'?target.w-m-box.w:(target.w-box.w)/2,alongY=align==='start'?m:align==='end'?target.h-m-box.h:(target.h-box.h)/2;
   if(r.position==='top'){box.x=alongX;box.y=m;}if(r.position==='bottom'){box.x=alongX;box.y=target.h-m-box.h;}if(r.position==='left'){box.x=m;box.y=alongY;}if(r.position==='right'){box.x=target.w-m-box.w;box.y=alongY;}if(r.position==='center'){box.x=alongX;box.y=(target.h-box.h)/2;}
   if(r.position==='auto'&&r.align!=='auto'){if(horizontal)box.y=alongY;else box.x=alongX;}
   desired.push({unit,box,anchored:r.position!=='auto'});
  }
  // Anchors are constraints, not suggestions. Flexible units go around them and protected edits.
  for(const item of desired.filter(d=>d.anchored)){item.conflict=occupied.some(o=>overlap(item.box,o));occupied.push(item.box);}
  for(const item of desired.filter(d=>!d.anchored).sort((a,b)=>b.unit.rules.priority-a.unit.rules.priority)){
   const r=item.unit.rules,m=small*r.margin/100,original=item.box;let best=null;
   for(let step=0;step<22;step++){const s=Math.max(item.unit.minScale,original.w/item.unit.box.w*Math.pow(.9,step)),w=item.unit.box.w*s,h=item.unit.box.h*s;const xs=[original.x,m,(target.w-w)/2,target.w-m-w,...occupied.flatMap(o=>[o.x-w-gap,o.x+o.w+gap])],ys=[original.y,m,(target.h-h)/2,target.h-m-h,...occupied.flatMap(o=>[o.y-h-gap,o.y+o.h+gap])];for(const x of xs)for(const y of ys){const candidate={x,y,w,h};if(!r.overflow&&(x<m-1e-6||y<m-1e-6||x+w>target.w-m+1e-6||y+h>target.h-m+1e-6))continue;if(r.align!=='auto'){const expected=r.align==='start'?m:r.align==='end'?(horizontal?target.h-h-m:target.w-w-m):(horizontal?(target.h-h)/2:(target.w-w)/2);if(Math.abs((horizontal?y:x)-expected)>.01)continue;}if(occupied.some(o=>overlap(candidate,o,gap*.35)))continue;const score=Math.abs(x-original.x)/target.w+Math.abs(y-original.y)/target.h+(1-w/original.w)*3;if(!best||score<best.score)best={box:candidate,score};}if(best||s<=item.unit.minScale+1e-8)break;}
   if(best)item.box=best.box;else item.conflict=true;occupied.push(item.box);
  }
  for(const {unit,box,conflict}of desired){const s=box.w/unit.box.w;for(const l of unit.layers){const source=base.layers.find(x=>x.id===l.id),p=rect(source,base);Object.assign(l,{x:(box.x+(p.x-unit.box.x)*s)/target.w,y:(box.y+(p.y-unit.box.y)*s)/target.h,w:p.w*s/target.w,h:p.h*s/target.h,fontSize:clamp((source.fontSize||40)*s,2,500),rotation:source.rotation||0,cornerRadius:source.cornerRadius,manualLayout:false,layoutConflict:!!(conflict||unit.constraintConflict)});existing.set(l.id,l);}}
  // Preserve the approved stacking order while retaining target-only layers and all hidden layers.
  const order=[...base.layers.map(l=>l.id),...result.layers.map(l=>l.id)],ids=new Set();result.layers=order.filter(id=>existing.has(id)&&!ids.has(id)&&ids.add(id)).map(id=>existing.get(id));
  result.composition=`Base: ${base.name} · ${similar?'relações preservadas':horizontal?'leitura horizontal':'leitura vertical'}`;result.layoutScore=0;
  const conflicts=result.layers.filter(l=>l.layoutConflict).length,protectedCount=result.layers.filter(l=>protectedIds.has(l.id)).length;
  return{output:result,conflicts,protectedCount,reflow:!similar};
 }
 return{capture,adapt,rules,defaults};
})();
