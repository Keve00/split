'use strict';
globalThis.SplitVideoStudio = (() => {
  const dialog = document.createElement('dialog');
  dialog.id = 'videoStudio';
  dialog.setAttribute('aria-labelledby', 'videoTitle');
  dialog.innerHTML = `<header class="video-header"><div><h2 id="videoTitle">Vídeos</h2><p>Os mesmos assets. Uma nova forma de contar sua campanha.</p></div><button id="closeVideoStudio" type="button" aria-label="Fechar vídeos" title="Fechar">×</button></header>
  <div class="video-body"><aside class="video-settings"><label class="video-render-all"><input id="videoRenderAll" type="checkbox"> Renderizar todos os formatos</label><p id="videoRenderAllHint" class="video-note">Gera um MP4 por composição e reúne todos em um ZIP.</p><h3>Configure seu vídeo</h3>
  <label class="field">Composição de origem<select id="videoFormat"></select></label>
  <label class="field">Duração<select id="videoDuration"><option value="6">6 segundos</option><option value="10" selected>10 segundos</option><option value="15">15 segundos</option><option value="20">20 segundos</option></select></label>
  <label class="field">Estilo para todas as camadas<select id="videoMotion"><option value="slide">Deslizar</option><option value="zoom">Zoom suave</option><option value="fade">Aparecer suavemente</option></select></label>
  <p class="video-note">Selecione uma camada na linha do tempo para personalizar sua animação.</p>
  <label class="field">Intervalo entre entradas (s)<input id="videoStagger" type="number" value="0.3" min="0" max="2" step="0.1"></label>
  <div class="video-actions video-icon-actions" role="group" aria-label="Organizar animações"><button id="videoSequence" type="button" disabled>Em sequência</button><button id="videoTogether" type="button" disabled>Juntas</button><button id="refreshVideo" type="button">Atualizar da composição</button></div>
  <hr><h3>Seu vídeo pronto</h3><button id="renderVideo" type="button" class="primary" disabled>Gerar MP4</button>
  <progress id="videoRenderProgress" max="100" value="0" hidden aria-label="Progresso da renderização"></progress>
  <button id="cancelVideoRender" type="button" hidden>Cancelar renderização</button>
  <p id="videoRenderStatus" class="video-note" role="status" aria-live="polite">Conectando ao serviço de vídeo…</p>
  <a id="downloadRenderedVideo" class="video-download" hidden download>Baixar MP4</a>
  <details><summary class="video-note">Exportar projeto editável</summary><p class="video-note">Leve as camadas e a animação para continuar no Hyperframes. Vídeo sem áudio.</p>
  <button id="exportVideoProject" type="button" disabled>Baixar projeto · ZIP</button></details>
  <p id="videoStatus" class="video-note" role="status" aria-live="polite"></p></aside>
  <section class="video-preview" aria-label="Prévia do vídeo"><div id="videoScreen" class="video-screen"><div id="videoEmpty" class="video-empty"><h3>Transforme uma peça em vídeo</h3><p>Gere suas composições no Split para começar, ou abra o exemplo da plataforma.</p><button id="videoExample" type="button">Usar exemplo</button></div><iframe id="videoFrame" title="Prévia animada da campanha" hidden></iframe><div id="videoSelectionOverlay" class="video-selection-overlay" hidden tabindex="0" role="group" aria-label="Selecionar uma camada no canvas. Use o mouse ou as setas do teclado."><svg id="videoSelectionSvg" aria-hidden="true"><polygon id="videoSelectionOutline" fill="none" vector-effect="non-scaling-stroke"/></svg><span id="videoSelectionLabel" class="video-selection-label" hidden></span></div></div>
  <div class="video-transport"><button id="videoPlay" type="button" disabled>▶ Reproduzir</button><input id="videoSeek" type="range" min="0" max="300" value="0" step="1" disabled aria-label="Quadro do vídeo"><output id="videoTime">0:00 / 0:10</output><label class="video-loop"><input id="videoLoop" type="checkbox" checked> Repetir</label></div>
  <div class="video-timeline-heading"><h3>Linha do tempo</h3><span>Selecione no canvas ou nas faixas · clique na régua para avançar</span></div>
  <div id="videoTimeline" class="video-timeline" aria-label="Camadas na linha do tempo">As camadas aparecerão aqui.</div></section>
  <aside class="video-inspector"><div class="video-inspector-heading"><span class="video-eyebrow">ANIMAÇÃO POR CAMADA</span><h3 id="videoLayerName">Selecione uma camada</h3></div>
  <fieldset id="videoLayerControls" disabled>
    <div class="video-field-pair"><label class="field">Início (s)<input id="videoLayerStart" type="number" min="0" step="0.1"></label><label class="field">Fim (s)<input id="videoLayerEnd" type="number" min="0.1" step="0.1"></label></div>
    <h4>Entrada</h4><label class="field">Efeito<select id="videoLayerEnter"><option value="slide">Deslizar</option><option value="fade">Aparecer</option><option value="zoom">Zoom</option><option value="pop">Pop</option><option value="rotate">Girar + zoom</option><option value="none">Sem animação</option></select></label>
    <label class="field">Duração da entrada (s)<input id="videoLayerEntryDuration" type="number" min="0.05" step="0.05"></label>
    <label class="field">Suavização<select id="videoLayerEase"><option value="power3.out">Suave · desacelera</option><option value="power1.out">Leve</option><option value="none">Linear</option><option value="back.out(1.7)">Elástica</option><option value="bounce.out">Quicar</option></select></label>
    <h4>Saída</h4><label class="field">Efeito<select id="videoLayerExit"><option value="none">Sem animação</option><option value="fade">Desaparecer</option><option value="slide">Deslizar</option><option value="zoom">Zoom</option></select></label>
    <label class="field">Duração da saída (s)<input id="videoLayerExitDuration" type="number" min="0.05" step="0.05"></label>
    <h4>Movimento e aparência</h4>
    <label class="field">Direção do movimento<select id="videoLayerDirection"><option value="up">↑ Para cima</option><option value="down">↓ Para baixo</option><option value="left">← Para a esquerda</option><option value="right">→ Para a direita</option></select></label>
    <label class="field">Deslocamento · % da peça<input id="videoLayerDistance" type="number" min="0" max="100" step="1"></label>
    <label class="field">Escala na entrada (%)<input id="videoLayerScale" type="number" min="10" max="200" step="5"></label>
    <label class="field">Escala na saída (%)<input id="videoLayerExitScale" type="number" min="10" max="200" step="5"></label>
    <label class="field">Rotação na entrada (°)<input id="videoLayerRotation" type="number" min="-180" max="180" step="5"></label>
    <p id="videoTransformHint" class="video-note">Durante a entrada, a camada chega a 100% e 0°. Os ajustes aparecem no trecho animado.</p>
    <label class="field">Opacidade (%)<input id="videoLayerOpacity" type="number" min="10" max="100" step="5"></label>
    <button id="videoPreviewLayer" type="button">▶ Testar esta camada</button>
    <button id="videoApplyAll" type="button">Aplicar estilo a todas</button>
    <p class="video-note">Aplica efeitos e intensidade; mantém os horários de cada camada.</p>
  </fieldset><p class="video-note">Seus ajustes ficam nesta sessão ao fechar a janela ou trocar de formato. Use o ZIP para guardar a animação.</p></aside></div>`;
  document.body.append(dialog);
  const el = id => document.getElementById(id);
  let snapshot = null,
    playing = false,
    raf = 0,
    frame = 0,
    buildId = 0,
    building = false;
  let serverReady = false,
    rendering = false,
    posterFrame = -1;
  let batchDownloadUrl = null;
  let renderController = null;
  let selectedLayer = 1;
  let revision = 0;
  const drafts = new Map();
  const iconGroups = new Map();
  let pendingIconFocus = null;
  const FPS = 30;
  const status = message => {
    el('videoStatus').textContent = message;
  };
  const textFile = (name, text) => ({ name, data: new TextEncoder().encode(text) });
  const png = canvas =>
    new Promise((resolve, reject) =>
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(Error('Não foi possível preparar uma camada.'))),
        'image/png'
      )
    );
  const escape = value => escapeText(value);
  function syncIconChoices() {
    for (const [id, group] of iconGroups) {
      const select = el(id);
      for (const button of group.children) {
        button.disabled = select.matches(':disabled');
        button.setAttribute('aria-checked', String(button.dataset.value === select.value));
        button.tabIndex = button.dataset.value === select.value ? 0 : -1;
      }
    }
    if (pendingIconFocus && !pendingIconFocus.disabled) {
      const button = pendingIconFocus;
      pendingIconFocus = null;
      if (dialog.open && [document.body, dialog, button].includes(document.activeElement))
        button.focus({ preventScroll: true });
    }
  }
  function setupIconControls() {
    const paths = {
      sequence:
        '<rect x="2" y="3" width="10" height="4" rx="1"/><rect x="7" y="10" width="10" height="4" rx="1"/><rect x="12" y="17" width="10" height="4" rx="1"/>',
      together:
        '<rect x="4" y="3" width="16" height="4" rx="1"/><rect x="4" y="10" width="16" height="4" rx="1"/><rect x="4" y="17" width="16" height="4" rx="1"/>',
      refresh: '<path d="M20 4v6h-6M20 10a8 8 0 1 0-1 8"/>',
      slide:
        '<rect x="3" y="6" width="7" height="12" rx="2" stroke-dasharray="2 3"/><path d="M9 12h12m-4-4 4 4-4 4"/>',
      fade: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor" stroke="none"/>',
      zoom: '<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5"/>',
      pop: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM19 3v3m-1.5-1.5h3"/>',
      rotate:
        '<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/><rect x="8" y="8" width="8" height="8" rx="1" transform="rotate(25 12 12)"/>',
      none: '<circle cx="12" cy="12" r="8"/><path d="m6.5 6.5 11 11"/>',
      smooth: '<path d="M3 20h18M4 17C6 5 10 4 20 4"/>',
      light: '<path d="M3 20h18M4 17C9 13 11 6 20 4"/>',
      linear: '<path d="M3 20h18M4 17 20 4"/>',
      elastic: '<path d="M3 20h18M4 17C9 17 10 1 15 4s2 5 5 3"/>',
      bounce: '<path d="M3 20h18M4 5c1 0 3 12 5 12s2-7 4-7 2 7 4 7 2-3 3-3"/>',
      spin: '<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/><path d="m12 8 3 4-3 4-3-4Z"/>',
      swing:
        '<path d="M4 5h16M12 5v5m-7 5a8 8 0 0 0 14 0"/><rect x="9" y="10" width="6" height="6" rx="1" transform="rotate(25 12 13)"/>',
      stretch:
        '<rect x="8" y="6" width="8" height="12" rx="2"/><path d="M3 12h4m-2-2-2 2 2 2m16-2h-4m2-2 2 2-2 2"/>',
      expand: '<path d="M12 4v16M3 6v12m18-12v12M9 12H3m3-3-3 3 3 3m9-3h6m-3-3 3 3-3 3"/>',
      up: '<path d="M12 20V4m-6 6 6-6 6 6"/>',
      down: '<path d="M12 4v16m-6-6 6 6 6-6"/>',
      left: '<path d="M20 12H4m6-6-6 6 6 6"/>',
      right: '<path d="M4 12h16m-6-6 6 6-6 6"/>'
    };
    const svg = name =>
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
    for (const [id, icon, label, tip] of [
      ['videoSequence', 'sequence', 'Em sequência', 'Distribuir as entradas usando o intervalo definido.'],
      ['videoTogether', 'together', 'Juntas', 'Iniciar todas as camadas ao mesmo tempo.'],
      [
        'refreshVideo',
        'refresh',
        'Atualizar da composição',
        'Atualizar imagens e textos preservando os ajustes da animação.'
      ]
    ]) {
      const button = el(id);
      button.innerHTML = svg(icon);
      button.setAttribute('aria-label', label);
      button.dataset.videoTip = `${label} — ${tip}`;
    }
    const labels = {
      slide: 'Deslizar',
      fade: 'Aparecer',
      zoom: 'Zoom',
      pop: 'Pop',
      rotate: 'Girar',
      bounce: 'Quicar',
      spin: 'Giro 360°',
      swing: 'Balançar',
      stretch: 'Esticar',
      expand: 'Expandir',
      none: 'Nenhum',
      up: 'Cima',
      down: 'Baixo',
      left: 'Esquerda',
      right: 'Direita',
      'power3.out': 'Suave',
      'power1.out': 'Leve',
      'back.out(1.7)': 'Elástica',
      'bounce.out': 'Quicar'
    };
    const tips = {
      slide: 'Mover a camada na direção escolhida.',
      fade: 'Alterar a transparência suavemente.',
      zoom: 'Animar o tamanho da camada.',
      pop: 'Entrar com um pequeno impulso elástico.',
      rotate: 'Girar e variar o tamanho na entrada.',
      none: 'Sem transição animada.',
      up: 'Mover para cima.',
      down: 'Mover para baixo.',
      left: 'Mover para a esquerda.',
      right: 'Mover para a direita.',
      'power3.out': 'Começar rápido e desacelerar suavemente.',
      'power1.out': 'Desacelerar de forma leve.',
      'back.out(1.7)': 'Ultrapassar um pouco o destino e retornar.',
      'bounce.out': 'Chegar ao destino com pequenos saltos.'
    };
    const easeIcons = {
      'power3.out': 'smooth',
      'power1.out': 'light',
      none: 'linear',
      'back.out(1.7)': 'elastic',
      'bounce.out': 'bounce'
    };
    Object.assign(tips, {
      bounce: 'Chegar com pequenos saltos na direção escolhida.',
      spin: 'Dar uma volta completa com escala e transparência.',
      swing: 'Balançar de um lado para o outro antes de estabilizar.',
      stretch: 'Esticar a camada com uma recuperação elástica.',
      expand: 'Abrir ou fechar a camada horizontalmente.'
    });
    for (const [id, values] of [
      ['videoLayerEnter', ['bounce', 'spin', 'swing', 'stretch', 'expand']],
      ['videoLayerExit', ['spin', 'swing', 'stretch', 'expand']],
      ['videoMotion', ['bounce', 'spin', 'swing', 'stretch', 'expand']]
    ]) {
      for (const value of values) el(id).add(new Option(labels[value], value));
    }
    for (const [id, name] of [
      ['videoMotion', 'Estilo para todas as camadas'],
      ['videoLayerEnter', 'Efeito de entrada'],
      ['videoLayerExit', 'Efeito de saída'],
      ['videoLayerEase', 'Suavização'],
      ['videoLayerDirection', 'Direção do movimento']
    ]) {
      const select = el(id),
        old = select.parentElement,
        field = document.createElement('div'),
        heading = document.createElement('span'),
        group = document.createElement('div');
      field.className = 'field video-choice-field';
      heading.textContent = name;
      heading.id = id + '-label';
      group.id = id + '-choices';
      group.className = 'video-icon-choices';
      group.setAttribute('role', 'radiogroup');
      group.setAttribute('aria-labelledby', heading.id);
      for (const option of select.options) {
        const value = option.value,
          button = document.createElement('button'),
          isEase = id === 'videoLayerEase',
          label =
            isEase && value === 'none'
              ? 'Linear'
              : id === 'videoLayerExit' && value === 'fade'
                ? 'Sumir'
                : labels[value];
        button.type = 'button';
        button.dataset.value = value;
        button.setAttribute('role', 'radio');
        button.setAttribute('aria-label', option.textContent.replace(/^[↑↓←→] /, ''));
        button.dataset.videoTip = `${label} — ${isEase && value === 'none' ? 'Manter a velocidade constante.' : tips[value]}`;
        button.innerHTML = svg(isEase ? easeIcons[value] : value) + `<span>${label}</span>`;
        button.onclick = () => {
          if (document.activeElement === button) pendingIconFocus = button;
          select.value = value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          syncIconChoices();
        };
        group.append(button);
      }
      group.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const buttons = [...group.children],
          index = buttons.indexOf(event.target),
          next =
            event.key === 'Home'
              ? 0
              : event.key === 'End'
                ? buttons.length - 1
                : (index + (['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1) + buttons.length) %
                  buttons.length;
        buttons[next].focus();
        buttons[next].click();
      });
      select.hidden = true;
      select.tabIndex = -1;
      select.setAttribute('aria-hidden', 'true');
      old.replaceWith(field);
      field.append(heading, group, select);
      iconGroups.set(id, group);
    }
    const tooltip = document.createElement('div');
    tooltip.id = 'videoControlTooltip';
    tooltip.className = 'video-control-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.hidden = true;
    dialog.append(tooltip);
    let tipTarget = null;
    const hide = () => {
      tipTarget?.removeAttribute('aria-describedby');
      tipTarget = null;
      tooltip.hidden = true;
    };
    const show = target => {
      hide();
      if (!target || target.matches(':disabled')) return;
      tipTarget = target;
      tooltip.textContent = target.dataset.videoTip;
      target.setAttribute('aria-describedby', tooltip.id);
      tooltip.hidden = false;
      const box = target.getBoundingClientRect(),
        tip = tooltip.getBoundingClientRect();
      tooltip.style.left = `${Math.max(10, Math.min(innerWidth - tip.width - 10, box.left + box.width / 2 - tip.width / 2))}px`;
      tooltip.style.top = `${box.bottom + tip.height + 10 < innerHeight ? box.bottom + 8 : Math.max(8, box.top - tip.height - 8)}px`;
    };
    dialog.addEventListener('pointerover', event => {
      const target = event.target.closest('[data-video-tip]');
      if (target !== tipTarget) show(target);
    });
    dialog.addEventListener('pointerout', event => {
      if (tipTarget && !tipTarget.contains(event.relatedTarget)) hide();
    });
    dialog.addEventListener('focusin', event => show(event.target.closest('[data-video-tip]')));
    dialog.addEventListener('focusout', hide);
    dialog.addEventListener('scroll', hide, true);
    dialog.addEventListener('close', hide);
    window.addEventListener('resize', hide);
    syncIconChoices();
  }
  function renderButton() {
    el('renderVideo').disabled = !serverReady || !snapshot || building || rendering;
    el('videoRenderAll').disabled = rendering;
    el('renderVideo').textContent = el('videoRenderAll').checked
      ? `Gerar todos · ${outputs.length} formatos`
      : 'Gerar MP4';
    for (const id of ['videoDuration', 'videoMotion', 'videoFormat', 'refreshVideo'])
      el(id).disabled = building || rendering;
    el('cancelVideoRender').hidden = !rendering;
    inspector();
    syncIconChoices();
  }
  async function connect() {
    serverReady = !!globalThis.SplitBrowserVideo?.supported();
    if (!rendering)
      el('videoRenderStatus').textContent = serverReady
        ? 'O vídeo é gerado neste dispositivo, sem enviar suas imagens para um servidor.'
        : 'Este navegador não oferece geração de MP4. Use Chrome ou Edge atualizado. A prévia e o projeto editável continuam disponíveis.';
    renderButton();
  }
  function compositionHTML(data, preview = false) {
    return SplitVideoComposition.html(data, preview ? new URL('./', location.href).href : '');
  }
  function pause() {
    playing = false;
    cancelAnimationFrame(raf);
    el('videoPlay').textContent = '▶ Reproduzir';
  }
  function seek(value) {
    if (!snapshot) return;
    frame = Math.min(snapshot.duration * FPS, Math.max(0, value));
    el('videoFrame').contentWindow.__timelines?.['split-video']?.seek(frame / FPS, true);
    el('videoSeek').value = frame;
    el('videoTime').textContent = `${(frame / FPS).toFixed(1)}s / ${snapshot.duration}s · 30 fps`;
    el('videoTimeline').style.setProperty('--playhead', `${(frame / FPS / snapshot.duration) * 100}%`);
    updateSelection();
  }
  function play() {
    if (!snapshot || building) return;
    if (playing) {
      pause();
      return;
    }
    // A fresh preview rests on its settled frame; the first play still starts from 0s.
    if (frame === posterFrame || frame >= snapshot.duration * FPS) seek(0);
    posterFrame = -1;
    playing = true;
    el('videoPlay').textContent = 'Ⅱ Pausar';
    let started = performance.now() - (frame / FPS) * 1000;
    const tick = now => {
      seek(Math.floor(((now - started) / 1000) * FPS));
      if (frame >= snapshot.duration * FPS) {
        if (el('videoLoop').checked) {
          seek(0);
          started = now;
        } else {
          pause();
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  function sizePreview() {
    if (!snapshot) return;
    const area = el('videoScreen'),
      iframe = el('videoFrame');
    const scale = Math.min((area.clientWidth - 32) / snapshot.w, (area.clientHeight - 32) / snapshot.h);
    iframe.style.width = `${snapshot.w}px`;
    iframe.style.height = `${snapshot.h}px`;
    iframe.style.transform = `scale(${scale})`;
    iframe.style.left = `${(area.clientWidth - snapshot.w * scale) / 2}px`;
    iframe.style.top = `${(area.clientHeight - snapshot.h * scale) / 2}px`;
    const overlay = el('videoSelectionOverlay');
    overlay.style.width = `${snapshot.w * scale}px`;
    overlay.style.height = `${snapshot.h * scale}px`;
    overlay.style.left = iframe.style.left;
    overlay.style.top = iframe.style.top;
    el('videoSelectionSvg').setAttribute('viewBox', `0 0 ${snapshot.w} ${snapshot.h}`);
    updateSelection();
  }
  function previewTransform(index) {
    const image = el('videoFrame').contentDocument?.getElementById(`layer-${index}`);
    if (!image) return null;
    const style = el('videoFrame').contentWindow.getComputedStyle(image),
      origin = style.transformOrigin.split(' ').map(parseFloat);
    const raw = new DOMMatrix(style.transform === 'none' ? undefined : style.transform);
    return {
      matrix: new DOMMatrix().translate(origin[0], origin[1]).multiply(raw).translate(-origin[0], -origin[1]),
      opacity: Number(style.opacity)
    };
  }
  function updateSelection() {
    const overlay = el('videoSelectionOverlay'),
      layer = snapshot?.layers[selectedLayer];
    overlay.hidden = !snapshot || building || el('videoFrame').hidden;
    const transform = layer?.corners ? previewTransform(selectedLayer) : null;
    const polygon = el('videoSelectionOutline'),
      label = el('videoSelectionLabel');
    polygon.hidden = !transform;
    polygon.style.display = transform ? '' : 'none';
    label.hidden = !transform;
    if (!transform) {
      delete overlay.dataset.selectedLayer;
      return;
    }
    const points = layer.corners.map(point => transform.matrix.transformPoint(point));
    polygon.setAttribute('points', points.map(p => `${p.x},${p.y}`).join(' '));
    polygon.setAttribute('stroke-dasharray', transform.opacity < 0.03 ? '5 4' : '');
    overlay.dataset.selectedLayer = layer.key;
    label.textContent = layer.name + (transform.opacity < 0.03 ? ' · fora do trecho visível' : '');
    const scale = overlay.clientWidth / snapshot.w;
    label.style.left = `${Math.max(0, Math.min(overlay.clientWidth - 150, Math.min(...points.map(p => p.x)) * scale))}px`;
    label.style.top = `${Math.max(0, Math.min(overlay.clientHeight - 24, Math.min(...points.map(p => p.y)) * scale - 24))}px`;
  }
  function selectVideoLayer(index) {
    if (!snapshot || building) return;
    selectedLayer = index;
    timeline(snapshot);
    inspector();
    updateSelection();
    dialog.querySelector('.video-inspector').scrollTop = 0;
  }
  function pickVideoLayer(event) {
    if (!snapshot || building) return;
    if (event.target === el('videoSelectionLabel')) return;
    pause();
    const box = el('videoSelectionOverlay').getBoundingClientRect(),
      point = {
        x: ((event.clientX - box.left) / box.width) * snapshot.w,
        y: ((event.clientY - box.top) / box.height) * snapshot.h
      };
    // PNG alpha and inverse animation transforms let clicks pass through transparent pixels.
    for (let i = snapshot.layers.length - 1; i > 0; i--) {
      const layer = snapshot.layers[i],
        transform = previewTransform(i);
      if (!transform || transform.opacity < 0.03 || !layer.hitMask) continue;
      const local = transform.matrix.inverse().transformPoint(point),
        mask = layer.hitMask;
      if (
        !Number.isFinite(local.x) ||
        !Number.isFinite(local.y) ||
        local.x < 0 ||
        local.y < 0 ||
        local.x >= snapshot.w ||
        local.y >= snapshot.h
      )
        continue;
      const x = Math.floor((local.x / snapshot.w) * mask.w),
        y = Math.floor((local.y / snapshot.h) * mask.h);
      if (mask.alpha[y * mask.w + x] > 12) {
        selectVideoLayer(i);
        return;
      }
    }
    selectVideoLayer(null);
  }
  function release(data) {
    data?.layers.forEach(layer => URL.revokeObjectURL(layer.url));
  }
  function options() {
    const prior = el('videoFormat').value;
    el('videoFormat').replaceChildren(
      ...outputs.map(out => new Option(`${out.name} · ${out.w} × ${out.h}`, out.id))
    );
    if (outputs.some(out => out.id === prior)) el('videoFormat').value = prior;
    else el('videoFormat').value = outputs.some(out => out.id === activeId) ? activeId : outputs[0]?.id || '';
    el('refreshVideo').disabled = !outputs.length;
  }
  const normalize = layer => SplitVideoComposition.animation(layer, snapshot.duration, snapshot.motion);
  function remember() {
    if (!snapshot) return;
    drafts.set(snapshot.sourceId, {
      duration: snapshot.duration,
      motion: snapshot.motion,
      layers: snapshot.layers.map(({ key, start, animation }) => ({
        key,
        start,
        animation: { ...animation }
      }))
    });
  }
  function invalidateDownload() {
    revision++;
    el('downloadRenderedVideo').hidden = true;
    if (!rendering && serverReady)
      el('videoRenderStatus').textContent = 'Ajustes atualizados. Gere o MP4 para baixar esta versão.';
  }
  const fields = {
    videoLayerEnter: 'enter',
    videoLayerExit: 'exit',
    videoLayerDirection: 'direction',
    videoLayerEase: 'ease',
    videoLayerEnd: 'end',
    videoLayerEntryDuration: 'entryDuration',
    videoLayerExitDuration: 'exitDuration',
    videoLayerDistance: 'distance',
    videoLayerScale: 'scale',
    videoLayerExitScale: 'exitScale',
    videoLayerRotation: 'rotation',
    videoLayerOpacity: 'opacity'
  };
  function inspector() {
    const layer = snapshot?.layers[selectedLayer];
    el('videoLayerControls').disabled = !layer || building || rendering;
    el('videoSequence').disabled = el('videoTogether').disabled = !snapshot || building || rendering;
    el('videoLayerName').textContent = layer?.name || 'Selecione uma camada';
    if (!layer) {
      syncIconChoices();
      return;
    }
    const a = layer.animation;
    el('videoLayerStart').value = +layer.start.toFixed(2);
    el('videoLayerStart').max = +(snapshot.duration - 0.1).toFixed(2);
    for (const [id, key] of Object.entries(fields))
      if (document.activeElement !== el(id))
        el(id).value =
          typeof a[key] === 'number'
            ? +(a[key] * (['scale', 'exitScale', 'opacity'].includes(key) ? 100 : 1)).toFixed(2)
            : a[key];
    el('videoLayerEnd').min = +(layer.start + 0.1).toFixed(2);
    el('videoLayerEnd').max = snapshot.duration;
    el('videoLayerEntryDuration').max = el('videoLayerExitDuration').max = snapshot.duration;
    el('videoLayerEntryDuration').disabled = a.enter === 'none';
    el('videoLayerEase').disabled = ['none', 'pop', 'bounce', 'swing', 'stretch'].includes(a.enter);
    el('videoLayerExitDuration').disabled = a.exit === 'none';
    el('videoLayerDirection').disabled = el('videoLayerDistance').disabled =
      !['slide', 'bounce'].includes(a.enter) && a.exit !== 'slide';
    el('videoLayerScale').disabled = el('videoLayerRotation').disabled = a.enter === 'none';
    el('videoLayerExitScale').disabled = false;
    el('videoTransformHint').textContent =
      (a.enter === 'none'
        ? 'Escolha um efeito de entrada para ajustar escala e rotação. '
        : 'A entrada leva a camada até 100% e 0°. ') +
      (a.exit === 'none'
        ? 'Editar a escala de saída ativa o efeito Zoom.'
        : 'A escala de saída é independente da entrada.');
    syncIconChoices();
  }
  function timeline(data) {
    const holder = el('videoTimeline');
    holder.replaceChildren();
    const ruler = document.createElement('div');
    ruler.className = 'video-track video-ruler';
    const label = document.createElement('span');
    label.textContent = 'Tempo';
    const scale = document.createElement('button');
    scale.type = 'button';
    scale.className = 'video-ruler-scale';
    scale.setAttribute('aria-label', 'Posicionar na linha do tempo');
    for (let i = 0; i <= 4; i++) {
      const tick = document.createElement('span');
      tick.textContent = `${+((data.duration * i) / 4).toFixed(1)}s`;
      scale.append(tick);
    }
    scale.onclick = event => {
      const rect = scale.getBoundingClientRect();
      pause();
      seek(((event.clientX - rect.left) / rect.width) * data.duration * FPS);
    };
    ruler.append(label, scale);
    holder.append(ruler);
    data.layers.slice(1).forEach((layer, index) => {
      const i = index + 1,
        a = layer.animation,
        row = document.createElement('div');
      row.className = 'video-track' + (i === selectedLayer ? ' is-selected' : '');
      const name = document.createElement('button');
      name.type = 'button';
      name.className = 'video-track-name';
      name.textContent = layer.name;
      name.title = layer.name;
      name.setAttribute('aria-pressed', String(i === selectedLayer));
      const select = () => selectVideoLayer(i);
      name.onclick = select;
      const track = document.createElement('div');
      track.className = 'video-track-lane';
      const bar = document.createElement('button');
      bar.type = 'button';
      bar.className = 'video-track-bar';
      bar.setAttribute(
        'aria-label',
        `${layer.name}: ${layer.start.toFixed(1)} a ${a.end.toFixed(1)} segundos`
      );
      bar.onclick = select;
      bar.style.left = `${(layer.start / data.duration) * 100}%`;
      bar.style.width = `${((a.end - layer.start) / data.duration) * 100}%`;
      const entry = document.createElement('i');
      entry.className = 'video-track-entry';
      entry.style.width = a.enter === 'none' ? '0' : `${(a.entryDuration / (a.end - layer.start)) * 100}%`;
      const exit = document.createElement('i');
      exit.className = 'video-track-exit';
      exit.style.width = a.exit === 'none' ? '0' : `${(a.exitDuration / (a.end - layer.start)) * 100}%`;
      bar.append(entry, exit);
      track.append(bar);
      row.append(name, track);
      holder.append(row);
    });
  }
  // First frame where every layer has finished entering, so a new preview never opens on an empty canvas.
  function restingFrame(data) {
    const settled = Math.max(
      0,
      ...data.layers.map(layer => (layer.start || 0) + (layer.animation?.entryDuration || 0))
    );
    return Math.min(data.duration * FPS, Math.ceil(settled * FPS));
  }
  async function loadPreview(data, id, at = 0) {
    const iframe = el('videoFrame');
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(Error('A prévia demorou para carregar. Tente atualizar.')),
        15000
      );
      iframe.onload = () => {
        clearTimeout(timer);
        resolve();
      };
      iframe.srcdoc = compositionHTML(data, true);
    });
    await iframe.contentWindow.SplitVideoReady;
    if (id !== buildId) return false;
    if (!iframe.contentWindow.__timelines) throw Error('Não foi possível carregar a animação.');
    building = false;
    el('videoEmpty').hidden = true;
    iframe.hidden = false;
    el('videoSeek').max = data.duration * FPS;
    el('videoPlay').disabled = el('videoSeek').disabled = el('exportVideoProject').disabled = false;
    timeline(data);
    sizePreview();
    seek(at);
    inspector();
    renderButton();
    return true;
  }
  async function updateAnimation(at = frame) {
    if (!snapshot || building) return;
    pause();
    remember();
    invalidateDownload();
    // Update the existing preview timeline so typing never disables or blurs an input.
    const preview = el('videoFrame').contentWindow;
    if (preview.SplitVideoRebuild) {
      try {
        const root = preview.document.getElementById('split-video');
        root.dataset.duration = snapshot.duration;
        root.dataset.motion = snapshot.motion;
        snapshot.layers.forEach((layer, i) => {
          const image = preview.document.getElementById(`layer-${i}`),
            a = layer.animation;
          image.dataset.start = layer.start;
          image.dataset.duration = (i ? a.end : snapshot.duration) - layer.start;
          image.dataset.animation = JSON.stringify(a);
          image.style.transformOrigin = `${a.originX}% ${a.originY}%`;
        });
        preview.SplitVideoRebuild();
        el('videoSeek').max = snapshot.duration * FPS;
        timeline(snapshot);
        seek(at);
        inspector();
        renderButton();
        status('Animação atualizada. Use Reproduzir ou Testar esta camada.');
      } catch (error) {
        status(error.message);
      }
      return;
    }
    building = true;
    const id = ++buildId;
    el('videoPlay').disabled = el('videoSeek').disabled = el('exportVideoProject').disabled = true;
    inspector();
    renderButton();
    try {
      if (await loadPreview(snapshot, id, at))
        status('Animação atualizada. Use Reproduzir ou Testar esta camada.');
    } catch (error) {
      if (id === buildId) {
        building = false;
        status(error.message);
        inspector();
        renderButton();
      }
    }
  }
  function editLayer(id) {
    const layer = snapshot?.layers[selectedLayer];
    if (!layer || building) return;
    if (id === 'videoLayerStart')
      layer.start = Math.max(0, Math.min(snapshot.duration - 0.1, Number(el(id).value) || 0));
    else {
      const key = fields[id];
      layer.animation[key] = ['enter', 'exit', 'direction', 'ease'].includes(key)
        ? el(id).value
        : Number(el(id).value) / (['scale', 'exitScale', 'opacity'].includes(key) ? 100 : 1);
      if (key === 'enter')
        Object.assign(layer.animation, {
          scale: ['zoom', 'pop', 'rotate', 'spin'].includes(layer.animation.enter) ? 0.85 : 1,
          rotation: layer.animation.enter === 'swing' ? 25 : layer.animation.enter === 'rotate' ? 15 : 0
        });
      if (key === 'exit') layer.animation.exitScale = layer.animation.exit === 'zoom' ? 0.85 : 1;
      if (key === 'exit' && layer.animation.exit === 'swing' && layer.animation.rotation === 0)
        layer.animation.rotation = 25;
      if (key === 'exitScale' && layer.animation.exit === 'none') layer.animation.exit = 'zoom';
    }
    layer.animation = normalize(layer);
    const a = layer.animation,
      at = ['videoLayerExitScale', 'videoLayerExit'].includes(id)
        ? (a.end - a.exitDuration * 0.5) * FPS
        : ['videoLayerScale', 'videoLayerRotation', 'videoLayerEnter'].includes(id)
          ? (layer.start + a.entryDuration * 0.35) * FPS
          : frame;
    updateAnimation(at);
  }
  async function build() {
    remember();
    invalidateDownload();
    const id = ++buildId;
    pause();
    building = true;
    renderButton();
    inspector();
    el('videoPlay').disabled = el('videoSeek').disabled = el('exportVideoProject').disabled = true;
    const source = outputs.find(out => out.id === el('videoFormat').value);
    if (!source) {
      release(snapshot);
      snapshot = null;
      building = false;
      el('videoFrame').hidden = true;
      el('videoSelectionOverlay').hidden = true;
      el('videoEmpty').hidden = false;
      renderButton();
      inspector();
      el('videoTimeline').textContent = 'As camadas aparecerão aqui.';
      status('Gere uma composição para usar seus assets.');
      return;
    }
    status('Preparando as camadas da campanha…');
    const draft = drafts.get(source.id);
    if (draft) {
      el('videoDuration').value = draft.duration;
      el('videoMotion').value = draft.motion;
    }
    const out = clone(source),
      duration = Number(el('videoDuration').value);
    const data = {
      sourceId: source.id,
      w: out.w,
      h: out.h,
      duration,
      motion: el('videoMotion').value,
      campaign: el('campaign').value,
      layers: []
    };
    try {
      await ensureFonts();
      await prepareBackground(out, true);
      if (id !== buildId) return;
      const add = async (canvas, name, start, sourceLayer = null) => {
        const blob = await png(canvas);
        const key = sourceLayer?.id || '__background',
          prior = draft?.layers.find(layer => layer.key === key);
        const layer = {
          key,
          name,
          start: prior?.start ?? start,
          blob,
          path: `assets/layer-${data.layers.length}.png`,
          url: URL.createObjectURL(blob),
          animation: { ...prior?.animation }
        };
        if (sourceLayer) {
          Object.assign(layer.animation, {
            originX: (sourceLayer.x + sourceLayer.w / 2) * 100,
            originY: (sourceLayer.y + sourceLayer.h / 2) * 100
          });
          const cx = (sourceLayer.x + sourceLayer.w / 2) * out.w,
            cy = (sourceLayer.y + sourceLayer.h / 2) * out.h,
            angle = ((sourceLayer.rotation || 0) * Math.PI) / 180,
            c = Math.cos(angle),
            s = Math.sin(angle);
          layer.corners = [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1]
          ].map(([sx, sy]) => {
            const x = (sx * sourceLayer.w * out.w) / 2,
              y = (sy * sourceLayer.h * out.h) / 2;
            return { x: cx + x * c - y * s, y: cy + x * s + y * c };
          });
          const hitCanvas = document.createElement('canvas'),
            ratio = Math.min(1, 256 / Math.max(out.w, out.h));
          hitCanvas.width = Math.max(1, Math.ceil(out.w * ratio));
          hitCanvas.height = Math.max(1, Math.ceil(out.h * ratio));
          const hitContext = hitCanvas.getContext('2d', { willReadFrequently: true });
          hitContext.drawImage(canvas, 0, 0, hitCanvas.width, hitCanvas.height);
          const rgba = hitContext.getImageData(0, 0, hitCanvas.width, hitCanvas.height).data,
            alpha = new Uint8Array(hitCanvas.width * hitCanvas.height);
          for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];
          layer.hitMask = { w: hitCanvas.width, h: hitCanvas.height, alpha };
        }
        layer.animation = SplitVideoComposition.animation(layer, duration, data.motion);
        data.layers.push(layer);
      };
      const canvas = document.createElement('canvas');
      canvas.width = out.w;
      canvas.height = out.h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = out.bg;
      ctx.fillRect(0, 0, out.w, out.h);
      paintBackground(ctx, out);
      await add(canvas, 'Fundo', 0);
      const visible = out.layers.filter(layer => !layer.hidden);
      for (let i = 0; i < visible.length; i++) {
        ctx.clearRect(0, 0, out.w, out.h);
        paintLayer(ctx, visible[i], out);
        await add(
          canvas,
          visible[i].name || `Camada ${i + 1}`,
          0.15 + i * Math.min(0.3, (duration * 0.45) / Math.max(1, visible.length)),
          visible[i]
        );
        if (id !== buildId) {
          release(data);
          return;
        }
      }
      release(snapshot);
      snapshot = data;
      selectedLayer = Math.max(1, Math.min(selectedLayer, data.layers.length - 1));
      if (!(await loadPreview(data, id, restingFrame(data)))) {
        release(data);
        return;
      }
      posterFrame = frame;
      remember();
      status(`${visible.length} camadas animadas · ${out.w} × ${out.h} px. Prévia pronta.`);
    } catch (error) {
      release(data);
      if (id === buildId) {
        building = false;
        release(snapshot);
        snapshot = null;
        el('videoFrame').hidden = true;
        el('videoSelectionOverlay').hidden = true;
        el('videoEmpty').hidden = false;
        status(error.message);
        renderButton();
        inspector();
      }
    }
  }
  async function checkedFile(path) {
    const response = await fetch(path);
    if (!response.ok) throw Error(`Não foi possível carregar ${path}.`);
    return new Uint8Array(await response.arrayBuffer());
  }
  async function exportProject() {
    if (!snapshot || building) return;
    const data = {
        ...snapshot,
        layers: snapshot.layers.map(layer => ({ ...layer, animation: { ...layer.animation } }))
      },
      button = el('exportVideoProject');
    button.disabled = true;
    status('Empacotando projeto e assets…');
    try {
      const [gsap, animation] = await Promise.all([
        checkedFile('vendor/gsap.min.js'),
        checkedFile('video-animation.js')
      ]);
      const files = [
        textFile('index.html', compositionHTML(data)),
        { name: 'vendor/gsap.min.js', data: gsap },
        { name: 'video-animation.js', data: animation },
        textFile(
          'README.txt',
          `Split Vídeo Studio — experimento Hyperframes\n\nCampanha: ${data.campaign}\n${data.w} x ${data.h} · ${data.duration}s · 30 fps\n\nExtraia todos os arquivos. Instale Node.js 22+ e FFmpeg.\nNa pasta extraída:\n  npx hyperframes@0.8.150 preview\n  npx hyperframes@0.8.150 render --fps 30 --output video.mp4\n\nVídeo sem áudio. As camadas são PNGs transparentes na resolução da composição original.\nA prévia e a renderização usam a mesma timeline GSAP.\nGSAP 3.15.0: https://gsap.com/standard-license/\nHyperframes: https://github.com/heygen-com/hyperframes\n`
        ),
        textFile(
          'split-video.json',
          JSON.stringify(
            {
              version: 2,
              engine: 'hyperframes',
              fps: FPS,
              width: data.w,
              height: data.h,
              duration: data.duration,
              motion: data.motion,
              campaign: data.campaign,
              layers: data.layers.map(({ name, start, path, animation }) => ({
                name,
                start,
                path,
                animation
              }))
            },
            null,
            2
          )
        )
      ];
      for (const layer of data.layers)
        files.push({ name: layer.path, data: new Uint8Array(await layer.blob.arrayBuffer()) });
      download(zipFiles(files), `${safeName()}-hyperframes.zip`);
      status('Projeto baixado. Extraia o ZIP para gerar o MP4 com Hyperframes.');
    } catch (error) {
      status(error.message);
    } finally {
      button.disabled = !snapshot || building;
    }
  }
  async function renderJob(data, onProgress) {
    return SplitBrowserVideo.render(data, {
      onProgress: value => onProgress(value, 'rendering'),
      signal: renderController?.signal
    });
  }
  async function prepareBatchComposition(out, settings) {
    const data = { w: out.w, h: out.h, duration: settings.duration, motion: settings.motion, layers: [] };
    await ensureFonts();
    await prepareBackground(out, true);
    const canvas = document.createElement('canvas');
    canvas.width = out.w;
    canvas.height = out.h;
    const ctx = canvas.getContext('2d');
    const add = async (name, key, start, sourceLayer) => {
      const prior = settings.layers.find(layer => layer.key === key);
      const layer = {
        name,
        start: prior?.start ?? start,
        blob: await png(canvas),
        animation: { ...prior?.animation }
      };
      if (sourceLayer)
        Object.assign(layer.animation, {
          originX: (sourceLayer.x + sourceLayer.w / 2) * 100,
          originY: (sourceLayer.y + sourceLayer.h / 2) * 100
        });
      layer.animation = SplitVideoComposition.animation(layer, data.duration, data.motion);
      data.layers.push(layer);
    };
    ctx.fillStyle = out.bg;
    ctx.fillRect(0, 0, out.w, out.h);
    paintBackground(ctx, out);
    await add('Fundo', '__background', 0);
    const visible = out.layers.filter(layer => !layer.hidden);
    for (let i = 0; i < visible.length; i++) {
      ctx.clearRect(0, 0, out.w, out.h);
      paintLayer(ctx, visible[i], out);
      await add(
        visible[i].name || `Camada ${i + 1}`,
        visible[i].id,
        0.15 + i * Math.min(0.3, (data.duration * 0.45) / Math.max(1, visible.length)),
        visible[i]
      );
    }
    return data;
  }
  async function renderAllVideos() {
    if (!snapshot || !serverReady || rendering || building) return;
    remember();
    pause();
    const currentData = {
      ...snapshot,
      layers: snapshot.layers.map(layer => ({ ...layer, animation: { ...layer.animation } }))
    };
    const sources = clone(outputs),
      settings = clone([...drafts]),
      fallback = clone(drafts.get(snapshot.sourceId)),
      name = safeName();
    const saved = new Map(settings),
      renderRevision = revision,
      files = [],
      failures = [];
    rendering = true;
    renderController = new AbortController();
    renderButton();
    const progress = el('videoRenderProgress'),
      message = el('videoRenderStatus'),
      link = el('downloadRenderedVideo');
    progress.hidden = false;
    progress.value = 0;
    link.hidden = true;
    try {
      for (let i = 0; i < sources.length; i++) {
        const source = sources[i],
          prefix = `${i + 1}/${sources.length} · ${source.name} · ${source.w} × ${source.h}`;
        try {
          message.textContent = `Preparando ${prefix}…`;
          const data =
            source.id === currentData.sourceId
              ? currentData
              : await prepareBatchComposition(source, saved.get(source.id) || fallback);
          const job = await renderJob(data, (value, state) => {
            progress.value = ((i + value / 100) / sources.length) * 100;
            message.textContent = `${state === 'queued' ? 'Na fila' : 'Renderizando'} ${prefix} · ${Math.round(value)}%`;
          });
          files.push({
            name: `${name}-${i + 1}-${source.w}x${source.h}.mp4`,
            data: new Uint8Array(await job.blob.arrayBuffer())
          });
        } catch (error) {
          if (error.name === 'AbortError') throw error;
          failures.push(`${source.name} (${source.w} × ${source.h}): ${error.message}`);
        }
        progress.value = ((i + 1) / sources.length) * 100;
      }
      if (!files.length) throw Error(`Nenhum vídeo foi gerado. ${failures.join(' ')}`);
      const completed = files.length;
      if (failures.length) files.push(textFile('formatos-com-erro.txt', failures.join('\n')));
      if (batchDownloadUrl) URL.revokeObjectURL(batchDownloadUrl);
      batchDownloadUrl = URL.createObjectURL(zipFiles(files));
      link.href = batchDownloadUrl;
      link.download = `${name}-videos.zip`;
      link.textContent = 'Baixar vídeos · ZIP';
      link.hidden = false;
      message.textContent = `${completed} de ${sources.length} vídeos prontos. ${failures.length ? 'Os formatos com erro estão listados no ZIP.' : 'Baixe todos no ZIP.'}`;
      if (renderRevision !== revision)
        message.textContent += ' Os vídeos usam os ajustes do início da renderização.';
    } catch (error) {
      message.textContent =
        error.name === 'AbortError' ? 'Renderização cancelada. Seus ajustes foram mantidos.' : error.message;
      progress.hidden = true;
    } finally {
      rendering = false;
      renderController = null;
      renderButton();
    }
  }
  async function renderVideo() {
    if (!snapshot || !serverReady || rendering || building) return;
    if (el('videoRenderAll').checked) return renderAllVideos();
    const data = {
        ...snapshot,
        layers: snapshot.layers.map(layer => ({ ...layer, animation: { ...layer.animation } }))
      },
      renderRevision = revision;
    rendering = true;
    renderController = new AbortController();
    renderButton();
    pause();
    const progress = el('videoRenderProgress'),
      message = el('videoRenderStatus');
    progress.hidden = false;
    progress.value = 0;
    el('downloadRenderedVideo').hidden = true;
    message.textContent = 'Preparando assets para renderização…';
    try {
      const job = await renderJob(data, (value, state) => {
        progress.value = value;
        message.textContent =
          state === 'queued'
            ? 'Vídeo na fila de renderização…'
            : `Renderizando vídeo · ${Math.round(value)}%`;
      });
      progress.value = 100;
      message.textContent = `Vídeo pronto · ${data.w} × ${data.h} px · ${data.duration}s · gerado em ${job.seconds.toFixed(1)}s neste dispositivo.`;
      if (renderRevision !== revision)
        message.textContent +=
          ' Você alterou a animação: este download é da versão anterior. Gere novamente para atualizar.';
      if (batchDownloadUrl) URL.revokeObjectURL(batchDownloadUrl);
      batchDownloadUrl = URL.createObjectURL(job.blob);
      const link = el('downloadRenderedVideo');
      link.href = batchDownloadUrl;
      link.download = `${safeName()}-${data.w}x${data.h}.mp4`;
      link.textContent = 'Baixar MP4';
      link.hidden = false;
    } catch (error) {
      message.textContent =
        error.name === 'AbortError' ? 'Renderização cancelada. Seus ajustes foram mantidos.' : error.message;
      progress.hidden = true;
    } finally {
      rendering = false;
      renderController = null;
      renderButton();
    }
  }
  el('openVideoStudio').onclick = () => {
    options();
    dialog.showModal();
    build();
    connect();
  };
  el('closeVideoStudio').onclick = () => dialog.close();
  dialog.addEventListener('close', () => {
    remember();
    pause();
    ++buildId;
    building = false;
    release(snapshot);
    snapshot = null;
    el('videoFrame').srcdoc = '';
    el('videoSelectionOverlay').hidden = true;
  });
  dialog.addEventListener('keydown', event => event.stopPropagation());
  dialog.addEventListener('click', event => {
    if (event.button !== 0 || selectedLayer == null || building) return;
    if (
      event.target.closest(
        'button,a,input,select,textarea,label,summary,[contenteditable],#videoSelectionOverlay'
      )
    )
      return;
    selectVideoLayer(null);
  });
  el('videoPlay').onclick = play;
  el('videoSeek').oninput = event => {
    pause();
    seek(Number(event.target.value));
  };
  el('videoSelectionOverlay').onclick = pickVideoLayer;
  el('videoSelectionOverlay').onkeydown = event => {
    if (
      !snapshot ||
      building ||
      snapshot.layers.length < 2 ||
      !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)
    )
      return;
    event.preventDefault();
    const count = snapshot.layers.length - 1,
      step = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1;
    selectVideoLayer((((selectedLayer || 1) - 1 + step + count) % count) + 1);
  };
  el('videoFormat').onchange = build;
  el('videoDuration').onchange = () => {
    if (!snapshot || building) return;
    const previous = snapshot.duration;
    snapshot.duration = Number(el('videoDuration').value);
    for (const layer of snapshot.layers) {
      layer.start = Math.min(layer.start, snapshot.duration - 0.1);
      if (layer.animation.end === previous) layer.animation.end = snapshot.duration;
      layer.animation = normalize(layer);
    }
    updateAnimation(Math.min(frame, snapshot.duration * FPS));
  };
  el('videoMotion').onchange = () => {
    if (!snapshot || building) return;
    snapshot.motion = el('videoMotion').value;
    snapshot.layers.slice(1).forEach(layer => {
      Object.assign(layer.animation, {
        enter: snapshot.motion,
        scale: ['zoom', 'spin'].includes(snapshot.motion) ? 0.85 : 1,
        rotation: snapshot.motion === 'swing' ? 25 : 0
      });
    });
    updateAnimation();
  };
  for (const id of ['videoLayerStart', ...Object.keys(fields)]) el(id).onchange = () => editLayer(id);
  for (const id of ['videoLayerScale', 'videoLayerExitScale', 'videoLayerRotation']) {
    el(id).step = 'any';
    el(id).oninput = () => {
      const input = el(id);
      if (
        input.value !== '' &&
        !input.validity.badInput &&
        !input.validity.rangeUnderflow &&
        !input.validity.rangeOverflow
      )
        editLayer(id);
    };
    const commit = () => {
      editLayer(id);
      const layer = snapshot?.layers[selectedLayer];
      if (layer)
        el(id).value = +(layer.animation[fields[id]] * (id === 'videoLayerRotation' ? 1 : 100)).toFixed(2);
    };
    el(id).onchange = commit;
    el(id).onkeydown = event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commit();
      }
    };
  }
  const arrangeEntries = together => {
    if (!snapshot || building) return;
    const step = Math.max(0, Math.min(2, Number(el('videoStagger').value) || 0));
    el('videoStagger').value = step;
    snapshot.layers.slice(1).forEach((layer, i) => {
      layer.start = together ? 0 : Math.min(i * step, Math.max(0, snapshot.duration - 1));
      layer.animation = normalize(layer);
    });
    updateAnimation(0);
  };
  el('videoSequence').onclick = () => arrangeEntries(false);
  el('videoTogether').onclick = () => arrangeEntries(true);
  el('videoApplyAll').onclick = () => {
    if (!snapshot || building || !snapshot.layers[selectedLayer]) return;
    const { end, originX, originY, ...style } = snapshot.layers[selectedLayer].animation;
    snapshot.layers.slice(1).forEach(layer => {
      Object.assign(layer.animation, style);
      layer.animation = normalize(layer);
    });
    updateAnimation();
  };
  el('videoPreviewLayer').onclick = () => {
    if (!snapshot || building || !snapshot.layers[selectedLayer]) return;
    pause();
    seek(Math.max(0, snapshot.layers[selectedLayer].start - 0.2) * FPS);
    play();
  };
  el('refreshVideo').onclick = () => {
    options();
    build();
  };
  el('videoExample').onclick = () => {
    demo();
    options();
    build();
  };
  el('exportVideoProject').onclick = exportProject;
  el('renderVideo').onclick = renderVideo;
  el('cancelVideoRender').onclick = () => renderController?.abort();
  el('videoRenderAll').onchange = () => {
    invalidateDownload();
    renderButton();
  };
  setupIconControls();
  new ResizeObserver(sizePreview).observe(el('videoScreen'));
  return { compositionHTML };
})();
