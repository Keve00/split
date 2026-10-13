/* Local browser renderer. Uses the same GSAP timeline as the preview. */
'use strict';
globalThis.SplitBrowserVideo = (() => {
  const FPS=30;
  let library;
  const load=()=>library??=import('./vendor/mediabunny.min.js');
  const supported=()=>isSecureContext&&typeof VideoEncoder==='function'&&typeof VideoFrame==='function';
  function check(signal){if(signal?.aborted)throw new DOMException('Renderização cancelada.','AbortError');}
  function draw(ctx,images,time,timeline,w,h){
    timeline.seek(time,true);ctx.resetTransform();ctx.globalAlpha=1;ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
    for(const image of images){
      const style=image.ownerDocument.defaultView.getComputedStyle(image),opacity=Number(style.opacity);
      if(opacity<=0)continue;
      const matrix=new DOMMatrix(style.transform==='none'?undefined:style.transform);
      const [ox,oy]=style.transformOrigin.split(' ').map(parseFloat);
      ctx.save();ctx.globalAlpha=opacity;ctx.translate(ox,oy);ctx.transform(matrix.a,matrix.b,matrix.c,matrix.d,matrix.e,matrix.f);ctx.translate(-ox,-oy);
      ctx.drawImage(image,0,0,w,h);ctx.restore();
    }
  }
  async function render(data,{onProgress=()=>{},signal}={}){
    if(!supported())throw Error('Este navegador não oferece renderização de vídeo. Use uma versão atual do Chrome ou Edge em uma página HTTPS.');
    check(signal);
    const {Output,Mp4OutputFormat,BufferTarget,CanvasSource,canEncodeVideo}=await load();
    const bitrate=Math.max(1_000_000,Math.min(20_000_000,Math.round(data.w*data.h*FPS*.16)));
    if(!await canEncodeVideo('avc',{width:data.w,height:data.h,bitrate}))throw Error(`Este navegador não consegue gerar MP4 em ${data.w} × ${data.h}. Tente um formato menor ou outro navegador.`);
    const started=performance.now(),urls=[],iframe=document.createElement('iframe');
    iframe.setAttribute('aria-hidden','true');iframe.tabIndex=-1;
    iframe.style.cssText=`position:fixed;left:-10000px;top:0;width:${data.w}px;height:${data.h}px;border:0;pointer-events:none`;
    const layers=data.layers.map((layer,i)=>{const url=URL.createObjectURL(layer.blob);urls.push(url);return{...layer,url,path:`assets/layer-${i}.png`};});
    let output,canvas;
    try{
      await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>{cleanup();reject(Error('As camadas demoraram para carregar.'));},15000);
        const abort=()=>{cleanup();reject(new DOMException('Renderização cancelada.','AbortError'));};
        const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);};
        signal?.addEventListener('abort',abort,{once:true});
        iframe.onload=()=>{cleanup();resolve();};
        iframe.srcdoc=SplitVideoComposition.html({...data,layers},new URL('./',location.href).href);document.body.append(iframe);
      });
      await iframe.contentWindow.SplitVideoReady;check(signal);
      const timeline=iframe.contentWindow.SplitVideoTimeline,images=[...iframe.contentDocument.images];
      if(!timeline||images.some(image=>!image.complete||!image.naturalWidth))throw Error('Não foi possível preparar as imagens da animação.');
      canvas=document.createElement('canvas');canvas.width=data.w;canvas.height=data.h;
      const ctx=canvas.getContext('2d',{alpha:false});
      output=new Output({format:new Mp4OutputFormat({fastStart:'in-memory'}),target:new BufferTarget()});
      const source=new CanvasSource(canvas,{codec:'avc',bitrate});
      output.addVideoTrack(source,{frameRate:FPS});await output.start();
      const frames=Math.round(data.duration*FPS);
      for(let frame=0;frame<frames;frame++){
        check(signal);draw(ctx,images,frame/FPS,timeline,data.w,data.h);
        await source.add(frame/FPS,1/FPS);
        if(frame%15===0){onProgress((frame+1)/frames*99);await new Promise(resolve=>setTimeout(resolve,0));}
      }
      check(signal);await output.finalize();check(signal);onProgress(100);
      return {blob:new Blob([output.target.buffer],{type:'video/mp4'}),seconds:(performance.now()-started)/1000,width:data.w,height:data.h,frames};
    }catch(error){if(output)await output.cancel().catch(()=>{});throw error;}
    finally{iframe.contentWindow?.SplitVideoTimeline?.kill();iframe.remove();urls.forEach(url=>URL.revokeObjectURL(url));if(canvas){canvas.width=1;canvas.height=1;}}
  }
  return {supported,render};
})();
