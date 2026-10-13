const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../dist/video-studio.js'),'utf8');
const code=source.slice(source.indexOf('  async function renderJob('),source.indexOf('  async function renderVideo()'));
async function run(failIndex=-1){
  const nodes={},jobs=[],prepared=[],packed=[];
  const context={console,URL,AbortSignal,AbortController,Uint8Array,TextEncoder,Date,Map,setTimeout:fn=>fn(),location:{href:'http://localhost/'},renderController:null,
    el:id=>nodes[id]??=( {} ),snapshot:{sourceId:'a',w:300,h:250,duration:6,motion:'slide',layers:[{key:'logo',name:'Logo',start:.2,blob:'png',animation:{scale:.7}}]},
    outputs:[{id:'a',name:'A',w:300,h:250},{id:'b',name:'B',w:728,h:90},{id:'c',name:'C',w:1080,h:1080}],
    drafts:new Map([['a',{duration:6,motion:'slide',layers:[{key:'logo',start:.2,animation:{scale:.7}}]}],['b',{duration:10,motion:'fade',layers:[]}]]),
    serverReady:true,rendering:false,building:false,revision:0,batchDownloadUrl:null,
    clone:structuredClone,remember:()=>{},pause:()=>{},renderButton:()=>{},safeName:()=> 'campaign',base64:async()=> 'png',
    textFile:(name,text)=>({name,data:new TextEncoder().encode(text)}),zipFiles:files=>{packed.push(...files);return new Blob(['zip']);},
    SplitBrowserVideo:{render:async(data,{onProgress})=>{const index=jobs.length;jobs.push(data);if(index===failIndex)throw Error('Test failure');onProgress(100);return{blob:new Blob([Uint8Array.from([1,2,3])])};}}
  };
  vm.createContext(context);vm.runInContext(code,context);
  const painted=[];
  Object.assign(context,{
    ensureFonts:async()=>{},prepareBackground:async()=>{},png:async()=> 'png',paintBackground:()=>{},paintLayer:(_ctx,layer)=>painted.push(layer.id),
    document:{createElement:()=>({getContext:()=>({fillRect(){},clearRect(){}})})},
    SplitVideoComposition:require('../dist/video-composition.js')
  });
  const preparedData=await context.prepareBatchComposition({w:728,h:90,bg:'#fff',layers:[{id:'logo',name:'Logo',x:.1,y:.2,w:.3,h:.4},{id:'hidden',hidden:true}]},context.drafts.get('a'));
  assert.deepEqual(painted,['logo']);assert.equal(preparedData.layers.length,2);
  assert.equal(preparedData.layers[1].start,.2);assert.equal(preparedData.layers[1].animation.scale,.7);
  assert.equal(preparedData.layers[1].animation.originX,25);assert.equal(preparedData.layers[1].animation.originY,40);
  context.prepareBatchComposition=async(out,settings)=>{prepared.push({out,settings});return {w:out.w,h:out.h,duration:settings.duration,motion:settings.motion,layers:[]};};
  await context.renderAllVideos();
  assert.deepEqual(jobs.map(job=>[job.w,job.h]),[[300,250],[728,90],[1080,1080]]);
  assert.equal(jobs[0].layers[0].animation.scale,.7);
  assert.equal(prepared[0].settings.duration,10);assert.equal(prepared[1].settings.layers[0].animation.scale,.7);
  assert.equal(context.rendering,false);assert.equal(nodes.videoRenderProgress.value,100);
  assert.equal(packed.filter(file=>file.name.endsWith('.mp4')).length,failIndex<0?3:2);
  assert.equal(packed.some(file=>file.name==='formatos-com-erro.txt'),failIndex>=0);
  assert.equal(nodes.downloadRenderedVideo.download,'campaign-videos.zip');assert.equal(nodes.downloadRenderedVideo.hidden,false);
  URL.revokeObjectURL(context.batchDownloadUrl);
}
(async()=>{await run();await run(1);console.log('PASS: all dimensions, current animation, saved per-format settings, fallback, ZIP and partial failure recovery.');})().catch(error=>{console.error(error);process.exitCode=1;});
