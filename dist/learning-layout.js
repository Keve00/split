/* Conservative local preferences. The ordinary composition is always the fallback. */
'use strict';
globalThis.SplitLearningLayout=(()=>{
 const limits={x:.025,y:.025,widthScale:.1,heightScale:.1,fontScale:.1,rotation:3};
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const protectedLayer=l=>l.manualLayout||l.locked||l.hidden||l.groupId||l.role==='reference'||l.layoutConflict;
 function bounds(l,f){const angle=(l.rotation||0)*Math.PI/180,w=l.w*f.w,h=l.h*f.h,dx=(Math.abs(Math.cos(angle))*w+Math.abs(Math.sin(angle))*h)/2/f.w,dy=(Math.abs(Math.sin(angle))*w+Math.abs(Math.cos(angle))*h)/2/f.h,cx=l.x+l.w/2,cy=l.y+l.h/2;return{x:cx-dx,y:cy-dy,w:2*dx,h:2*dy};}
 function inside(box,area={x:0,y:0,w:1,h:1}){return [box.x,box.y,box.w,box.h].every(Number.isFinite)&&box.w>0&&box.h>0&&box.x>=area.x-1e-7&&box.y>=area.y-1e-7&&box.x+box.w<=area.x+area.w+1e-7&&box.y+box.h<=area.y+area.h+1e-7;}
 function overlap(a,b){return a.x<b.x+b.w-1e-7&&a.x+a.w>b.x+1e-7&&a.y<b.y+b.h-1e-7&&a.y+a.h>b.y+1e-7;}
 function index(model,max){try{return new Map(SplitPreferences.cleanModel(model,max).entries.map(e=>[e.key,e]));}catch{return new Map();}}
 function reader(learning){
  const project=index(learning?.project,SplitPreferences.MAX_PROJECT_ENTRIES),general=index(learning?.general,SplitPreferences.MAX_GENERAL_ENTRIES);
  const read=(context,metric)=>{const key=`${SplitPreferences.contextKey(context)}_${metric}`,own=project.get(key),entry=own?.support>=3?own:general.get(key);return entry?.ready&&entry.active&&entry.confidence>=.5?entry:null;};read.available=project.size+general.size>0;return read;
 }
 function unrestricted(l){const r=l.rules||{};return (!r.position||r.position==='auto')&&(!r.align||r.align==='auto')&&(r.margin==null||r.margin===5)&&(!r.minWidth)&&(!r.maxWidth)&&(!r.priority||r.priority===3)&&!r.overflow;}
 function targets(layers,f,read,contextFor,{planned=false}={}){
  return layers.map(l=>{
   if(protectedLayer(l)||!unrestricted(l))return null;
   const context=contextFor({...f,layers},l,planned),values={};
   for(const metric of [...Object.keys(limits),'align']){
    // Planned geometry belongs to the user. Only text presentation may adapt.
    if(planned&&metric!=='fontScale'&&metric!=='align')continue;
    if(l.type==='image'&&(metric==='fontScale'||metric==='align'))continue;
    const entry=read(context,metric);if(!entry)continue;
    values[metric]=metric==='align'?entry.value:clamp(entry.value,-limits[metric],limits[metric])*entry.confidence;
   }
   // Image boxes keep their current proportion and fitting mode.
   if(l.type==='image'&&(values.widthScale!=null||values.heightScale!=null)){const scale=values.widthScale??values.heightScale;values.widthScale=scale;values.heightScale=scale;}
   return Object.keys(values).length?values:null;
  });
 }
 function variant(layers,desired,f,strength){return layers.map((l,i)=>{
  const v=desired[i];if(!v)return l;const next={...l};
  if(v.widthScale!=null)next.w=l.w*(1+v.widthScale*strength);
  if(v.heightScale!=null)next.h=l.h*(1+v.heightScale*strength);
  if(v.x!=null)next.x=l.x+v.x*strength;if(v.y!=null)next.y=l.y+v.y*strength;
  if(v.rotation!=null)next.rotation=(l.rotation||0)+v.rotation*strength;
  if(v.fontScale!=null)next.fontSize=l.fontSize*(1+v.fontScale*strength);
  if(v.align!=null)next.align=v.align;return next;
 });}
 function valid(layers,original,f,readable,areas){
  for(let i=0;i<layers.length;i++){
   const l=layers[i],before=original[i];if(l===before)continue;
   if(protectedLayer(before)||!inside(bounds(l,f),areas?.get(l.id)))return false;
   if(l.type!=='image'&&(!(l.fontSize>=Math.min(8,before.fontSize))||l.fontSize>500||!readable(l)))return false;
   for(let j=0;j<layers.length;j++)if(j!==i&&!layers[j].hidden&&layers[j].role!=='reference'&&overlap(bounds(l,f),bounds(layers[j],f)))return false;
  }return true;
 }
 function utility(layers,original,desired){let sum=0,count=0;for(let i=0;i<layers.length;i++)for(const [metric,target]of Object.entries(desired[i]||{})){
  const a=original[i],b=layers[i];let progress;
  if(metric==='align')progress=b.align===target&&a.align!==target?1:0;
  else{const actual=metric==='widthScale'?b.w/a.w-1:metric==='heightScale'?b.h/a.h-1:metric==='fontScale'?b.fontSize/a.fontSize-1:metric==='rotation'?(b.rotation||0)-(a.rotation||0):b[metric]-a[metric];progress=Math.abs(target)<1e-8?0:clamp(1-Math.abs(target-actual)/Math.abs(target),0,1);}
  sum+=progress;count++;
 }return count?.6*sum/count:0;}
 function select(candidates,f,{learning,contextFor,quality,readable,planned=false,areas}={}){
  const ordinary=candidates.reduce((best,c)=>!best||c.score>best.score?c:best,null);
  if(!ordinary||!learning||!contextFor)return ordinary;
  try{
   const read=reader(learning);if(!read.available)return ordinary;
   let best=ordinary,rank=ordinary.score;
   for(const candidate of candidates){
    if(candidate.score<ordinary.score-.35||candidate.layers.some(l=>l.layoutConflict))continue;
    const desired=targets(candidate.layers,f,read,contextFor,{planned});if(!desired.some(Boolean))continue;
    for(const strength of [1,.5,.25]){
     const layers=variant(candidate.layers,desired,f,strength);if(!valid(layers,candidate.layers,f,readable,areas))continue;
     const score=quality(layers,candidate);if(!Number.isFinite(score)||score<ordinary.score-.35)continue;
     const nextRank=score+utility(layers,candidate.layers,desired);if(nextRank>rank+1e-8){rank=nextRank;const learningApplied=layers.flatMap((l,i)=>{const a=candidate.layers[i],metrics=[],original={};for(const metric of Object.keys(desired[i]||{})){const changed=metric==='widthScale'?l.w!==a.w:metric==='heightScale'?l.h!==a.h:metric==='fontScale'?l.fontSize!==a.fontSize:l[metric]!==a[metric];if(changed){metrics.push(metric);if(metric==='rotation')original.rotation=a.rotation||0;if(metric==='align')original.align=a.align;}}return metrics.length?[{id:l.id,metrics,...(Object.keys(original).length?{original}:{})}]:[];});best={...candidate,layers,score,learningApplied};}
    }
   }return best;
  }catch{return ordinary;}
 }
 return{select,limits,bounds};
})();
