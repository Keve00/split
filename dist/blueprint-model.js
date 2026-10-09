/* Shared, serializable diagram rules for the planner and layout engine. */
'use strict';
globalThis.SplitBlueprintModel=(()=>{
 const types=['logo','text','image','offer','cta'],families=['horizontal','wide','vertical','tall','medium'],limit=30;
 const type=key=>key.split('-')[0];
 const ratios={horizontal:1.8,wide:5,vertical:.7,tall:.32,medium:1.2};
 const mediumDefault={logo:{x:.05,y:.05,w:.3,h:.12},text:{x:.05,y:.22,w:.43,h:.28},image:{x:.54,y:.18,w:.41,h:.55},offer:{x:.05,y:.56,w:.43,h:.15},cta:{x:.1,y:.8,w:.8,h:.13}};
 const classify=(w,h)=>w/h>=.9&&w/h<=1.05?'vertical':families.reduce((best,key)=>Math.abs(Math.log(w/h/ratios[key]))<Math.abs(Math.log(w/h/ratios[best]))?key:best,'horizontal');
 function normalize(value,sources=[]){
  const result=JSON.parse(JSON.stringify(value));if(!result.templates.medium)result.templates.medium=Object.fromEntries(Object.entries(mediumDefault).map(([key,box])=>[key,{...box,...(result.itemMode?{sourceId:null}:{})}]));if(result.itemMode)return result;
  for(const family of families){const entries={};for(const role of types){const box=result.templates[family][role],available=sources.filter(item=>item.role===role),count=Math.max(1,available.length);for(let i=0;i<count;i++){const key=i?`${role}-${i+1}`:role,h=Math.max(.04,box.h/count);entries[key]={...box,y:Math.min(1-h,box.y+i*box.h/count),h,sourceId:available[i]?.id||null};}}result.templates[family]=entries;}
  result.itemMode=true;return result;
 }
 function entries(template,items,expand=false){const result=[];for(const [key,area]of Object.entries(template)){const role=type(key),available=items.filter(item=>item.role===role&&(!item.blueprintSourceId||item.blueprintSourceId===item.id)),source=area.sourceId?available.find(item=>item.id===area.sourceId)||items.filter(item=>item.role===role).map(item=>({...item,id:item.blueprintSourceId||item.id})).find(item=>item.id===area.sourceId):available[0]||items.filter(item=>item.role===role).map(item=>({...item,id:item.blueprintSourceId||item.id}))[0];if(!source)continue;const id=key===role?source.id:`bp_${key}_${source.id}`,prior=items.find(item=>item.id===id);if(!prior&&!expand)continue;result.push({area,key,item:{...source,...prior,id,blueprintSourceId:source.id}});}return result;}
 return{types,families,limit,ratios,mediumDefault,classify,type,normalize,entries};
})();
