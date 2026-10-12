'use strict';
globalThis.SplitVideoStudio = (() => {
  const dialog = document.createElement('dialog');
  dialog.id = 'videoStudio';
  dialog.setAttribute('aria-labelledby', 'videoTitle');
  dialog.innerHTML = `<header class="video-header"><div><h2 id="videoTitle">Vídeo Studio <span class="video-lab">EXPERIMENTO</span></h2><p>Os mesmos assets. Uma nova forma de contar sua campanha.</p></div><button id="closeVideoStudio" type="button" aria-label="Fechar Vídeo Studio">Fechar ×</button></header>
  <div class="video-body"><aside class="video-settings"><h3>Configure seu vídeo</h3>
  <label class="field">Composição de origem<select id="videoFormat"></select></label>
  <label class="field">Duração<select id="videoDuration"><option value="6">6 segundos</option><option value="10" selected>10 segundos</option><option value="15">15 segundos</option><option value="20">20 segundos</option></select></label>
  <label class="field">Movimento<select id="videoMotion"><option value="slide">Entrada em sequência</option><option value="zoom">Zoom suave</option><option value="fade">Aparecer suavemente</option></select></label>
  <p class="video-note">Cada camada visível da composição ganha uma entrada animada. Posições, proporções e recortes vêm da peça original.</p>
  <button id="refreshVideo" type="button">Atualizar da composição</button>
  <hr><h3>Seu vídeo pronto</h3><button id="renderVideo" type="button" class="primary" disabled>Gerar MP4</button>
  <progress id="videoRenderProgress" max="100" value="0" hidden aria-label="Progresso da renderização"></progress>
  <p id="videoRenderStatus" class="video-note" role="status" aria-live="polite">Conectando ao serviço de vídeo…</p>
  <a id="downloadRenderedVideo" class="video-download" hidden download>Baixar MP4</a>
  <details><summary class="video-note">Exportar projeto editável</summary><p class="video-note">Leve as camadas e a animação para continuar no Hyperframes. Vídeo sem áudio.</p>
  <button id="exportVideoProject" type="button" disabled>Baixar projeto · ZIP</button></details>
  <p id="videoStatus" class="video-note" role="status" aria-live="polite"></p></aside>
  <section class="video-preview" aria-label="Prévia do vídeo"><div id="videoScreen" class="video-screen"><div id="videoEmpty" class="video-empty"><h3>Transforme uma peça em vídeo</h3><p>Gere suas composições no Split para começar, ou abra o exemplo da plataforma.</p><button id="videoExample" type="button">Usar exemplo</button></div><iframe id="videoFrame" title="Prévia animada da campanha" hidden></iframe></div>
  <div class="video-transport"><button id="videoPlay" type="button" disabled>▶ Reproduzir</button><input id="videoSeek" type="range" min="0" max="300" value="0" step="1" disabled aria-label="Quadro do vídeo"><output id="videoTime">0:00 / 0:10</output></div>
  <div id="videoTimeline" class="video-timeline" aria-label="Camadas na linha do tempo">As camadas aparecerão aqui.</div></section></div>`;
  document.body.append(dialog);
  const el = id => document.getElementById(id);
  let snapshot = null, playing = false, raf = 0, frame = 0, buildId = 0, building = false;
  let serverReady = false, rendering = false;
  const FPS = 30;
  const status = message => { el('videoStatus').textContent = message; };
  const textFile = (name, text) => ({name, data: new TextEncoder().encode(text)});
  const png = canvas => new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error('Não foi possível preparar uma camada.')), 'image/png'));
  const escape = value => escapeText(value);
  function renderButton() { el('renderVideo').disabled = !serverReady || !snapshot || building || rendering; }
  async function connect() {
    try {
      const response = await fetch('api/video/health',{signal:AbortSignal.timeout(4000)});
      const data = response.ok ? await response.json() : null;
      serverReady = data?.engine === 'hyperframes';
    } catch { serverReady = false; }
    if (!rendering) el('videoRenderStatus').textContent = serverReady ? 'Renderização integrada com Hyperframes. Sem uso de modelos.' : 'Serviço de vídeo indisponível. Inicie o Split com npm start para gerar MP4 aqui.';
    renderButton();
  }
  function compositionHTML(data, preview = false) {
    return SplitVideoComposition.html(data, preview ? new URL('./', location.href).href : '');
  }
  function pause() { playing = false; cancelAnimationFrame(raf); el('videoPlay').textContent = '▶ Reproduzir'; }
  function seek(value) {
    if (!snapshot) return;
    frame = Math.min(snapshot.duration * FPS, Math.max(0, value));
    el('videoFrame').contentWindow.__timelines?.['split-video']?.seek(frame / FPS, true);
    el('videoSeek').value = frame;
    el('videoTime').textContent = `${(frame/FPS).toFixed(1)}s / ${snapshot.duration}s · 30 fps`;
  }
  function play() {
    if (!snapshot || building) return;
    if (playing) { pause(); return; }
    if (frame >= snapshot.duration * FPS) seek(0);
    playing = true; el('videoPlay').textContent = 'Ⅱ Pausar';
    const started = performance.now() - frame / FPS * 1000;
    const tick = now => {
      seek(Math.floor((now-started)/1000*FPS));
      if (frame >= snapshot.duration*FPS) pause();
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  function sizePreview() {
    if (!snapshot) return;
    const area = el('videoScreen'), iframe = el('videoFrame');
    const scale = Math.min((area.clientWidth-32)/snapshot.w, (area.clientHeight-32)/snapshot.h);
    iframe.style.width = `${snapshot.w}px`; iframe.style.height = `${snapshot.h}px`;
    iframe.style.transform = `scale(${scale})`;
    iframe.style.left = `${(area.clientWidth-snapshot.w*scale)/2}px`;
    iframe.style.top = `${(area.clientHeight-snapshot.h*scale)/2}px`;
  }
  function release(data) { data?.layers.forEach(layer => URL.revokeObjectURL(layer.url)); }
  function options() {
    const prior = el('videoFormat').value;
    el('videoFormat').replaceChildren(...outputs.map(out => new Option(`${out.name} · ${out.w} × ${out.h}`, out.id)));
    if (outputs.some(out => out.id === prior)) el('videoFormat').value = prior;
    else el('videoFormat').value = outputs.some(out => out.id === activeId) ? activeId : outputs[0]?.id || '';
    el('refreshVideo').disabled = !outputs.length;
  }
  function timeline(data) {
    el('videoTimeline').replaceChildren(...data.layers.slice(1).map(layer => {
      const row = document.createElement('div'); row.className = 'video-track';
      const name = document.createElement('span'); name.textContent = layer.name; name.title = layer.name;
      const bar = document.createElement('div'), fill = document.createElement('i');
      fill.style.marginLeft = `${layer.start/data.duration*100}%`;
      fill.style.width = `${(data.duration-layer.start)/data.duration*100}%`;
      bar.append(fill); row.append(name, bar); return row;
    }));
  }
  async function build() {
    const id = ++buildId;
    pause(); building = true;
    renderButton();
    el('videoPlay').disabled = el('videoSeek').disabled = el('exportVideoProject').disabled = true;
    const source = outputs.find(out => out.id === el('videoFormat').value);
    if (!source) {
      release(snapshot); snapshot = null; building = false;
      el('videoFrame').hidden = true; el('videoEmpty').hidden = false;
      renderButton();
      status('Gere uma composição para usar seus assets.'); return;
    }
    status('Preparando as camadas da campanha…');
    const out = clone(source), duration = Number(el('videoDuration').value);
    const data = {w:out.w, h:out.h, duration, motion:el('videoMotion').value, campaign:el('campaign').value, layers:[]};
    try {
      await ensureFonts(); await prepareBackground(out, true);
      if (id !== buildId) return;
      const add = async (canvas, name, start) => {
        const blob = await png(canvas);
        data.layers.push({name, start, blob, path:`assets/layer-${data.layers.length}.png`, url:URL.createObjectURL(blob)});
      };
      const canvas = document.createElement('canvas'); canvas.width=out.w; canvas.height=out.h;
      const ctx=canvas.getContext('2d'); ctx.fillStyle=out.bg; ctx.fillRect(0,0,out.w,out.h); paintBackground(ctx,out);
      await add(canvas, 'Fundo', 0);
      const visible = out.layers.filter(layer => !layer.hidden);
      for (let i=0;i<visible.length;i++) {
        ctx.clearRect(0,0,out.w,out.h); paintLayer(ctx,visible[i],out);
        await add(canvas, visible[i].name || `Camada ${i+1}`, .15+i*Math.min(.3, (duration*.45)/Math.max(1,visible.length)));
        if (id !== buildId) { release(data); return; }
      }
      const iframe=el('videoFrame');
      await new Promise((resolve,reject) => {
        const timer=setTimeout(()=>reject(Error('A prévia demorou para carregar. Tente atualizar.')),15000);
        iframe.onload=()=>{clearTimeout(timer);resolve();};
        iframe.srcdoc=compositionHTML(data,true);
      });
      await iframe.contentWindow.SplitVideoReady;
      if (!iframe.contentWindow.__timelines) throw Error('Não foi possível carregar a animação.');
      if (id !== buildId) { release(data); return; }
      release(snapshot); snapshot=data; building=false;
      el('videoEmpty').hidden=true; iframe.hidden=false;
      el('videoSeek').max=duration*FPS;
      el('videoPlay').disabled=el('videoSeek').disabled=el('exportVideoProject').disabled=false;
      renderButton();
      timeline(data); sizePreview(); seek(0);
      status(`${visible.length} camadas animadas · ${out.w} × ${out.h} px. Prévia pronta.`);
    } catch(error) {
      release(data);
      if(id===buildId){building=false;release(snapshot);snapshot=null;el('videoFrame').hidden=true;el('videoEmpty').hidden=false;status(error.message);renderButton();}
    }
  }
  async function checkedFile(path) {
    const response = await fetch(path);
    if (!response.ok) throw Error(`Não foi possível carregar ${path}.`);
    return new Uint8Array(await response.arrayBuffer());
  }
  async function exportProject() {
    if (!snapshot || building) return;
    const data=snapshot, button=el('exportVideoProject'); button.disabled=true;
    status('Empacotando projeto e assets…');
    try {
      const [gsap, animation] = await Promise.all([checkedFile('vendor/gsap.min.js'), checkedFile('video-animation.js')]);
      const files=[textFile('index.html',compositionHTML(data)),{name:'vendor/gsap.min.js',data:gsap},{name:'video-animation.js',data:animation},
        textFile('README.txt',`Split Vídeo Studio — experimento Hyperframes\n\nCampanha: ${data.campaign}\n${data.w} x ${data.h} · ${data.duration}s · 30 fps\n\nExtraia todos os arquivos. Instale Node.js 22+ e FFmpeg.\nNa pasta extraída:\n  npx hyperframes@0.8.150 preview\n  npx hyperframes@0.8.150 render --fps 30 --output video.mp4\n\nVídeo sem áudio. As camadas são PNGs transparentes na resolução da composição original.\nA prévia e a renderização usam a mesma timeline GSAP.\nGSAP 3.15.0: https://gsap.com/standard-license/\nHyperframes: https://github.com/heygen-com/hyperframes\n`),
        textFile('split-video.json',JSON.stringify({version:1,engine:'hyperframes',fps:FPS,width:data.w,height:data.h,duration:data.duration,motion:data.motion,campaign:data.campaign,layers:data.layers.map(({name,start,path})=>({name,start,path}))},null,2))];
      for(const layer of data.layers) files.push({name:layer.path,data:new Uint8Array(await layer.blob.arrayBuffer())});
      download(zipFiles(files),`${safeName()}-hyperframes.zip`);
      status('Projeto baixado. Extraia o ZIP para gerar o MP4 com Hyperframes.');
    } catch(error) {status(error.message);}
    finally {button.disabled=!snapshot||building;}
  }
  const base64 = blob => new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(Error('Não foi possível preparar um asset.'));reader.readAsDataURL(blob);});
  async function renderVideo() {
    if (!snapshot || !serverReady || rendering || building) return;
    const data=snapshot; rendering=true;renderButton();pause();
    const progress=el('videoRenderProgress'), message=el('videoRenderStatus');
    progress.hidden=false;progress.value=0;el('downloadRenderedVideo').hidden=true;
    message.textContent='Preparando assets para renderização…';
    try {
      const payload={w:data.w,h:data.h,duration:data.duration,motion:data.motion,layers:[]};
      for(const layer of data.layers)payload.layers.push({name:layer.name,start:layer.start,png:await base64(layer.blob)});
      const response=await fetch('api/video/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(30000)});
      let job=await response.json();if(!response.ok)throw Error(job.error||'Não foi possível iniciar o vídeo.');
      const started=Date.now();
      while(!['done','error'].includes(job.status)){
        if(Date.now()-started>7*60*1000)throw Error('O servidor demorou para responder. Tente novamente.');
        progress.value=job.progress;
        message.textContent=job.status==='queued'?'Vídeo na fila de renderização…':`Renderizando vídeo · ${Math.round(job.progress)}%`;
        await new Promise(resolve=>setTimeout(resolve,1000));
        const poll=await fetch(`api/video/jobs/${job.id}`,{signal:AbortSignal.timeout(15000)});
        job=await poll.json();if(!poll.ok)throw Error(job.error||'Não foi possível acompanhar o vídeo.');
      }
      if(job.status==='error')throw Error(job.error);
      progress.value=100;message.textContent=`Vídeo pronto · ${data.w} × ${data.h} px · ${data.duration}s. Baixe seu MP4.`;
      const link=el('downloadRenderedVideo');link.href=new URL(job.download,location.href).href;link.download=`${safeName()}-${data.w}x${data.h}.mp4`;link.hidden=false;
    } catch(error){message.textContent=error.message;progress.hidden=true;}
    finally {rendering=false;renderButton();}
  }
  el('openVideoStudio').onclick=()=>{options();dialog.showModal();build();connect();};
  el('closeVideoStudio').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{pause();++buildId;building=false;release(snapshot);snapshot=null;el('videoFrame').srcdoc='';});
  dialog.addEventListener('keydown',event=>event.stopPropagation());
  el('videoPlay').onclick=play;
  el('videoSeek').oninput=event=>{pause();seek(Number(event.target.value));};
  for(const name of ['videoFormat','videoDuration','videoMotion'])el(name).onchange=build;
  el('refreshVideo').onclick=()=>{options();build();};
  el('videoExample').onclick=()=>{demo();options();build();};
  el('exportVideoProject').onclick=exportProject;
  el('renderVideo').onclick=renderVideo;
  new ResizeObserver(sizePreview).observe(el('videoScreen'));
  return {compositionHTML};
})();
