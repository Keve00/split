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
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,executablePath:process.env.SPLIT_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'}),errors=[],failures=[];
 async function pageFor(context){const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>failures.push(r.url()));await p.goto(url);await p.evaluate(()=>SplitProjects.initialized);await p.evaluate(()=>SplitMemory.generalInitialized);return p;}
 const recalculate=p=>p.evaluate(()=>$('rearrange').onclick());
 const geometry=p=>p.evaluate(()=>({x:current().layers[0].x,manual:current().layers[0].manualLayout,model:SplitMemory.snapshot().preferences.entries.find(e=>e.metric==='x'&&e.context.role==='logo'&&e.context.ratio===0)}));
 async function setup(p){await p.locator('#emptyDemo').click();await p.evaluate(async()=>{sources=[sources.find(s=>s.role==='logo')];outputs=[];const plan=SplitBlueprint.state();plan.enabled=false;SplitBlueprint.restore(plan);await generate();openFormat(outputs[0].id);});}
 async function train(context){const p=await pageFor(context);await setup(p);const initial=await geometry(p);for(let i=0;i<3;i++){if(i)await recalculate(p);await p.evaluate(()=>{selectLayer(current().layers[0].id);updateProp(l=>l.x+=.01,true);});await exportOne(p);}return{page:p,initial};}
 try{
  const context=await browser.newContext({acceptDownloads:true}),{page,initial}=await train(context),trained=await geometry(page);assert.equal(trained.model.ready,true);const file=await save(page);
  await recalculate(page);const learned=await geometry(page);assert(learned.x>initial.x);assert(learned.x<initial.x+.025);assert.equal(learned.manual,false);assert.deepEqual(learned.model,trained.model);
  pass('real recalculation uses confident project preferences without adding interface controls');
  for(let i=0;i<4;i++)await recalculate(page);assert.equal((await geometry(page)).x,learned.x);await exportOne(page);assert.deepEqual((await geometry(page)).model,trained.model);
  pass('repeated generation is stable and unchanged personalized exports do not train the algorithm on itself');
  await page.evaluate(()=>undo());const undone=await geometry(page);await page.evaluate(()=>SplitEditor.redo());assert.equal((await geometry(page)).x,learned.x);assert.equal(undone.model.ready,true);
  await page.evaluate(()=>{selectLayer(current().layers[0].id);updateProp(l=>l.x+=.02,true);});const manual=await geometry(page);await page.evaluate(()=>arrangeOutput(current()));assert.equal((await geometry(page)).x,manual.x);
  pass('undo/redo restores generated geometry and ordinary editing preserves manual positions');
  const isolated=await browser.newContext({acceptDownloads:true}),portable=await pageFor(isolated);await portable.evaluate(file=>SplitProjects.openValue(file),file);assert.equal((await general(portable)).entries.length,0);await recalculate(portable);assert.equal((await geometry(portable)).x,learned.x);
  const savedPersonalized=await save(portable);await portable.evaluate(async()=>{await SplitProjects.flush();await SplitMemory.settled();});await portable.reload();await portable.evaluate(()=>SplitProjects.initialized);await portable.locator('#restoreProject').click();await portable.waitForFunction(()=>document.getElementById('projectBusy').hidden);await recalculate(portable);assert.equal((await geometry(portable)).x,learned.x);assert.equal(savedPersonalized.learning.records.some(r=>r.outputs.some(o=>o.applied?.length)),true);
  pass('portable preferences and anti-feedback metadata survive saving, import and local recovery');
  await train(context);await train(context);const fresh=await pageFor(context);await setup(fresh);const globalResult=await geometry(fresh);assert(globalResult.x>initial.x);assert.equal(globalResult.model,undefined);assert.equal(logoX(await general(fresh)).ready,true);
  pass('a fresh project benefits from general preferences only after independent local projects agree');
  const deniedContext=await browser.newContext({acceptDownloads:true});await deniedContext.addInitScript(()=>Object.defineProperty(globalThis,'indexedDB',{value:{open(){throw Error('Denied');}},configurable:true}));const denied=await pageFor(deniedContext);await denied.evaluate(file=>SplitProjects.openValue(file),file);await recalculate(denied);assert.equal((await geometry(denied)).x,learned.x);await exportOne(denied);
  pass('project learning still improves generation and exports when browser storage is unavailable');
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);assert.equal(await page.locator('[id*=learning], [id*=preference]').count(),0);pass('no new learning controls, browser errors or failed requests');
  await deniedContext.close();await isolated.close();await context.close();console.log('Completed '+checks+' learning layout browser checks.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
