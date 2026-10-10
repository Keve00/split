const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../dist'),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/seed'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Local test setup</title>');return;}
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':decodeURIComponent(pathname)));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync(file));
});
let checks=0;const pass=label=>{checks++;console.log(`PASS ${checks}: ${label}`);};
const logoX=model=>model.entries.find(e=>e.metric==='x'&&e.context.role==='logo'&&e.context.ratio===0);
const state=page=>page.evaluate(()=>SplitMemory.snapshot());
const general=page=>page.evaluate(async()=>{await SplitMemory.settled();return SplitMemory.readGeneral();});
async function save(page){const wait=page.waitForEvent('download');await page.locator('#saveProject').click();const file=await wait,stream=await file.createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);assert.equal(await file.failure(),null);return JSON.parse(Buffer.concat(chunks).toString('utf8'));}
async function exportOne(page){const wait=page.waitForEvent('download');await page.locator('#downloadOne').click();assert.equal(await (await wait).failure(),null);await page.evaluate(()=>SplitMemory.settled());}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,executablePath:process.env.SPLIT_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'}),errors=[],failures=[];
 const watch=page=>{page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failures.push(r.url()));};
 async function pageFor(context){const page=await context.newPage();watch(page);await page.goto(url);await page.evaluate(()=>SplitProjects.initialized);await page.evaluate(()=>SplitMemory.generalInitialized);return page;}
 async function train(context){const page=await pageFor(context);await page.locator('#emptyDemo').click();for(let i=0;i<3;i++){if(i)await page.evaluate(()=>generate());await page.evaluate(()=>{openFormat(outputs[0].id);selectLayer(current().layers.find(l=>l.role==='logo').id);updateProp(l=>l.x+=.01,true);});await exportOne(page);}return page;}
 try{
  const context=await browser.newContext({acceptDownloads:true}),first=await train(context),project=await state(first),one=await general(first);
  assert.equal(logoX(project.preferences).ready,true);assert.equal(logoX(project.preferences).support,3);assert.equal(logoX(one).projectCount,1);assert.equal(logoX(one).ready,false);assert.equal(logoX(one).evidence,1);
  pass('real edit/export cycles build project preferences while one project remains weak globally');
  const file=await save(first),savedGeneral=await general(first);for(let i=0;i<3;i++){await save(first);await exportOne(first);}
  assert.equal(logoX((await state(first)).preferences).support,3);assert.equal(logoX(await general(first)).projectCount,1);assert.equal(logoX(await general(first)).evidence,logoX(savedGeneral).evidence);
  pass('repeated saving and exporting do not multiply independent examples or project weight');

  const second=await train(context),two=await general(second);assert.equal(logoX(two).projectCount,2);assert.equal(logoX(two).ready,false);
  const third=await train(context),three=await general(third);assert.equal(logoX(three).projectCount,3);assert.equal(logoX(three).ready,true);assert.equal(logoX(three).evidence,3);
  pass('global preferences become reliable only after consistent evidence from independent projects');
  await third.reload();await third.evaluate(()=>SplitMemory.generalInitialized);assert.deepEqual(await general(third),three);
  assert(await third.locator('#recoveryBanner').isVisible());await third.locator('#restoreProject').click();await third.waitForFunction(()=>!SplitProjects.busy()&&outputs.length>0);
  const restored=await state(third);assert.equal(logoX(restored.preferences).ready,true);assert.deepEqual(await general(third),three);
  pass('project and general preferences survive reload and local recovery');

  const isolated=await browser.newContext({acceptDownloads:true}),imported=await pageFor(isolated);assert.equal((await general(imported)).entries.length,0);
  await imported.evaluate(file=>SplitProjects.openValue(file),file);await imported.evaluate(()=>SplitMemory.settled());assert.equal(logoX((await state(imported)).preferences).ready,true);assert.equal((await general(imported)).entries.length,0);
  for(let i=0;i<3;i++)await imported.evaluate(file=>SplitProjects.openValue(file),file);assert.equal((await general(imported)).entries.length,0);
  pass('portable preferences accompany .split files without promoting imported history globally');
  await save(imported);const newlyConfirmed=await general(imported);assert.equal(logoX(newlyConfirmed).projectCount,1);assert.equal(logoX(newlyConfirmed).ready,false);assert.equal(logoX(newlyConfirmed).evidence,.4);
  for(let i=0;i<3;i++)await save(imported);assert.deepEqual(await general(imported),newlyConfirmed);
  pass('explicitly saving an imported piece contributes only the current confirmation with save weight');

  const undoContext=await browser.newContext({acceptDownloads:true}),undoPage=await pageFor(undoContext);await undoPage.locator('#emptyDemo').click();
  await undoPage.evaluate(()=>{openFormat(outputs[0].id);selectLayer(current().layers.find(l=>l.role==='logo').id);updateProp(l=>l.x+=.01,true);});
  assert.equal((await general(undoPage)).entries.length,0);await exportOne(undoPage);const beforeUndo=await general(undoPage);assert.equal(logoX(beforeUndo).active,true);
  await undoPage.evaluate(()=>undo());assert.equal((await general(undoPage)).entries.length,0);assert.equal((await state(undoPage)).evidence.length,0);
  await undoPage.evaluate(()=>SplitEditor.redo());assert.deepEqual(await general(undoPage),beforeUndo);
  pass('pending corrections do not contribute and undo/redo removes/restores local evidence exactly');

  const failed=await undoPage.evaluate(async()=>{
   const before=await SplitMemory.readGeneral(),original=download;selectLayer(current().layers.find(l=>l.role==='logo').id);updateProp(l=>l.x+=.01,true);
   download=()=>{throw Error('Simulated failed download');};try{await SplitProjects.save();}finally{download=original;}await SplitMemory.settled();return{before,after:await SplitMemory.readGeneral()};
  });assert.deepEqual(failed.after,failed.before);pass('failed project downloads roll back general contributions as well as project records');

  const eviction=await undoPage.evaluate(async()=>{
   for(let i=0;i<52;i++){SplitMemory.restore(null);SplitMemory.record('generation',[]);}await SplitMemory.settled();
   const d=await new Promise(resolve=>{const r=indexedDB.open('split-learning');r.onsuccess=()=>resolve(r.result);});
   const counts=await Promise.all(['projects','contributions'].map(name=>new Promise(resolve=>{const r=d.transaction(name).objectStore(name).count();r.onsuccess=()=>resolve(r.result);})));d.close();return{counts,general:await SplitMemory.readGeneral()};
  });assert.deepEqual(eviction.counts,[50,50]);assert.equal(eviction.general.entries.length,0);
  pass('retention removes old project contributions and rebuilds the general model atomically');

  const upgradeContext=await browser.newContext({acceptDownloads:true}),upgrade=await upgradeContext.newPage();watch(upgrade);await upgrade.goto(url+'/seed');
  const old=structuredClone(file.learning);old.version=2;delete old.evidence;delete old.preferences;delete old.eventSequence;for(const record of old.records)delete record.ordinal;
  await upgrade.evaluate(async memory=>{const d=await new Promise((resolve,reject)=>{const r=indexedDB.open('split-learning',1);r.onupgradeneeded=()=>{const store=r.result.createObjectStore('projects',{keyPath:'projectId'});store.createIndex('updatedAt','updatedAt');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});await new Promise((resolve,reject)=>{const tx=d.transaction('projects','readwrite');tx.objectStore('projects').put({projectId:memory.projectId,updatedAt:Date.now(),memory});tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);});d.close();},old);
  await upgrade.goto(url);await upgrade.evaluate(()=>SplitMemory.generalInitialized);const migrated=await upgrade.evaluate(id=>SplitMemory.readLocal(id),old.projectId);
  assert.equal(migrated.version,3);assert.equal(logoX(migrated.preferences).ready,true);assert.equal((await general(upgrade)).entries.length,0);
  const dbVersion=await upgrade.evaluate(async()=>{const d=await new Promise(resolve=>{const r=indexedDB.open('split-learning');r.onsuccess=()=>resolve(r.result);});const version=d.version;d.close();return version;});assert.equal(dbVersion,2);
  pass('existing IndexedDB data upgrades without losing history or creating unconfirmed global evidence');

  const deniedContext=await browser.newContext({acceptDownloads:true});await deniedContext.addInitScript(()=>Object.defineProperty(globalThis,'indexedDB',{value:{open(){throw Error('Denied');}},configurable:true}));
  const denied=await pageFor(deniedContext);await denied.evaluate(file=>SplitProjects.openValue(file),file);assert.equal(logoX((await state(denied)).preferences).ready,true);const deniedFile=await save(denied);assert.equal(logoX(deniedFile.learning.preferences).ready,true);assert.equal((await general(denied)).entries.length,0);
  pass('project preferences remain portable and usable when browser storage is unavailable');
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);pass('no new interface controls, browser errors or failed resource requests');
  await deniedContext.close();await upgradeContext.close();await undoContext.close();await isolated.close();await context.close();console.log(`Completed ${checks} preference browser checks.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
