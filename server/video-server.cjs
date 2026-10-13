'use strict';
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawn} = require('node:child_process');
const {html,animation,choices} = require('../dist/video-composition.js');
const root = path.resolve(__dirname,'../dist');
const MAX_BODY = 64*1024*1024, TTL = 30*60*1000;
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
const jobs = new Map();
let running = null;
function invalid(message){const error=new Error(message);error.status=400;throw error;}
function validate(input) {
  if (!input || typeof input!=='object') invalid('Projeto inválido.');
  const {w,h,duration,motion,layers}=input;
  if (![w,h].every(n=>Number.isInteger(n)&&n>=32&&n<=4096&&n%2===0)||w*h>8e6) invalid('O vídeo precisa de dimensões pares, entre 32 e 4096 px, e até 8 megapixels.');
  if (![6,10,15,20].includes(duration)||!choices.enter.includes(motion)) invalid('Duração ou movimento inválido.');
  if(!Array.isArray(layers)||layers.length<1||layers.length>60)invalid('O vídeo precisa de 1 a 60 camadas, incluindo o fundo.');
  const safe=layers.map((layer,i)=>{
    if(!layer||typeof layer.png!=='string'||layer.png.length>20*1024*1024||!Number.isFinite(layer.start)||layer.start<0||layer.start>duration-.1)invalid('Camada inválida ou muito grande.');
    const buffer=Buffer.from(layer.png,'base64');
    if(buffer.length<33||!buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||buffer.readUInt32BE(16)!==w||buffer.readUInt32BE(20)!==h)invalid('Cada camada precisa ser um PNG nas dimensões da composição.');
    if(i===0&&layer.start!==0)invalid('O fundo deve começar no quadro zero.');
    let safeAnimation;
    try { safeAnimation=animation(layer,duration,motion,true); } catch(error) { invalid(error.message); }
    return {name:String(layer.name||`Camada ${i+1}`).slice(0,120),start:layer.start,animation:safeAnimation,path:`assets/layer-${i}.png`,buffer};
  });
  return {w,h,duration,motion,layers:safe};
}
async function body(req) {
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))invalid('Use application/json.');
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>MAX_BODY){const e=new Error('A campanha excede o limite de 64 MB para renderização.');e.status=413;throw e;}chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString());}catch{invalid('JSON inválido.');}
}
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));}
function publicJob(job){return {id:job.id,status:job.status,progress:job.progress,error:job.error,download:job.status==='done'?`/api/video/jobs/${job.id}/download`:null};}
async function render(job) {
  running=job.id;job.status='rendering';
  try {
    job.dir=await fsp.mkdtemp(path.join(os.tmpdir(),'split-render-'));
    await fsp.mkdir(path.join(job.dir,'assets'));await fsp.mkdir(path.join(job.dir,'vendor'));
    for(const layer of job.data.layers){await fsp.writeFile(path.join(job.dir,layer.path),layer.buffer);}
    await fsp.writeFile(path.join(job.dir,'index.html'),html(job.data));
    await fsp.copyFile(path.join(root,'video-animation.js'),path.join(job.dir,'video-animation.js'));
    await fsp.copyFile(path.join(root,'vendor/gsap.min.js'),path.join(job.dir,'vendor/gsap.min.js'));
    job.data=null;
    const cli=path.join(path.dirname(require.resolve('hyperframes/package.json')),'bin/hyperframes.mjs');
    job.file=path.join(job.dir,'video.mp4');
    await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,[cli,'render',job.dir,'--fps','30','--workers','1','--output',job.file,'--strict'],{env:{...process.env,HYPERFRAMES_NO_TELEMETRY:'1'},stdio:['ignore','pipe','pipe']});
      job.child=child;
      let log='',lines='',timedOut=false;
      const timer=setTimeout(()=>{timedOut=true;child.kill('SIGTERM');},5*60*1000);timer.unref();
      child.stdout.on('data',chunk=>{
        lines+=chunk;log=(log+chunk).slice(-3000);
        const parts=lines.split('\n');lines=parts.pop();
        for(const line of parts)if(line.startsWith('@hf-progress ')){try{const progress=JSON.parse(line.slice(13));if(Number.isFinite(progress.pct))job.progress=Math.max(job.progress,Math.min(99,progress.pct));}catch{}}
      });
      child.stderr.on('data',chunk=>{log=(log+chunk).slice(-3000);});
      child.on('error',error=>{clearTimeout(timer);reject(error);});
      child.on('close',code=>{clearTimeout(timer);job.child=null;if(code===0)resolve();else reject(Error(timedOut?'A renderização excedeu 5 minutos. Tente uma peça menor.':/ffmpeg.*(not found|ENOENT|not installed)/i.test(log)?'FFmpeg não encontrado. Instale o FFmpeg no servidor.':'A renderização falhou. Verifique Node.js, FFmpeg e Chromium no servidor e tente novamente.'));});
    });
    const stat=await fsp.stat(job.file);if(stat.size<100)throw Error('O vídeo gerado está vazio.');
    job.status='done';job.progress=100;
  } catch(error){job.status='error';job.error=error.message;}
  finally {job.data=null;job.completedAt=Date.now();running=null;next();}
}
function next(){if(running)return;const pending=[...jobs.values()].find(job=>job.status==='queued');if(pending)void render(pending);}
function createServer() {
  return http.createServer(async(req,res)=>{
    try {
      // Same-origin only. The default listener is local and no campaign content is logged.
      if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`&&req.headers.origin!==`https://${req.headers.host}`){send(res,403,{error:'Origem não permitida.'});return;}
      const url=new URL(req.url,'http://localhost');
      if(url.pathname==='/api/video/health'&&req.method==='GET'){send(res,200,{engine:'hyperframes',version:'0.8.150',llm:false});return;}
      if(url.pathname==='/api/video/jobs'&&req.method==='POST'){
        if([...jobs.values()].filter(job=>['queued','rendering'].includes(job.status)).length>=3){send(res,429,{error:'A fila está cheia. Aguarde os vídeos em processamento.'});return;}
        const data=validate(await body(req));
        if([...jobs.values()].filter(job=>['queued','rendering'].includes(job.status)).length>=3){send(res,429,{error:'A fila está cheia. Aguarde os vídeos em processamento.'});return;}
        const job={id:crypto.randomUUID(),status:'queued',progress:0,data,createdAt:Date.now()};
        jobs.set(job.id,job);send(res,202,publicJob(job));next();return;
      }
      const match=url.pathname.match(/^\/api\/video\/jobs\/([a-f0-9-]{36})(\/download)?$/);
      if(match&&req.method==='GET'){
        const job=jobs.get(match[1]);if(!job){send(res,404,{error:'Vídeo não encontrado ou expirado.'});return;}
        if(!match[2]){send(res,200,publicJob(job));return;}
        if(job.status!=='done'){send(res,409,{error:'O vídeo ainda não está pronto.'});return;}
        const stat=await fsp.stat(job.file);
        res.writeHead(200,{'Content-Type':'video/mp4','Content-Length':stat.size,'Content-Disposition':'attachment; filename="split-video.mp4"','Cache-Control':'no-store'});
        fs.createReadStream(job.file).on('error',()=>res.destroy()).pipe(res);return;
      }
      if(url.pathname.startsWith('/api/')){send(res,404,{error:'API não encontrada.'});return;}
      if(req.method!=='GET'&&req.method!=='HEAD'){send(res,405,{error:'Método não permitido.'});return;}
      const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
      if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){send(res,404,{error:'Arquivo não encontrado.'});return;}
      res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});
      if(req.method==='HEAD')res.end();else fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
    }catch(error){if(!res.headersSent)send(res,error.status||500,{error:error.status?error.message:'Não foi possível processar a solicitação.'});else res.destroy();}
  });
}
const cleanup=setInterval(()=>{for(const [id,job]of jobs)if(job.completedAt&&Date.now()-job.completedAt>TTL){jobs.delete(id);if(job.dir)void fsp.rm(job.dir,{recursive:true,force:true});}},60*1000);cleanup.unref();
if(require.main===module){const server=createServer(),port=Number(process.env.PORT||8000);server.listen(port,'127.0.0.1',()=>console.log(`Split + Hyperframes: http://127.0.0.1:${port}`));}
module.exports={createServer,validate};
