/* Synthetic preferences, with distinct training and held-out projects/content. */
'use strict';
globalThis.SplitEvaluation=(()=>{
 const specs=[
  {name:'logo-square',role:'logo',type:'image',aspect:2,w:1080,h:1080,metric:'x',delta:.012},
  {name:'logo-portrait',role:'logo',type:'image',aspect:1,w:1080,h:1920,metric:'x',delta:.012},
  {name:'product-landscape',role:'image',type:'image',aspect:2,w:1200,h:628,metric:'y',delta:.012},
  {name:'title-square',role:'text',type:'text',w:1080,h:1080,metric:'align',target:'center'},
  {name:'offer-square',role:'offer',type:'offer',w:1080,h:1080,metric:'fontScale',delta:-.08},
  {name:'cta-banner',role:'cta',type:'cta',w:728,h:90,metric:'fontScale',delta:-.08}
 ];
 const copy=v=>JSON.parse(JSON.stringify(v));
 function fixture(spec,phase,n){
  const scale=phase==='train'?1:1+(n%3)*.1,id=`${phase}_${spec.name}_${n}`;
  const item={id:`item_${id}`,role:spec.role,type:spec.type,align:'left',weight:n%2?600:700,color:n%2?'#123456':'#222222'};
  if(spec.type==='image'){item.aspect=spec.aspect;item.asset=`asset_${id}`;}
  else item.text=phase==='train'?`Treino ${n} — oferta especial`:`Projeto reservado ${n}`;
  return{id,w:Math.round(spec.w*scale),h:Math.round(spec.h*scale),bg:'#ffffff',items:[item],spec};
 }
 function imageMap(f){return new Map(f.items.filter(i=>i.type==='image').map(i=>[i.asset,{width:i.aspect*100,height:100}]));}
 function compose(f,measureText,learning){return SplitLayout.compose(f,copy(f.items),measureText,{learning});}
 function target(layer,spec){const next={...layer};if(spec.metric==='fontScale')next.fontSize*=1+spec.delta;else if(spec.metric==='align')next.align=spec.target;else next[spec.metric]+=spec.delta;return next;}
 function error(layer,desired,base,spec){return spec.metric==='align'?Number(layer.align!==desired.align):spec.metric==='fontScale'?Math.abs(layer.fontSize-desired.fontSize)/Math.abs(base.fontSize*spec.delta):Math.abs(layer[spec.metric]-desired[spec.metric])/Math.abs(spec.delta);}
 function needsCorrection(layer,desired,spec){return spec.metric==='align'?layer.align!==desired.align:spec.metric==='fontScale'?Math.abs(layer.fontSize-desired.fontSize)>.01:Math.abs(layer[spec.metric]-desired[spec.metric])>1e-6;}
 function safe(plan,f,measureText){
  for(const l of plan.layers){const b=SplitLearningLayout.bounds(l,f);if(b.x<-1e-7||b.y<-1e-7||b.x+b.w>1+1e-7||b.y+b.h>1+1e-7||l.layoutConflict)return false;
   if(l.type!=='image'){const w=l.w*f.w,h=l.h*f.h,pad=['offer','cta'].includes(l.type)?Math.min(w*.06,h*.15):0,width=w-2*pad;let lines=0;for(const paragraph of String(l.text).split('\n')){let line='';lines++;for(const word of paragraph.split(/\s+/)){if(measureText(word,l.fontSize,l.weight)>width+1e-7)return false;const next=line?line+' '+word:word;if(line&&measureText(next,l.fontSize,l.weight)>width){lines++;line=word;}else line=next;}}if(lines*l.fontSize*1.13>h-2*pad+1e-7)return false;}
  }return true;
 }
 function train(measureText){
  const contributions=[],ids=[];
  for(let project=0;project<3;project++){
   SplitMemory.restore(null);
   for(const spec of specs)for(let example=0;example<3;example++){
    const f=fixture(spec,'train',project*3+example),base=compose(f,measureText),out={...f,composition:base.template,layers:base.layers},images=imageMap(f);ids.push(f.id);
    SplitMemory.record('generation',[out],{images});const final=copy(out);final.layers[0]=target(final.layers[0],spec);SplitMemory.record('export',[final],{images});
   }
   const state=SplitMemory.snapshot();contributions.push({projectId:state.projectId,preferences:state.preferences});
  }
  const general=SplitPreferences.general(contributions);SplitMemory.restore(null);return{general,trainingIds:ids,projectIds:contributions.map(c=>c.projectId),projectModels:contributions.map(c=>c.preferences)};
 }
 function evaluate(measureText=(text,font)=>String(text).length*font*.55,trained=train(measureText)){
  const learning={project:SplitPreferences.empty(),general:trained.general},cases=[];
  for(const spec of specs)for(let example=0;example<4;example++){
   const f=fixture(spec,'holdout',example),base=compose(f,measureText),adapted=compose(f,measureText,learning),desired=target(base.layers[0],spec),before=error(base.layers[0],desired,base.layers[0],spec),after=error(adapted.layers[0],desired,base.layers[0],spec);
   cases.push({id:f.id,context:spec.name,metric:spec.metric,before,after,needsCorrectionBefore:needsCorrection(base.layers[0],desired,spec),needsCorrectionAfter:needsCorrection(adapted.layers[0],desired,spec),safe:safe(adapted,f,measureText)});
  }
  const fallbacks=[];
  for(const spec of specs){const f=fixture(spec,'unmatched',10),base=compose(f,measureText);f.w*=2;const ordinary=compose(f,measureText),adapted=compose(f,measureText,learning);fallbacks.push({id:f.id,identical:JSON.stringify(ordinary)===JSON.stringify(adapted)});}
  const before=cases.reduce((sum,c)=>sum+c.before,0),after=cases.reduce((sum,c)=>sum+c.after,0);
  const requiredCorrectionsBefore=cases.filter(c=>c.needsCorrectionBefore).length,requiredCorrectionsAfter=cases.filter(c=>c.needsCorrectionAfter).length;
  return{schemaVersion:1,algorithmVersion:SplitMemory.ALGORITHM_VERSION,memoryVersion:SplitMemory.VERSION,trainingProjects:trained.projectIds.length,trainingExamples:trained.trainingIds.length,trainingIds:trained.trainingIds,holdoutCases:cases.length,cases,fallbacks,correctionReduction:1-after/before,requiredCorrectionsBefore,requiredCorrectionsAfter,correctionCountReduction:1-requiredCorrectionsAfter/requiredCorrectionsBefore,unsafeCases:cases.filter(c=>!c.safe).length,worseCases:cases.filter(c=>c.after>c.before+1e-8).length};
 }
 return{specs,fixture,train,evaluate};
})();
