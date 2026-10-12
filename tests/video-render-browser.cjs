/* Real end-to-end MP4 render through the Split UI. Needs FFmpeg and Chromium. */
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright');
const {createServer}=require('../server/video-server.cjs');
(async()=>{
  const server=createServer();let browser,folder;
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}`;
  try{
    const health=await (await fetch(url+'/api/video/health')).json();assert.equal(health.llm,false);
    const invalid=await fetch(url+'/api/video/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({w:1080,h:1080,duration:6,motion:'slide',layers:[{png:'<script>bad</script>',start:0}]})});assert.equal(invalid.status,400);
    const origin=await fetch(url+'/api/video/jobs',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://example.com'},body:'{}'});assert.equal(origin.status,403);
    browser=await chromium.launch({headless:true,executablePath:process.env.SPLIT_CHROME_PATH||undefined,args:['--no-sandbox']});
    const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url);await page.locator('#emptyDemo').click();await page.locator('#openVideoStudio').click();
    await page.waitForFunction(()=>!document.getElementById('renderVideo').disabled);
    await page.locator('#videoFormat').selectOption('rectangle');
    await page.waitForFunction(()=>!document.getElementById('renderVideo').disabled);
    await page.locator('#videoDuration').selectOption('6');
    await page.waitForFunction(()=>!document.getElementById('renderVideo').disabled);
    const before=await page.evaluate(()=>JSON.stringify(outputs));
    await page.locator('#renderVideo').click();
    await page.locator('#downloadRenderedVideo').waitFor({state:'visible',timeout:120000});
    assert.equal(await page.locator('#videoRenderProgress').getAttribute('value'),'100');
    assert((await page.locator('#videoRenderStatus').textContent()).includes('Vídeo pronto'));
    const wait=page.waitForEvent('download');await page.locator('#downloadRenderedVideo').click();
    const download=await wait;assert.equal(await download.failure(),null);
    folder=await fs.mkdtemp(path.join(os.tmpdir(),'split-mp4-test-'));
    const file=path.join(folder,'video.mp4');await download.saveAs(file);
    const data=await fs.readFile(file);assert(data.subarray(0,64).includes(Buffer.from('ftyp')));
    const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height,r_frame_rate,duration','-of','json',file],{encoding:'utf8'}));
    assert.equal(probe.streams[0].width,300);assert.equal(probe.streams[0].height,250);assert.equal(probe.streams[0].r_frame_rate,'30/1');assert.equal(Number(probe.streams[0].duration),6);
    assert.equal(await page.evaluate(()=>JSON.stringify(outputs)),before);assert.deepEqual(errors,[]);
    console.log('PASS: server health without LLM, invalid asset rejection, same-origin validation, integrated UI render, progress, real MP4 download (300 × 250, 6s, 30fps), editor isolation.');
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));if(folder)await fs.rm(folder,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
