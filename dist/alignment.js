/* Explicit layer alignment in output coordinates, independent of pan and zoom. */
'use strict';
globalThis.SplitAlignment=(()=>{
 const actions=['left','centerX','right','top','centerY','bottom','distributeX','distributeY'];
 const priorEditor=renderEditor;
 function units(){const groups=new Map();for(const l of selectedLayers()){const key=l.groupId?`group_${l.groupId}`:`layer_${l.id}`;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(l);}return[...groups.values()].map(layers=>({layers,...selectionBounds(layers)}));}
 function update(){const all=selectedLayers(),list=units(),valid=!!current()&&all.length>0&&!all.some(l=>l.locked||l.hidden);for(const key of actions)$(`align-${key}`).disabled=!valid||(key.startsWith('distribute')&&list.length<3);$('alignReference').disabled=!valid;$('alignMargin').disabled=!valid||$('alignReference').value==='selection';$('alignmentHint').textContent=!all.length?'Selecione uma camada para alinhar. Grupos mantêm sua composição interna.':all.some(l=>l.locked)?'Desbloqueie a seleção para alinhar.':all.some(l=>l.hidden)?'Mostre as camadas da seleção para alinhar.':`${list.length} ${list.length===1?'elemento selecionado':'elementos selecionados'} · grupos se movem como uma unidade. Distribua com pelo menos 3 elementos.`;}
 function translate(unit,dx,dy){for(const l of unit.layers){l.x+=dx;l.y+=dy;l.manualLayout=true;}}
 function reference(){if($('alignReference').value==='selection')return selectionBounds();const margin=$('alignMargin').checked?.05:0;return{x:margin,y:margin,w:1-2*margin,h:1-2*margin};}
 function align(key){const list=units();if(!actions.includes(key)||!list.length||selectedLayers().some(l=>l.locked||l.hidden)||!current()||(key.startsWith('distribute')&&list.length<3))return false;SplitEditor.finishInteraction();const area=reference();let moves=[];
  if(key.startsWith('distribute')){const axis=key==='distributeX'?'x':'y',size=axis==='x'?'w':'h',ordered=[...list].sort((a,b)=>a[axis]-b[axis]),total=ordered.reduce((sum,u)=>sum+u[size],0),gap=(area[size]-total)/(ordered.length-1);let cursor=area[axis];for(const unit of ordered){moves.push({unit,dx:axis==='x'?cursor-unit.x:0,dy:axis==='y'?cursor-unit.y:0});cursor+=unit[size]+gap;}}
  else for(const unit of list){let dx=0,dy=0;if(key==='left')dx=area.x-unit.x;if(key==='centerX')dx=area.x+(area.w-unit.w)/2-unit.x;if(key==='right')dx=area.x+area.w-unit.w-unit.x;if(key==='top')dy=area.y-unit.y;if(key==='centerY')dy=area.y+(area.h-unit.h)/2-unit.y;if(key==='bottom')dy=area.y+area.h-unit.h-unit.y;moves.push({unit,dx,dy});}
  if(moves.every(m=>Math.abs(m.dx)<1e-10&&Math.abs(m.dy)<1e-10))return false;checkpoint();for(const m of moves)translate(m.unit,m.dx,m.dy);alignmentGuides=[];renderEditor();renderCards();toast(key.startsWith('distribute')?'Elementos distribuídos.':'Alinhamento aplicado à seleção.',true);return true;
 }
 renderEditor=function(){priorEditor();update();};
 for(const key of actions)$(`align-${key}`).onclick=()=>align(key);$('alignReference').onchange=update;update();
 return{align,units,update};
})();
