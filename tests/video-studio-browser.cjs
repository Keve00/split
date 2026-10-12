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
    await page.locator('#videoSeek').fill('90');await page.locator('#videoSeek').dispatchEvent('input');
    const ready=await frame.locator('.video-layer').first().evaluate(el=>getComputedStyle(el).opacity);
    assert.equal(ready,'1');
    // Same frame after a backward seek must produce identical pixels/styles.
    const first=await frame.locator('body').screenshot();
    await page.locator('#videoSeek').fill('0');await page.locator('#videoSeek').dispatchEvent('input');
    await page.locator('#videoSeek').fill('90');await page.locator('#videoSeek').dispatchEvent('input');
    assert.deepEqual(await frame.locator('body').screenshot(),first);
    await page.locator('#videoPlay').click();await page.waitForFunction(()=>Number(document.getElementById('videoSeek').value)>90);
    await page.locator('#videoPlay').click();
    await page.locator('#videoMotion').selectOption('zoom');
    await page.waitForFunction(()=>!document.getElementById('videoPlay').disabled);
    await page.locator('#videoDuration').selectOption('6');
    await page.waitForFunction(()=>!document.getElementById('videoPlay').disabled);
    assert.equal(await page.locator('#videoSeek').getAttribute('max'),'180');
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
    assert(!entries['index.html'].toString().includes('blob:'));
    assert.equal(JSON.parse(entries['split-video.json']).duration,6);
    if(process.env.SPLIT_VIDEO_QA_DIR){fs.mkdirSync(process.env.SPLIT_VIDEO_QA_DIR,{recursive:true});for(const [name,data]of Object.entries(entries)){const file=path.join(process.env.SPLIT_VIDEO_QA_DIR,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,data);}await page.locator('#videoSeek').fill('90');await page.locator('#videoSeek').dispatchEvent('input');await page.screenshot({path:path.join(process.env.SPLIT_VIDEO_QA_DIR,'studio.png')});}
    assert.equal(await page.evaluate(()=>JSON.stringify(outputs)),initial);
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
    assert.deepEqual(errors,[]);
    console.log('PASS: empty state, uploaded image and campaign text layers, deterministic seek, playback, motion, duration, ZIP assets, editor isolation, hidden layers, focus and mobile width.');
  } finally {await browser?.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
