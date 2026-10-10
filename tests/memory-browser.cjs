/* Run with Node and Playwright available on NODE_PATH. No external services. */
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../dist'),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':decodeURIComponent(pathname)));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync(file));
});
let checks=0;const pass=label=>{checks++;console.log(`PASS ${checks}: ${label}`);};
const state=page=>page.evaluate(()=>SplitMemory.snapshot());
async function downloadProject(page){const wait=page.waitForEvent('download');await page.locator('#saveProject').click();const result=await wait;const stream=await result.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);assert.equal(await result.failure(),null);return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,executablePath:process.env.SPLIT_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const errors=[],failures=[];const context=await browser.newContext({acceptDownloads:true}),url=`http://127.0.0.1:${server.address().port}`;
 const watch=page=>{page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failures.push(r.url()));};
 try{
  const page=await context.newPage();watch(page);await page.goto(url);await page.evaluate(()=>SplitProjects.initialized);
  await page.locator('#emptyDemo').click();
  const generated=await state(page);assert.equal(generated.records.length,1);assert.equal(generated.records[0].kind,'generation');assert.equal(generated.records[0].outputs.length,6);
  assert(!JSON.stringify(generated).includes('Sua próxima'));assert.equal(await page.locator('[id*=learning],[id*=memory]').count(),0);
  const local=await page.evaluate(async()=>{await SplitMemory.settled();return SplitMemory.readLocal(SplitMemory.snapshot().projectId);});assert.deepEqual(local,generated);
  const stores=await page.evaluate(async()=>{const d=await new Promise((resolve,reject)=>{const r=indexedDB.open('split-learning');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});const names=[...d.objectStoreNames];d.close();return names;});assert.deepEqual(stores,['contributions','general','projects']);
  pass('generation captures six formats and persists in a separate local database');

  const file=await downloadProject(page),saved=await state(page);assert.equal(file.version,7);assert.deepEqual(file.learning,saved);assert.equal(saved.projectId,generated.projectId);assert.equal(saved.records.length,2);
  assert.equal(await page.evaluate(()=>SplitProjects.needsUnloadWarning()),false);
  const repeated=await downloadProject(page);assert.deepEqual(repeated.learning,saved);pass('real .split downloads contain memory and repeated saves do not duplicate it');

  await page.evaluate(()=>{openFormat(outputs[0].id);selectLayer(current().layers[0].id);updateProp(l=>l.fontSize+=3,true);});
  const edited=await downloadProject(page);assert.equal(edited.learning.records.length,3);assert.notEqual(edited.learning.revisionId,saved.revisionId);
  await page.evaluate(()=>undo());assert.equal(await page.evaluate(()=>current().layers[0].fontSize),file.outputs[0].layers[0].fontSize);
  await page.evaluate(()=>SplitEditor.redo());assert.equal(await page.evaluate(()=>current().layers[0].fontSize),edited.outputs[0].layers[0].fontSize);
  // Redo restores exactly the memory present before Undo, including the saved observation.
  assert.deepEqual(await state(page),edited.learning);pass('edits acquire a saved revision and undo/redo restores the corresponding memory');

  await page.evaluate(async()=>{await SplitProjects.flush();await SplitMemory.settled();});await page.reload();await page.evaluate(()=>SplitProjects.initialized);
  assert(await page.locator('#recoveryBanner').isVisible());await page.locator('#restoreProject').click();await page.waitForFunction(()=>!SplitProjects.busy()&&outputs.length===6);
  assert.deepEqual(await state(page),edited.learning);assert.deepEqual((await downloadProject(page)).learning,edited.learning);
  pass('recovery after reload preserves project identity and revisions without new observations');

  const other=await browser.newContext({acceptDownloads:true}),otherPage=await other.newPage();watch(otherPage);await otherPage.goto(url);await otherPage.evaluate(()=>SplitProjects.initialized);
  assert.equal(await otherPage.evaluate(id=>SplitMemory.readLocal(id),edited.learning.projectId),null);
  assert.equal(await otherPage.evaluate(file=>SplitProjects.openValue(file),edited),true);assert.deepEqual(await state(otherPage),edited.learning);
  assert.deepEqual(await otherPage.evaluate(id=>SplitMemory.readLocal(id),edited.learning.projectId),edited.learning);
  await otherPage.evaluate(file=>SplitProjects.openValue(file),edited);assert.deepEqual(await state(otherPage),edited.learning);
  pass('portable memory opens in an isolated browser and reopening does not duplicate records');

  const malformed=structuredClone(edited);malformed.learning.records[0].outputs[0].layers[0].w=-1;
  assert.equal(await otherPage.evaluate(file=>SplitProjects.openValue(file),malformed),true);const reset=await state(otherPage);assert.equal(reset.projectId,edited.learning.projectId);assert.equal(reset.records.length,0);assert.equal(await otherPage.evaluate(()=>outputs.length),6);
  await otherPage.evaluate(file=>SplitProjects.openValue(file),edited);
  const legacy=structuredClone(edited);delete legacy.learning;legacy.version=6;
  assert.equal(await otherPage.evaluate(file=>SplitProjects.openValue(file),legacy),true);assert.equal((await state(otherPage)).records.length,0);
  const migrated=await downloadProject(otherPage);assert.equal(migrated.version,7);assert.equal(migrated.learning.records.length,1);
  await otherPage.evaluate(file=>SplitProjects.openValue(file),migrated);assert.deepEqual(await state(otherPage),migrated.learning);
  pass('invalid memory is isolated and legacy projects migrate with portable identities');

  await page.evaluate(()=>openFormat(outputs[0].id));const pngWait=page.waitForEvent('download');await page.locator('#downloadOne').click();const png=await pngWait;assert.equal(await png.failure(),null);
  const exported=await state(page);assert.equal(exported.records.at(-1).kind,'export');assert.equal(exported.records.at(-1).outputs.length,1);
  const secondPng=page.waitForEvent('download');await page.locator('#downloadOne').click();await secondPng;assert.deepEqual(await state(page),exported);
  const zipWait=page.waitForEvent('download');await page.locator('#exportAll').click();const zip=await zipWait;assert.equal(await zip.failure(),null);assert.equal((await state(page)).records.at(-1).outputs.length,6);
  pass('PNG and ZIP exports record the exported pieces and repeated exports are deduplicated');

  const failed=await page.evaluate(async()=>{
   const originalDownload=download,originalOutputBlob=outputBlob;
   // Change the piece so this would be a genuinely new saved observation.
   selectLayer(current().layers[0].id);updateProp(l=>l.fontSize+=2,true);
   SplitProjects.capture();const before=SplitMemory.snapshot();
   download=()=>{throw Error('Simulated download failure');};
   try{await SplitProjects.save();}finally{download=originalDownload;}
   const afterSave=SplitMemory.snapshot();outputBlob=async()=>{throw Error('Simulated render failure');};
   try{await exportOne();await exportAll();}finally{outputBlob=originalOutputBlob;}
   await SplitMemory.settled();return{before,afterSave,afterExport:SplitMemory.snapshot(),local:await SplitMemory.readLocal(before.projectId)};
  });
  assert.deepEqual(failed.afterSave,failed.before);assert.deepEqual(failed.afterExport,failed.before);assert.deepEqual(failed.local,failed.before);
  pass('failed saves and exports do not leave false observations in portable or local memory');

  const concurrent=await page.evaluate(async()=>{
   const originalOutputBlob=outputBlob,originalDownload=download;let release;
   outputBlob=()=>new Promise(resolve=>{release=resolve;});download=()=>{};
   try{
    const exporting=exportOne();await SplitProjects.openValue({
     kind:'split-project',version:6,campaign:'Other',assets:[],formats:[{id:'square',name:'Square',w:1080,h:1080}],checked:['square'],sources:[],outputs:[],baseBackground:'#ffffff',selectedIds:[],view:'grid',blueprint:null
    });
    const before=SplitMemory.snapshot();release(new Blob(['test']));await exporting;
    return{before,after:SplitMemory.snapshot()};
   }finally{outputBlob=originalOutputBlob;download=originalDownload;}
  });
  assert.deepEqual(concurrent.before,concurrent.after);await page.evaluate(file=>SplitProjects.openValue(file),edited);
  pass('an export finishing after another project is opened cannot contaminate that project');

  const before=await state(page);await page.evaluate(()=>generate());const after=await state(page);assert.equal(after.records.length,before.records.length+1);assert.notEqual(after.records.at(-1).id,before.records.at(-1).id);
  await page.evaluate(()=>undo());assert.deepEqual(await state(page),before);await page.evaluate(()=>SplitEditor.redo());assert.deepEqual(await state(page),after);
  const calls=await page.evaluate(async()=>{const initial=SplitMemory.snapshot();for(let i=0;i<52;i++){SplitMemory.restore(null);SplitMemory.record('generation',[]);}await SplitMemory.settled();const d=await new Promise(resolve=>{const r=indexedDB.open('split-learning');r.onsuccess=()=>resolve(r.result);});const count=await new Promise(resolve=>{const r=d.transaction('projects').objectStore('projects').count();r.onsuccess=()=>resolve(r.result);});d.close();SplitMemory.restore(initial,{persist:true});await SplitMemory.settled();return count;});assert.equal(calls,50);
  pass('generation attempts survive undo/redo and the browser database retains at most 50 projects');

  const comparisonContext=await browser.newContext({acceptDownloads:true}),comparisonPage=await comparisonContext.newPage();watch(comparisonPage);await comparisonPage.goto(url);await comparisonPage.evaluate(()=>SplitProjects.initialized);await comparisonPage.locator('#emptyDemo').click();
  const beforeDrag=await state(comparisonPage);
  const start=await comparisonPage.evaluate(()=>{
   openFormat(outputs[0].id);selectLayer(current().layers.find(l=>l.role==='text').id);renderEditor();
   const r=$('stage').getBoundingClientRect(),l=selected();globalThis.trackingDuringDrag=0;
   const original=SplitMemory.trackEdits;SplitMemory.trackEdits=(...args)=>{if(drag)trackingDuringDrag++;return original(...args);};
   return{x:r.left+(l.x+l.w*.5)*r.width,y:r.top+(l.y+l.h*.5)*r.height};
  });
  await comparisonPage.mouse.move(start.x,start.y);await comparisonPage.mouse.down();
  await comparisonPage.mouse.move(start.x+35,start.y+25,{steps:12});
  assert.equal((await state(comparisonPage)).records.length,beforeDrag.records.length);
  assert((await comparisonPage.evaluate(()=>trackingDuringDrag))<=1,'Comparisons must not run on every pointer movement');
  await comparisonPage.mouse.up();await comparisonPage.evaluate(async()=>{await SplitProjects.flush();await SplitMemory.settled();});
  const dragged=await state(comparisonPage);assert.equal(dragged.drafts.length,1);assert.equal(dragged.drafts[0].status,'adjusted');assert.equal(dragged.drafts[0].eligibleCount,1);
  assert.equal(dragged.drafts[0].changes[0].id,beforeDrag.records[0].outputs[0].layers.find(l=>l.role==='text').id);
  await comparisonPage.evaluate(()=>undo());assert.equal((await state(comparisonPage)).drafts.length,0);
  await comparisonPage.evaluate(()=>SplitEditor.redo());assert.deepEqual((await state(comparisonPage)).drafts,dragged.drafts);
  const dragFile=await downloadProject(comparisonPage);assert.equal(dragFile.learning.records.at(-1).comparisons[0].eligibleCount,1);
  pass('real drag gestures consolidate once, and undo/redo excludes reverted corrections');

  const baselineCount=dragFile.learning.records.length;
  await comparisonPage.evaluate(()=>{selectLayer(current().layers.find(l=>l.role==='text').id);updateProp(l=>{l.text='X'+l.text.slice(1);arrangeOutput(current());});});
  const contentFile=await downloadProject(comparisonPage),contentReport=contentFile.learning.records.at(-1).comparisons[0];assert(contentReport.reasons.includes('content'));assert.equal(contentReport.eligibleCount,0);
  assert.equal(contentFile.learning.records.length,baselineCount+1);assert(contentReport.changes.some(c=>c.kind==='content'));
  await comparisonPage.evaluate(file=>SplitProjects.openValue(file),dragFile);assert.deepEqual((await state(comparisonPage)).drafts,dragFile.learning.drafts);
  pass('same-length copy edits are separated from geometry and portable drafts survive reopening');

  const imageFile=await comparisonPage.evaluate(async()=>{
   const c=document.createElement('canvas');c.width=160;c.height=80;const ctx=c.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(0,0,c.width,c.height);
   const image=new Image();image.src=c.toDataURL();await image.decode();images.set('phase2_asset',image);
   SplitBlueprint.restore(null);
   addSource({id:uid(),name:'Private product',role:'image',type:'image',asset:'phase2_asset',aspect:2});await generate();
   openFormat(outputs[0].id);selectLayer(current().layers.find(l=>l.type==='image').id);updateProp(l=>{l.x+=.02;},true);
   const captured=SplitProjects.capture(),project=await SplitProject.encode(captured.state,captured.assets);return project;
  });
  const imageId=imageFile.outputs[0].layers.find(l=>l.type==='image').id,originalImageComparison=imageFile.learning.drafts[0].changes.find(c=>c.id===imageId);
  assert.equal(originalImageComparison.eligible,true);assert(imageFile.assets.every(a=>typeof a.contentId==='string'));
  await comparisonPage.evaluate(file=>SplitProjects.openValue(file),imageFile);
  const imageRoundTrip=await downloadProject(comparisonPage),imageComparison=imageRoundTrip.learning.records.at(-1).comparisons[0];
  assert.equal(imageComparison.changes.find(c=>c.id===imageId).eligible,true);assert(!imageComparison.reasons.includes('content'));
  const replaced=await comparisonPage.evaluate(async id=>{
   const out=outputs[0],layer=out.layers.find(l=>l.id===id),c=document.createElement('canvas');c.width=160;c.height=80;const ctx=c.getContext('2d');ctx.fillStyle='#0000ff';ctx.fillRect(0,0,c.width,c.height);
   const blob=await new Promise(resolve=>c.toBlob(resolve)),file=new File([blob],'replacement.png',{type:'image/png'});
   SplitProjects.chooseReplacement(layer.role,layer.id);await SplitProjects.prepareReplacement(file);SplitProjects.replace('keep');
   SplitProjects.capture();return SplitMemory.snapshot().drafts.find(c=>c.formatId===out.id);
  },imageId);assert(replaced.reasons.includes('content'));assert.equal(replaced.changes.find(c=>c.id===imageId).kind,'content');assert.equal(replaced.eligibleCount,0);
  pass('real images keep their identities through .split files and replacement is content change');

  await comparisonPage.evaluate(()=>{openFormat(outputs[0].id);selectLayer(current().layers[0].id);updateProp(l=>l.x+=.015,true);});
  await comparisonPage.evaluate(async()=>{await SplitProjects.flush();await SplitMemory.settled();});const beforeReload=await state(comparisonPage);
  await comparisonPage.reload();await comparisonPage.evaluate(()=>SplitProjects.initialized);await comparisonPage.locator('#restoreProject').click();await comparisonPage.waitForFunction(()=>!SplitProjects.busy()&&outputs.length>0);
  assert.deepEqual((await state(comparisonPage)).drafts,beforeReload.drafts);await comparisonContext.close();
  pass('unsaved consolidated corrections survive local recovery without becoming approvals');

  const unavailable=await browser.newContext({acceptDownloads:true});await unavailable.addInitScript(()=>Object.defineProperty(globalThis,'indexedDB',{value:{open(){throw Error('Storage denied');}},configurable:true}));
  const noStorage=await unavailable.newPage();watch(noStorage);await noStorage.goto(url);await noStorage.evaluate(()=>SplitProjects.initialized);await noStorage.locator('#emptyDemo').click();
  assert.equal((await state(noStorage)).records.length,1);const fallback=await downloadProject(noStorage);assert.equal(fallback.learning.records.length,2);assert.equal(await noStorage.evaluate(()=>SplitMemory.settled()),false);
  const fallbackPng=noStorage.waitForEvent('download');await noStorage.evaluate(()=>openFormat(outputs[0].id));await noStorage.locator('#downloadOne').click();assert.equal(await (await fallbackPng).failure(),null);
  pass('unavailable IndexedDB does not prevent generation, .split saving or PNG export');
  await unavailable.close();await other.close();
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);pass('no browser errors or failed resource requests');
  console.log(`Completed ${checks} browser checks.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
