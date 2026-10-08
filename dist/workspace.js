/* Menus keep secondary actions reachable without permanent visual clutter. */
'use strict';
(()=>{
 const menus=[...document.querySelectorAll('.tool-menu')];
 function clearSelection(event){if(event.button!==0||spacePressed||drag||pan||globalThis.SplitProjects?.busy()||!selectedLayers().length)return;const target=event.target;if(['button','a','input','select','textarea','summary','label','[contenteditable]','.dock-panel','.tool-menu','#stage','#selectionOverlay','dialog'].some(selector=>target.closest(selector)))return;selectLayer(null);alignmentGuides=[];renderEditor();}
 document.addEventListener('pointerdown',clearSelection);
 function closeMenus(except=null){for(const menu of menus)if(menu!==except)menu.open=false;}
 for(const menu of menus){menu.addEventListener('toggle',()=>{if(menu.open)closeMenus(menu);});menu.addEventListener('click',event=>{if(event.target.closest('button'))menu.open=false;});}
 document.addEventListener('pointerdown',event=>{if(!event.target.closest('.tool-menu'))closeMenus();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){const open=menus.find(menu=>menu.open);if(open){open.open=false;open.querySelector('summary').focus();}}});
 let frame=false;
 function fitWorkspace(){if(frame)return;frame=true;requestAnimationFrame(()=>{frame=false;const header=$('generationBar').getBoundingClientRect();document.documentElement.style.setProperty('--workspace-header',`${Math.ceil(header.height)}px`);if(!$('editor').hidden){const wrap=$('canvasWrap'),top=Math.max(header.height,wrap.getBoundingClientRect().top),height=Math.max(300,window.innerHeight-top-54);if(wrap.style.height!==`${height}px`)wrap.style.height=`${height}px`;sizeStage();}});}
 if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(fitWorkspace);for(const node of [$('generationBar'),document.querySelector('.canvas-toolbars'),document.querySelector('.workspace-toolbar')])observer.observe(node);}
 const priorView=setView;setView=function(view){priorView(view);fitWorkspace();};
 window.addEventListener('resize',fitWorkspace);fitWorkspace();
 globalThis.SplitWorkspace={closeMenus,fitWorkspace};
})();
