/* Isolated integration test. Requires Playwright on NODE_PATH. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '../dist');
const mime = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.ttf':'font/ttf'};
const server = http.createServer((req,res) => {
  const name = new URL(req.url, 'http://localhost').pathname;
  const file = path.resolve(root, '.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  res.end(fs.readFileSync(file));
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser=await chromium.launch({headless:true,executablePath:process.env.SPLIT_CHROME_PATH||undefined,args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('#openVideoStudio').click();
    assert(await page.locator('#videoEmpty').isVisible());
    assert(await page.locator('#exportVideoProject').isDisabled());
    await page.locator('#videoExample').click();
    await page.waitForFunction(()=>!document.getElementById('videoPlay').disabled);
    await page.locator('#closeVideoStudio').click();
    const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=120;c.height=60;const ctx=c.getContext('2d');ctx.fillStyle='#ff623d';ctx.fillRect(0,0,120,60);return c.toDataURL().split(',')[1];});
    await page.locator('#elementFile').setInputFiles({name:'asset-test.png',mimeType:'image/png',buffer:Buffer.from(image,'base64')});
    await page.waitForFunction(()=>sources.some(layer=>layer.type==='image'));
    await page.evaluate(()=>generate());
    await page.locator('#openVideoStudio').click();
    await page.waitForFunction(()=>!document.getElementById('videoPlay').disabled);
    const initial=await page.evaluate(()=>JSON.stringify(outputs));
    const format=await page.locator('#videoFormat').inputValue();
    const source=await page.evaluate(id=>outputs.find(out=>out.id===id),format);
    const frame=page.frameLocator('#videoFrame');
    assert.equal(await frame.locator('.video-layer').count(),source.layers.filter(layer=>!layer.hidden).length);
    // Selection must agree across the timeline, preview and animation inspector.
    await page.locator('.video-track-name').filter({hasText:'asset-test.png'}).click();
    assert.equal(await page.locator('#videoLayerName').textContent(),'asset-test.png');
    const assetKey=source.layers.find(l=>l.name==='asset-test.png').id;
    assert.equal(await page.locator('#videoSelectionOverlay').getAttribute('data-selected-layer'),assetKey);
    await page.locator('#videoSeek').fill('90');await page.locator('#videoSeek').dispatchEvent('input');
    const ready=await frame.locator('.video-layer').first().evaluate(el=>getComputedStyle(el).opacity);
    assert.equal(ready,'1');
    const assetPoint=await page.locator('#videoSelectionOverlay').evaluate(el=>{const points=el.querySelector('polygon').getAttribute('points').split(' ').map(p=>p.split(',').map(Number)),box=el.getBoundingClientRect(),view=el.querySelector('svg').getAttribute('viewBox').split(' ').map(Number);return{x:points.reduce((s,p)=>s+p[0],0)/points.length/view[2]*box.width,y:points.reduce((s,p)=>s+p[1],0)/points.length/view[3]*box.height};});
    await page.locator('.video-track-name').first().click();
    await page.locator('#videoSelectionOverlay').click({position:assetPoint});
    assert.equal(await page.locator('#videoLayerName').textContent(),'asset-test.png');
    await page.locator('#videoSelectionOverlay').click({position:{x:1,y:1}});
    assert.equal(await page.locator('#videoLayerName').textContent(),'Selecione uma camada');
    assert(!(await page.locator('#videoSelectionLabel').isVisible()));
    await page.locator('.video-track-name').first().click();
    // Same frame after a backward seek must produce identical pixels/styles.
    const first=await frame.locator('body').screenshot();
    await page.locator('#videoSeek').fill('0');await page.locator('#videoSeek').dispatchEvent('input');
    await page.locator('#videoSeek').fill('90');await page.locator('#videoSeek').dispatchEvent('input');
    assert.deepEqual(await frame.locator('body').screenshot(),first);
    await page.locator('#videoPlay').click();await page.waitForFunction(()=>Number(document.getElementById('videoSeek').value)>90);
    await page.locator('#videoPlay').click();
    await page.locator('#videoMotion-choices [data-value="zoom"]').click();
    await page.waitForFunction(()=>!document.getElementById('videoPlay').disabled);
    await page.locator('#videoDuration').selectOption('6');
    await page.waitForFunction(()=>!document.getElementById('videoPlay').disabled);
    assert.equal(await page.locator('#videoSeek').getAttribute('max'),'180');
    const readyPreview=()=>page.waitForFunction(()=>!document.getElementById('videoPlay').disabled);
    // Inspector fields live in tabs; open the one that holds a field before editing it.
    const showTab=id=>page.evaluate(id=>{const panel=document.getElementById(id).closest('[data-video-panel]');if(panel?.hidden)document.querySelector(`[data-video-tab="${panel.dataset.videoPanel}"]`).click();},id);
    const edit=async(id,value)=>{await showTab(id);const input=page.locator('#'+id);if(await input.evaluate(el=>el.tagName==='SELECT'))await page.locator(`#${id}-choices`).locator(`[data-value="${value}"]`).click();else{await input.fill(value);await input.dispatchEvent('change');}await readyPreview();};
    await page.locator('.video-track-name').first().click();
    await edit('videoLayerEnter','rotate');await edit('videoLayerExit','slide');await edit('videoLayerDirection','left');
    await edit('videoLayerStart','0.6');await edit('videoLayerEnd','4.5');await edit('videoLayerEntryDuration','0.9');await edit('videoLayerExitDuration','0.4');
    await edit('videoLayerDistance','18');await edit('videoLayerScale','70');await edit('videoLayerRotation','45');await edit('videoLayerOpacity','80');await edit('videoLayerEase','none');
    const seekTo=async(seconds)=>{await page.locator('#videoSeek').fill(String(Math.round(seconds*30)));await page.locator('#videoSeek').dispatchEvent('input');};
    const layerStyle=()=>frame.locator('.video-layer').first().evaluate(el=>({opacity:Number(getComputedStyle(el).opacity),transform:getComputedStyle(el).transform,animation:JSON.parse(el.dataset.animation)}));
    await seekTo(.3);assert.equal((await layerStyle()).opacity,0);
    await seekTo(1);const entering=await layerStyle();assert(entering.opacity>0&&entering.opacity<.8);assert.notEqual(entering.transform,'matrix(1, 0, 0, 1, 0, 0)');
    await seekTo(3);assert.equal((await layerStyle()).opacity,.8);
    const customized=await frame.locator('body').screenshot();
    await seekTo(5);assert.equal((await layerStyle()).opacity,0);
    await seekTo(3);assert.deepEqual(await frame.locator('body').screenshot(),customized);
    // Transform inputs work with slide/fade too; editing seeks into the affected segment.
    await edit('videoLayerExit','none');
    assert(await page.locator('#videoLayerExitScale').isEnabled());
    await page.locator('#videoLayerExitScale').fill('');await page.locator('#videoLayerExitScale').pressSequentially('137.5');
    assert.equal(await page.locator('#videoLayerExitScale').inputValue(),'137.5');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'videoLayerExitScale');
    assert.equal(await page.locator('#videoLayerExit').inputValue(),'zoom');
    assert.equal((await layerStyle()).animation.exitScale,1.375);
    await page.locator('#videoLayerExitScale').press('Tab');await edit('videoLayerExit','slide');
    await edit('videoLayerEnter','slide');await edit('videoLayerScale','50');await edit('videoLayerRotation','60');
    let transform=await layerStyle();assert.equal(transform.animation.scale,.5);assert.equal(transform.animation.rotation,60);
    assert.notEqual(transform.transform,'matrix(1, 0, 0, 1, 0, 0)');
    assert(Number(await page.locator('#videoSeek').inputValue())>18);
    await edit('videoLayerExitScale','150');transform=await layerStyle();assert.equal(transform.animation.exitScale,1.5);assert.equal(transform.animation.scale,.5);
    const matrix=transform.transform.match(/matrix\(([^)]+)\)/)[1].split(',').map(Number);assert(matrix[0]>1);
    await edit('videoLayerExitScale','100');await edit('videoLayerEnter','rotate');await edit('videoLayerScale','70');await edit('videoLayerRotation','45');
    for(const effect of ['none','fade','zoom','pop','slide','bounce','spin','swing','stretch','expand','rotate']){
      await edit('videoLayerEnter',effect);await seekTo(.3);assert.equal((await layerStyle()).opacity,0);
      await seekTo(3);assert.equal((await layerStyle()).opacity,.8);
      await seekTo(5);assert.equal((await layerStyle()).opacity,0);
      await seekTo(3);assert.deepEqual(await frame.locator('body').screenshot(),customized);
    }
    // Copying a style must preserve individual timing and each asset's pivot.
    const beforeApply=await frame.locator('.video-layer').evaluateAll(nodes=>nodes.map(el=>({start:el.dataset.start,a:JSON.parse(el.dataset.animation)})));
    await page.locator('#videoApplyAll').click();await readyPreview();
    const afterApply=await frame.locator('.video-layer').evaluateAll(nodes=>nodes.map(el=>({start:el.dataset.start,a:JSON.parse(el.dataset.animation)})));
    afterApply.forEach((layer,i)=>{assert.equal(layer.start,beforeApply[i].start);assert.equal(layer.a.end,beforeApply[i].a.end);assert.equal(layer.a.originX,beforeApply[i].a.originX);assert.equal(layer.a.enter,'rotate');});
    // A format change and reopening the dialog must restore the customized layer.
    const other=await page.locator('#videoFormat option').evaluateAll(nodes=>nodes.map(n=>n.value));
    if(other.length>1){await page.locator('#videoFormat').selectOption(other.find(id=>id!==format));await readyPreview();await page.locator('#videoFormat').selectOption(format);await readyPreview();}
    await page.locator('#closeVideoStudio').click();await page.locator('#openVideoStudio').click();await readyPreview();
    assert.equal(await page.locator('#videoLayerStart').inputValue(),'0.6');assert.equal(await page.locator('#videoLayerEnter').inputValue(),'rotate');assert.equal(await page.locator('#videoLayerEnd').inputValue(),'4.5');
    await page.getByText('Exportar projeto editável',{exact:true}).click();
    const downloadWait=page.waitForEvent('download');await page.locator('#exportVideoProject').click();
    const download=await downloadWait;assert.equal(await download.failure(),null);
    const stream=await download.createReadStream();const parts=[];for await(const chunk of stream)parts.push(chunk);
    const zip=Buffer.concat(parts);assert.equal(zip.readUInt32LE(0),0x04034b50);
    // Read stored ZIP entries to validate the actual package, not a mock download.
    let offset=0;const entries={};
    while(zip.readUInt32LE(offset)===0x04034b50){const size=zip.readUInt32LE(offset+18),nameLength=zip.readUInt16LE(offset+26),extra=zip.readUInt16LE(offset+28),start=offset+30+nameLength+extra;entries[zip.subarray(offset+30,offset+30+nameLength).toString()]=zip.subarray(start,start+size);offset=start+size;}
    assert(entries['vendor/gsap.min.js']);assert(entries['video-animation.js']);assert(entries['assets/layer-0.png']);
    assert(entries['index.html'].toString().includes('data-composition-id="split-video"'));
    assert(!entries['index.html'].toString().includes('videoSelection'));
    assert(!entries['index.html'].toString().includes('blob:'));
    assert.equal(JSON.parse(entries['split-video.json']).duration,6);
    const manifest=JSON.parse(entries['split-video.json']);assert.equal(manifest.version,2);assert.equal(manifest.layers[1].animation.enter,'rotate');assert.equal(manifest.layers[1].animation.exit,'slide');assert.equal(manifest.layers[1].animation.end,4.5);assert.equal(manifest.layers[1].start,.6);
    if(process.env.SPLIT_VIDEO_QA_DIR){fs.mkdirSync(process.env.SPLIT_VIDEO_QA_DIR,{recursive:true});for(const [name,data]of Object.entries(entries)){const file=path.join(process.env.SPLIT_VIDEO_QA_DIR,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);}await page.locator('#videoSeek').fill('90');await page.locator('#videoSeek').dispatchEvent('input');await page.screenshot({path:path.join(process.env.SPLIT_VIDEO_QA_DIR,'studio.png')});}
    assert.equal(await page.evaluate(()=>JSON.stringify(outputs)),initial);
    await page.locator('#videoSequence').hover();assert(await page.locator('#videoControlTooltip').isVisible());assert((await page.locator('#videoControlTooltip').textContent()).includes('Distribuir'));
    assert.equal(await page.locator('#videoSequence svg').count(),1);
    await page.locator('#videoTogether').click();await readyPreview();
    assert((await frame.locator('.video-layer').evaluateAll(nodes=>nodes.map(el=>Number(el.dataset.start)))).every(start=>start===0));
    await page.locator('#videoStagger').fill('0.5');await page.locator('#videoSequence').click();await readyPreview();
    assert.deepEqual(await frame.locator('.video-layer').evaluateAll(nodes=>nodes.map(el=>Number(el.dataset.start))),source.layers.filter(layer=>!layer.hidden).map((_,i)=>i*.5));
    // Closing must restore focus and leave the original editor intact.
    await page.keyboard.press('Escape');assert(!(await page.locator('#videoStudio').isVisible()));
    assert.equal(await page.evaluate(()=>document.activeElement.id),'openVideoStudio');
    // Hidden layers must not become exported video assets.
    await page.evaluate(()=>{outputs[0].layers[0].hidden=true;});
    await page.locator('#openVideoStudio').click();
    await page.waitForFunction(()=>!document.getElementById('videoPlay').disabled);
    assert.equal(await frame.locator('.video-layer').count(),source.layers.length-1);
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.locator('#videoStudio').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true);
    if(process.env.SPLIT_VIDEO_QA_DIR)await page.screenshot({path:path.join(process.env.SPLIT_VIDEO_QA_DIR,'studio-mobile.png')});
    assert.deepEqual(errors,[]);
    console.log('PASS: per-layer entrance/exit, timing, style copy, pivots, opacity, deterministic backward seek, format/session retention, v2 ZIP, editor isolation, focus and mobile width.');
  } finally {await browser?.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
